package com.storeall.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.storeall.api.entity.CustomerPushSubscription;
import com.storeall.api.entity.PushSubscription;
import com.storeall.api.entity.User;
import com.storeall.api.repository.CustomerPushSubscriptionRepository;
import com.storeall.api.repository.PushSubscriptionRepository;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

import java.security.Security;
import java.util.List;
import java.util.Map;

/**
 * Envoie des notifications Web Push (VAPID) aux appareils abonnés.
 * Fonctionne en arrière-plan (navigateur fermé / app en background).
 */
@Service
public class WebPushService {

    private static final Logger log = LoggerFactory.getLogger(WebPushService.class);

    @Value("${app.webpush.vapid-public-key:}")
    private String vapidPublicKey;

    @Value("${app.webpush.vapid-private-key:}")
    private String vapidPrivateKey;

    @Value("${app.webpush.vapid-subject:}")
    private String vapidSubject;

    private final PushSubscriptionRepository repo;
    private final CustomerPushSubscriptionRepository customerRepo;
    private final ObjectMapper objectMapper;
    private PushService pushService;

    public WebPushService(PushSubscriptionRepository repo,
                          CustomerPushSubscriptionRepository customerRepo,
                          ObjectMapper objectMapper) {
        this.repo = repo;
        this.customerRepo = customerRepo;
        this.objectMapper = objectMapper;

        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    @PostConstruct
    void init() {
        if (vapidPublicKey == null || vapidPublicKey.isBlank()
            || vapidPrivateKey == null || vapidPrivateKey.isBlank()
            || vapidSubject == null || vapidSubject.isBlank()) {
            log.warn("[NOTIF] channel=WEBPUSH order= status=SKIPPED error=missing_vapid_config");
            this.pushService = null;
            return;
        }
        try {
            this.pushService = new PushService(vapidPublicKey, vapidPrivateKey, vapidSubject);
        } catch (Exception e) {
            log.warn("[NOTIF] channel=WEBPUSH order= status=FAIL error=pushservice_init_failed details={}", e.toString());
            this.pushService = null;
        }
    }

    /**
     * Envoie une notification push à tous les abonnés ayant le rôle donné.
     */
    public void notifyByRole(User.Role role, String title, String body, String tag) {
        if (pushService == null) {
            return;
        }
        List<PushSubscription> subscriptions = repo.findByUserRole(role);
        if (subscriptions.isEmpty()) {
            return;
        }

        String payload;
        try {
            payload = objectMapper.writeValueAsString(Map.of(
                "title", title,
                "body",  body,
                "tag",   tag
            ));
        } catch (Exception e) {
            log.error("Erreur sérialisation payload push", e);
            return;
        }

        for (PushSubscription sub : subscriptions) {
            try {
                Notification notification = new Notification(
                    sub.getEndpoint(),
                    sub.getP256dh(),
                    sub.getAuth(),
                    payload
                );
                pushService.send(notification);
            } catch (Exception e) {
                log.warn("Échec push vers {} : {}", sub.getEndpoint(), e.getMessage());
                // Supprime les souscriptions expirées (410 Gone)
                if (e.getMessage() != null && e.getMessage().contains("410")) {
                    repo.delete(sub);
                }
            }
        }
    }

    public void notifyAdmins(String title, String body, String tag) {
        if (pushService == null) {
            log.warn(
                "[NOTIF] channel=WEBPUSH audience=admin status=SKIPPED error=missing_vapid_config (app.webpush.vapid-*)"
            );
            return;
        }
        notifyByRole(User.Role.SUPER_ADMIN, title, body, tag);
        notifyByRole(User.Role.MANAGER, title, body, tag);
    }

    /** Notifications « tournée » : managers + super admins + livreurs boutique. */
    public void notifyDeliveryAgents(String title, String body, String tag) {
        notifyByRole(User.Role.MANAGER, title, body, tag);
        notifyByRole(User.Role.SUPER_ADMIN, title, body, tag);
        notifyByRole(User.Role.DELIVERY_AGENT, title, body, tag);
    }

    /**
     * Envoie une notification push au(x) appareil(s) du client associé à un numéro de commande.
     */
    public void notifyCustomer(String orderNumber, String title, String body) {
        List<CustomerPushSubscription> subs = customerRepo.findByOrderNumber(orderNumber);
        if (subs.isEmpty()) return;

        String payload;
        try {
            payload = objectMapper.writeValueAsString(Map.of(
                "title", title,
                "body",  body,
                "tag",   "order-" + orderNumber
            ));
        } catch (Exception e) {
            log.error("Erreur sérialisation payload push client", e);
            return;
        }

        for (CustomerPushSubscription sub : subs) {
            try {
                Notification notification = new Notification(
                    sub.getEndpoint(),
                    sub.getP256dh(),
                    sub.getAuth(),
                    payload
                );
                pushService.send(notification);
            } catch (Exception e) {
                log.warn("Échec push client vers {} : {}", sub.getEndpoint(), e.getMessage());
                if (e.getMessage() != null && e.getMessage().contains("410")) {
                    customerRepo.delete(sub);
                }
            }
        }
    }
}