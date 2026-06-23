package com.storeall.api.repository;

import com.storeall.api.entity.AppSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AppSettingRepository extends JpaRepository<AppSetting, Long> {

    /** Première ligne pour cette clé (id croissant) — évite NonUniqueResultException si la même clé existe pour plusieurs boutiques. */
    Optional<AppSetting> findFirstByKeyOrderByIdAsc(String key);

    /** Délègue à {@link #findFirstByKeyOrderByIdAsc} ; préférer store-scoped quand c’est pertinent. */
    default Optional<AppSetting> findByKey(String key) {
        return findFirstByKeyOrderByIdAsc(key);
    }

    Optional<AppSetting> findByKeyAndStoreId(String key, Long storeId);

    Optional<AppSetting> findFirstByKeyAndStoreIdOrderByIdAsc(String key, Long storeId);

    java.util.List<AppSetting> findAllByStore_IdAndKeyOrderByIdAsc(Long storeId, String key);

    Optional<AppSetting> findFirstByKeyAndStoreIsNullOrderByIdAsc(String key);

    java.util.List<AppSetting> findAllByKeyAndStoreIsNullOrderByIdAsc(String key);

    /**
     * Backward compatibility: legacy global setting (store_id is NULL).
     */
    Optional<AppSetting> findByKeyAndStoreIsNull(String key);

    @Query("""
        SELECT a FROM AppSetting a
        WHERE a.key = 'telegram_chat_id' AND a.value = :chatId AND a.store IS NOT NULL
        """)
    java.util.List<AppSetting> findStoreSettingsByTelegramChatId(@Param("chatId") String chatId);

    @Modifying
    @Query("DELETE FROM AppSetting a WHERE a.store.id = :storeId")
    void deleteByStore_Id(@Param("storeId") Long storeId);
}
