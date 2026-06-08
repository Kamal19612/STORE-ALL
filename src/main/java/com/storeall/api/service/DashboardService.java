package com.storeall.api.service;

import com.storeall.api.dto.DashboardStatsResponse;
import com.storeall.api.dto.DashboardStatsResponse.DailyStat;
import com.storeall.api.dto.DashboardStatsResponse.RecentOrder;
import com.storeall.api.entity.Order;
import com.storeall.api.repository.OrderRepository;
import com.storeall.api.repository.ProductRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class DashboardService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private ProductRepository productRepository;

    public void resetStatistics() {
        orderRepository.deleteAll();
    }

    @Transactional(readOnly = true)
    public DashboardStatsResponse getStatistics(Long storeId) {
        if (storeId == null) {
            log.warn("Dashboard stats demandées sans storeId — agrégats vides.");
            return buildEmptyStatistics();
        }

        Long pendingOrders   = orderRepository.countByStatusAndDeletedFalseAndStore_Id(Order.Status.PENDING, storeId);
        Long confirmedOrders = orderRepository.countByStatusAndDeletedFalseAndStore_Id(Order.Status.CONFIRMED, storeId);
        Long shippedOrders   = orderRepository.countByStatusAndDeletedFalseAndStore_Id(Order.Status.SHIPPED, storeId);
        Long deliveredOrders = orderRepository.countByStatusAndDeletedFalseAndStore_Id(Order.Status.DELIVERED, storeId);
        Long cancelledOrders = orderRepository.countByStatusAndDeletedFalseAndStore_Id(Order.Status.CANCELLED, storeId);
        Long rejectedOrders  = orderRepository.countByStatusAndDeletedFalseAndStore_Id(Order.Status.REJECTED, storeId);
        Long totalOrders     = pendingOrders + confirmedOrders + shippedOrders + deliveredOrders + cancelledOrders + rejectedOrders;
        Long totalProducts   = productRepository.countByStore_Id(storeId);
        BigDecimal totalRevenue = orderRepository.sumValidRevenueByStoreId(storeId);

        // ── Statistiques journalières 7 jours (boutique courante) ────────────
        List<Object[]> rawDaily = orderRepository.findDailyStatsLast7DaysByStore(storeId);
        Map<LocalDate, Object[]> byDate = rawDaily.stream()
                .collect(Collectors.toMap(
                    row -> ((java.sql.Date) row[0]).toLocalDate(),
                    row -> row
                ));

        List<DailyStat> dailyStats = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = LocalDate.now().minusDays(i);
            String label = day.getDayOfWeek()
                    .getDisplayName(TextStyle.SHORT, Locale.FRENCH);
            label = label.substring(0, 1).toUpperCase() + label.substring(1, Math.min(3, label.length()));

            Object[] row = byDate.get(day);
            long ordersCount = row != null ? ((Number) row[1]).longValue() : 0L;
            BigDecimal rev   = row != null ? new BigDecimal(row[2].toString()) : BigDecimal.ZERO;

            dailyStats.add(DailyStat.builder()
                    .date(label)
                    .orders(ordersCount)
                    .revenue(rev)
                    .build());
        }

        // ── Commandes récentes (boutique courante) ────────────────────────────
        List<Order> recent = orderRepository.findTop5ByDeletedFalseAndStore_IdOrderByCreatedAtDesc(storeId);
        List<RecentOrder> recentOrders = recent.stream().map(o -> RecentOrder.builder()
                .id(o.getId())
                .orderNumber(o.getOrderNumber())
                .customerName(o.getCustomerName())
                .total(o.getTotal())
                .status(o.getStatus().name())
                .createdAt(o.getCreatedAt() != null
                        ? o.getCreatedAt().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM HH:mm"))
                        : "")
                .build()
        ).collect(Collectors.toList());

        return DashboardStatsResponse.builder()
                .totalOrders(totalOrders)
                .totalProducts(totalProducts)
                .totalRevenue(totalRevenue)
                .pendingOrders(pendingOrders)
                .confirmedOrders(confirmedOrders)
                .shippedOrders(shippedOrders)
                .deliveredOrders(deliveredOrders)
                .cancelledOrders(cancelledOrders + rejectedOrders)
                .dailyStats(dailyStats)
                .recentOrders(recentOrders)
                .build();
    }

    /**
     * Réponse neutre si aucun tenant (ne devrait pas arriver sur GET /api/manager/{id}/dashboard/stats).
     */
    private DashboardStatsResponse buildEmptyStatistics() {
        List<DailyStat> dailyStats = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = LocalDate.now().minusDays(i);
            String label = day.getDayOfWeek()
                    .getDisplayName(TextStyle.SHORT, Locale.FRENCH);
            label = label.substring(0, 1).toUpperCase() + label.substring(1, Math.min(3, label.length()));
            dailyStats.add(DailyStat.builder()
                    .date(label)
                    .orders(0L)
                    .revenue(BigDecimal.ZERO)
                    .build());
        }
        return DashboardStatsResponse.builder()
                .totalOrders(0L)
                .totalProducts(0L)
                .totalRevenue(BigDecimal.ZERO)
                .pendingOrders(0L)
                .confirmedOrders(0L)
                .shippedOrders(0L)
                .deliveredOrders(0L)
                .cancelledOrders(0L)
                .dailyStats(dailyStats)
                .recentOrders(List.of())
                .build();
    }
}
