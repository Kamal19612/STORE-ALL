package com.storeall.api.service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.storeall.api.config.AppProperties;

import lombok.RequiredArgsConstructor;

/**
 * Provisions Supabase Auth users via the Admin API (service_role key).
 *
 * NOTE: this key must remain server-side.
 */
@Service
@RequiredArgsConstructor
public class SupabaseAdminService {

    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    /**
     * Creates a Supabase Auth user and returns the auth user id (uuid).
     *
     * Endpoint: POST {SUPABASE_URL}/auth/v1/admin/users
     */
    public String createAuthUser(String email, String password, boolean emailConfirmed) {
        String baseUrl = appProperties.getSupabase().getUrl();
        String serviceKey = appProperties.getSupabase().getServiceRoleKey();

        if (baseUrl == null || baseUrl.isBlank() || serviceKey == null || serviceKey.isBlank()) {
            throw new RuntimeException(
                    "Supabase non configuré côté serveur : définissez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY "
                            + "(copier SERVICE_ROLE_KEY depuis supabase/.env, jamais ANON_KEY).");
        }

        assertJwtServiceRoleKey(serviceKey);

        String url = baseUrl.replaceAll("/+$", "") + "/auth/v1/admin/users";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("apikey", serviceKey);
        headers.setBearerAuth(serviceKey);

        Map<String, Object> body = Map.of(
            "email", email,
            "password", password,
            "email_confirm", emailConfirmed
        );

        RestTemplate rt = new RestTemplate();
        try {
            ResponseEntity<Map> res = rt.postForEntity(url, new HttpEntity<>(body, headers), Map.class);

            if (!res.getStatusCode().is2xxSuccessful() || res.getBody() == null) {
                throw new RuntimeException("Supabase admin create user failed: HTTP " + res.getStatusCode().value());
            }

            Object id = res.getBody().get("id");
            if (id == null) {
                // Some versions return { user: { id: ... } }
                Object user = res.getBody().get("user");
                if (user instanceof Map u && u.get("id") != null) {
                    return u.get("id").toString();
                }
                throw new RuntimeException("Supabase admin create user: missing id in response.");
            }
            return id.toString();
        } catch (HttpStatusCodeException e) {
            String responseBody = e.getResponseBodyAsString(StandardCharsets.UTF_8);
            // If the email already exists in Supabase Auth, re-use the existing user id instead of failing.
            // This avoids blocking admin user creation when the Supabase Auth account was created earlier.
            int status = e.getStatusCode().value();
            if ((status == 400 || status == 422) && looksLikeEmailAlreadyRegistered(responseBody)) {
                String existing = getAuthUserIdByEmail(email, baseUrl, serviceKey);
                if (existing != null && !existing.isBlank()) {
                    return existing;
                }
            }
            throw new RuntimeException(
                    "Supabase Auth (admin) a refusé la création utilisateur (HTTP "
                            + e.getStatusCode().value()
                            + "). Vérifiez SUPABASE_URL (URL Kong joignable depuis ce serveur) et "
                            + "SUPABASE_SERVICE_ROLE_KEY (= SERVICE_ROLE_KEY dans supabase/.env). "
                            + "Réponse: "
                            + truncate(responseBody, 800));
        } catch (ResourceAccessException e) {
            throw new RuntimeException(
                    "Impossible de contacter Supabase à l'adresse "
                            + url
                            + ". Vérifiez SUPABASE_URL (ex. https://votre-kong/public). Détail: "
                            + e.getMessage());
        }
    }

    private boolean looksLikeEmailAlreadyRegistered(String responseBody) {
        if (responseBody == null) {
            return false;
        }
        String s = responseBody.toLowerCase();
        return s.contains("already been registered")
                || s.contains("already registered")
                || s.contains("user already registered")
                || s.contains("email_exists")
                || s.contains("email already") // keep broad: Supabase/GoTrue wording differs across versions
                || s.contains("duplicate");
    }

    /**
     * Attempts to resolve the Supabase Auth user id from an email address using the Admin API.
     * Tries to be resilient to response-shape differences (array vs {users:[...]}).
     */
    private String getAuthUserIdByEmail(String email, String baseUrl, String serviceKey) {
        try {
            String url = baseUrl.replaceAll("/+$", "") + "/auth/v1/admin/users";

            UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(url)
                    .queryParam("page", 1)
                    .queryParam("per_page", 200);

            HttpHeaders headers = new HttpHeaders();
            headers.set("apikey", serviceKey);
            headers.setBearerAuth(serviceKey);

            RestTemplate rt = new RestTemplate();
            ResponseEntity<String> res = rt.exchange(
                    b.toUriString(),
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    String.class);

            if (!res.getStatusCode().is2xxSuccessful() || res.getBody() == null) {
                return null;
            }

            JsonNode root = objectMapper.readTree(res.getBody());
            JsonNode users = root.isArray() ? root : root.path("users");
            if (users != null && users.isArray()) {
                for (JsonNode u : users) {
                    String em = u.path("email").asText("");
                    if (email.equalsIgnoreCase(em)) {
                        String id = u.path("id").asText("");
                        if (!id.isBlank()) {
                            return id;
                        }
                    }
                }
            }
            return null;
        } catch (Exception ignored) {
            return null;
        }
    }

    /**
     * Si la clé ressemble à un JWT Supabase, vérifie que le claim {@code role} n'est pas {@code anon}.
     * Les clés opaques (ex. {@code sb_secret_...}) sont ignorées.
     */
    private void assertJwtServiceRoleKey(String serviceKey) {
        String[] parts = serviceKey.split("\\.");
        if (parts.length < 2) {
            return;
        }
        try {
            byte[] payload = Base64.getUrlDecoder().decode(parts[1]);
            JsonNode root = objectMapper.readTree(payload);
            String role = root.path("role").asText("");
            if ("anon".equals(role) || "authenticated".equals(role)) {
                throw new RuntimeException(
                        "SUPABASE_SERVICE_ROLE_KEY utilise le rôle JWT « "
                                + role
                                + " » (souvent la clé ANON). "
                                + "Utilisez la valeur SERVICE_ROLE_KEY de supabase/.env pour provisionner les livreurs.");
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception ignored) {
            // clé non décodable : ne pas bloquer (formats futurs)
        }
    }

    private static String truncate(String s, int max) {
        if (s == null) {
            return "";
        }
        String t = s.trim();
        if (t.length() <= max) {
            return t;
        }
        return t.substring(0, max) + "…";
    }
}

