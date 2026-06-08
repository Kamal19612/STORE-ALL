package com.storeall.api.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.storeall.api.entity.NotificationOutbox;

public interface NotificationOutboxRepository extends JpaRepository<NotificationOutbox, Long> {

    @Query("""
        select n from NotificationOutbox n
        where (n.status = 'PENDING' or n.status = 'RETRY')
          and n.nextAttemptAt <= :now
        order by n.nextAttemptAt asc, n.id asc
        """)
    List<NotificationOutbox> findDue(@Param("now") LocalDateTime now, Pageable pageable);

    @Modifying
    @Query("DELETE FROM NotificationOutbox n WHERE n.orderId IN :ids")
    void deleteByOrderIdIn(@Param("ids") java.util.Collection<Long> ids);
}

