package com.storeall.api.repository;

import java.util.Collection;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.storeall.api.entity.DeliveryAssignment;

@Repository
public interface DeliveryAssignmentRepository extends JpaRepository<DeliveryAssignment, Long> {
    Optional<DeliveryAssignment> findByOrderId(Long orderId);

    @Modifying
    @Query("DELETE FROM DeliveryAssignment d WHERE d.order.id IN :ids")
    void deleteByOrder_IdIn(@Param("ids") Collection<Long> ids);
}

