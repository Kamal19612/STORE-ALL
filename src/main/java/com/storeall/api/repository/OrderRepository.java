package com.storeall.api.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.storeall.api.entity.Order;

/**
 * Repository pour l'accès aux données des Commandes.
 */
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    /**
     * Trouve une commande par son numéro unique public.
     */
    Optional<Order> findByOrderNumber(String orderNumber);

    /**
     * Trouve les commandes ayant l'un des statuts donnés.
     */
    Page<Order> findByStatusIn(List<Order.Status> statuses, Pageable pageable);

    /**
     * Compte le nombre de commandes par statut
     */
    Long countByStatus(Order.Status status);

    /**
     * Chiffre d'affaires réel pour une boutique : confirmées + livrées (+ en route), non supprimées.
     */
    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.store.id = :storeId "
        + "AND o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED') AND o.deleted = false")
    BigDecimal sumValidRevenueByStoreId(@Param("storeId") Long storeId);

    /**
     * Statistiques journalières des 7 derniers jours pour une boutique.
     */
    @Query(value = """
        SELECT CAST(o.created_at AS DATE), COUNT(o.id), COALESCE(SUM(o.total), 0)
        FROM orders o
        WHERE o.deleted = false AND o.store_id = :storeId AND o.created_at >= CURRENT_DATE - 6
        GROUP BY CAST(o.created_at AS DATE)
        ORDER BY CAST(o.created_at AS DATE)
        """, nativeQuery = true)
    List<Object[]> findDailyStatsLast7DaysByStore(@Param("storeId") Long storeId);

    /**
     * 5 commandes les plus récentes non supprimées pour une boutique.
     */
    List<Order> findTop5ByDeletedFalseAndStore_IdOrderByCreatedAtDesc(Long storeId);

    Long countByStatusAndDeletedFalseAndStore_Id(Order.Status status, Long storeId);

    /**
     * Chiffre d'affaires réel toutes boutiques (compat. code existant hors dashboard tenant).
     */
    @Query("SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.status IN ('CONFIRMED', 'SHIPPED', 'DELIVERED') AND o.deleted = false")
    BigDecimal sumValidRevenue();

    /**
     * Compte les commandes non supprimées par statut.
     */
    @Query("SELECT COUNT(o) FROM Order o WHERE o.status = :status AND o.deleted = false")
    Long countByStatusAndNotDeleted(@org.springframework.data.repository.query.Param("status") Order.Status status);

    /**
     * Trouve les commandes disponibles pour livraison (CONFIRMED et pas de
     * livreur).
     */
    @EntityGraph(attributePaths = {"store"})
    Page<Order> findByStatusAndDeliveryAgentNullAndDeletedFalse(Order.Status status, Pageable pageable);

    /**
     * Commandes livraison uniquement (exclut retrait boutique) — pool livreurs.
     */
    @EntityGraph(attributePaths = {"store"})
    @Query("""
        SELECT o FROM Order o
        WHERE o.status = :status
          AND o.deliveryAgent IS NULL
          AND o.deleted = false
          AND (o.fulfillmentType IS NULL OR o.fulfillmentType = com.storeall.api.entity.FulfillmentType.DELIVERY)
        """)
    Page<Order> findDeliveryAvailableByStatus(@Param("status") Order.Status status, Pageable pageable);

    @EntityGraph(attributePaths = {"store"})
    @Query("""
        SELECT o FROM Order o
        WHERE o.status = :status
          AND o.deliveryAgent IS NULL
          AND o.deleted = false
          AND o.store.id = :storeId
          AND (o.fulfillmentType IS NULL OR o.fulfillmentType = com.storeall.api.entity.FulfillmentType.DELIVERY)
        """)
    Page<Order> findDeliveryAvailableByStatusAndStore_Id(
        @Param("status") Order.Status status,
        @Param("storeId") Long storeId,
        Pageable pageable);

    /**
     * Trouve les commandes par statut (utilisé par le bot Telegram).
     */
    List<Order> findTop10ByStatusOrderByIdDesc(Order.Status status);

    /** Commandes en attente pour une boutique (bot Telegram /commandes). */
    @EntityGraph(attributePaths = {"store"})
    List<Order> findTop10ByStatusAndStore_IdOrderByIdDesc(Order.Status status, Long storeId);

    /**
     * Trouve les commandes modifiées après une certaine date.
     */
    List<Order> findByUpdatedAtAfter(java.time.LocalDateTime lastSync);

    List<Order> findByUpdatedAtAfterAndStore_Id(java.time.LocalDateTime lastSync, Long storeId);

    /**
     * Trouve les commandes assignées à un livreur spécifique avec certains
     * statuts.
     */
    @EntityGraph(attributePaths = {"store"})
    Page<Order> findByDeliveryAgentUsernameAndStatusInAndDeletedFalse(
        String username, List<Order.Status> statuses, Pageable pageable);

    /**
     * Trouve toutes les commandes non supprimées (soft delete).
     */
    Page<Order> findByDeletedFalse(Pageable pageable);

    /** Super admin : toutes les commandes ou filtre {@code storeId}. */
    @Query("SELECT o FROM Order o WHERE o.deleted = false AND (:storeId IS NULL OR o.store.id = :storeId)")
    Page<Order> findSupervisionPage(@Param("storeId") Long storeId, Pageable pageable);

    // Multi-store scoped
    Page<Order> findByDeletedFalseAndStoreId(Long storeId, Pageable pageable);
    Optional<Order> findByIdAndStoreId(Long id, Long storeId);

    /** Webhook Telegram (thread async) : charge la boutique pour fixer {@link com.storeall.api.tenant.StoreContext}. */
    @Query("SELECT o FROM Order o LEFT JOIN FETCH o.store WHERE o.id = :id AND o.deleted = false")
    Optional<Order> findByIdWithStore(@Param("id") Long id);
    @EntityGraph(attributePaths = {"store"})
    Page<Order> findByStatusAndDeliveryAgentNullAndDeletedFalseAndStore_Id(
        Order.Status status, Long storeId, Pageable pageable);

    @EntityGraph(attributePaths = {"store"})
    Page<Order> findByDeliveryAgentUsernameAndStatusInAndDeletedFalseAndStore_Id(
        String username, List<Order.Status> statuses, Long storeId, Pageable pageable);

    /**
     * Export Google Sheets: toutes les commandes non supprimées.
     */
    @Query("SELECT o FROM Order o WHERE o.deleted = false ORDER BY o.createdAt DESC")
    List<Order> findAllNotDeletedForExport();

    @Query("SELECT o FROM Order o WHERE o.deleted = false AND o.store.id = :storeId ORDER BY o.createdAt DESC")
    List<Order> findAllNotDeletedForExportByStore(@org.springframework.data.repository.query.Param("storeId") Long storeId);

    /**
     * Statistiques journalières des 7 derniers jours : [date, nbCommandes, revenu].
     * Retourne Object[] : [0]=LocalDate, [1]=Long count, [2]=BigDecimal sum
     */
    @Query(value = """
        SELECT CAST(o.created_at AS DATE), COUNT(o.id), COALESCE(SUM(o.total), 0)
        FROM orders o
        WHERE o.deleted = false AND o.created_at >= CURRENT_DATE - 6
        GROUP BY CAST(o.created_at AS DATE)
        ORDER BY CAST(o.created_at AS DATE)
        """, nativeQuery = true)
    List<Object[]> findDailyStatsLast7Days();

    /**
     * 5 commandes les plus récentes non supprimées.
     */
    List<Order> findTop5ByDeletedFalseOrderByCreatedAtDesc();

    /** Suppression boutique : toutes les commandes du tenant (y compris soft-deleted). */
    List<Order> findByStore_Id(Long storeId);
}
