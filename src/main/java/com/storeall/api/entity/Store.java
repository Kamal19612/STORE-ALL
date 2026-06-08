package com.storeall.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Store = tenant (boutique) : une ligne par boutique.
 * Les entités {@code User}, {@code Category}, {@code Product}, {@code Order}, {@code Slider}, etc.
 * portent {@code store_id} pour isoler les données par boutique.
 */
@Entity
@Table(
    name = "stores",
    indexes = {
        @Index(name = "idx_store_code", columnList = "code"),
        @Index(name = "idx_store_domain", columnList = "domain")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Store {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    /**
     * Code court stable utilisé par le frontend via header X-Store-Code.
     */
    @Column(nullable = false, unique = true, length = 50)
    private String code;

    /**
     * Domaine principal (optionnel) pour résolution automatique par Host header.
     * Ex: "sucre.com", "spirit.com", "sucre.local".
     */
    @Column(unique = true, length = 255)
    private String domain;

    /** Téléphone de contact affiché aux clients (WhatsApp / appel). */
    @Column(length = 40)
    private String phone;

    /** Email de contact boutique (pas forcément un compte {@code User}). */
    @Column(name = "contact_email", length = 255)
    private String contactEmail;

    /** Lien carte (ex. Google Maps). */
    @Column(name = "maps_url", columnDefinition = "TEXT")
    private String mapsUrl;

    /** Identifiant Telegram (chat id) pour alertes / bot lié à cette boutique. */
    @Column(name = "telegram_id", length = 80)
    private String telegramId;

    /** URL publique du logo boutique (upload super admin ou URL externe). */
    @Column(name = "logo_url", length = 1024)
    private String logoUrl;

    /**
     * Si {@code false}, la vitrine et les API tenant (hors super-admin) refusent la résolution de cette boutique.
     */
    @Column(name = "active", nullable = false, columnDefinition = "boolean default true")
    @Builder.Default
    private boolean active = true;

    /**
     * Slug du modèle de vitrine publique (layout React). Ex. {@code default}, {@code minimal}.
     * @see com.storeall.api.vitrine.VitrineTemplate
     */
    @Column(name = "vitrine_template", nullable = false, length = 32)
    @Builder.Default
    private String vitrineTemplate = com.storeall.api.vitrine.VitrineTemplate.DEFAULT;

    /**
     * JSON optionnel : paramètres d’affichage propres au modèle vitrine (hero, recherche, accent, …).
     */
    @Column(name = "vitrine_config", columnDefinition = "TEXT")
    private String vitrineConfig;
}

