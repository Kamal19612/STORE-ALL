package com.storeall.api.service;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.storeall.api.config.AppProperties;
import com.storeall.api.dto.OrderItemRequest;
import com.storeall.api.dto.OrderRequest;
import com.storeall.api.dto.OrderResponse;
import com.storeall.api.entity.FulfillmentType;
import com.storeall.api.entity.Order;
import com.storeall.api.entity.OrderItem;
import com.storeall.api.entity.OrderStatusHistory;
import com.storeall.api.entity.Product;
import com.storeall.api.entity.Store;
import com.storeall.api.entity.DeliveryAssignment;
import com.storeall.api.notification.NotificationChannel;
import com.storeall.api.notification.NotificationRunner;
import com.storeall.api.repository.OrderRepository;
import com.storeall.api.repository.OrderStatusHistoryRepository;
import com.storeall.api.repository.ProductRepository;
import com.storeall.api.entity.NotificationOutbox;
import com.storeall.api.tenant.StoreContext;

/**
 * Service gérant la logique métier pour les commandes (Checkout).
 */
@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private OrderStatusHistoryRepository statusHistoryRepository;

    @Autowired
    private AppProperties appProperties;

    @Autowired
    private AppSettingService appSettingService;

    @Autowired
    private com.storeall.api.repository.UserRepository userRepository;

    @Autowired
    private com.storeall.api.repository.StoreRepository storeRepository;

    @Autowired
    private com.storeall.api.repository.DeliveryAssignmentRepository deliveryAssignmentRepository;

    @Autowired
    private NotificationRunner notificationRunner;

    @Autowired
    private NotificationOutboxService notificationOutboxService;

    @Autowired
    @Lazy
    private NotificationService notificationService;

    @Autowired
    @Lazy
    private WebPushService webPushService;

    @Autowired
    @Lazy
    private TelegramService telegramService;

    @Autowired(required = false)
    @Lazy
    private FcmService fcmService;

    // Livraison mobile: lecture directe Supabase (Auth + RPC).

    /**
     * Traite une nouvelle commande invité. 1. Vérifie le stock. 2. Crée la
     * commande et les lignes. 3. Décrémente le stock. 4. Génère le lien
     * WhatsApp.
     */
    @Transactional
    public OrderResponse createOrder(OrderRequest request) {
        Long storeId = StoreContext.getStoreIdOrNull();
        FulfillmentType fulfillment = FulfillmentType.fromRequest(request.getFulfillmentType());

        if (fulfillment.isPickup()) {
            if (request.getCustomerName() == null || request.getCustomerName().isBlank()) {
                throw new RuntimeException("Le nom est obligatoire");
            }
            if (request.getCustomerPhone() == null || request.getCustomerPhone().isBlank()) {
                throw new RuntimeException("Le téléphone est obligatoire");
            }
        } else if (request.getCustomerAddress() == null || request.getCustomerAddress().isBlank()) {
            throw new RuntimeException("L'adresse est obligatoire pour une livraison");
        }

        // 1. Générer un numéro de commande unique (ex: ORD-171569854)
        String orderNumber = "ORD-" + System.currentTimeMillis();

        // 2. Générer un code de confirmation unique (ex: CONF-1234)
        String confirmationCode = generateConfirmationCode();

        // Extraction des coordonnées si le lien est présent mais pas les coordonnées
        BigDecimal lat = request.getCustomerLatitude();
        BigDecimal lng = request.getCustomerLongitude();
        if ((lat == null || lng == null) && request.getManualLocationLink() != null) {
            BigDecimal[] coords = extractCoordinatesFromLink(request.getManualLocationLink());
            if (coords != null) {
                lat = coords[0];
                lng = coords[1];
            }
        }

        // 3. Initialiser la commande
        Order order = Order.builder()
                .store(com.storeall.api.entity.Store.builder().id(storeId).build())
                .orderNumber(orderNumber)
                .confirmationCode(confirmationCode)
                .fulfillmentType(fulfillment)
                .customerName(request.getCustomerName())
                .customerPhone(request.getCustomerPhone())
                .customerAddress(fulfillment.isPickup() ? "Retrait en boutique" : request.getCustomerAddress())
                .customerNotes(request.getCustomerNotes())
                .customerLatitude(fulfillment.isPickup() ? null : lat)
                .customerLongitude(fulfillment.isPickup() ? null : lng)
                .deliveryType(fulfillment.isPickup() ? null : request.getDeliveryType())
                .scheduledTime(fulfillment.isPickup() ? null : request.getScheduledTime())
                .manualLocationLink(fulfillment.isPickup() ? null : request.getManualLocationLink())
                .deliveryCost(fulfillment.isPickup() ? BigDecimal.ZERO : request.getDeliveryCost())
                .distance(fulfillment.isPickup() ? null : request.getDistance())
                .status(Order.Status.PENDING)
                .items(new ArrayList<>())
                .subtotal(BigDecimal.ZERO)
                .total(BigDecimal.ZERO)
                .build();

        BigDecimal subtotal = BigDecimal.ZERO;

        // 3. Traiter chaque article
        for (OrderItemRequest itemRequest : request.getItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> new RuntimeException("Produit non trouvé ID: " + itemRequest.getProductId()));
            if (product.getStore() == null || product.getStore().getId() == null || !product.getStore().getId().equals(storeId)) {
                throw new RuntimeException("Produit non trouvé ID: " + itemRequest.getProductId());
            }

            if (!product.isActive()) {
                throw new RuntimeException("Produit non disponible à la vente : " + product.getName());
            }
            if (!product.isPurchaseAllowed()) {
                throw new RuntimeException("Produit non disponible à la vente : " + product.getName());
            }

            // Vérification stock
            if (product.getStock() < itemRequest.getQuantity()) {
                throw new RuntimeException("Stock insuffisant pour le produit : " + product.getName());
            }

            // Décrémentation stock
            product.setStock(product.getStock() - itemRequest.getQuantity());
            productRepository.save(product);

            // Création ligne de commande
            BigDecimal lineTotal = product.getPrice().multiply(new BigDecimal(itemRequest.getQuantity()));

            OrderItem orderItem = OrderItem.builder()
                    .order(order)
                    .product(product)
                    .quantity(itemRequest.getQuantity())
                    .unitPrice(product.getPrice())
                    .totalPrice(lineTotal)
                    .build();

            order.getItems().add(orderItem);
            subtotal = subtotal.add(lineTotal);
        }

        // 4. Calculs finaux et sauvegarde
        order.setSubtotal(subtotal);
        if (fulfillment.isPickup()) {
            order.setTotal(subtotal);
        } else if (request.getTotalAmount() != null) {
            order.setTotal(request.getTotalAmount());
        } else {
            BigDecimal delivery = request.getDeliveryCost() != null ? request.getDeliveryCost() : BigDecimal.ZERO;
            order.setTotal(subtotal.add(delivery));
        }

        Order savedOrder = orderRepository.save(order);

        // 5. Générer le lien WhatsApp
        String whatsappLink = generateWhatsAppLink(savedOrder);
        String pickupMapsUrl = fulfillment.isPickup() ? resolveStoreMapsUrl(storeId) : null;

        // 6. Notifications : admin (SSE + Telegram) lors d'une nouvelle commande
        String currency = appProperties.getCurrency() != null ? appProperties.getCurrency() : "FCFA";
        Map<String, Object> notifData = Map.of(
                "id", savedOrder.getId(),
                "orderNumber", savedOrder.getOrderNumber(),
                "customerName", savedOrder.getCustomerName(),
                "total", savedOrder.getTotal(),
                "deliveryType", savedOrder.getDeliveryType() != null ? savedOrder.getDeliveryType() : "",
                "fulfillmentType", savedOrder.getFulfillmentType() != null ? savedOrder.getFulfillmentType().name() : "DELIVERY"
        );

        // IMPORTANT: ne pas mettre tous les canaux dans le même try/catch.
        // Un échec WebPush/SSE ne doit pas empêcher Telegram/FCM.
        final String ord = savedOrder.getOrderNumber();

        // Outbox: enregistre les notifications externes (retry) avant exécution.
        // SSE reste best-effort (temps réel) et n'est pas dans l'outbox.
        var outWebPushAdmin = notificationOutboxService.enqueue(
            NotificationOutbox.Channel.WEBPUSH,
            NotificationOutbox.EventType.NEW_ORDER_ADMIN,
            savedOrder.getId(),
            ord,
            Map.of()
        );
        var outTelegram = notificationOutboxService.enqueue(
            NotificationOutbox.Channel.TELEGRAM,
            NotificationOutbox.EventType.NEW_ORDER_ADMIN,
            savedOrder.getId(),
            ord,
            Map.of()
        );
        NotificationOutbox outFcmAdmin = null;
        if (fcmService != null) {
            outFcmAdmin = notificationOutboxService.enqueue(
                NotificationOutbox.Channel.FCM,
                NotificationOutbox.EventType.NEW_ORDER_ADMIN,
                savedOrder.getId(),
                ord,
                Map.of()
            );
        }

        notificationRunner.executeNotification(NotificationChannel.SSE, ord,
            () -> notificationService.notifyAdmins("new_order", notifData));

        var rWebPushAdmin = notificationRunner.executeNotification(NotificationChannel.WEBPUSH, ord,
            () -> webPushService.notifyAdmins(
                "🛒 Nouvelle commande",
                "#" + ord + " — " + savedOrder.getCustomerName(),
                "order-" + ord
            ));
        if (rWebPushAdmin.status() == com.storeall.api.notification.NotificationResult.Status.SUCCESS) {
            notificationOutboxService.markSent(outWebPushAdmin.getId());
        } else if (rWebPushAdmin.status() == com.storeall.api.notification.NotificationResult.Status.FAIL) {
            notificationOutboxService.markFailedAndScheduleRetry(outWebPushAdmin.getId(), rWebPushAdmin.error(), 1);
        }

        var rTelegram = notificationRunner.executeNotification(NotificationChannel.TELEGRAM, ord,
            () -> telegramService.sendNewOrderNotification(savedOrder, currency));
        if (rTelegram.status() == com.storeall.api.notification.NotificationResult.Status.SUCCESS) {
            notificationOutboxService.markSent(outTelegram.getId());
        } else if (rTelegram.status() == com.storeall.api.notification.NotificationResult.Status.FAIL) {
            notificationOutboxService.markFailedAndScheduleRetry(outTelegram.getId(), rTelegram.error(), 1);
        }

        if (fcmService != null) {
            var rFcmAdmin = notificationRunner.executeNotification(NotificationChannel.FCM, ord,
                () -> fcmService.notifyAdminsNewOrder(savedOrder));
            if (outFcmAdmin != null) {
                if (rFcmAdmin.status() == com.storeall.api.notification.NotificationResult.Status.SUCCESS) {
                    notificationOutboxService.markSent(outFcmAdmin.getId());
                } else if (rFcmAdmin.status() == com.storeall.api.notification.NotificationResult.Status.FAIL) {
                    notificationOutboxService.markFailedAndScheduleRetry(outFcmAdmin.getId(), rFcmAdmin.error(), 1);
                }
            }
        }

        return OrderResponse.builder()
                .orderNumber(savedOrder.getOrderNumber())
                .totalAmount(savedOrder.getTotal())
                .status(savedOrder.getStatus().name())
                .whatsappLink(whatsappLink)
                .fulfillmentType(savedOrder.getFulfillmentType() != null ? savedOrder.getFulfillmentType().name() : "DELIVERY")
                .pickupMapsUrl(pickupMapsUrl != null && !pickupMapsUrl.isBlank() ? pickupMapsUrl : null)
                .build();
    }

    private String resolveStoreMapsUrl(Long storeId) {
        if (storeId != null) {
            String maps = storeRepository.findById(storeId).map(Store::getMapsUrl).orElse("");
            if (maps != null && !maps.isBlank()) {
                return maps.trim();
            }
        }
        return appSettingService.getSettingValue("store_location").orElse("").trim();
    }

    /**
     * Génère un lien WhatsApp pré-rempli avec le résumé de la commande.
     */
    private String generateWhatsAppLink(Order order) {
        StringBuilder message = new StringBuilder();

        // Dynamic Settings with Fallback
        String storeName = appSettingService.getSettingValue("store_name")
                .orElse(appProperties.getStoreName() != null ? appProperties.getStoreName() : "STORE");
        String currency = appProperties.getCurrency() != null ? appProperties.getCurrency() : "FCFA";
        String whatsappNumber = appSettingService.getSettingValue("whatsapp_number")
                .orElse(appProperties.getWhatsappNumber());
        String whatsappDest = formatPhoneNumberForWhatsApp(whatsappNumber);
        if (whatsappDest.isBlank()) {
            // Ne bloque pas la création de commande, mais le CTA WhatsApp sera absent côté frontend.
            return "";
        }

        boolean pickup = order.isPickup();
        message.append(pickup
                ? "*RETRAIT EN BOUTIQUE — " + storeName + "*"
                : "*NOUVELLE COMMANDE " + storeName + "*").append("\n\n");
        message.append("Commande: #").append(order.getOrderNumber()).append("\n");
        message.append("Date: ").append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))).append("\n\n");

        message.append("*CLIENT*").append("\n");
        message.append("Nom: ").append(order.getCustomerName()).append("\n");
        message.append("Tel: ").append(order.getCustomerPhone()).append("\n");
        if (pickup) {
            message.append("Mode: *Retrait sur place*\n");
            Long storeId = order.getStore() != null ? order.getStore().getId() : StoreContext.getStoreIdOrNull();
            String maps = resolveStoreMapsUrl(storeId);
            if (!maps.isBlank()) {
                message.append("📍 Lieu de retrait: ").append(maps).append("\n");
            }
        } else {
            message.append("Adresse: ").append(order.getCustomerAddress()).append("\n");

            if (order.getCustomerLatitude() != null && order.getCustomerLongitude() != null) {
                message.append("📍 Position: https://www.google.com/maps?q=").append(order.getCustomerLatitude()).append(",").append(order.getCustomerLongitude()).append("\n");
            } else if (order.getManualLocationLink() != null && !order.getManualLocationLink().isEmpty()) {
                message.append("📍 Position: ").append(order.getManualLocationLink()).append("\n");
            }

            if (order.getDeliveryType() != null) {
                message.append("🚚 Type: ").append(order.getDeliveryType());
                if ("PROGRAMMER".equals(order.getDeliveryType()) && order.getScheduledTime() != null) {
                    message.append(" (").append(order.getScheduledTime()).append(")");
                }
                message.append("\n");
            }
        }

        message.append("\n");

        message.append("*ARTICLES*").append("\n");
        for (OrderItem item : order.getItems()) {
            message.append("- ").append(item.getQuantity()).append("x ")
                    .append(item.getProduct().getName())
                    .append(" (").append(item.getTotalPrice()).append(" ").append(currency).append(")\n");
        }

        message.append("\n*TOTAL: ").append(order.getTotal()).append(" ").append(currency).append("*").append("\n\n");

        if (order.getCustomerNotes() != null && !order.getCustomerNotes().isEmpty()) {
            message.append("Notes: ").append(order.getCustomerNotes());
        }

        try {
            return "https://wa.me/" + whatsappDest + "?text=" + URLEncoder.encode(message.toString(), StandardCharsets.UTF_8.toString());
        } catch (java.io.UnsupportedEncodingException e) {
            return "";
        }
    }

    /**
     * Génère un lien de notification WhatsApp pour le changement de statut.
     */
    @Transactional(readOnly = true)
    public String generateStatusNotificationLink(Long orderId) {
        Order order = getOrderById(orderId);

        // Dynamic Settings with Fallback
        String storeName = appSettingService.getSettingValue("store_name")
                .orElse(appProperties.getStoreName() != null ? appProperties.getStoreName() : "SUCRE STORE");
        String storePhone = appSettingService.getSettingValue("contact_phone")
                .orElse(appProperties.getStorePhone() != null ? appProperties.getStorePhone() : "");

        StringBuilder message = new StringBuilder();
        message.append("Bonjour,\n\n");
        message.append("Votre commande #").append(order.getOrderNumber()).append(" sur ").append(storeName).append(" est actuellement : *").append(getStatusLabel(order.getStatus())).append("*\n\n");

        switch (order.getStatus()) {
            case PENDING:
            case SHIPPED: // Using SHIPPED as "En cours" equivalent for now
                message.append("Votre commande est en cours de préparation et sera bientôt livrée.");
                break;
            case DELIVERED:
                message.append("Votre commande a été livrée avec succès. Merci de votre confiance !");
                break;
            case CANCELLED:
                message.append("Votre commande a été annulée. Pour plus d'informations, contactez-nous.");
                break;
            case CONFIRMED:
            default:
                message.append("Nous vous tiendrons informé de l'évolution de votre commande.");
                break;
        }

        message.append("\n\n").append(storeName).append("\n").append(storePhone);

        // Nettoyage du numéro de téléphone du client (suppression des espaces, etc.)
        String customerPhone = order.getCustomerPhone().replaceAll("\\s+", "").replaceAll("[^0-9]", "");

        try {
            return "https://wa.me/" + customerPhone + "?text=" + URLEncoder.encode(message.toString(), StandardCharsets.UTF_8.toString());
        } catch (java.io.UnsupportedEncodingException e) {
            return "";
        }
    }

    private String getStatusLabel(Order.Status status) {
        return switch (status) {
            case PENDING ->
                "En attente";
            case CONFIRMED ->
                "Confirmée";
            case SHIPPED ->
                "En cours de livraison";
            case DELIVERED ->
                "Livrée";
            case CANCELLED ->
                "Annulée";
            default ->
                status.name();
        };
    }

    // --- Méthodes Admin ---
    /**
     * Récupère toutes les commandes (Admin). Ajouter pagination si beaucoup de
     * commandes.
     */
    /**
     * Récupère toutes les commandes (Admin) avec pagination.
     */
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Order> getAllOrders(org.springframework.data.domain.Pageable pageable) {
        Long storeId = StoreContext.getStoreIdOrNull();
        return orderRepository.findByDeletedFalseAndStoreId(storeId, pageable);
    }

    /**
     * Récupère une commande par son ID (Admin).
     */
    @Transactional(readOnly = true)
    public Order getOrderById(Long id) {
        Long storeId = StoreContext.getStoreIdOrNull();
        return orderRepository.findByIdAndStoreId(id, storeId)
            .orElseThrow(() -> new RuntimeException("Commande introuvable ID: " + id));
    }

    /**
     * Met à jour le statut d'une commande (Admin) et enregistre dans
     * l'historique.
     */
    @Transactional
    public Order updateOrderStatus(Long id, String statusName) {
        Order order = getOrderById(id);

        try {
            Order.Status newStatus = Order.Status.valueOf(statusName);
            order.setStatus(newStatus);
            Order savedOrder = orderRepository.save(order);

            // Capturer l'acteur connecté (null si action automatique / Telegram)
            String actorUsername = null;
            String actorRole = null;
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                actorUsername = auth.getName();
                actorRole = userRepository.findByUsername(actorUsername)
                        .map(u -> u.getRole() != null ? u.getRole().name() : null)
                        .orElse(null);
            }

            OrderStatusHistory history = OrderStatusHistory.builder()
                    .order(savedOrder)
                    .status(newStatus)
                    .actorUsername(actorUsername)
                    .actorRole(actorRole)
                    .build();
            statusHistoryRepository.save(history);

            // Notification temps réel pour les admins (mise à jour statut)
            // NOTE: Map.of() n'accepte pas les valeurs null (ex: action automatique / Telegram).
            Map<String, Object> statusData = new java.util.HashMap<>();
            statusData.put("id", savedOrder.getId());
            statusData.put("orderNumber", savedOrder.getOrderNumber());
            statusData.put("status", newStatus.name());
            statusData.put("actorUsername", actorUsername == null ? "" : actorUsername);
            statusData.put("actorRole", actorRole == null ? "" : actorRole);
            final String ord = savedOrder.getOrderNumber();
            notificationRunner.executeNotification(NotificationChannel.SSE, ord,
                () -> notificationService.notifyAdmins("order_status", statusData));

            if (fcmService != null) {
                final String actor = actorUsername;
                // Outbox pour retry FCM statut
                var outFcmStatus = notificationOutboxService.enqueue(
                    NotificationOutbox.Channel.FCM,
                    NotificationOutbox.EventType.ORDER_STATUS_ADMIN,
                    savedOrder.getId(),
                    ord,
                    Map.of("actorUsername", actor == null ? "" : actor)
                );
                var rFcmStatus = notificationRunner.executeNotification(NotificationChannel.FCM, ord,
                    () -> fcmService.notifyAdminsOrderStatus(savedOrder, actor));
                if (rFcmStatus.status() == com.storeall.api.notification.NotificationResult.Status.SUCCESS) {
                    notificationOutboxService.markSent(outFcmStatus.getId());
                } else if (rFcmStatus.status() == com.storeall.api.notification.NotificationResult.Status.FAIL) {
                    notificationOutboxService.markFailedAndScheduleRetry(outFcmStatus.getId(), rFcmStatus.error(), 1);
                }
            }

            // Notification livreurs quand une commande livraison est confirmée (pas les retraits boutique)
            if (newStatus == Order.Status.CONFIRMED && savedOrder.isDelivery()) {
                Map<String, Object> deliveryData = Map.of(
                        "id", savedOrder.getId(),
                        "orderNumber", savedOrder.getOrderNumber(),
                        "customerAddress", savedOrder.getCustomerAddress() != null ? savedOrder.getCustomerAddress() : "",
                        "deliveryType", savedOrder.getDeliveryType() != null ? savedOrder.getDeliveryType() : ""
                );
                final String deliveryOrd = savedOrder.getOrderNumber();

                notificationRunner.executeNotification(NotificationChannel.SSE, deliveryOrd,
                    () -> notificationService.notifyDeliveryAgents("new_delivery", deliveryData));

                var outWebPushDelivery = notificationOutboxService.enqueue(
                    NotificationOutbox.Channel.WEBPUSH,
                    NotificationOutbox.EventType.NEW_DELIVERY,
                    savedOrder.getId(),
                    deliveryOrd,
                    Map.of()
                );
                var rWebPushDelivery = notificationRunner.executeNotification(NotificationChannel.WEBPUSH, deliveryOrd,
                    () -> webPushService.notifyDeliveryAgents(
                        "🚚 Nouvelle livraison disponible",
                        "Commande #" + deliveryOrd,
                        "delivery-" + deliveryOrd
                    ));
                if (rWebPushDelivery.status() == com.storeall.api.notification.NotificationResult.Status.SUCCESS) {
                    notificationOutboxService.markSent(outWebPushDelivery.getId());
                } else if (rWebPushDelivery.status() == com.storeall.api.notification.NotificationResult.Status.FAIL) {
                    notificationOutboxService.markFailedAndScheduleRetry(outWebPushDelivery.getId(), rWebPushDelivery.error(), 1);
                }

                if (fcmService != null) {
                    var outFcmDelivery = notificationOutboxService.enqueue(
                        NotificationOutbox.Channel.FCM,
                        NotificationOutbox.EventType.NEW_DELIVERY,
                        savedOrder.getId(),
                        deliveryOrd,
                        Map.of()
                    );
                    var rFcmDelivery = notificationRunner.executeNotification(NotificationChannel.FCM, deliveryOrd,
                        () -> fcmService.notifyDeliveryAgentsNewDelivery(savedOrder));
                    if (rFcmDelivery.status() == com.storeall.api.notification.NotificationResult.Status.SUCCESS) {
                        notificationOutboxService.markSent(outFcmDelivery.getId());
                    } else if (rFcmDelivery.status() == com.storeall.api.notification.NotificationResult.Status.FAIL) {
                        notificationOutboxService.markFailedAndScheduleRetry(outFcmDelivery.getId(), rFcmDelivery.error(), 1);
                    }
                }
            }

            // Notification push client (CONFIRMED / REJECTED / CANCELLED)
            if (newStatus == Order.Status.CONFIRMED
                || newStatus == Order.Status.CANCELLED
                || newStatus == Order.Status.REJECTED) {
                try {
                    String pushTitle = (newStatus == Order.Status.CONFIRMED)
                        ? "✅ Commande confirmée"
                        : (newStatus == Order.Status.REJECTED)
                            ? "❌ Commande rejetée"
                            : "❌ Commande annulée";
                    String pushBody = (newStatus == Order.Status.CONFIRMED)
                        ? "Votre commande #" + savedOrder.getOrderNumber() + " a été confirmée et est en cours de préparation."
                        : (newStatus == Order.Status.REJECTED)
                            ? "Votre commande #" + savedOrder.getOrderNumber() + " a été rejetée."
                            : "Votre commande #" + savedOrder.getOrderNumber() + " a été annulée.";
                    webPushService.notifyCustomer(savedOrder.getOrderNumber(), pushTitle, pushBody);
                } catch (Exception e) {
                    log.warn("[NOTIF] channel=WEBPUSH order={} status=FAIL error={}",
                        savedOrder.getOrderNumber(), e.toString());
                }
            }

            return savedOrder;
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Statut invalide : " + statusName);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Actions Admin explicites : accepter / rejeter
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * L'admin accepte une commande.
     * Transition autorisée : PENDING -> CONFIRMED.
     */
    @Transactional
    public Order acceptOrder(Long id) {
        Order order = getOrderById(id);
        if (order.getStatus() != Order.Status.PENDING) {
            throw new RuntimeException("Impossible d'accepter (Statut: " + order.getStatus() + ")");
        }
        return updateOrderStatus(id, Order.Status.CONFIRMED.name());
    }

    /**
     * Accepte une commande depuis le webhook Telegram (sans JWT).
     * Résout la boutique depuis la commande — ne dépend pas du Host / X-Store-Code du webhook.
     */
    @Transactional
    public Order acceptOrderForTelegram(Long orderId) {
        Order order = requireOrderForTelegram(orderId);
        if (order.getStatus() != Order.Status.PENDING) {
            throw new RuntimeException("Impossible d'accepter (Statut: " + order.getStatus() + ")");
        }
        return runOrderActionWithStore(order, () -> updateOrderStatus(orderId, Order.Status.CONFIRMED.name()));
    }

    /**
     * L'admin rejette une commande.
     * Transition autorisée : PENDING -> REJECTED.
     */
    @Transactional
    public Order rejectOrder(Long id) {
        Order order = getOrderById(id);
        if (order.getStatus() != Order.Status.PENDING) {
            throw new RuntimeException("Impossible de rejeter (Statut: " + order.getStatus() + ")");
        }
        return updateOrderStatus(id, Order.Status.REJECTED.name());
    }

    /**
     * Rejette une commande depuis le webhook Telegram (sans JWT).
     */
    @Transactional
    public Order rejectOrderForTelegram(Long orderId) {
        Order order = requireOrderForTelegram(orderId);
        if (order.getStatus() != Order.Status.PENDING) {
            throw new RuntimeException("Impossible de rejeter (Statut: " + order.getStatus() + ")");
        }
        return runOrderActionWithStore(order, () -> updateOrderStatus(orderId, Order.Status.REJECTED.name()));
    }

    /**
     * Charge la commande pour webhook Telegram (boutique incluse, sans filtre tenant du Host).
     */
    private Order requireOrderForTelegram(Long orderId) {
        Order order = orderRepository.findByIdWithStore(orderId)
                .orElseThrow(() -> new RuntimeException("Commande introuvable ID: " + orderId));
        if (order.getStore() == null || order.getStore().getId() == null) {
            throw new RuntimeException("Commande sans boutique (store_id manquant) ID: " + orderId);
        }
        return order;
    }

    private Order runOrderActionWithStore(Order order, java.util.function.Supplier<Order> action) {
        var previousStore = StoreContext.get();
        try {
            StoreContext.set(order.getStore());
            return action.get();
        } finally {
            if (previousStore != null) {
                StoreContext.set(previousStore);
            } else {
                StoreContext.clear();
            }
        }
    }

    /**
     * Récupère l'historique complet des changements de statut d'une commande
     */
    @Transactional(readOnly = true)
    public java.util.List<OrderStatusHistory> getOrderHistory(Long orderId) {
        // Vérifier que la commande existe
        getOrderById(orderId);
        return statusHistoryRepository.findByOrderIdOrderByCreatedAtDesc(orderId);
    }

    /**
     * Génère le lien WhatsApp pour notifier un client selon le statut
     */
    public String generateWhatsAppNotificationLink(Long orderId, String phoneNumber) {
        Order order = getOrderById(orderId);

        // Dynamic Settings with Fallback
        String whatsappNumber = appSettingService.getSettingValue("whatsapp_number")
                .orElse(appProperties.getWhatsappNumber());

        String phoneInput = (phoneNumber != null && !phoneNumber.isBlank()) ? phoneNumber : order.getCustomerPhone();
        String phone = formatPhoneNumberForWhatsApp(phoneInput);

        StringBuilder message = new StringBuilder();
        message.append("Bonjour,\n\n");
        // N° remplace # pour éviter que le navigateur mobile interprète %23 comme un fragment d'URL
        message.append("Votre commande N° ").append(order.getOrderNumber());
        if (order.getConfirmationCode() != null) {
            message.append(" (Code: ").append(order.getConfirmationCode()).append(")");
        }
        // Pas de * autour du statut — évite les truncations WhatsApp sur mobile
        message.append(" sur SUCRE STORE est actuellement : ").append(getStatusLabel(order.getStatus())).append("\n\n");

        // Message personnalisé selon le statut (texte plain — sans markdown WhatsApp)
        switch (order.getStatus()) {
            case CONFIRMED -> message.append("Bonne nouvelle ! Votre commande est confirmee.\n\n")
                .append("Elle est en cours de preparation et sera bientot livree.")
                .append(order.getConfirmationCode() != null
                    ? "\n\nCode de confirmation : " + order.getConfirmationCode() : "");
            case SHIPPED -> message.append("Votre commande est en cours de livraison.\n\n")
                .append("Notre livreur est en route. Tenez-vous pret !");
            case DELIVERED -> message.append("Votre commande a ete livree avec succes.\n\n")
                .append("Merci pour votre confiance. A tres bientot sur SUCRE STORE !");
            case CANCELLED -> message.append("Nous avons le regret de vous informer que votre commande a ete annulee.\n\n")
                .append("Nous nous excusons pour la gene occasionnee.\n")
                .append("Pour toute information, n'hesitez pas a nous contacter.");
            default -> message.append("Nous vous tiendrons informe de l'evolution de votre commande.");
        }

        message.append("\n\nSUCRE STORE\n").append(whatsappNumber);

        String encodedMessage = URLEncoder.encode(message.toString(), StandardCharsets.UTF_8);
        return "https://wa.me/" + phone + "?text=" + encodedMessage;
    }

    /**
     * Formate un numéro de téléphone pour WhatsApp (ajoute 226 si nécessaire).
     */
    private String formatPhoneNumberForWhatsApp(String phone) {
        if (phone == null) {
            return "";
        }
        // Garder uniquement les chiffres
        String cleaned = phone.replaceAll("[^0-9]", "");
        if (cleaned.isBlank()) {
            return "";
        }

        // Retirer les 00 du début si présents
        if (cleaned.startsWith("00")) {
            cleaned = cleaned.substring(2);
        }

        // Préfixe par défaut piloté par l'admin (checkout).
        // Exemple: settings.customer_whatsapp_dial_code="+226" → dialDigits="226".
        String dialDigits = appSettingService.getSettingValue("customer_whatsapp_dial_code")
            .map(v -> v.replaceAll("[^0-9]", ""))
            .orElse("226");
        if (dialDigits.isBlank()) {
            dialDigits = "226";
        }

        // Si le numéro est local (souvent <= 8 chiffres) et n'a pas déjà l'indicatif,
        // on ajoute l'indicatif configuré.
        if (!cleaned.startsWith(dialDigits) && cleaned.length() <= 8) {
            return dialDigits + cleaned;
        }

        return cleaned;
    }

    /**
     * Génère un code de confirmation unique composé de 4 chiffres.
     */
    private String generateConfirmationCode() {
        int randomNumber = 1000 + (int) (Math.random() * 9000);
        return String.valueOf(randomNumber);
    }

    /**
     * Tente d'extraire les coordonnées GPS d'un lien Google Maps.
     */
    private BigDecimal[] extractCoordinatesFromLink(String link) {
        try {
            // Regex simple pour trouver lat,lng
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("([0-9.-]+),([0-9.-]+)");
            java.util.regex.Matcher matcher = pattern.matcher(link);
            if (matcher.find()) {
                return new BigDecimal[]{
                    new BigDecimal(matcher.group(1)),
                    new BigDecimal(matcher.group(2))
                };
            }
        } catch (Exception e) {
            // Ignorer si format invalide
        }
        return null;
    }

    /**
     * Retourne les 10 dernières commandes PENDING (pour le bot Telegram).
     */
    @Transactional(readOnly = true)
    public java.util.List<Order> getLatestPendingOrders() {
        Long storeId = StoreContext.getStoreIdOrNull();
        if (storeId != null) {
            return orderRepository.findTop10ByStatusAndStore_IdOrderByIdDesc(Order.Status.PENDING, storeId);
        }
        return orderRepository.findTop10ByStatusOrderByIdDesc(Order.Status.PENDING);
    }

    /**
     * Supprime logiquement une commande (Soft Delete).
     */
    @Transactional
    public void deleteOrder(Long id) {
        Order order = getOrderById(id);
        order.setDeleted(true);
        orderRepository.save(order);
    }

    /**
     * Récupère les commandes modifiées pour la synchronisation.
     */
    @Transactional(readOnly = true)
    public java.util.List<Order> syncOrders(String lastSyncStr) {
        java.time.LocalDateTime lastSync;
        if (lastSyncStr == null || lastSyncStr.isBlank()) {
            lastSync = java.time.LocalDateTime.now().minusDays(30); // Default to last 30 days
        } else {
            lastSync = java.time.LocalDateTime.parse(lastSyncStr);
        }
        Long storeId = StoreContext.getStoreIdOrNull();
        if (storeId != null) {
            return orderRepository.findByUpdatedAtAfterAndStore_Id(lastSync, storeId);
        }
        return orderRepository.findByUpdatedAtAfter(lastSync);
    }

    // --- Méthodes Livraison (Traceability) ---

    /**
     * Staff livraison : voit et traite les commandes de toutes les boutiques (pool global).
     */
    private boolean isGlobalDeliveryStaff() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getAuthorities() == null) {
            return false;
        }
        return auth.getAuthorities().stream().anyMatch(a ->
            "ROLE_DELIVERY_AGENT".equals(a.getAuthority())
                || "ROLE_MANAGER".equals(a.getAuthority())
                || "ROLE_SUPER_ADMIN".equals(a.getAuthority())
        );
    }

    @Transactional(readOnly = true)
    public Order getOrderForDelivery(Long id) {
        if (isGlobalDeliveryStaff()) {
            return orderRepository.findById(id)
                .filter(o -> !o.isDeleted())
                .orElseThrow(() -> new RuntimeException("Commande introuvable ID: " + id));
        }
        return getOrderById(id);
    }

    /**
     * Un livreur prend en charge une commande "CONFIRMED".
     */
    @Transactional
    public Order claimOrder(Long orderId, String username) {
        Order order = getOrderForDelivery(orderId);

        if (order.isPickup()) {
            throw new RuntimeException("Cette commande est un retrait en boutique (pas de livraison).");
        }
        if (order.getStatus() != Order.Status.CONFIRMED) {
            throw new RuntimeException("La commande n'est pas disponible (Statut: " + order.getStatus() + ")");
        }
        if (order.getDeliveryAgent() != null) {
            throw new RuntimeException("Cette commande est déjà prise en charge.");
        }

        com.storeall.api.entity.User agent = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable : " + username));

        order.setDeliveryAgent(agent);
        order.setStatus(Order.Status.SHIPPED); // En cours de livraison

        Order saved = orderRepository.save(order);

        // Central assignment table (audit)
        DeliveryAssignment assign = deliveryAssignmentRepository.findByOrderId(saved.getId())
            .orElseGet(() -> DeliveryAssignment.builder()
                .order(saved)
                .status(DeliveryAssignment.Status.CLAIMED)
                .build());
        assign.setDeliveryUser(agent);
        assign.setStatus(DeliveryAssignment.Status.CLAIMED);
        deliveryAssignmentRepository.save(assign);

        try {
            String roleName = agent.getRole() != null ? agent.getRole().name() : "";
            Map<String, Object> statusData = Map.of(
                "id", saved.getId(),
                "orderNumber", saved.getOrderNumber(),
                "status", saved.getStatus().name(),
                "actorUsername", username,
                "actorRole", roleName
            );
            notificationService.notifyAdmins("order_status", statusData);
            if (fcmService != null) {
                fcmService.notifyAdminsOrderStatus(saved, username);
            }
        } catch (Exception ignored) {}

        return saved;
    }

    /**
     * Staff boutique : valide le retrait en magasin avec le code client ({@link FulfillmentType#PICKUP}).
     */
    @Transactional
    public Order completePickup(Long orderId, String code) {
        Order order = getOrderById(orderId);

        if (!order.isPickup()) {
            throw new RuntimeException("Cette commande n'est pas un retrait en boutique.");
        }
        if (order.getStatus() != Order.Status.CONFIRMED) {
            throw new RuntimeException(
                "Le retrait ne peut être validé que pour une commande confirmée (statut actuel : "
                    + order.getStatus() + ").");
        }
        if (order.getConfirmationCode() == null || order.getConfirmationCode().isBlank()) {
            throw new RuntimeException("Code de confirmation manquant sur cette commande.");
        }

        String inputCode = code != null ? code.trim() : "";
        if (inputCode.isEmpty()) {
            throw new RuntimeException("Le code de confirmation est obligatoire.");
        }
        if (!inputCode.equalsIgnoreCase(order.getConfirmationCode())) {
            throw new RuntimeException("Code de confirmation incorrect.");
        }

        order.setStatus(Order.Status.DELIVERED);
        Order saved = orderRepository.save(order);

        String actorUsername = null;
        String actorRole = null;
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            actorUsername = auth.getName();
            actorRole = userRepository.findByUsername(actorUsername)
                    .map(u -> u.getRole() != null ? u.getRole().name() : null)
                    .orElse(null);
        }

        OrderStatusHistory history = OrderStatusHistory.builder()
                .order(saved)
                .status(Order.Status.DELIVERED)
                .actorUsername(actorUsername)
                .actorRole(actorRole)
                .build();
        statusHistoryRepository.save(history);

        try {
            Map<String, Object> statusData = new java.util.HashMap<>();
            statusData.put("id", saved.getId());
            statusData.put("orderNumber", saved.getOrderNumber());
            statusData.put("status", saved.getStatus().name());
            statusData.put("actorUsername", actorUsername == null ? "" : actorUsername);
            statusData.put("actorRole", actorRole == null ? "" : actorRole);
            statusData.put("fulfillmentType", "PICKUP");
            notificationService.notifyAdmins("order_status", statusData);
            if (fcmService != null) {
                fcmService.notifyAdminsOrderStatus(saved, actorUsername);
            }
        } catch (Exception ignored) {}

        return saved;
    }

    /**
     * Un livreur valide la livraison avec le code client.
     */
    @Transactional
    public Order completeDelivery(Long orderId, String username, String code) {
        Order order = getOrderForDelivery(orderId);

        if (order.getStatus() != Order.Status.SHIPPED) {
            throw new RuntimeException("Statut incorrect pour validation : " + order.getStatus());
        }
        if (order.getDeliveryAgent() == null || !order.getDeliveryAgent().getUsername().equals(username)) {
            throw new RuntimeException("Vous n'êtes pas assigné à cette commande.");
        }

        // Vérification du code (ignorer la casse et les espaces)
        String inputCode = code.trim();
        if (!inputCode.equalsIgnoreCase(order.getConfirmationCode())) {
            throw new RuntimeException("Code de confirmation incorrect.");
        }

        order.setStatus(Order.Status.DELIVERED);
        Order saved = orderRepository.save(order);

        com.storeall.api.entity.User actor = userRepository.findByUsername(username).orElse(null);
        final String actorRoleName = actor != null && actor.getRole() != null ? actor.getRole().name() : "";

        deliveryAssignmentRepository.findByOrderId(saved.getId()).ifPresent(a -> {
            a.setStatus(DeliveryAssignment.Status.DELIVERED);
            deliveryAssignmentRepository.save(a);
        });

        try {
            Map<String, Object> statusData = Map.of(
                "id", saved.getId(),
                "orderNumber", saved.getOrderNumber(),
                "status", saved.getStatus().name(),
                "actorUsername", username,
                "actorRole", actorRoleName
            );
            notificationService.notifyAdmins("order_status", statusData);
            if (fcmService != null) {
                fcmService.notifyAdminsOrderStatus(saved, username);
            }
        } catch (Exception ignored) {}

        return saved;
    }

    /**
     * Un livreur déclare un échec de livraison (motif optionnel).
     * Stratégie: on passe à CANCELLED et on garde le motif dans l'historique.
     */
    @Transactional
    public Order failDelivery(Long orderId, String username, String reason) {
        Order order = getOrderForDelivery(orderId);

        if (order.getDeliveryAgent() == null || !order.getDeliveryAgent().getUsername().equals(username)) {
            throw new RuntimeException("Vous n'êtes pas assigné à cette commande.");
        }
        if (order.getStatus() != Order.Status.SHIPPED) {
            throw new RuntimeException("Statut incorrect pour échec : " + order.getStatus());
        }

        order.setStatus(Order.Status.CANCELLED);
        Order saved = orderRepository.save(order);

        deliveryAssignmentRepository.findByOrderId(saved.getId()).ifPresent(a -> {
            a.setStatus(DeliveryAssignment.Status.FAILED);
            a.setNote(reason != null ? reason : "");
            deliveryAssignmentRepository.save(a);
        });

        try {
            String failRole = userRepository.findByUsername(username)
                .map(u -> u.getRole() != null ? u.getRole().name() : "")
                .orElse("");
            OrderStatusHistory history = OrderStatusHistory.builder()
                .order(saved)
                .status(Order.Status.CANCELLED)
                .actorUsername(username)
                .actorRole(failRole)
                .note(reason != null && !reason.isBlank() ? ("DELIVERY_FAILED: " + reason.trim()) : "DELIVERY_FAILED")
                .build();
            statusHistoryRepository.save(history);
        } catch (Exception ignored) {}

        try {
            Map<String, Object> statusData = Map.of(
                "id", saved.getId(),
                "orderNumber", saved.getOrderNumber(),
                "status", saved.getStatus().name(),
                "note", reason != null ? reason : ""
            );
            notificationService.notifyAdmins("order_status", statusData);
        } catch (Exception ignored) {}

        return saved;
    }

    /**
     * Récupère les commandes disponibles pour les livreurs. CONFIRMED + Pas de
     * livreur. NOTE: Pour la confidentialité, on masque les infos clients.
     */
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Order> getAvailableDeliveryOrders(org.springframework.data.domain.Pageable pageable) {
        Long storeId = StoreContext.getStoreIdOrNull();
        // Pool livraison global : StoreContext vide sur /api/delivery/** → toutes les boutiques.
        if (storeId == null) {
            return orderRepository.findDeliveryAvailableByStatus(Order.Status.CONFIRMED, pageable);
        }
        return orderRepository.findDeliveryAvailableByStatusAndStore_Id(Order.Status.CONFIRMED, storeId, pageable);
    }

    /**
     * Récupère les commandes assignées au livreur connecté.
     */
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Order> getMyDeliveryOrders(String username, org.springframework.data.domain.Pageable pageable) {
        // En cours de livraison (SHIPPED uniquement — voir getMyDeliveryHistory pour les livrées).
        Long storeId = StoreContext.getStoreIdOrNull();
        if (storeId == null) {
            return orderRepository.findByDeliveryAgentUsernameAndStatusInAndDeletedFalse(
                    username,
                    java.util.List.of(Order.Status.SHIPPED),
                    pageable);
        }
        return orderRepository.findByDeliveryAgentUsernameAndStatusInAndDeletedFalseAndStore_Id(
                username,
                java.util.List.of(Order.Status.SHIPPED),
                storeId,
                pageable);
    }

    /**
     * Historique des livraisons terminées par le livreur connecté.
     */
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<Order> getMyDeliveryHistory(String username, org.springframework.data.domain.Pageable pageable) {
        Long storeId = StoreContext.getStoreIdOrNull();
        var delivered = java.util.List.of(Order.Status.DELIVERED);
        if (storeId == null) {
            return orderRepository.findByDeliveryAgentUsernameAndStatusInAndDeletedFalse(
                    username, delivered, pageable);
        }
        return orderRepository.findByDeliveryAgentUsernameAndStatusInAndDeletedFalseAndStore_Id(
                username, delivered, storeId, pageable);
    }

}
