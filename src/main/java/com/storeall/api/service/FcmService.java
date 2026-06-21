package com.storeall.api.service;

import java.io.FileInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.AndroidConfig;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import com.storeall.api.config.AppProperties;
import com.storeall.api.entity.DeliveryDeviceToken;
import com.storeall.api.entity.Order;
import com.storeall.api.entity.User;
import com.storeall.api.repository.DeliveryDeviceTokenRepository;
import com.storeall.api.util.PdfFieldValuesFormatter;

@Service
public class FcmService {

    private static final Logger log = LoggerFactory.getLogger(FcmService.class);

    private final AppProperties appProperties;
    private final DeliveryDeviceTokenRepository tokenRepository;
    private final AtomicBoolean initialized = new AtomicBoolean(false);

    public FcmService(AppProperties appProperties, DeliveryDeviceTokenRepository tokenRepository) {
        this.appProperties = appProperties;
        this.tokenRepository = tokenRepository;
    }

    private boolean ensureInitialized() {
        if (initialized.get()) return true;
        if (!appProperties.getDelivery().getFcm().isEnabled()) return false;

        String path = appProperties.getDelivery().getFcm().getServiceAccountPath();
        if (path == null || path.isBlank()) {
            log.warn("FCM enabled but serviceAccountPath is missing (app.delivery.fcm.service-account-path).");
            return false;
        }

        try (FileInputStream serviceAccount = new FileInputStream(path)) {
            GoogleCredentials credentials = GoogleCredentials.fromStream(serviceAccount)
                .createScoped(List.of("https://www.googleapis.com/auth/firebase.messaging"));

            FirebaseOptions.Builder builder = FirebaseOptions.builder().setCredentials(credentials);
            String projectId = appProperties.getDelivery().getFcm().getProjectId();
            if (projectId != null && !projectId.isBlank()) {
                builder.setProjectId(projectId.trim());
            }

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(builder.build());
            }
            initialized.set(true);
            log.info("FCM initialized.");
            return true;
        } catch (Exception e) {
            log.warn("FCM initialization failed: {}", e.getMessage());
            return false;
        }
    }

    private void maybeDeactivateInvalidToken(DeliveryDeviceToken token, Exception e) {
        if (!(e instanceof FirebaseMessagingException fme)) return;
        // Reason codes used by FCM Admin SDK.
        // - UNREGISTERED: app uninstall / token revoked
        // - INVALID_ARGUMENT: token format invalid
        String code = fme.getMessagingErrorCode() != null ? fme.getMessagingErrorCode().name() : "";
        if ("UNREGISTERED".equals(code) || "INVALID_ARGUMENT".equals(code)) {
            try {
                token.setActive(false);
                tokenRepository.save(token);
                log.warn("[NOTIF] channel=FCM order= status=FAIL error=token_deactivated fcmToken={} reason={}",
                    token.getFcmToken(), code);
            } catch (Exception ex) {
                log.warn("[NOTIF] channel=FCM order= status=FAIL error=token_deactivate_failed fcmToken={} reason={} details={}",
                    token.getFcmToken(), code, ex.toString());
            }
        }
    }

    public void notifyDeliveryAgentsNewDelivery(Order order) {
        if (!ensureInitialized()) {
            log.warn(
                "[NOTIF] channel=FCM order={} status=SKIPPED error=fcm_not_initialized (app.delivery.fcm.enabled, service account path, or init failure)",
                order.getOrderNumber());
            return;
        }

        Long storeId = order.getStore() != null ? order.getStore().getId() : null;
        List<DeliveryDeviceToken> tokens = new ArrayList<>();
        if (storeId != null) {
            tokens.addAll(tokenRepository.findByIsActiveTrueAndUser_Store_IdAndUser_Role(storeId, User.Role.MANAGER));
            tokens.addAll(tokenRepository.findByIsActiveTrueAndUser_Store_IdAndUser_Role(storeId, User.Role.SUPER_ADMIN));
            tokens.addAll(tokenRepository.findByIsActiveTrueAndUser_Store_IdAndUser_Role(storeId, User.Role.DELIVERY_AGENT));
        } else {
            tokens.addAll(tokenRepository.findByUserRoleAndIsActiveTrue(User.Role.MANAGER));
            tokens.addAll(tokenRepository.findByUserRoleAndIsActiveTrue(User.Role.SUPER_ADMIN));
            tokens.addAll(tokenRepository.findByUserRoleAndIsActiveTrue(User.Role.DELIVERY_AGENT));
        }
        if (tokens.isEmpty()) {
            log.warn(
                "[NOTIF] channel=FCM order={} status=SKIPPED error=no_active_staff_fcm_tokens (MANAGER/SUPER_ADMIN/DELIVERY_AGENT pour cette boutique)",
                order.getOrderNumber());
            return;
        }

        for (DeliveryDeviceToken t : tokens) {
            try {
                Message msg = Message.builder()
                    .setToken(t.getFcmToken())
                    .setAndroidConfig(AndroidConfig.builder()
                        .setPriority(AndroidConfig.Priority.HIGH)
                        .build())
                    .setNotification(Notification.builder()
                        .setTitle("Nouvelle livraison disponible")
                        .setBody("Commande #" + order.getOrderNumber())
                        .build())
                    .putAllData(Map.of(
                        "type", "new_delivery",
                        "orderId", String.valueOf(order.getId()),
                        "orderNumber", order.getOrderNumber(),
                        "status", order.getStatus().name()
                    ))
                    .build();
                FirebaseMessaging.getInstance().send(msg);
            } catch (Exception e) {
                maybeDeactivateInvalidToken(t, e);
                log.warn("[NOTIF] channel=FCM order={} status=FAIL error={}", order.getOrderNumber(), e.toString());
            }
        }
    }

    public void notifyAdminsNewOrder(Order order) {
        if (!ensureInitialized()) {
            log.warn(
                "[NOTIF] channel=FCM order={} event=new_order status=SKIPPED error=fcm_not_initialized",
                order.getOrderNumber());
            return;
        }
        List<DeliveryDeviceToken> tokens = new ArrayList<>();
        tokens.addAll(tokenRepository.findByUserRoleAndIsActiveTrue(User.Role.SUPER_ADMIN));
        tokens.addAll(tokenRepository.findByUserRoleAndIsActiveTrue(User.Role.MANAGER));
        if (tokens.isEmpty()) {
            log.warn(
                "[NOTIF] channel=FCM order={} event=new_order status=SKIPPED error=no_admin_fcm_tokens (SUPER_ADMIN/MANAGER must register via POST /api/delivery/devices/register)",
                order.getOrderNumber());
            return;
        }

        final boolean pickup = order.isPickup();
        final String fulfillmentType = order.getFulfillmentType() != null
            ? order.getFulfillmentType().name()
            : "DELIVERY";
        final String customizationSummary = PdfFieldValuesFormatter.compactSummary(order.getItems());
        String fcmBody = "#" + order.getOrderNumber() + " — " + order.getCustomerName()
            + (pickup ? " · Retrait" : " · Livraison");
        if (!customizationSummary.isBlank()) {
            fcmBody += "\n" + customizationSummary;
        }

        for (DeliveryDeviceToken t : tokens) {
            try {
                Message msg = Message.builder()
                    .setToken(t.getFcmToken())
                    .setAndroidConfig(AndroidConfig.builder()
                        .setPriority(AndroidConfig.Priority.HIGH)
                        .build())
                    .setNotification(Notification.builder()
                        .setTitle(pickup ? "🏪 Retrait en boutique" : "Nouvelle commande")
                        .setBody(fcmBody)
                        .build())
                    .putAllData(Map.of(
                        "type", "new_order",
                        "orderId", String.valueOf(order.getId()),
                        "orderNumber", order.getOrderNumber(),
                        "status", order.getStatus().name(),
                        "fulfillmentType", fulfillmentType
                    ))
                    .build();
                FirebaseMessaging.getInstance().send(msg);
            } catch (Exception e) {
                maybeDeactivateInvalidToken(t, e);
                log.warn("[NOTIF] channel=FCM order={} status=FAIL error={}", order.getOrderNumber(), e.toString());
            }
        }
    }

    public void notifyAdminsOrderStatus(Order order, String actorUsername) {
        if (!ensureInitialized()) return;
        List<DeliveryDeviceToken> tokens = new ArrayList<>();
        tokens.addAll(tokenRepository.findByUserRoleAndIsActiveTrue(User.Role.SUPER_ADMIN));
        tokens.addAll(tokenRepository.findByUserRoleAndIsActiveTrue(User.Role.MANAGER));
        if (tokens.isEmpty()) return;

        for (DeliveryDeviceToken t : tokens) {
            try {
                Message msg = Message.builder()
                    .setToken(t.getFcmToken())
                    .setAndroidConfig(AndroidConfig.builder()
                        .setPriority(AndroidConfig.Priority.HIGH)
                        .build())
                    .setNotification(Notification.builder()
                        .setTitle("Statut mis à jour")
                        .setBody("#" + order.getOrderNumber() + " → "
                            + (order.isPickup() && order.getStatus() == com.storeall.api.entity.Order.Status.DELIVERED
                                ? "Récupérée"
                                : order.getStatus().name()))
                        .build())
                    .putAllData(Map.of(
                        "type", "order_status",
                        "orderId", String.valueOf(order.getId()),
                        "orderNumber", order.getOrderNumber(),
                        "status", order.getStatus().name(),
                        "actorUsername", actorUsername == null ? "" : actorUsername
                    ))
                    .build();
                FirebaseMessaging.getInstance().send(msg);
            } catch (Exception e) {
                maybeDeactivateInvalidToken(t, e);
                log.warn("[NOTIF] channel=FCM order={} status=FAIL error={}", order.getOrderNumber(), e.toString());
            }
        }
    }
}

