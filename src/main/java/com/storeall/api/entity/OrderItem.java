package com.storeall.api.entity;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Entité représentant une ligne de commande (un produit spécifique et sa
 * quantité).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "order_items")
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Commande à laquelle cet article appartient
     */
    @JsonIgnore // Évite la référence circulaire Order <-> OrderItem
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    /**
     * Produit commandé (snapshot, ou lie au produit actuel)
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    /**
     * Quantité commandée
     */
    @Column(nullable = false)
    private Integer quantity;

    /**
     * Prix unitaire au moment de la commande (pour figer le prix)
     */
    @Column(nullable = false)
    private BigDecimal unitPrice;

    /**
     * Prix total de la ligne (Quantité * Prix unitaire)
     */
    @Column(nullable = false)
    private BigDecimal totalPrice;

    /**
     * Chemin relatif du PDF rempli par le client (stockage privé).
     */
    @Column(name = "filled_pdf_url", length = 2048)
    private String filledPdfUrl;

    /**
     * Valeurs des champs du formulaire PDF (JSON).
     */
    @Column(name = "pdf_field_values", columnDefinition = "TEXT")
    private String pdfFieldValues;
}
