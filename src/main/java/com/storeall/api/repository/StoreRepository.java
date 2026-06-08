package com.storeall.api.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.storeall.api.entity.Store;

@Repository
public interface StoreRepository extends JpaRepository<Store, Long> {
    Optional<Store> findByCode(String code);
    Optional<Store> findByDomain(String domain);
    Optional<Store> findByTelegramId(String telegramId);
}

