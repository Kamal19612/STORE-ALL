package com.storeall.api.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.storeall.api.dto.ProductResponse;
import com.storeall.api.entity.Category;
import com.storeall.api.service.CategoryService;
import com.storeall.api.service.ProductService;

/**
 * Contrôleur REST public pour le catalogue (Produits et Catégories). Accessible
 * sans authentification (configuré dans SecurityConfig).
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api")
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private CategoryService categoryService;

    /**
     * GET /api/categories : Liste toutes les catégories actives.
     */
    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getAllCategories() {
        return ResponseEntity.ok(categoryService.getAllActiveCategories());
    }

    /**
     * GET /api/products : Liste paginée de tous les produits du magasin (ruptures et archivés inclus).
     * Filtres optionnels : ?category=1 ou ?search=gadget Pagination par défaut : 50 items.
     */
    @GetMapping("/products")
    public ResponseEntity<Page<ProductResponse>> getProducts(
            @RequestParam(required = false) Long category,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 50, sort = "id", direction = org.springframework.data.domain.Sort.Direction.DESC) Pageable pageable) {

        if (category != null) {
            return ResponseEntity.ok(productService.getProductsByCategory(category, pageable));
        }

        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(productService.searchProducts(search, pageable));
        }

        return ResponseEntity.ok(productService.getPublicCatalogPage(pageable));
    }

    /**
     * GET /api/products/full : catalogue complet du magasin (archivés + ruptures),
     * aligné {@code sucre-store} {@code fetchProductData} + tous les lignes avant pagination client.
     * Déclaré avant {@code /products/{slug}} pour éviter « full » comme slug.
     */
    @GetMapping("/products/full")
    public ResponseEntity<List<ProductResponse>> getFullPublicCatalog() {
        return ResponseEntity.ok(productService.getPublicCatalogFullList());
    }

    /**
     * GET /api/public/products/full : alias public sans collision avec /api/products/{slug}.
     */
    @GetMapping("/public/products/full")
    public ResponseEntity<List<ProductResponse>> getFullPublicCatalogPublicAlias() {
        return ResponseEntity.ok(productService.getPublicCatalogFullList());
    }

    /**
     * GET /api/products/top : Top 10 produits les plus commandés (pour le carrousel).
     */
    @GetMapping("/products/top")
    public ResponseEntity<List<ProductResponse>> getTopProducts(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(productService.getTopOrderedProducts(limit));
    }

    /**
     * GET /api/products/{slug} : Détail d'un produit.
     */
    // Exclude reserved literals like "full" and "top" from slug matching.
    @GetMapping("/products/{slug:^(?!full$|top$).+}")
    public ResponseEntity<ProductResponse> getProductDetail(@PathVariable String slug) {
        return ResponseEntity.ok(productService.getProductBySlug(slug));
    }
}
