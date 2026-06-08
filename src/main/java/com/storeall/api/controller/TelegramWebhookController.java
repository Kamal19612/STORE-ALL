package com.storeall.api.controller;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.storeall.api.config.AppProperties;
import com.storeall.api.entity.Order;
import com.storeall.api.entity.Store;
import com.storeall.api.repository.StoreRepository;
import com.storeall.api.service.AppSettingService;
import com.storeall.api.service.OrderService;
import com.storeall.api.service.TelegramService;
import com.storeall.api.telegram.TelegramCallbackData;
import com.storeall.api.tenant.StoreContext;
import com.storeall.api.tenant.StoreResolverService;

@RestController
@RequestMapping("/api/telegram")
public class TelegramWebhookController {

    private static final Logger log = LoggerFactory.getLogger(TelegramWebhookController.class);

    private final TelegramService telegramService;
    private final OrderService orderService;
    private final AppProperties appProperties;
    private final StoreResolverService storeResolverService;
    private final StoreRepository storeRepository;
    private final AppSettingService appSettingService;

    public TelegramWebhookController(
            TelegramService telegramService,
            OrderService orderService,
            AppProperties appProperties,
            StoreResolverService storeResolverService,
            StoreRepository storeRepository,
            AppSettingService appSettingService) {
        this.telegramService = telegramService;
        this.orderService = orderService;
        this.appProperties = appProperties;
        this.storeResolverService = storeResolverService;
        this.storeRepository = storeRepository;
        this.appSettingService = appSettingService;
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody Map<String, Object> update,
            @RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false) String secretToken) {
        return handleWebhookInternal(update, secretToken);
    }

    /**
     * Webhook scopé boutique (optionnel) : /api/telegram/{storeCode}/webhook
     */
    @PostMapping("/{storeCode}/webhook")
    public ResponseEntity<Void> handleWebhookForStore(
            @PathVariable String storeCode,
            @RequestBody Map<String, Object> update,
            @RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false) String secretToken) {
        try {
            Store store = storeResolverService.resolveByCodeOrDomainOrDefault(storeCode, null);
            StoreContext.set(store);
            return handleWebhookInternal(update, secretToken);
        } finally {
            StoreContext.clear();
        }
    }

    private ResponseEntity<Void> handleWebhookInternal(
            Map<String, Object> update,
            String secretToken) {
        String configuredSecret = telegramService.getWebhookSecret();
        if (configuredSecret != null && !configuredSecret.isBlank()
                && !configuredSecret.equals(secretToken)) {
            log.warn("Webhook Telegram : secret invalide");
            return ResponseEntity.ok().build();
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> callbackQuery = (Map<String, Object>) update.get("callback_query");
        if (callbackQuery != null) {
            handleCallbackQueryAsync(callbackQuery);
            return ResponseEntity.ok().build();
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> message = (Map<String, Object>) update.get("message");
        if (message != null) {
            String text = (String) message.getOrDefault("text", "");
            Long chatId = extractChatId(message);
            handleTextCommandAsync(text.trim(), chatId);
        }

        return ResponseEntity.ok().build();
    }

    @Async("notificationExecutor")
    void handleCallbackQueryAsync(Map<String, Object> callbackQuery) {
        try {
            handleCallbackQuery(callbackQuery);
        } catch (Exception e) {
            log.error("Erreur async callback Telegram: {}", e.toString());
        }
    }

    @Async("notificationExecutor")
    void handleTextCommandAsync(String text, Long chatId) {
        try {
            handleTextCommand(text, chatId);
        } catch (Exception e) {
            log.error("Erreur async commande Telegram: {}", e.toString());
        }
    }

    @SuppressWarnings("unchecked")
    private void handleCallbackQuery(Map<String, Object> callbackQuery) {
        String callbackQueryId = (String) callbackQuery.get("id");
        String data = (String) callbackQuery.get("data");

        var parsedOpt = TelegramCallbackData.parse(data);
        if (parsedOpt.isEmpty()) {
            return;
        }
        var parsed = parsedOpt.get();
        boolean isConfirm = "confirm".equals(parsed.action());
        Long orderId = parsed.orderId();
        Long storeIdFromData = parsed.storeId();

        Map<String, Object> message = (Map<String, Object>) callbackQuery.get("message");
        if (message == null) {
            return;
        }
        Map<String, Object> chat = (Map<String, Object>) message.get("chat");
        Integer messageId = (Integer) message.get("message_id");
        Long chatIdLong = chat != null ? ((Number) chat.get("id")).longValue() : null;

        String emoji = isConfirm ? "✅" : "❌";
        String label = isConfirm ? "VALIDÉE" : "REJETÉE";

        Store previousStore = StoreContext.get();
        Long effectiveStoreId = storeIdFromData;
        try {
            if (effectiveStoreId == null && chatIdLong != null) {
                effectiveStoreId = appSettingService.findStoreByTelegramChatId(String.valueOf(chatIdLong))
                        .map(Store::getId)
                        .orElse(null);
            }
            if (effectiveStoreId != null) {
                storeRepository.findById(effectiveStoreId).ifPresent(StoreContext::set);
            }

            Order order = isConfirm
                    ? orderService.acceptOrderForTelegram(orderId)
                    : orderService.rejectOrderForTelegram(orderId);

            if (effectiveStoreId == null && order.getStore() != null) {
                effectiveStoreId = order.getStore().getId();
            }

            telegramService.answerCallbackQuery(callbackQueryId, emoji + " Commande " + label, effectiveStoreId);

            String originalText = (String) message.get("text");
            String updatedText = originalText + "\n\n" + emoji + " <b>Commande " + label + "</b> par l'admin";
            telegramService.editMessageAfterAction(chatIdLong, messageId, updatedText, effectiveStoreId);

            String whatsappLink = orderService.generateWhatsAppNotificationLink(orderId, null);
            telegramService.sendFollowUpWithWhatsApp(
                    chatIdLong,
                    order.getOrderNumber(),
                    order.getCustomerName(),
                    order.getCustomerPhone(),
                    whatsappLink,
                    isConfirm,
                    effectiveStoreId);

            log.info("Commande {} {} via Telegram (storeId={})", orderId, label, effectiveStoreId);
        } catch (Exception e) {
            String msg = (e.getMessage() == null || e.getMessage().isBlank())
                    ? e.getClass().getSimpleName()
                    : e.getMessage();
            log.error("Erreur traitement callback Telegram pour commande {} : {}", orderId, msg, e);
            telegramService.answerCallbackQuery(callbackQueryId, "⚠️ Erreur : " + msg, effectiveStoreId);
        } finally {
            if (previousStore != null) {
                StoreContext.set(previousStore);
            } else {
                StoreContext.clear();
            }
        }
    }

    private void handleTextCommand(String text, Long chatId) {
        String lower = text.toLowerCase();
        if (!lower.startsWith("/commandes") && !lower.equals("commandes")
                && !lower.startsWith("/aide") && !lower.equals("aide")) {
            return;
        }

        Store previousStore = StoreContext.get();
        try {
            if (chatId != null) {
                appSettingService.findStoreByTelegramChatId(String.valueOf(chatId))
                        .ifPresent(StoreContext::set);
            }

            if (lower.startsWith("/commandes") || lower.equals("commandes")) {
                List<Order> pending = orderService.getLatestPendingOrders();
                String currency = appProperties.getCurrency() != null ? appProperties.getCurrency() : "FCFA";
                telegramService.sendPendingOrdersMenu(pending, currency);
            } else {
                telegramService.sendText(
                        "🤖 <b>Commandes disponibles</b>\n\n"
                        + "/commandes — Voir les commandes en attente\n"
                        + "/aide — Afficher cette aide\n\n"
                        + "Les nouvelles commandes arrivent automatiquement avec les boutons "
                        + "✅ <b>VALIDER</b> / ❌ <b>ANNULER</b>\n\n"
                        + "Après chaque action, un bouton 💬 <b>WhatsApp</b> vous permet de notifier "
                        + "le client directement sans vous connecter au panneau admin.");
            }
        } finally {
            if (previousStore != null) {
                StoreContext.set(previousStore);
            } else {
                StoreContext.clear();
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static Long extractChatId(Map<String, Object> message) {
        Object chat = message.get("chat");
        if (!(chat instanceof Map<?, ?> chatMap)) {
            return null;
        }
        Object id = chatMap.get("id");
        return id instanceof Number n ? n.longValue() : null;
    }
}
