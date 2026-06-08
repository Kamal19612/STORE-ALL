package com.storeall.api.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.storeall.api.entity.Slider;

@Repository
public interface SliderRepository extends JpaRepository<Slider, Long> {

    List<Slider> findAllByActiveTrueOrderByDisplayOrderDesc();

    List<Slider> findAllByOrderByDisplayOrderDesc();

    // Multi-store scoped
    List<Slider> findAllByActiveTrueAndStoreIdOrderByDisplayOrderDesc(Long storeId);
    List<Slider> findAllByStoreIdOrderByDisplayOrderDesc(Long storeId);

    Optional<Slider> findByIdAndStore_Id(Long id, Long storeId);

    @Modifying
    @Query("DELETE FROM Slider s WHERE s.store.id = :storeId")
    void deleteByStore_Id(@Param("storeId") Long storeId);
}
