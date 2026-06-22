package com.storeall.api.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.storeall.api.entity.Product;

/**
 * Repository pour l'accès aux données des Produits.
 */
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    /**
     * Trouve un produit via son slug (URL friendly name).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Product p WHERE p.id = :id")
    Optional<Product> findByIdForUpdate(@Param("id") Long id);

    Optional<Product> findBySlug(String slug);

    /**
     * Trouve un produit via son ID externe (provenant de Google Sheets).
     */
    Optional<Product> findByExternalId(String externalId);

    /**
     * Trouve tous les produits actifs, avec pagination.
     */
    Page<Product> findByActiveTrue(Pageable pageable);

    /**
     * Trouve tous les produits actifs (sans pagination) - pour synchronisation.
     */
    java.util.List<Product> findByActiveTrue();

    java.util.List<Product> findByActiveTrueAndStoreId(Long storeId);

    /**
     * Trouve les produits d'une catégorie spécifique.
     */
    Page<Product> findByCategoryIdAndActiveTrue(Long categoryId, Pageable pageable);

    /**
     * Recherche de produits par nom (contient, insensible à la casse).
     */
    Page<Product> findByNameContainingIgnoreCaseAndActiveTrue(String name, Pageable pageable);

    /**
     * Catalogue magasin sans filtre sur {@code active}, stock ou achat —
     * même jeu que la liste admin (rupture + archivés inclus).
     */
    @Query("SELECT p FROM Product p WHERE p.store.id = :storeId")
    Page<Product> findCatalogPageAllStatuses(@Param("storeId") Long storeId, Pageable pageable);

    /** Même jeu que {@link #findCatalogPageAllStatuses} mais liste complète (équivalent sucre-store avant {@code paginateProducts}). */
    @Query("SELECT p FROM Product p WHERE p.store.id = :storeId ORDER BY p.id DESC")
    List<Product> findCatalogListAllStatuses(@Param("storeId") Long storeId);

    /** Export CSV : catégorie chargée en une requête. */
    @Query("SELECT p FROM Product p JOIN FETCH p.category WHERE p.store.id = :storeId ORDER BY p.id ASC")
    List<Product> findCatalogListForExport(@Param("storeId") Long storeId);

    Page<Product> findByStoreIdAndCategoryId(Long storeId, Long categoryId, Pageable pageable);

    Page<Product> findByStoreIdAndNameContainingIgnoreCase(Long storeId, String name, Pageable pageable);

    // Multi-store scoped
    Optional<Product> findBySlugAndStoreId(String slug, Long storeId);
    Optional<Product> findByExternalIdAndStoreId(String externalId, Long storeId);
    Page<Product> findByActiveTrueAndStoreId(Long storeId, Pageable pageable);
    Page<Product> findByCategoryIdAndActiveTrueAndStoreId(Long categoryId, Long storeId, Pageable pageable);
    Page<Product> findByNameContainingIgnoreCaseAndActiveTrueAndStoreId(String name, Long storeId, Pageable pageable);

    /** Super admin : catalogue toutes boutiques ou une boutique ; recherche nom optionnelle. */
    @Query("""
        SELECT p FROM Product p
        WHERE (:storeId IS NULL OR p.store.id = :storeId)
        AND (:search IS NULL OR :search = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')))
        """)
    Page<Product> findSupervisionPage(
            @Param("storeId") Long storeId,
            @Param("search") String search,
            Pageable pageable);

    /**
     * Top N produits les plus commandés (par quantité totale dans les commandes).
     * Exclut les produits sans image.
     */
    @Query("SELECT oi.product FROM OrderItem oi " +
           "WHERE oi.product.active = true AND oi.product.mainImage IS NOT NULL AND oi.product.mainImage != '' " +
           "GROUP BY oi.product " +
           "ORDER BY SUM(oi.quantity) DESC")
    List<Product> findTopOrderedProducts(Pageable pageable);

    @Query("SELECT oi.product FROM OrderItem oi " +
           "WHERE oi.product.active = true AND oi.product.mainImage IS NOT NULL AND oi.product.mainImage != '' " +
           "AND oi.product.store.id = :storeId " +
           "GROUP BY oi.product " +
           "ORDER BY SUM(oi.quantity) DESC")
    List<Product> findTopOrderedProductsByStore(@org.springframework.data.repository.query.Param("storeId") Long storeId, Pageable pageable);

    /**
     * Trouve les N produits actifs avec images (pour fallback du carousel).
     */
    Page<Product> findByActiveTrueAndMainImageIsNotNullOrderByIdDesc(Pageable pageable);

    Page<Product> findByActiveTrueAndMainImageIsNotNullAndStoreIdOrderByIdDesc(Long storeId, Pageable pageable);

    /**
     * Supprime les lignes de commande liées aux produits d'une boutique (avant suppression catalogue boutique).
     */
    @Modifying
    @Query(value = "DELETE FROM order_items WHERE product_id IN (SELECT id FROM products WHERE store_id = :storeId)", nativeQuery = true)
    void deleteOrderItemsForStoreProducts(@Param("storeId") Long storeId);

    @Modifying
    @Query(value = "DELETE FROM order_items WHERE product_id = :productId", nativeQuery = true)
    void deleteOrderItemsForProduct(@Param("productId") Long productId);

    /**
     * Supprime tous les order_items (reset total multi-boutiques — usage restreint).
     */
    @Modifying
    @Query(value = "DELETE FROM order_items", nativeQuery = true)
    void deleteAllOrderItemsReferences();

    @Modifying
    @Query("DELETE FROM Product p WHERE p.store.id = :storeId")
    void deleteByStore_Id(@Param("storeId") Long storeId);

    long countByStore_Id(Long storeId);
}
