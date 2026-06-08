package com.storeall.api.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.storeall.api.entity.DeliveryDeviceToken;

public interface DeliveryDeviceTokenRepository extends JpaRepository<DeliveryDeviceToken, Long> {

    Optional<DeliveryDeviceToken> findByFcmToken(String fcmToken);

    List<DeliveryDeviceToken> findByUserUsernameAndIsActiveTrue(String username);

    List<DeliveryDeviceToken> findByUserRoleAndIsActiveTrue(com.storeall.api.entity.User.Role role);

    List<DeliveryDeviceToken> findByIsActiveTrueAndUser_Store_IdAndUser_Role(
        Long storeId,
        com.storeall.api.entity.User.Role role
    );

    @Modifying
    @Query("DELETE FROM DeliveryDeviceToken d WHERE d.user.store.id = :storeId")
    void deleteByUser_Store_Id(@Param("storeId") Long storeId);
}

