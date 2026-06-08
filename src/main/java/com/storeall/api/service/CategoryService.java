package com.storeall.api.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.storeall.api.entity.Category;
import com.storeall.api.repository.CategoryRepository;
import com.storeall.api.tenant.StoreContext;

/**
 * Service gérant la logique métier pour les catégories.
 */
@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    /**
     * Récupère toutes les catégories actives pour le menu de navigation.
     *
     * @return Liste des catégories actives.
     */
    @Transactional(readOnly = true)
    public List<Category> getAllActiveCategories() {
        Long storeId = StoreContext.getStoreIdOrNull();
        return categoryRepository.findByActiveTrueAndStoreId(storeId);
    }

    // --- Méthodes Admin ---
    @Transactional(readOnly = true)
    public List<Category> getAllCategories() {
        Long storeId = StoreContext.getStoreIdOrNull();
        // Admin scoped: only categories of store
        return categoryRepository.findByStoreId(storeId);
    }

    @Transactional
    public Category createCategory(Category category) {
        return categoryRepository.save(category);
    }

    @Transactional
    public Category updateCategory(Long id, Category categoryRequest) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie introuvable ID: " + id));
        category.setName(categoryRequest.getName());
        category.setSlug(categoryRequest.getSlug());
        category.setDescription(categoryRequest.getDescription());
        category.setActive(categoryRequest.isActive());
        return categoryRepository.save(category);
    }

    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie introuvable ID: " + id));
        category.setActive(false); // Soft delete
        categoryRepository.save(category);
    }
}
