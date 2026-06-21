package com.storeall.api.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

import com.storeall.api.entity.Order;
import com.storeall.api.entity.OrderItem;
import com.storeall.api.entity.Store;
import com.storeall.api.repository.AppSettingRepository;
import com.storeall.api.repository.OrderRepository;
import com.storeall.api.repository.StoreRepository;
import com.storeall.api.util.PdfFieldValuesFormatter;
import com.storeall.api.service.AppSettingService.ResolvedTelegramChatId;
import com.storeall.api.service.AppSettingService.TelegramChatIdSource;
import com.storeall.api.telegram.TelegramCallbackData;

@Service
public class TelegramService {

    private static final Logger log = LoggerFactory.getLogger(TelegramService.class);
    private static final String TELEGRAM_API = "https://api.telegram.org/bot";

    @Value("${app.telegram.bot-token:}")
    private String botToken;

    @Value("${app.telegram.chat-id:}")
    private String defaultChatId;

    @Value("${app.public-base-url:}")
    private String publicBaseUrl;

    @Autowired
    private AppSettingService appSettingService;

    @Autowired
    private AppSettingRepository appSettingRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private OrderRepository orderRepository;

    record TelegramConfig(String token, String chatId, Source source) {
        enum Source { RESOLVED, ENV }
        boolean isComplete() { return token != null && !token.isBlank() && chatId != null && !chatId.isBlank(); }
    }

    /** Chemin webhook lorsqu'un seul bot sert toutes les boutiques (chat_id différent par boutique). */
    public static final String SHARED_BOT_WEBHOOK_PATH = "/api/telegram/webhook";

    /**
     * Config Telegram : token (boutique → global → ENV), chat (boutique → défaut global → ENV).
     */
    TelegramConfig resolveConfigForStore(Long storeId) {
        String token = "";
        String chatId = "";
        TelegramChatIdSource chatSource = TelegramChatIdSource.NONE;
        if (appSettingService != null) {
            token = appSettingService.resolveTelegramBotTokenForStore(storeId).orElse("").trim();
            var chatResolved = appSettingService.resolveTelegramChatIdForStoreDetailed(storeId);
            if (chatResolved.isPresent()) {
                chatId = chatResolved.get().chatId();
                chatSource = chatResolved.get().source();
            }
        }
        TelegramConfig env = resolveEnvConfig();
        if (token.isBlank()) {
            token = env.token();
        }
        // Ne pas remplacer un chat boutique résolu par le chat .env (souvent le défaut global).
        if (chatId.isBlank()) {
            chatId = env.chatId();
            if (!chatId.isBlank() && chatSource == TelegramChatIdSource.NONE) {
                chatSource = TelegramChatIdSource.GLOBAL_DEFAULT;
            }
        }
        if (!token.isBlank() && !chatId.isBlank()) {
            boolean fromEnv = env.token().equals(token)
                && env.chatId().equals(chatId)
                && chatSource == TelegramChatIdSource.NONE;
            return new TelegramConfig(token, chatId, fromEnv ? TelegramConfig.Source.ENV : TelegramConfig.Source.RESOLVED);
        }
        return env;
    }

    private TelegramConfig resolveConfigPreferDb() {
        return resolveConfigForStore(com.storeall.api.tenant.StoreContext.getStoreIdOrNull());
    }

    private TelegramConfig resolveConfigForStoreOrContext(Long storeId) {
        TelegramConfig cfg = resolveConfigForStore(storeId);
        return cfg.isComplete() ? cfg : resolveEnvConfig();
    }

    private TelegramConfig resolveEnvConfig() {
        return new TelegramConfig(
            botToken == null ? "" : botToken.trim(),
            defaultChatId == null ? "" : defaultChatId.trim(),
            TelegramConfig.Source.ENV
        );
    }

    private String botTokenForStore(Long storeId) {
        return resolveConfigForStoreOrContext(storeId).token();
    }

    @Value("${app.telegram.webhook-url:}")
    private String webhookUrl;

    @Value("${app.telegram.webhook-secret:}")
    private String webhookSecret;

    private final RestTemplate restTemplate = new RestTemplate();

    public record WebhookRegistrationResult(boolean attempted, boolean success, String message) {}

    public boolean isConfigured() {
        TelegramConfig cfg = resolveConfigPreferDb();
        return cfg.isComplete();
    }

    /**
     * Vérifie uniquement la validité du bot token via getMe.
     * Ne requiert pas chat_id, ce qui évite les faux négatifs (bot pas dans le chat).
     */
    public boolean healthCheckTokenOnly() {
        TelegramConfig cfg = resolveConfigPreferDb();
        if (cfg.token() == null || cfg.token().isBlank()) return false;
        try {
            String url = TELEGRAM_API + cfg.token() + "/getMe";
            String resp = restTemplate.getForObject(url, String.class);
            return resp != null && resp.contains("\"ok\":true");
        } catch (Exception e) {
            return false;
        }
    }

    // --- Enregistrement du webhook au démarrage ---

    @EventListener(ApplicationReadyEvent.class)
    public void registerWebhookOnStartup() {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            log.info("Telegram webhook non enregistré (TELEGRAM_WEBHOOK_URL manquant)");
            return;
        }
        int registered = registerAllStoreWebhooks();
        if (registered == 0) {
            WebhookRegistrationResult res = registerWebhookNow();
            if (!res.attempted()) {
                log.info("Telegram webhook non enregistré (aucun bot-token configuré)");
            } else if (res.success()) {
                log.info("Telegram webhook (défaut) enregistré : {}", res.message());
            } else {
                log.warn("Échec enregistrement webhook Telegram (défaut) : {}", res.message());
            }
        }
    }

    /**
     * Enregistre le webhook pour chaque token bot distinct.
     * Un bot partagé → une seule URL {@link #SHARED_BOT_WEBHOOK_PATH} ; la boutique est résolue via {@code chat_id}.
     */
    public int registerAllStoreWebhooks() {
        String base = resolveWebhookBaseUrl();
        if (base.isBlank() || storeRepository == null) {
            return 0;
        }
        java.util.Map<String, WebhookTarget> byToken = new java.util.LinkedHashMap<>();
        for (Store store : storeRepository.findAll()) {
            if (!store.isActive()) {
                continue;
            }
            TelegramConfig cfg = resolveConfigForStore(store.getId());
            if (!cfg.isComplete()) {
                continue;
            }
            byToken.compute(cfg.token(), (token, existing) -> {
                if (existing == null) {
                    var list = new java.util.ArrayList<Store>();
                    list.add(store);
                    return new WebhookTarget(cfg.token(), list);
                }
                existing.stores().add(store);
                return existing;
            });
        }
        int ok = 0;
        for (WebhookTarget target : byToken.values()) {
            WebhookRegistrationResult res = registerWebhookForToken(target.token(), target.stores());
            if (res.attempted() && res.success()) {
                ok++;
            } else if (res.attempted()) {
                log.warn("Échec webhook Telegram token=…{} : {}",
                    target.token().length() > 6 ? target.token().substring(target.token().length() - 6) : "?",
                    res.message());
            }
        }
        if (ok > 0) {
            log.info("Telegram : {} webhook(s) enregistré(s) pour {} bot(s)", ok, byToken.size());
        }
        return ok;
    }

    private record WebhookTarget(String token, List<Store> stores) {}

    private WebhookRegistrationResult registerWebhookForToken(String token, List<Store> stores) {
        if (token == null || token.isBlank() || webhookUrl == null || webhookUrl.isBlank()) {
            return new WebhookRegistrationResult(false, false, "missing_token_or_webhook_url");
        }
        if (stores.size() > 1) {
            log.info(
                "Bot Telegram partagé — webhook {} pour les boutiques {}",
                SHARED_BOT_WEBHOOK_PATH,
                stores.stream().map(Store::getCode).toList());
        }
        return postSetWebhook(token, trimTrailingSlash(webhookUrl) + SHARED_BOT_WEBHOOK_PATH);
    }

    private WebhookRegistrationResult postSetWebhook(String token, String fullUrl) {
        try {
            String apiSetWebhook = TELEGRAM_API + token + "/setWebhook";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> body = new HashMap<>();
            body.put("url", fullUrl);
            if (webhookSecret != null && !webhookSecret.isBlank()) {
                body.put("secret_token", webhookSecret);
            }
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            String response = restTemplate.postForObject(apiSetWebhook, request, String.class);
            return new WebhookRegistrationResult(true, true, response == null ? "" : response);
        } catch (Exception e) {
            return new WebhookRegistrationResult(true, false, e.getMessage() == null ? e.toString() : e.getMessage());
        }
    }

    /**
     * URL de base publique (HTTPS) pour enregistrer le webhook Telegram.
     * Ordre : TELEGRAM_WEBHOOK_URL → APP_PUBLIC_URL → app_settings → requête HTTPS courante.
     */
    public String resolveWebhookBaseUrl() {
        if (webhookUrl != null && !webhookUrl.isBlank()) {
            return trimTrailingSlash(webhookUrl);
        }
        if (publicBaseUrl != null && !publicBaseUrl.isBlank()) {
            return trimTrailingSlash(publicBaseUrl);
        }
        if (appSettingRepository != null) {
            for (String key : List.of("telegram_webhook_base_url", "public_base_url")) {
                String fromDb = appSettingRepository.findByKeyAndStoreIsNull(key)
                        .map(a -> a.getValue() == null ? "" : a.getValue().trim())
                        .orElse("");
                if (!fromDb.isBlank()) {
                    return trimTrailingSlash(fromDb);
                }
            }
        }
        String fromRequest = inferPublicBaseUrlFromCurrentRequest();
        if (!fromRequest.isBlank()) {
            return fromRequest;
        }
        return "";
    }

    /**
     * Déduit l'URL publique depuis la requête HTTP courante (reverse-proxy : X-Forwarded-*).
     * Permet d'enregistrer le webhook depuis l'admin sans variable d'environnement si l'API est joignable en HTTPS.
     */
    private String inferPublicBaseUrlFromCurrentRequest() {
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
            if (host == null || host.isBlank()) {
                int port = req.getServerPort();
                boolean defaultPort = ("https".equalsIgnoreCase(scheme) && port == 443)
                        || ("http".equalsIgnoreCase(scheme) && port == 80);
                host = defaultPort ? req.getServerName() : req.getServerName() + ":" + port;
            }
            if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
                return "";
            }
            if (!"https".equalsIgnoreCase(scheme)) {
                log.debug("Webhook Telegram : schéma {} non HTTPS, inférence ignorée pour {}", scheme, host);
                return "";
            }
            return trimTrailingSlash(scheme + "://" + host.split(",")[0].trim());
        } catch (Exception e) {
            return "";
        }
    }

    private static String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }

    private static String trimTrailingSlash(String url) {
        if (url == null) {
            return "";
        }
        String s = url.trim();
        while (s.endsWith("/")) {
            s = s.substring(0, s.length() - 1);
        }
        return s;
    }

    /** Enregistre (ou met à jour) le webhook Telegram immédiatement. */
    /**
     * Enregistre (ou met à jour) le webhook Telegram — même logique que {@code STORE} ({@code setWebhook} avec
     * {@code TELEGRAM_WEBHOOK_URL + chemin}).
     */
    public WebhookRegistrationResult registerWebhookNow() {
        Long storeId = com.storeall.api.tenant.StoreContext.getStoreIdOrNull();
        TelegramConfig cfg = resolveConfigForStoreOrContext(storeId);
        if (!cfg.isComplete() || webhookUrl == null || webhookUrl.isBlank()) {
            return new WebhookRegistrationResult(false, false, "missing_token_or_webhook_url");
        }
        return postSetWebhook(cfg.token(), trimTrailingSlash(webhookUrl) + SHARED_BOT_WEBHOOK_PATH);
    }

    /**
     * Retourne l'état du webhook côté Telegram (getWebhookInfo).
     * Sert au debug quand les boutons ne déclenchent rien.
     */
    public String getWebhookInfoRaw() {
        String effectiveToken = botTokenForStore(com.storeall.api.tenant.StoreContext.getStoreIdOrNull());
        if (effectiveToken == null || effectiveToken.isBlank()) {
            return "{\"ok\":false,\"error\":\"missing_bot_token\"}";
        }
        try {
            String url = TELEGRAM_API + effectiveToken + "/getWebhookInfo";
            String resp = restTemplate.getForObject(url, String.class);
            return resp == null ? "" : resp;
        } catch (Exception e) {
            return "{\"ok\":false,\"error\":\"" + escapeForJson(e.getMessage()) + "\"}";
        }
    }

    /**
     * Désactive le webhook Telegram (setWebhook url="").
     */
    public WebhookRegistrationResult unregisterWebhookNow() {
        String effectiveToken = botTokenForStore(com.storeall.api.tenant.StoreContext.getStoreIdOrNull());
        if (effectiveToken == null || effectiveToken.isBlank()) {
            return new WebhookRegistrationResult(false, false, "missing_bot_token");
        }
        try {
            String url = TELEGRAM_API + effectiveToken + "/setWebhook";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> body = new HashMap<>();
            body.put("url", "");
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            String response = restTemplate.postForObject(url, request, String.class);
            return new WebhookRegistrationResult(true, true, response == null ? "" : response);
        } catch (Exception e) {
            return new WebhookRegistrationResult(true, false, e.getMessage() == null ? e.toString() : e.getMessage());
        }
    }

    /**
     * Envoie un message de test (permet de valider token + chat_id sans attendre une commande).
     */
    public void sendTestMessage(String text) {
        String msg = (text == null || text.isBlank()) ? "✅ Test Telegram OK" : text;
        sendText("🧪 <b>Test</b>\n" + escapeHtml(msg));
    }

    private String escapeForJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    // --- Notification nouvelle commande avec boutons ---

    public void sendNewOrderNotification(Order order, String currency) {
        Long storeId = resolveOrderStoreId(order);
        TelegramConfig cfg = resolveConfigForStore(storeId);
        var chatDetail = appSettingService != null
            ? appSettingService.resolveTelegramChatIdForStoreDetailed(storeId)
            : java.util.Optional.<ResolvedTelegramChatId>empty();

        // Garantie métier : ID fiche boutique (stores.telegram_id) prioritaire sur le défaut global.
        if (storeId != null && storeRepository != null) {
            var storeTelegramId = storeRepository.findById(storeId)
                .map(Store::getTelegramId)
                .filter(v -> v != null && !v.isBlank())
                .map(String::trim);
            if (storeTelegramId.isPresent()) {
                String token = cfg.token();
                if (token.isBlank() && appSettingService != null) {
                    token = appSettingService.resolveTelegramBotTokenForStore(storeId).orElse("").trim();
                }
                if (token.isBlank()) {
                    token = resolveEnvConfig().token();
                }
                cfg = new TelegramConfig(token, storeTelegramId.get(), TelegramConfig.Source.RESOLVED);
                chatDetail = java.util.Optional.of(
                    new ResolvedTelegramChatId(storeTelegramId.get(), TelegramChatIdSource.STORE_ENTITY));
            }
        }

        if (!cfg.isComplete()) {
            log.warn(
                "Telegram non configuré pour boutique storeId={} — notification ignorée pour commande {}",
                storeId, order.getOrderNumber());
            return;
        }
        log.info(
            "[telegram] order={} storeId={} chatSource={} chatSuffix={}",
            order.getOrderNumber(),
            storeId,
            chatDetail.map(ResolvedTelegramChatId::source).orElse(TelegramChatIdSource.NONE),
            maskChatIdSuffix(cfg.chatId()));
        String message = buildNewOrderMessage(order, currency, storeId);
        sendMessageWithButtons(cfg, message, storeId, order.getId(), order.getOrderNumber());
    }

    private Long resolveOrderStoreId(Order order) {
        if (order == null) {
            return com.storeall.api.tenant.StoreContext.getStoreIdOrNull();
        }
        if (order.getStore() != null && order.getStore().getId() != null) {
            return order.getStore().getId();
        }
        Long fromContext = com.storeall.api.tenant.StoreContext.getStoreIdOrNull();
        if (fromContext != null) {
            return fromContext;
        }
        if (order.getId() != null && orderRepository != null) {
            return orderRepository.findById(order.getId())
                .map(Order::getStore)
                .map(Store::getId)
                .orElse(null);
        }
        return null;
    }

    private static String maskChatIdSuffix(String chatId) {
        if (chatId == null || chatId.isBlank()) {
            return "—";
        }
        String s = chatId.trim();
        return s.length() <= 4 ? "****" : ("…" + s.substring(s.length() - 4));
    }

    /**
     * Envoie le message Telegram ; lève une exception si l'envoi échoue définitivement
     * (permet à l'outbox / NotificationRunner de marquer FAIL et relancer).
     */
    private void sendMessageWithButtons(TelegramConfig cfg, String text, Long storeId, Long orderId, String orderNumber) {
        try {
            postSendMessageWithButtons(cfg, text, storeId, orderId, orderNumber);
            log.info("[NOTIF] channel=TELEGRAM order={} status=SUCCESS", orderNumber);
        } catch (HttpStatusCodeException e) {
            HttpStatusCode status = e.getStatusCode();
            String responseBody = e.getResponseBodyAsString();
            log.warn("[NOTIF] channel=TELEGRAM order={} status=FAIL error=http_{} body={}",
                orderNumber, status.value(), responseBody);

            throw new RuntimeException("Telegram sendMessage failed: HTTP " + status.value() + " " + responseBody, e);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            log.warn("[NOTIF] channel=TELEGRAM order={} status=FAIL error={}", orderNumber, e.toString());
            throw new RuntimeException("Telegram sendMessage failed: " + e.getMessage(), e);
        }
    }

    private void postSendMessageWithButtons(TelegramConfig cfg, String text, Long storeId, Long orderId, String orderNumber) {
        String url = TELEGRAM_API + cfg.token() + "/sendMessage";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        String confirmData = storeId != null
            ? TelegramCallbackData.encodeConfirm(storeId, orderId)
            : ("confirm_" + orderId);
        String cancelData = storeId != null
            ? TelegramCallbackData.encodeCancel(storeId, orderId)
            : ("cancel_" + orderId);

        Map<String, Object> body = new HashMap<>();
        body.put("chat_id", cfg.chatId());
        body.put("text", text);
        body.put("parse_mode", "HTML");
        body.put("reply_markup", Map.of(
            "inline_keyboard", List.of(
                List.of(
                    Map.of("text", "✅ VALIDER", "callback_data", confirmData),
                    Map.of("text", "❌ ANNULER", "callback_data", cancelData)
                )
            )
        ));

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        restTemplate.postForObject(url, request, String.class);
    }

    // --- Répondre à un clic de bouton (retire le spinner Telegram) ---

    public void answerCallbackQuery(String callbackQueryId, String text) {
        answerCallbackQuery(callbackQueryId, text, com.storeall.api.tenant.StoreContext.getStoreIdOrNull());
    }

    public void answerCallbackQuery(String callbackQueryId, String text, Long storeId) {
        try {
            String effectiveToken = botTokenForStore(storeId);
            String url = TELEGRAM_API + effectiveToken + "/answerCallbackQuery";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = new HashMap<>();
            body.put("callback_query_id", callbackQueryId);
            body.put("text", text);
            body.put("show_alert", false);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            restTemplate.postForObject(url, request, String.class);
        } catch (HttpStatusCodeException e) {
            HttpStatusCode status = e.getStatusCode();
            String responseBody = e.getResponseBodyAsString();
            log.warn("Échec answerCallbackQuery (status {}): {}", status.value(), responseBody);
        } catch (Exception e) {
            log.warn("Échec answerCallbackQuery : {}", e.getMessage());
        }
    }

    // --- Mettre à jour le message après action (remplace les boutons par le résultat) ---

    public void editMessageAfterAction(Long chatIdLong, Integer messageId, String newText) {
        editMessageAfterAction(chatIdLong, messageId, newText, com.storeall.api.tenant.StoreContext.getStoreIdOrNull());
    }

    public void editMessageAfterAction(Long chatIdLong, Integer messageId, String newText, Long storeId) {
        try {
            String effectiveToken = botTokenForStore(storeId);
            String url = TELEGRAM_API + effectiveToken + "/editMessageText";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> body = new HashMap<>();
            body.put("chat_id", chatIdLong);
            body.put("message_id", messageId);
            body.put("text", newText);
            body.put("parse_mode", "HTML");

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            restTemplate.postForObject(url, request, String.class);
        } catch (HttpStatusCodeException e) {
            HttpStatusCode status = e.getStatusCode();
            String responseBody = e.getResponseBodyAsString();
            log.warn("Échec editMessageText (status {}): {}", status.value(), responseBody);
        } catch (Exception e) {
            log.warn("Échec editMessageText : {}", e.getMessage());
        }
    }

    // --- Envoi d'un message texte simple ---

    public void sendText(String text) {
        Long storeId = com.storeall.api.tenant.StoreContext.getStoreIdOrNull();
        TelegramConfig cfg = resolveConfigForStoreOrContext(storeId);
        if (!cfg.isComplete()) {
            return;
        }
        try {
            String url = TELEGRAM_API + cfg.token() + "/sendMessage";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> body = new HashMap<>();
            body.put("chat_id", cfg.chatId());
            body.put("text", text);
            body.put("parse_mode", "HTML");
            restTemplate.postForObject(url, new HttpEntity<>(body, headers), String.class);
        } catch (HttpStatusCodeException e) {
            HttpStatusCode status = e.getStatusCode();
            String responseBody = e.getResponseBodyAsString();
            log.warn("Échec sendText Telegram (status {}): {}", status.value(), responseBody);
        } catch (Exception e) {
            log.warn("Échec sendText Telegram : {}", e.getMessage());
        }
    }

    // --- Suivi WhatsApp après validation/annulation ---

    /**
     * Envoie un message de suivi dans Telegram après une action sur une commande,
     * avec un bouton inline qui ouvre directement WhatsApp pour notifier le client.
     */
    public void sendFollowUpWithWhatsApp(Long chatId, String orderNumber, String customerName,
                                         String customerPhone, String whatsappLink, boolean isConfirmed) {
        sendFollowUpWithWhatsApp(chatId, orderNumber, customerName, customerPhone, whatsappLink, isConfirmed,
            com.storeall.api.tenant.StoreContext.getStoreIdOrNull());
    }

    public void sendFollowUpWithWhatsApp(Long chatId, String orderNumber, String customerName,
                                         String customerPhone, String whatsappLink, boolean isConfirmed, Long storeId) {
        try {
            String effectiveToken = botTokenForStore(storeId);
            String url = TELEGRAM_API + effectiveToken + "/sendMessage";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            String statusEmoji = isConfirmed ? "✅" : "❌";
            String statusLabel = isConfirmed ? "Confirmée" : "Annulée";

            String text = "📱 <b>Notifier le client</b>\n\n"
                + "Commande : <code>" + escapeHtml(orderNumber) + "</code> — " + escapeHtml(customerName) + "\n"
                + "Tel : " + escapeHtml(customerPhone) + "\n"
                + "Statut : " + statusEmoji + " <b>" + statusLabel + "</b>\n\n"
                + "Appuyez sur le bouton pour envoyer le message au client via WhatsApp :";

            Map<String, Object> body = new HashMap<>();
            body.put("chat_id", chatId);
            body.put("text", text);
            body.put("parse_mode", "HTML");
            body.put("reply_markup", Map.of(
                "inline_keyboard", List.of(
                    List.of(
                        Map.of("text", "💬 Notifier le client", "url", whatsappLink)
                    )
                )
            ));

            restTemplate.postForObject(url, new HttpEntity<>(body, headers), String.class);
            log.debug("Follow-up WhatsApp Telegram envoyé pour commande {}", orderNumber);
        } catch (HttpStatusCodeException e) {
            HttpStatusCode status = e.getStatusCode();
            String responseBody = e.getResponseBodyAsString();
            log.warn("Échec follow-up WhatsApp Telegram (status {}): {}", status.value(), responseBody);
        } catch (Exception e) {
            log.warn("Échec follow-up WhatsApp Telegram : {}", e.getMessage());
        }
    }

    // --- Liste des commandes en attente ---

    /**
     * Envoie la liste des commandes PENDING avec boutons VALIDER/ANNULER pour chacune.
     */
    public void sendPendingOrdersMenu(List<Order> orders, String currency) {
        Long storeId = com.storeall.api.tenant.StoreContext.getStoreIdOrNull();
        TelegramConfig cfg = resolveConfigForStoreOrContext(storeId);
        if (!cfg.isComplete()) {
            return;
        }
        try {
            if (orders.isEmpty()) {
                sendText("✅ Aucune commande en attente pour le moment.");
                return;
            }

            String url = TELEGRAM_API + cfg.token() + "/sendMessage";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            String storeLabel = resolveStoreLabel(storeId);
            StringBuilder sb = new StringBuilder();
            sb.append("📋 <b>Commandes en attente</b>");
            if (!storeLabel.isBlank()) {
                sb.append(" — ").append(escapeHtml(storeLabel));
            }
            sb.append(" (").append(orders.size()).append(")\n\n");

            List<List<Map<String, String>>> keyboard = new java.util.ArrayList<>();

            for (int i = 0; i < orders.size(); i++) {
                Order o = orders.get(i);
                Long orderStoreId = o.getStore() != null ? o.getStore().getId() : storeId;
                sb.append(i + 1).append(". <code>").append(escapeHtml(o.getOrderNumber())).append("</code> — ")
                  .append(escapeHtml(o.getCustomerName()))
                  .append(" — ").append(o.getTotal()).append(" ").append(escapeHtml(currency));
                if (o.isPickup()) {
                    sb.append(" 🏪");
                } else if (o.getDeliveryType() != null) {
                    String t = "EXPRESS".equals(o.getDeliveryType()) ? " ⚡" : " 🕐";
                    sb.append(t);
                }
                sb.append("\n");

                String confirmData = orderStoreId != null
                    ? TelegramCallbackData.encodeConfirm(orderStoreId, o.getId())
                    : ("confirm_" + o.getId());
                String cancelData = orderStoreId != null
                    ? TelegramCallbackData.encodeCancel(orderStoreId, o.getId())
                    : ("cancel_" + o.getId());
                keyboard.add(List.of(
                    Map.of("text", "✅ " + o.getOrderNumber(), "callback_data", confirmData),
                    Map.of("text", "❌ " + o.getOrderNumber(), "callback_data", cancelData)
                ));
            }

            Map<String, Object> body = new HashMap<>();
            body.put("chat_id", cfg.chatId());
            body.put("text", sb.toString());
            body.put("parse_mode", "HTML");
            body.put("reply_markup", Map.of("inline_keyboard", keyboard));

            restTemplate.postForObject(url, new HttpEntity<>(body, headers), String.class);
        } catch (HttpStatusCodeException e) {
            HttpStatusCode status = e.getStatusCode();
            String responseBody = e.getResponseBodyAsString();
            log.warn("Échec sendPendingOrdersMenu Telegram (status {}): {}", status.value(), responseBody);
        } catch (Exception e) {
            log.warn("Échec sendPendingOrdersMenu Telegram : {}", e.getMessage());
        }
    }

    // --- Construction du message ---

    private String resolveStoreLabel(Long storeId) {
        if (storeId == null) {
            return "";
        }
        String name = appSettingService != null
            ? appSettingService.getSettingValueForStore(storeId, "store_name").orElse("")
            : "";
        String code = "";
        if (storeRepository != null) {
            var storeOpt = storeRepository.findById(storeId);
            if (name.isBlank()) {
                name = storeOpt.map(Store::getName).orElse("");
            }
            code = storeOpt.map(Store::getCode).orElse("");
        }
        if (name.isBlank() && code.isBlank()) {
            return "ID " + storeId;
        }
        if (code.isBlank()) {
            return name;
        }
        return name.isBlank() ? code : (name + " (" + code + ")");
    }

    private String resolvePickupMapsUrl(Long storeId) {
        if (storeId != null && storeRepository != null) {
            String maps = storeRepository.findById(storeId).map(Store::getMapsUrl).orElse("");
            if (maps != null && !maps.isBlank()) {
                return maps.trim();
            }
        }
        if (appSettingService != null && storeId != null) {
            return appSettingService.getSettingValueForStore(storeId, "store_location").orElse("").trim();
        }
        if (appSettingService != null) {
            return appSettingService.getSettingValue("store_location").orElse("").trim();
        }
        return "";
    }

    private String buildNewOrderMessage(Order order, String currency, Long storeId) {
        StringBuilder sb = new StringBuilder();
        sb.append(order.isPickup()
            ? "🏪 <b>RETRAIT EN BOUTIQUE</b>\n"
            : "🛒 <b>NOUVELLE COMMANDE</b>\n");
        String storeLabel = resolveStoreLabel(storeId);
        if (!storeLabel.isBlank()) {
            sb.append("🏪 <b>Boutique :</b> ").append(escapeHtml(storeLabel));
            if (storeId != null) {
                sb.append(" · id=").append(storeId);
            }
            sb.append("\n");
        }
        sb.append("\n");
        sb.append("📋 N° : <code>").append(escapeHtml(order.getOrderNumber())).append("</code>\n");
        sb.append("👤 Client : ").append(escapeHtml(order.getCustomerName())).append("\n");
        sb.append("📞 Tel : ").append(escapeHtml(order.getCustomerPhone())).append("\n");

        if (order.isPickup()) {
            sb.append("🏪 Mode : <b>Retrait en boutique</b>\n");
            Long sid = resolveOrderStoreId(order);
            String maps = resolvePickupMapsUrl(sid);
            if (!maps.isBlank()) {
                sb.append("🗺 <a href=\"")
                    .append(escapeHtml(maps))
                    .append("\">Lieu de retrait</a>\n");
            }
        } else {
            sb.append("📍 Adresse : ").append(escapeHtml(order.getCustomerAddress())).append("\n");
        }

        if (!order.isPickup() && order.getDeliveryType() != null) {
            String typeLabel = switch (order.getDeliveryType()) {
                case "EXPRESS" -> "⚡ Express";
                case "PROGRAMMER" -> "🕐 Programmée";
                default -> escapeHtml(order.getDeliveryType());
            };
            sb.append("🚚 Livraison : ").append(typeLabel);
            if ("PROGRAMMER".equals(order.getDeliveryType()) && order.getScheduledTime() != null) {
                sb.append(" à ").append(escapeHtml(order.getScheduledTime()));
            }
            sb.append("\n");
        }

        if (!order.isPickup()) {
            if (order.getCustomerLatitude() != null && order.getCustomerLongitude() != null) {
                sb.append("🗺 <a href=\"https://www.google.com/maps?q=")
                  .append(order.getCustomerLatitude()).append(",").append(order.getCustomerLongitude())
                  .append("\">Voir sur Maps</a>\n");
            } else if (order.getManualLocationLink() != null && !order.getManualLocationLink().isBlank()) {
                sb.append("🗺 <a href=\"").append(escapeHtml(order.getManualLocationLink())).append("\">Voir sur Maps</a>\n");
            }
        }

        if (order.getCustomerNotes() != null && !order.getCustomerNotes().isBlank()) {
            sb.append("📝 Notes : ").append(escapeHtml(order.getCustomerNotes())).append("\n");
        }

        sb.append("\n<b>Articles :</b>\n");
        for (OrderItem item : order.getItems()) {
            sb.append("  • ").append(item.getQuantity()).append("x ")
              .append(escapeHtml(item.getProduct().getName()))
              .append(" — ").append(item.getTotalPrice()).append(" ").append(escapeHtml(currency)).append("\n");
            PdfFieldValuesFormatter.appendHtmlItemDetails(
                    sb,
                    item.getProduct().getName(),
                    PdfFieldValuesFormatter.parse(item.getPdfFieldValues()));
        }

        sb.append("\n💰 <b>Total : ").append(order.getTotal()).append(" ").append(escapeHtml(currency)).append("</b>");

        if (order.getConfirmationCode() != null && !order.getConfirmationCode().isBlank()) {
            sb.append("\n🔑 Code client : <code>")
                .append(escapeHtml(order.getConfirmationCode()))
                .append("</code>");
            if (order.isPickup()) {
                sb.append(" (retrait boutique)");
            }
        }

        return sb.toString();
    }

    // Échappe les caractères spéciaux HTML pour Telegram parse_mode=HTML
    private String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;");
    }

    public String getWebhookSecret() {
        return webhookSecret;
    }
}