package com.storeall.api.repository;

import com.storeall.api.entity.CustomerPushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerPushSubscriptionRepository extends JpaRepository<CustomerPushSubscription, Long> {
    Optional<CustomerPushSubscription> findByEndpoint(String endpoint);
    List<CustomerPushSubscription> findByOrderNumber(String orderNumber);

    @Modifying
    @Query("DELETE FROM CustomerPushSubscription c WHERE c.orderNumber IN :nums")
    void deleteByOrderNumberIn(@Param("nums") Collection<String> nums);
}