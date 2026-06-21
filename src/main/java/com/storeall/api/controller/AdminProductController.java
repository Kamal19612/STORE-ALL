package com.storeall.api.controller;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.storeall.api.dto.ProductRequest;
import com.storeall.api.dto.ProductResponse;
import com.storeall.api.service.FileStorageService;
import com.storeall.api.service.ProductPdfService;
import com.storeall.api.service.ProductService;

/**
 * CRUD produits pour l'espace manager : {@code /api/manager/{storeId}/products}.
 * L'import CSV / Google Sheets reste sur {@link AdminImportController}.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/manager/{storeId}/products")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
public class AdminProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private ProductPdfService productPdfService;

    @Autowired
    private ObjectMapper objectMapper;

    /**
     * GET /api/manager/{storeId}/products : liste paginée (recherche optionnelle).
     */
    @GetMapping
    public ResponseEntity<Page<ProductResponse>> getAllProducts(
            @RequestParam(value = "search", required = false, defaultValue = "") String search,
            @PageableDefault(size = 20) Pageable pageable) {
        if (search != null && !search.trim().isEmpty()) {
            return ResponseEntity.ok(productService.searchProducts(search.trim(), pageable));
        }
        return ResponseEntity.ok(productService.getAllProducts(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductResponse> createProduct(
            @RequestPart("product") String productJson,
            @RequestPart(value = "mainImage", required = false) MultipartFile mainImageFile,
            @RequestPart(value = "image", required = false) MultipartFile legacyImageFile,
            @RequestPart(value = "secondaryImages", required = false) List<MultipartFile> secondaryImageFiles,
            @RequestPart(value = "templatePdf", required = false) MultipartFile templatePdfFile)
            throws IOException {

        ProductRequest request = objectMapper.readValue(productJson, ProductRequest.class);

        String imageUrl = request.getImageUrl();
        MultipartFile effectiveMain = (mainImageFile != null && !mainImageFile.isEmpty()) ? mainImageFile : legacyImageFile;
        if (effectiveMain != null && !effectiveMain.isEmpty()) {
            String fileName = fileStorageService.storeProductImage(effectiveMain);
            imageUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/uploads/")
                    .path(fileName)
                    .toUriString();
        }

        if (imageUrl == null || imageUrl.isBlank()) {
            throw new RuntimeException("L'image principale est obligatoire (fichier ou URL).");
        }

        List<String> secondaryUrls = buildSecondaryImageUrls(secondaryImageFiles);

        String templatePdfPath = null;
        if (templatePdfFile != null && !templatePdfFile.isEmpty()) {
            templatePdfPath = productPdfService.storeAndValidateTemplate(templatePdfFile);
        }

        return ResponseEntity.ok(productService.createProduct(request, imageUrl, secondaryUrls, templatePdfPath));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductResponse> updateProduct(
            @PathVariable Long id,
            @RequestPart("product") String productJson,
            @RequestPart(value = "mainImage", required = false) MultipartFile mainImageFile,
            @RequestPart(value = "image", required = false) MultipartFile legacyImageFile,
            @RequestPart(value = "secondaryImages", required = false) List<MultipartFile> secondaryImageFiles,
            @RequestPart(value = "templatePdf", required = false) MultipartFile templatePdfFile)
            throws IOException {

        ProductRequest request = objectMapper.readValue(productJson, ProductRequest.class);

        String imageUrl = request.getImageUrl();
        MultipartFile effectiveMain = (mainImageFile != null && !mainImageFile.isEmpty()) ? mainImageFile : legacyImageFile;
        if (effectiveMain != null && !effectiveMain.isEmpty()) {
            String fileName = fileStorageService.storeProductImage(effectiveMain);
            imageUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/uploads/")
                    .path(fileName)
                    .toUriString();
        }

        List<String> newSecondaryUrls = buildSecondaryImageUrls(secondaryImageFiles);

        String templatePdfPath = null;
        if (templatePdfFile != null && !templatePdfFile.isEmpty()) {
            templatePdfPath = productPdfService.storeAndValidateTemplate(templatePdfFile);
        }

        return ResponseEntity.ok(productService.updateProduct(
                id, request, imageUrl, newSecondaryUrls, templatePdfPath, request.isRemoveTemplatePdf()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.ok().build();
    }

    /**
     * DELETE /api/manager/{storeId}/products : vide le catalogue de la boutique courante uniquement.
     */
    @DeleteMapping
    public ResponseEntity<Map<String, Object>> deleteAllProducts() {
        int count = productService.deleteAllProductsForCurrentStore();
        return ResponseEntity.ok(Map.of(
                "message", "Catalogue vidé avec succès",
                "deletedCount", count
        ));
    }

    private List<String> buildSecondaryImageUrls(List<MultipartFile> secondaryImageFiles) throws IOException {
        List<String> secondaryUrls = new ArrayList<>();
        if (secondaryImageFiles == null) {
            return secondaryUrls;
        }
        if (secondaryImageFiles.size() > 5) {
            throw new RuntimeException("Maximum 5 images secondaires.");
        }
        for (MultipartFile file : secondaryImageFiles) {
            if (file == null || file.isEmpty()) {
                continue;
            }
            String fileName = fileStorageService.storeProductImage(file);
            String url = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/uploads/")
                    .path(fileName)
                    .toUriString();
            secondaryUrls.add(url);
        }
        return secondaryUrls;
    }
}
