package com.storeall.api.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.storeall.api.config.AppProperties;
import com.storeall.api.tenant.StoreContextFilter;

/**
 * Classe de configuration principale de la sécurité Spring Security. Définit
 * les règles d'accès, les filtres et les gestionnaires d'authentification.
 */
@Configuration
@EnableMethodSecurity // Active la sécurité au niveau des méthodes (ex: @PreAuthorize)
public class SecurityConfig {

    @Autowired
    UserDetailsServiceImpl userDetailsService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthEntryPointJwt unauthorizedHandler;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Autowired
    private StoreContextFilter storeContextFilter;

    @Autowired
    private AppProperties appProperties;

    /**
     * Configure le fournisseur d'authentification DAO (Data Access Object). Il
     * fait le lien entre UserDetaisService (les données) et PasswordEncoder
     * (l'encodage).
     */
    @Bean
    @SuppressWarnings("deprecation") // Supprime l'avertissement car DaoAuthenticationProvider est stable même si marqué déprécié dans certaines versions récentes pour inciter à la config lambda
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();

        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder);

        return authProvider;
    }

    /**
     * Expose le Bean AuthenticationManager pour être utilisé dans les
     * contrôleurs (Login).
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    /**
     * Définit la chaîne de filtres de sécurité (Security Filter Chain). C'est
     * ici qu'on configure les règles HTTP.
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable) // Désactive CSRF car nous utilisons des tokens JWT (Stateless)
                .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler)) // Gestionnaire d'erreurs 401
                .cors(org.springframework.security.config.Customizer.withDefaults()) // Active la configuration CORS utilisant le bean corsConfigurationSource()
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // Pas de session serveur (HttpSession)
                .authorizeHttpRequests(auth
                        -> // Liste blanche (URLs publiques)
                        auth.requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/login").permitAll()
                        .requestMatchers("/api/logout").permitAll()
                        .requestMatchers("/api/shop/**").permitAll()
                        .requestMatchers("/api/products/**").permitAll()
                        .requestMatchers("/api/categories/**").permitAll()
                        .requestMatchers("/api/store/**").permitAll()
                        .requestMatchers("/api/sliders/**").permitAll()
                        .requestMatchers("/api/orders/**").permitAll()
                        .requestMatchers("/uploads/**").permitAll() // Accès aux images sans authentification
                        .requestMatchers("/error").permitAll()
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/api/telegram/**").permitAll()
                        .requestMatchers("/api/notifications/push/customer-subscribe").permitAll()
                        .requestMatchers("/api/payments/yengapay/webhook").permitAll()
                        // Tout le reste nécessite une authentification
                        .anyRequest().authenticated()
                );

        // Ajoute le fournisseur d'authentification configuré
        http.authenticationProvider(authenticationProvider());

        // Ajoute notre filtre JWT *avant* le filtre standard UsernamePassword
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        // Résolution du store après auth (empêche le spoofing de header en mode authentifié)
        http.addFilterAfter(storeContextFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Configuration globale CORS pour autoriser le frontend React.
     */
    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration configuration = new org.springframework.web.cors.CorsConfiguration();
        String origins = appProperties.getCors().getAllowedOriginPatterns();
        if (origins == null || origins.isBlank()) {
            configuration.setAllowedOriginPatterns(java.util.List.of("*"));
        } else {
            configuration.setAllowedOriginPatterns(
                    java.util.Arrays.stream(origins.split(","))
                            .map(String::trim)
                            .filter(s -> !s.isEmpty())
                            .toList());
        }
        configuration.setAllowedMethods(java.util.List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        // Keep headers explicit: SSE uses Last-Event-ID, and multi-store uses X-Store-Code.
        configuration.setAllowedHeaders(java.util.List.of("Authorization", "Content-Type", "X-Store-Code", "Last-Event-ID"));
        configuration.setAllowCredentials(true);
        org.springframework.web.cors.UrlBasedCorsConfigurationSource source = new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
