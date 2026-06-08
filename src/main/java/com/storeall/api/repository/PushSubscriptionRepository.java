package com.storeall.api.repository;

import com.storeall.api.entity.PushSubscription;
import com.storeall.api.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {

    Optional<PushSubscription> findByEndpoint(String endpoint);

    List<PushSubscription> findByUserRole(User.Role role);

    @Modifying
    @Query("DELETE FROM PushSubscription p WHERE p.user.store.id = :storeId")
    void deleteByUser_Store_Id(@Param("storeId") Long storeId);
}