package com.storeall.api.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.storeall.api.service.AppSettingService;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

/**
 * URL publique du site vitrine (ex. https://store.socialracine.com), distincte de l'API.
 */
@Component
@RequiredArgsConstructor
public class PublicSiteUrlResolver {

    @Value("${app.public-base-url:}")
    private String publicBaseUrl;

    private final AppSettingService appSettingService;

    public String resolveFrontendBaseUrl() {
        if (hasText(publicBaseUrl)) {
            return trimTrailingSlash(publicBaseUrl.trim());
        }
        for (String key : new String[] { "public_base_url", "telegram_webhook_base_url" }) {
            String fromDb = appSettingService.getSettingValueForStore(null, key).orElse("").trim();
            if (hasText(fromDb)) {
                return trimTrailingSlash(fromDb);
            }
        }
        return trimTrailingSlash(inferFromCurrentRequest());
    }

    public String buildStorePaymentReturnUrl(String storeCode, String orderNumber) {
        if (!hasText(storeCode) || !hasText(orderNumber)) {
            return "";
        }
        String base = resolveFrontendBaseUrl();
        if (!hasText(base)) {
            return "";
        }
        String code = storeCode.trim().toLowerCase();
        String order = orderNumber.trim();
        return base + "/" + code + "/paiement/retour?order=" + java.net.URLEncoder.encode(order, java.nio.charset.StandardCharsets.UTF_8);
    }

    /**
     * Page pont : WhatsApp nouvel onglet + vitrine dans l'onglet actuel.
     */
    public String buildStorePaymentWhatsAppBridgeUrl(String storeCode, String orderNumber) {
        if (!hasText(storeCode) || !hasText(orderNumber)) {
            return "";
        }
        String base = resolveFrontendBaseUrl();
        if (!hasText(base)) {
            return "";
        }
        String code = storeCode.trim().toLowerCase();
        String order = orderNumber.trim();
        return base + "/" + code + "/paiement/whatsapp?order=" + java.net.URLEncoder.encode(order, java.nio.charset.StandardCharsets.UTF_8);
    }

    /** URL de retour après checkout YengaPay (redirection serveur → WhatsApp). */
    public String buildYengapayApiReturnUrl() {
        String base = resolveFrontendBaseUrl();
        if (!hasText(base)) {
            return "";
        }
        return base + "/api/public/payments/yengapay/return";
    }

    private static String inferFromCurrentRequest() {
        try {
            if (!(RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs)) {
                return "";
            }
            HttpServletRequest req = attrs.getRequest();
            if (req == null) {
                return "";
            }
            String scheme = firstNonBlank(req.getHeader("X-Forwarded-Proto"), req.getScheme());
            String host = firstNonBlank(req.getHeader("X-Forwarded-Host"), req.getHeader("Host"));
            if (!hasText(scheme) || !hasText(host)) {
                return "";
            }
            if (host.contains("localhost") || host.startsWith("127.0.0.1")) {
                return "";
            }
            return scheme + "://" + host.split(",")[0].trim();
        } catch (Exception ignored) {
            return "";
        }
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (hasText(v)) {
                return v.trim();
            }
        }
        return "";
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String trimTrailingSlash(String url) {
        if (url == null || url.isBlank()) {
            return "";
        }
        String t = url.trim();
        while (t.endsWith("/")) {
            t = t.substring(0, t.length() - 1);
        }
        return t;
    }
}
