package com.storeall.api.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.storeall.api.entity.Category;

/**
 * Repository pour l'accès aux données des Catégories.
 */
@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    /**
     * Trouve une catégorie par son slug.
     */
    Optional<Category> findBySlug(String slug);

    /**
     * Trouve une catégorie par son nom (ignore casse).
     */
    Optional<Category> findByNameIgnoreCase(String name);

    /**
     * Liste toutes les catégories actives.
     */
    List<Category> findByActiveTrue();

    // Multi-store scoped
    Optional<Category> findByNameIgnoreCaseAndStoreId(String name, Long storeId);
    Optional<Category> findBySlugAndStoreId(String slug, Long storeId);
    List<Category> findByActiveTrueAndStoreId(Long storeId);
    List<Category> findByStoreId(Long storeId);

    @Modifying
    @Query("DELETE FROM Category c WHERE c.store.id = :storeId")
    void deleteByStore_Id(@Param("storeId") Long storeId);
}
