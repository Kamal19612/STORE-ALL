package com.storeall.api.security;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.storeall.api.dto.ManagerSupervisionRow;
import com.storeall.api.dto.SuperManagerCreateRequest;
import com.storeall.api.dto.SuperManagerUpdateRequest;
import com.storeall.api.entity.Store;
import com.storeall.api.entity.User;
import com.storeall.api.repository.StoreRepository;
import com.storeall.api.repository.UserRepository;
import com.storeall.api.tenant.StoreContext;

/**
 * Service implémentant l'interface UserDetailsService de Spring Security. Son
 * rôle est de charger les données de l'utilisateur depuis la base de données
 * pour que Spring Security puisse effectuer la vérification du mot de passe.
 */
@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private static final Logger log = LoggerFactory.getLogger(UserDetailsServiceImpl.class);

    @Autowired
    UserRepository userRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Autowired
    private com.storeall.api.service.SupabaseAdminService supabaseAdminService;

    @Autowired
    private com.storeall.api.repository.DeliveryAgentRepository deliveryAgentRepository;

    @Autowired
    private com.storeall.api.service.NotificationService notificationService;

    @Override
    @Transactional // Transactionnel car on pourrait charger des collections Lazy (ex: roles)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        try {
            // Accepte la connexion via username OU email (l'UI affiche souvent un email)
            User user = userRepository.findByUsernameOrEmail(username, username)
                    .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé : " + username));

            // Guard rails: avoid NPEs that would bubble up as 500.
            if (user.getUsername() == null || user.getUsername().isBlank()) {
                log.error("[AUTH] user record is invalid (blank username) input={}", username);
                throw new BadCredentialsException("Bad credentials");
            }
            if (user.getPassword() == null || user.getPassword().isBlank()) {
                log.error("[AUTH] user record is invalid (blank password) username={}", user.getUsername());
                throw new BadCredentialsException("Bad credentials");
            }
            if (user.getRole() == null) {
                log.error("[AUTH] user record is invalid (null role) username={} storeId={}",
                    user.getUsername(), user.getStore() != null ? user.getStore().getId() : null);
                throw new BadCredentialsException("Bad credentials");
            }

            // Retourne un objet User de Spring Security (et non notre Entité User)
            return new org.springframework.security.core.userdetails.User(
                    user.getUsername(),
                    user.getPassword(),
                    user.isActive(), // Enabled ?
                    true, // Account Non Expired
                    true, // Credentials Non Expired
                    true, // Account Non Locked
                    // Conversion du rôle en Authority Spring Security
                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
            );
        } catch (BadCredentialsException | UsernameNotFoundException e) {
            // Expected auth failures
            throw e;
        } catch (RuntimeException e) {
            // Convert unexpected runtime errors to auth failure (prevents leaking stacktraces / 500s).
            log.error("[AUTH] unexpected error while loading user={}: {}", username, e.getMessage(), e);
            throw new BadCredentialsException("Bad credentials");
        }
    }

    // --- Méthodes Admin ---
    public List<User> getAllUsers() {
        if (isSuperAdminCaller()) {
            return userRepository.findAll();
        }
        Long storeId = StoreContext.getStoreIdOrNull();
        return userRepository.findByStoreId(storeId);
    }

    private boolean isSuperAdminCaller() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) {
            return false;
        }
        return auth.getAuthorities().stream().anyMatch(a -> "ROLE_SUPER_ADMIN".equals(a.getAuthority()));
    }

    private void assertCanManageTargetRole(User.Role targetRole) {
        if (targetRole == null) {
            throw new RuntimeException("Rôle manquant.");
        }
        if (targetRole == User.Role.SUPER_ADMIN && !isSuperAdminCaller()) {
            throw new RuntimeException("Seul un Super Admin peut attribuer le rôle SUPER_ADMIN.");
        }
    }

    public User updateUserRole(Long id, String roleName) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable ID: " + id));

        try {
            User.Role role = User.Role.valueOf(roleName);

            // Vérification Unique Super Admin
            if (role == User.Role.SUPER_ADMIN && user.getRole() != User.Role.SUPER_ADMIN) {
                if (userRepository.findByRole(User.Role.SUPER_ADMIN).isPresent()) {
                    throw new RuntimeException("Un seul Super Admin est autorisé !");
                }
            }

            assertCanManageTargetRole(role);
            user.setRole(role);
            return userRepository.save(user);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Rôle invalide : " + roleName);
        }
    }

    @Transactional
    public User createUser(User user) {
        assertCanManageTargetRole(user.getRole());
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new RuntimeException("Nom d'utilisateur déjà pris !");
        }
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email déjà utilisé !");
        }

        // Vérification Unique Super Admin
        if (user.getRole() == User.Role.SUPER_ADMIN) {
            if (userRepository.findByRole(User.Role.SUPER_ADMIN).isPresent()) {
                throw new RuntimeException("Un seul Super Admin est autorisé !");
            }
        }

        final String rawPassword = user.getPassword();
        user.setPassword(passwordEncoder.encode(rawPassword));

        Long storeId = StoreContext.getStoreIdOrNull();
        user.setStore(com.storeall.api.entity.Store.builder().id(storeId).build());

        User saved = userRepository.save(user);
        notifyStaffChanged("created", saved);

        if (saved.getRole() == User.Role.DELIVERY_AGENT) {
            try {
                final String authUserId = supabaseAdminService.createAuthUser(
                    saved.getEmail(),
                    rawPassword,
                    true
                );
                deliveryAgentRepository.upsertDeliveryAgent(
                    authUserId,
                    saved.getId(),
                    User.Role.DELIVERY_AGENT.name(),
                    saved.isActive()
                );
            } catch (Exception e) {
                throw new RuntimeException(
                    "Création Supabase Auth impossible pour ce livreur. "
                        + "Vérifiez SUPABASE_SERVICE_ROLE_KEY et/ou l'email (déjà utilisé ?). "
                        + "Détail: " + e.getMessage()
                );
            }
        }

        return saved;
    }

    /**
     * Super admin : création d'un manager pour une boutique donnée (sans {@link StoreContext}).
     */
    @Transactional
    public User createManagerForSupervision(SuperManagerCreateRequest req) {
        if (!isSuperAdminCaller()) {
            throw new RuntimeException("Permission refusée.");
        }
        if (req == null || req.getStoreId() == null) {
            throw new RuntimeException("La boutique (storeId) est obligatoire.");
        }
        if (req.getNom() == null || req.getNom().isBlank()) {
            throw new RuntimeException("Le nom est obligatoire.");
        }
        if (req.getEmail() == null || req.getEmail().isBlank()) {
            throw new RuntimeException("Email obligatoire.");
        }
        if (req.getPassword() == null || req.getPassword().isBlank()) {
            throw new RuntimeException("Mot de passe obligatoire.");
        }
        Store store = storeRepository.findById(req.getStoreId())
                .orElseThrow(() -> new RuntimeException("Boutique introuvable."));
        String email = req.getEmail().trim();
        String username = req.getUsername() != null && !req.getUsername().isBlank()
                ? req.getUsername().trim()
                : email;
        String phone = req.getPhone() != null ? req.getPhone().trim() : null;
        if (phone != null && phone.isEmpty()) {
            phone = null;
        }
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Nom d'utilisateur déjà pris !");
        }
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email déjà utilisé !");
        }
        User user = User.builder()
                .username(username)
                .email(email)
                .firstName(req.getNom().trim())
                .phone(phone)
                .password(passwordEncoder.encode(req.getPassword()))
                .role(User.Role.MANAGER)
                .store(store)
                .active(true)
                .build();
        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public ManagerSupervisionRow getManagerForSupervision(Long id) {
        if (!isSuperAdminCaller()) {
            throw new RuntimeException("Permission refusée.");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Manager introuvable."));
        assertManagerRole(user);
        if (user.getStore() != null) {
            user.getStore().getCode();
        }
        return ManagerSupervisionRow.fromEntity(user);
    }

    @Transactional
    public ManagerSupervisionRow updateManagerForSupervision(Long id, SuperManagerUpdateRequest req) {
        if (!isSuperAdminCaller()) {
            throw new RuntimeException("Permission refusée.");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Manager introuvable."));
        assertManagerRole(user);

        if (req == null) {
            throw new RuntimeException("Requête vide.");
        }
        if (req.getStoreId() != null) {
            Store store = storeRepository.findById(req.getStoreId())
                    .orElseThrow(() -> new RuntimeException("Boutique introuvable."));
            user.setStore(store);
        }
        if (req.getNom() != null) {
            String nom = req.getNom().trim();
            if (nom.isEmpty()) {
                throw new RuntimeException("Le nom est obligatoire.");
            }
            user.setFirstName(nom);
        }
        if (req.getEmail() != null) {
            String email = req.getEmail().trim();
            if (email.isEmpty()) {
                throw new RuntimeException("Email obligatoire.");
            }
            if (!email.equals(user.getEmail()) && userRepository.existsByEmail(email)) {
                throw new RuntimeException("Email déjà utilisé !");
            }
            user.setEmail(email);
        }
        if (req.getUsername() != null) {
            String username = req.getUsername().trim();
            if (username.isEmpty()) {
                throw new RuntimeException("Identifiant obligatoire.");
            }
            if (!username.equals(user.getUsername()) && userRepository.existsByUsername(username)) {
                throw new RuntimeException("Nom d'utilisateur déjà pris !");
            }
            user.setUsername(username);
        }
        if (req.getPhone() != null) {
            String phone = req.getPhone().trim();
            user.setPhone(phone.isEmpty() ? null : phone);
        }
        if (req.getPassword() != null && !req.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(req.getPassword()));
        }
        if (req.getActive() != null) {
            user.setActive(req.getActive());
        }

        User saved = userRepository.save(user);
        notifyStaffChanged("updated", saved);
        if (saved.getStore() != null) {
            saved.getStore().getCode();
        }
        return ManagerSupervisionRow.fromEntity(saved);
    }

    @Transactional
    public void deleteManagerForSupervision(Long id) {
        if (!isSuperAdminCaller()) {
            throw new RuntimeException("Permission refusée.");
        }
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Manager introuvable."));
        assertManagerRole(user);
        deleteUser(id);
    }

    private static void assertManagerRole(User user) {
        if (user.getRole() != User.Role.MANAGER) {
            throw new RuntimeException("Ce compte n'est pas un manager.");
        }
    }

    @Transactional
    public User updateUser(Long id, User userRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable ID: " + id));

        // Enforce store isolation for non-super-admin: cannot touch users from other stores.
        if (!isSuperAdminCaller()) {
            Long storeId = StoreContext.getStoreIdOrNull();
            if (user.getStore() == null || user.getStore().getId() == null || !user.getStore().getId().equals(storeId)) {
                throw new RuntimeException("Utilisateur introuvable ID: " + id);
            }
        }

        if (!isSuperAdminCaller() && user.getRole() == User.Role.SUPER_ADMIN) {
            throw new RuntimeException("Permission insuffisante pour modifier ce compte.");
        }

        user.setUsername(userRequest.getUsername());
        user.setEmail(userRequest.getEmail());

        // Vérification Unique Super Admin
        if (userRequest.getRole() == User.Role.SUPER_ADMIN && user.getRole() != User.Role.SUPER_ADMIN) {
            if (userRepository.findByRole(User.Role.SUPER_ADMIN).isPresent()) {
                throw new RuntimeException("Un seul Super Admin est autorisé !");
            }
        }

        assertCanManageTargetRole(userRequest.getRole());
        user.setRole(userRequest.getRole());
        user.setActive(userRequest.isActive());

        if (user.getStore() == null) {
            Long storeId = StoreContext.getStoreIdOrNull();
            user.setStore(com.storeall.api.entity.Store.builder().id(storeId).build());
        }

        // Update password only if provided (non-empty)
        if (userRequest.getPassword() != null && !userRequest.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(userRequest.getPassword()));
        }

        user.setPhone(userRequest.getPhone());

        // Champs identité CNIB (livreurs)
        user.setFirstName(userRequest.getFirstName());
        user.setLastName(userRequest.getLastName());
        user.setBirthDate(userRequest.getBirthDate());
        user.setBirthPlace(userRequest.getBirthPlace());
        user.setGender(userRequest.getGender());
        user.setProfession(userRequest.getProfession());
        user.setCnibNationalId(userRequest.getCnibNationalId());
        user.setCnibSerial(userRequest.getCnibSerial());
        user.setCnibIssueDate(userRequest.getCnibIssueDate());
        user.setCnibExpiryDate(userRequest.getCnibExpiryDate());
        user.setCnibOcrText(userRequest.getCnibOcrText());

        User saved = userRepository.save(user);
        notifyStaffChanged("updated", saved);
        return saved;
    }

    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable ID: " + id));
        if (!isSuperAdminCaller() && user.getRole() == User.Role.SUPER_ADMIN) {
            throw new RuntimeException("Permission insuffisante pour supprimer ce compte.");
        }
        notifyStaffChanged("deleted", user);
        userRepository.deleteById(id);
    }

    /** SSE admin : rafraîchissement mobile / web après changement staff (livreurs, etc.). */
    private void notifyStaffChanged(String action, User user) {
        if (user == null || action == null || action.isBlank()) {
            return;
        }
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("action", action);
            payload.put("userId", user.getId());
            payload.put("role", user.getRole() != null ? user.getRole().name() : "");
            payload.put("username", user.getUsername() != null ? user.getUsername() : "");
            notificationService.notifyAdmins("staff_changed", payload);
        } catch (Exception e) {
            log.debug("SSE staff_changed ignoré pour userId={}: {}", user.getId(), e.getMessage());
        }
    }

    @Transactional
    public Long invalidateUserSession(String username) {
        return invalidateUserSession(username, ClientSessionType.WEB);
    }

    @Transactional
    public Long invalidateUserSession(String username, String clientType) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + username));

        String sessionType = ClientSessionType.normalize(clientType);
        if (ClientSessionType.MOBILE.equals(sessionType)) {
            Long currentVersion = user.getTokenVersionMobile();
            if (currentVersion == null) {
                currentVersion = 0L;
            }
            user.setTokenVersionMobile(currentVersion + 1);
        } else {
            Long currentVersion = user.getTokenVersion();
            if (currentVersion == null) {
                currentVersion = 0L;
            }
            user.setTokenVersion(currentVersion + 1);
        }
        userRepository.save(user);

        return getUserTokenVersion(username, sessionType);
    }

    public Long getUserTokenVersion(String username) {
        return getUserTokenVersion(username, ClientSessionType.WEB);
    }

    public Long getUserTokenVersion(String username, String clientType) {
        String sessionType = ClientSessionType.normalize(clientType);
        return userRepository.findByUsername(username)
                .map(u -> ClientSessionType.MOBILE.equals(sessionType)
                        ? (u.getTokenVersionMobile() != null ? u.getTokenVersionMobile() : 0L)
                        : (u.getTokenVersion() != null ? u.getTokenVersion() : 0L))
                .orElse(0L);
    }
}
