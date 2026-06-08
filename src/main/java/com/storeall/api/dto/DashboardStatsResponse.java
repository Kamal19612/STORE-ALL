package com.storeall.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStatsResponse {

    private Long totalOrders;
    private Long totalProducts;
    private BigDecimal totalRevenue;

    private Long pendingOrders;
    private Long confirmedOrders;
    private Long shippedOrders;
    private Long deliveredOrders;
    private Long cancelledOrders;

    /** Statistiques journalières des 7 derniers jours */
    private List<DailyStat> dailyStats;

    /** 5 commandes les plus récentes */
    private List<RecentOrder> recentOrders;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyStat {
        private String date;      // "lun.", "mar.", …
        private Long orders;
        private BigDecimal revenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecentOrder {
        private Long id;
        private String orderNumber;
        private String customerName;
        private BigDecimal total;
        private String status;
        private String createdAt;
    }
}
