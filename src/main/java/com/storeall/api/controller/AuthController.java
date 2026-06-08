package com.storeall.api.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.storeall.api.dto.auth.JwtResponse;
import com.storeall.api.dto.auth.LoginRequest;
import com.storeall.api.entity.User;
import com.storeall.api.security.ClientSessionType;
import com.storeall.api.security.JwtUtils;

import java.util.Map;
import java.util.Optional;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.util.StringUtils;

/**
 * Contrôleur REST gérant l'authentification des utilisateurs. Permet aux
 * utilisateurs de se connecter et d'obtenir un token JWT.
 */
@CrossOrigin(origins = "*", maxAge = 3600) // Autorise les requêtes Cross-Origin (CORS) depuis n'importe quelle source
@RestController
@RequestMapping({"/api/auth", "/api"})
public class AuthController {

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    com.storeall.api.security.UserDetailsServiceImpl userDetailsService;

    @Autowired
    JwtUtils jwtUtils;

    @Autowired
    com.storeall.api.repository.UserRepository userRepository;

    /**
     * Endpoint de connexion (Login).
     *
     * @param loginRequest DTO contenant le username et le password.
     * @return ResponseEntity contenant le JWT et les infos utilisateur si
     * succès, ou une erreur 401.
     */
    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {

        // 1. Authentifier l'utilisateur via le Manager de Spring Security
        // Cela va appeler UserDetailsServiceImpl.loadUserByUsername en interne
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        // 2. Mettre l'authentification dans le contexte de sécurité (SecurityContext)
        SecurityContextHolder.getContext().setAuthentication(authentication);

        // 3. Authentifier l'utilisateur
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();

        Optional<User> uOpt = userRepository.findByUsernameWithStore(userDetails.getUsername());
        if (uOpt.isPresent()) {
            User u0 = uOpt.get();
            boolean staffStoreBlocked =
                    u0.getStore() != null
                            && !u0.getStore().isActive()
                            && (u0.getRole() == User.Role.MANAGER || u0.getRole() == User.Role.DELIVERY_AGENT);
            if (staffStoreBlocked) {
                SecurityContextHolder.clearContext();
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Cette boutique est désactivée. Contactez l'administrateur de la plateforme."));
            }
        }

        // 4. Invalider les sessions précédentes (Incrémente la version du token en BDD)
        // Cela garantit qu'un seul token est valide à la fois pour un utilisateur
        // 4. Invalider les sessions précédentes (Incrémente la version du token en BDD)
        String clientType = ClientSessionType.normalize(loginRequest.getClientType());
        Long newTokenVersion = userDetailsService.invalidateUserSession(userDetails.getUsername(), clientType);

        // 5. Générer le nouveau token avec la version
        String jwt = jwtUtils.generateJwtToken(authentication, newTokenVersion, clientType);

        // 5. Retourner la réponse avec le token
        java.util.List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(java.util.stream.Collectors.toList());

        String simpleRole = "admin";

        Long livreurId = null;
        String nom = userDetails.getUsername();
        Long storeId = null;
        String storeCode = null;
        String storeName = null;
        String storeLogoUrl = null;
        if (uOpt.isPresent()) {
            var u = uOpt.get();
            String first = u.getFirstName() != null ? u.getFirstName().trim() : "";
            String last = u.getLastName() != null ? u.getLastName().trim() : "";
            String full = (first + " " + last).trim();
            if (!full.isBlank()) nom = full;
            if (roles.contains("ROLE_DELIVERY_AGENT")) {
                simpleRole = "livreur";
                livreurId = u.getId();
            }
            if (u.getStore() != null) {
                var st = u.getStore();
                if (st.getId() != null) {
                    storeId = st.getId();
                }
                if (st.getCode() != null && !st.getCode().isBlank()) {
                    storeCode = st.getCode().trim();
                }
                if (st.getName() != null && !st.getName().isBlank()) {
                    storeName = st.getName().trim();
                }
                if (st.getLogoUrl() != null && !st.getLogoUrl().isBlank()) {
                    storeLogoUrl = st.getLogoUrl().trim();
                }
            }
        }

        return ResponseEntity.ok(new JwtResponse(
                jwt,
                userDetails.getUsername(),
                roles,
                simpleRole,
                livreurId,
                nom,
                storeId,
                storeCode,
                storeName,
                storeLogoUrl
        ));
    }

    /**
     * Endpoint de déconnexion (Logout). Invalide la session côté serveur en
     * incrémentant la version du token.
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logoutUser(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserDetails) {
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String clientType = ClientSessionType.WEB;
            String jwt = parseBearerToken(request);
            if (jwt != null && jwtUtils.validateJwtToken(jwt)) {
                clientType = jwtUtils.getClientTypeFromJwtToken(jwt);
            }
            userDetailsService.invalidateUserSession(userDetails.getUsername(), clientType);
        }
        return ResponseEntity.ok(Map.of("message", "Déconnexion réussie !"));
    }

    private static String parseBearerToken(HttpServletRequest request) {
        String headerAuth = request.getHeader("Authorization");
        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }
        return null;
    }
}
