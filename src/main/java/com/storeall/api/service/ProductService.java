package com.storeall.api.service;

import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.Reader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.opencsv.CSVReader;
import com.opencsv.CSVReaderBuilder;
import com.opencsv.CSVWriter;
import com.storeall.api.dto.ImportSummary;
import com.storeall.api.dto.ProductRequest;
import com.storeall.api.dto.ProductResponse;
import com.storeall.api.util.MediaUrlUtils;
import com.storeall.api.entity.Category;
import com.storeall.api.entity.Product;
import com.storeall.api.entity.Store;
import com.storeall.api.repository.ProductRepository;
import com.storeall.api.repository.StoreRepository;
import com.storeall.api.tenant.StoreContext;
import com.storeall.api.util.ExternalIdNormalizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Service gérant la logique métier pour les produits.
 */
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private StoreRepository storeRepository;

    /**
     * Liste paginée pour le catalogue public : tous les produits du magasin (même liste que l’admin),
     * sans filtre sur archivés ({@code active}) ni sur le stock ({@link #findCatalogPageAllStatuses}).
     */
    private Page<Product> paginateCatalogForCurrentStore(Pageable pageable) {
        Long storeId = StoreContext.getStoreIdOrNull();
        if (storeId == null) {
            log.warn("Catalogue produits : aucun magasin résolu (StoreContext) — retour page vide "
                + "pour éviter une requête ambiguë (ex. STORE_ID IS NULL).");
            return Page.empty(pageable);
        }
        Page<Product> page = productRepository.findCatalogPageAllStatuses(storeId, pageable);
        log.debug("Catalogue storeId={} : page {} / {} — {} lignes dans la page (total {})",
            storeId, page.getNumber() + 1, Math.max(1, page.getTotalPages()),
            page.getNumberOfElements(), page.getTotalElements());
        return page;
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> getPublicCatalogPage(Pageable pageable) {
        return paginateCatalogForCurrentStore(pageable).map(this::mapToResponse);
    }

    /**
     * Catalogue complet du magasin en une fois (sans pagination), comme {@code getProducts()}
     * dans {@code sucre-store/functions.php} avant {@code paginateProducts}.
     */
    @Transactional(readOnly = true)
    public List<ProductResponse> getPublicCatalogFullList() {
        Long storeId = StoreContext.getStoreIdOrNull();
        if (storeId == null) {
            log.warn("Catalogue produits complet : aucun magasin résolu — liste vide.");
            return List.of();
        }
        List<ProductResponse> list = productRepository.findCatalogListAllStatuses(storeId).stream()
                .map(this::mapToResponse)
                .toList();
        log.debug("Catalogue complet storeId={} : {} produit(s)", storeId, list.size());
        return list;
    }

    /**
     * Liste paginée par catégorie (tous les produits du magasin dans cette catégorie).
     */
    @Transactional(readOnly = true)
    public Page<ProductResponse> getProductsByCategory(Long categoryId, Pageable pageable) {
        Long storeId = StoreContext.getStoreIdOrNull();
        return productRepository.findByStoreIdAndCategoryId(storeId, categoryId, pageable)
                .map(this::mapToResponse);
    }

    /**
     * Recherche par nom (tous les produits du magasin correspondant au texte).
     */
    @Transactional(readOnly = true)
    public Page<ProductResponse> searchProducts(String query, Pageable pageable) {
        Long storeId = StoreContext.getStoreIdOrNull();
        return productRepository.findByStoreIdAndNameContainingIgnoreCase(storeId, query, pageable)
                .map(this::mapToResponse);
    }

    /**
     * Récupère le détail d'un produit via son slug.
     */
    @Transactional(readOnly = true)
    public ProductResponse getProductBySlug(String slug) {
        Long storeId = StoreContext.getStoreIdOrNull();
        Product product = productRepository.findBySlugAndStoreId(slug, storeId)
                .orElseThrow(() -> new RuntimeException("Produit introuvable : " + slug));

        return mapToResponse(product);
    }

    private String normalizeProductImageUrl(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return imageUrl;
        }
        return MediaUrlUtils.normalizeImageUrl(imageUrl);
    }

    /**
     * Mapper utilitaire : Convertit une Entité Product en DTO ProductResponse.
     */
    private ProductResponse mapToResponse(Product product) {
        return ProductResponse.builder()
                .id(product.getId())
                .name(product.getName())
                .slug(product.getSlug())
                .shortDescription(product.getShortDescription())
                .description(product.getDescription())
                .volumeWeight(product.getVolumeWeight()) // Volume/Poids
                .price(product.getPrice())
                .oldPrice(product.getOldPrice())
                .mainImage(MediaUrlUtils.normalizeImageUrl(product.getMainImage()))
                .secondaryImages(product.getSecondaryImages() == null ? List.of()
                    : product.getSecondaryImages().stream().map(MediaUrlUtils::normalizeImageUrl).toList())
                .categoryName(product.getCategory().getName())
                .categorySlug(product.getCategory().getSlug())
                .categoryId(product.getCategory().getId()) // Mappage ID Catégorie
                .stock(product.getStock()) // Mappage Stock réel
                .externalId(product.getExternalId()) // Mappage External ID
                .purchaseAllowed(product.isPurchaseAllowed())
                .available(product.isPurchaseAllowed()
                    && product.getStock() != null
                    && product.getStock() > 0
                    && product.isActive())
                .active(product.isActive()) // Mappage statut actif réel
                .created(false) // Par défaut false, surchargé lors de l'import
                .build();
    }

    /**
     * Récupère les N produits les plus commandés (pour le carrousel public).
     * Si aucune commande n'existe, retourne les produits actifs les plus récents avec images.
     */
    @Transactional(readOnly = true)
    public List<ProductResponse> getTopOrderedProducts(int limit) {
        Long storeId = StoreContext.getStoreIdOrNull();
        List<Product> topProducts = productRepository.findTopOrderedProductsByStore(storeId, PageRequest.of(0, limit));

        // Fallback : Si aucun produit commandé ou moins que la limite, compléter avec les produits actifs récents
        if (topProducts.size() < limit) {
            Page<Product> recentProducts = productRepository
                .findByActiveTrueAndMainImageIsNotNullAndStoreIdOrderByIdDesc(storeId, PageRequest.of(0, limit));

            // Fusionner les listes en évitant les doublons
            List<Product> combined = new java.util.ArrayList<>(topProducts);
            for (Product product : recentProducts.getContent()) {
                if (!combined.contains(product) && combined.size() < limit) {
                    combined.add(product);
                }
            }
            topProducts = combined;
        }

        return topProducts.stream()
                .filter(p -> p.getMainImage() != null && !p.getMainImage().isEmpty())
                .map(this::mapToResponse)
                .toList();
    }

    // --- Méthodes Admin ---
    /**
     * Récupère tous les produits (actifs et inactifs) pour l'admin.
     */
    @Transactional(readOnly = true)
    public Page<ProductResponse> getAllProducts(Pageable pageable) {
        return paginateCatalogForCurrentStore(pageable).map(this::mapToResponse);
    }

    /**
     * Récupère un produit par son ID pour l'admin.
     */
    @Transactional(readOnly = true)
    public ProductResponse getProductById(Long id) {
        Long storeId = StoreContext.getStoreIdOrNull();
        Product product = productRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Produit introuvable ID: " + id));
        if (product.getStore() == null || product.getStore().getId() == null || !product.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Produit introuvable ID: " + id);
        }
        return mapToResponse(product);
    }

    @Autowired
    private com.storeall.api.repository.CategoryRepository categoryRepository;

    /**
     * Crée un nouveau produit.
     */
    @Transactional
    public ProductResponse createProduct(com.storeall.api.dto.ProductRequest request, String imageUrl,
            List<String> secondaryImageUrls) {
        Long storeId = StoreContext.getStoreIdOrNull();
        Product product = Product.builder()
                .store(com.storeall.api.entity.Store.builder().id(storeId).build())
                .name(request.getName())
                .slug(request.getSlug())
                .shortDescription(request.getShortDescription())
                .description(request.getDescription())
                .price(request.getPrice())
                .oldPrice(request.getOldPrice())
                .stock(request.getStock())
                .active(request.isActive())
                .purchaseAllowed(request.isPurchaseAllowed())
                .mainImage(normalizeProductImageUrl(imageUrl))
                .secondaryImages(secondaryImageUrls == null ? new ArrayList<>() : new ArrayList<>(secondaryImageUrls))
                .category(resolveCategory(request))
                .build();

        return mapToResponse(productRepository.save(product));
    }

    /**
     * Met à jour un produit existant.
     */
    @Transactional
    public ProductResponse updateProduct(Long id, com.storeall.api.dto.ProductRequest request, String imageUrl,
            List<String> newSecondaryImageUrls) {
        Long storeId = StoreContext.getStoreIdOrNull();
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produit introuvable ID: " + id));
        if (product.getStore() == null || product.getStore().getId() == null || !product.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Produit introuvable ID: " + id);
        }

        product.setName(request.getName());
        product.setSlug(request.getSlug());
        product.setShortDescription(request.getShortDescription());
        product.setDescription(request.getDescription());
        product.setPrice(request.getPrice());
        product.setOldPrice(request.getOldPrice());
        product.setStock(request.getStock());
        product.setActive(request.isActive());
        product.setPurchaseAllowed(request.isPurchaseAllowed());

        // Mettre à jour l'image seulement si une nouvelle est fournie
        if (imageUrl != null && !imageUrl.isEmpty()) {
            product.setMainImage(normalizeProductImageUrl(imageUrl));
        }

        // Images secondaires : la requête fournit la liste "conservée" (ordre inclus),
        // puis on concatène les nouvelles images uploadées (si présentes).
        List<String> keptSecondary = request.getSecondaryImages() == null
                ? new ArrayList<>()
                : new ArrayList<>(request.getSecondaryImages());
        if (newSecondaryImageUrls != null && !newSecondaryImageUrls.isEmpty()) {
            keptSecondary.addAll(newSecondaryImageUrls);
        }
        product.setSecondaryImages(keptSecondary);

        // Gestion Catégorie (ID ou Nom)
        Category category = resolveCategory(request);
        if (!product.getCategory().getId().equals(category.getId())) {
            product.setCategory(category);
        }

        return mapToResponse(productRepository.save(product));
    }

    /**
     * Suppression définitive d’un produit (admin manager / super).
     * Les lignes de commande liées sont retirées pour respecter les contraintes FK.
     */
    @Transactional
    public void deleteProduct(Long id) {
        Long storeId = StoreContext.getStoreIdOrNull();
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Produit introuvable ID: " + id));
        if (product.getStore() == null || product.getStore().getId() == null || !product.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Produit introuvable ID: " + id);
        }

        productRepository.deleteOrderItemsForProduct(id);
        productRepository.deleteById(id);
        log.info("Produit supprimé définitivement id={} storeId={}", id, storeId);
    }

    /**
     * Supprime définitivement tous les produits d'une boutique (par id).
     * Supprime d'abord les {@code order_items} liés à ces produits (contraintes FK).
     */
    @Transactional
    public int deleteAllProductsForStoreId(Long storeId) {
        if (storeId == null) {
            throw new IllegalArgumentException("storeId requis pour vider le catalogue d'une boutique.");
        }
        int count = (int) productRepository.countByStore_Id(storeId);
        productRepository.deleteOrderItemsForStoreProducts(storeId);
        productRepository.deleteByStore_Id(storeId);
        return count;
    }

    /**
     * Supprime définitivement tous les produits de la boutique courante ({@link StoreContext}).
     * Les autres boutiques ne sont pas affectées.
     */
    @Transactional
    public int deleteAllProductsForCurrentStore() {
        Long storeId = StoreContext.getStoreIdOrNull();
        if (storeId == null) {
            throw new IllegalStateException("Aucune boutique en contexte pour vider le catalogue.");
        }
        return deleteAllProductsForStoreId(storeId);
    }

    /**
     * Supprime définitivement tous les produits de toutes les boutiques (reset total).
     * Réservé aux usages internes / super-admin hors API manager.
     */
    @Transactional
    public int deleteAllProducts() {
        int count = (int) productRepository.count();
        // Supprimer les order_items référençant des produits (via requête native)
        productRepository.deleteAllOrderItemsReferences();
        productRepository.deleteAll();
        return count;
    }

    /**
     * Helper pour trouver ou créer une catégorie selon la requête.
     */
    private Category resolveCategory(com.storeall.api.dto.ProductRequest request) {
        Long storeId = StoreContext.getStoreIdOrNull();
        // Priorité 1: Recherche par ID si présent
        if (request.getCategoryId() != null) {
            Category c = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new RuntimeException("Catégorie introuvable ID: " + request.getCategoryId()));
            if (c.getStore() == null || c.getStore().getId() == null || !c.getStore().getId().equals(storeId)) {
                throw new RuntimeException("Catégorie introuvable ID: " + request.getCategoryId());
            }
            return c;
        }

        // Priorité 2: Recherche ou Création par Nom
        if (request.getCategoryName() != null && !request.getCategoryName().trim().isEmpty()) {
            String name = request.getCategoryName().trim();
            return categoryRepository.findByNameIgnoreCaseAndStoreId(name, storeId)
                    .orElseGet(() -> createNewCategory(name, storeId));
        }

        throw new RuntimeException("Une catégorie (ID ou Nom) est requise.");
    }

    private Category createNewCategory(String name, Long storeId) {
        // Crée un slug basique
        String slug = name.toLowerCase()
                .replaceAll("[^a-z0-9]", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");

        Category newCategory = Category.builder()
                .store(com.storeall.api.entity.Store.builder().id(storeId).build())
                .name(name)
                .slug(slug)
                .active(true)
                .build();

        return categoryRepository.save(newCategory);
    }

    /**
     * Importe un produit (Création ou Mise à jour basée sur l'ExternalId puis
     * Slug). Méthode transactionnelle isolée pour permettre le traitement par
     * lots "Best Effort".
     */
    @Transactional
    public ProductResponse importProduct(com.storeall.api.dto.ProductRequest request, String imageUrl, String externalId) {
        log.info("🚀 [IMPORT] ImportProduit - Nom: {}, ExternalID: {}, Slug: {}, Stock: {}, Active: {}",
            request.getName(), externalId, request.getSlug(), request.getStock(), request.isActive());

        if (StoreContext.getStoreIdOrNull() == null) {
            throw new IllegalStateException(
                "Import impossible : aucune boutique courante (StoreContext). Utilisez l’espace manager (/api/manager/{id}/…) ou un en-tête X-Store-Code valide.");
        }

        // Validation basique
        if (request.getSlug() == null || request.getSlug().isEmpty()) {
            log.error("❌ [IMPORT] Slug manquant pour le produit: {}", request.getName());
            throw new RuntimeException("Le slug est obligatoire pour l'import");
        }

        // PRIORITÉ 1: Recherche par ExternalId (si fourni et non vide)
        if (externalId != null && !externalId.trim().isEmpty()) {
            log.debug("🔍 [IMPORT] Recherche par ExternalId: {}", externalId);
            Long storeId = StoreContext.getStoreIdOrNull();
            Optional<Product> existingByExternalId = productRepository.findByExternalIdAndStoreId(externalId, storeId);
            if (existingByExternalId.isPresent()) {
                // Mise à jour du produit existant
                log.info("🔄 [IMPORT] Produit existant trouvé par ExternalId: {}", externalId);
                Product existingProduct = existingByExternalId.get();

                existingProduct.setName(request.getName());
                existingProduct.setShortDescription(request.getShortDescription());
                existingProduct.setDescription(request.getDescription());
                existingProduct.setVolumeWeight(request.getVolumeWeight()); // Volume/Poids
                existingProduct.setPrice(request.getPrice());
                existingProduct.setStock(request.getStock());
                existingProduct.setActive(request.isActive());
                existingProduct.setPurchaseAllowed(request.isPurchaseAllowed());

                // NE PAS régénérer le slug - garder l'ancien pour éviter les liens cassés
                if (imageUrl != null && !imageUrl.isEmpty()) {
                    existingProduct.setMainImage(normalizeProductImageUrl(imageUrl));
                }

                // Synchro catégorie
                Category category = resolveCategory(request);
                if (!existingProduct.getCategory().getId().equals(category.getId())) {
                    existingProduct.setCategory(category);
                }

                Product saved = productRepository.save(existingProduct);
                log.info("✅ [IMPORT] Produit mis à jour - ID: {}, Nom: {}, Active: {}", saved.getId(), saved.getName(), saved.isActive());
                ProductResponse response = mapToResponse(saved);
                response.setCreated(false);
                return response;
            } else {
                log.debug("🔍 [IMPORT] Aucun produit trouvé avec ExternalId: {}", externalId);
            }
        }

        // PRIORITÉ 2: Recherche par Slug (pour compatibilité avec anciens produits sans externalId)
        log.debug("🔍 [IMPORT] Recherche par Slug: {}", request.getSlug());
        Long storeId = StoreContext.getStoreIdOrNull();
        return productRepository.findBySlugAndStoreId(request.getSlug(), storeId)
                .map(existingProduct -> {
                    // ID Sheet : renseigné → on le fixe ; vide → on retire l’ancien (évite désactivation « absent du Sheet »).
                    if (externalId != null && !externalId.trim().isEmpty()) {
                        existingProduct.setExternalId(externalId.trim());
                    } else {
                        existingProduct.setExternalId(null);
                    }

                    existingProduct.setName(request.getName());
                    existingProduct.setShortDescription(request.getShortDescription());
                    existingProduct.setDescription(request.getDescription());
                    existingProduct.setPrice(request.getPrice());
                    existingProduct.setStock(request.getStock());
                    existingProduct.setActive(request.isActive());
                    existingProduct.setPurchaseAllowed(request.isPurchaseAllowed());

                    if (imageUrl != null && !imageUrl.isEmpty()) {
                        existingProduct.setMainImage(normalizeProductImageUrl(imageUrl));
                    }

                    Category category = resolveCategory(request);
                    if (!existingProduct.getCategory().getId().equals(category.getId())) {
                        existingProduct.setCategory(category);
                    }

                    Product saved = productRepository.save(existingProduct);
                    log.info("✅ [IMPORT] Produit mis à jour via Slug - ID: {}, Nom: {}, Active: {}", saved.getId(), saved.getName(), saved.isActive());
                    ProductResponse response = mapToResponse(saved);
                    response.setCreated(false);
                    return response;
                })
                .orElseGet(() -> {
                    // NOUVEAU produit - création avec externalId
                    log.info("➕ [IMPORT] Aucun produit existant, création d'un nouveau produit");
                    return createProductWithExternalId(request, imageUrl, externalId);
                });
    }

    /**
     * Crée un nouveau produit avec externalId (helper pour l'import).
     */
    public ProductResponse createProductWithExternalId(com.storeall.api.dto.ProductRequest request, String imageUrl, String externalId) {
        log.info("➕ [IMPORT] Création nouveau produit - Nom: {}, ExternalID: {}, Active: {}", request.getName(), externalId, request.isActive());

        Product product = new Product();
        Long storeId = StoreContext.getStoreIdOrNull();
        product.setStore(com.storeall.api.entity.Store.builder().id(storeId).build());
        product.setExternalId(
            externalId != null && !externalId.isBlank() ? externalId.trim() : null);
        product.setName(request.getName());
        product.setSlug(request.getSlug());
        product.setShortDescription(request.getShortDescription());
        product.setDescription(request.getDescription());
        product.setVolumeWeight(request.getVolumeWeight()); // Volume/Poids
        product.setPrice(request.getPrice());
        product.setStock(request.getStock());
        product.setActive(request.isActive());
        product.setPurchaseAllowed(request.isPurchaseAllowed());
        product.setMainImage(normalizeProductImageUrl(imageUrl));

        // Catégorie
        Category category = resolveCategory(request);
        log.debug("🏷️ [IMPORT] Catégorie résolue: {} (ID: {})", category.getName(), category.getId());
        product.setCategory(category);

        Product saved = productRepository.save(product);
        log.info("✅ [IMPORT] Nouveau produit CRÉÉ - ID: {}, Nom: {}, Active: {}, Stock: {}",
            saved.getId(), saved.getName(), saved.isActive(), saved.getStock());
        ProductResponse response = mapToResponse(saved);
        response.setCreated(true);
        return response;
    }

    /**
     * Traite un fichier CSV uploadé pour importer des produits (tenant courant).
     * Si au moins une ligne fournit un {@code externalId}, les produits actifs avec ID externe absents du fichier sont désactivés (comme l’import Sheet).
     */
    @Transactional
    public ImportSummary processCsvImport(MultipartFile file) {
        ImportSummary summary = new ImportSummary();
        Set<String> importedExternalKeys = new HashSet<>();

        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
             CSVReader csvReader = new CSVReaderBuilder(reader).withSkipLines(1).build()) {

            List<String[]> rows = csvReader.readAll();
            int rowNum = 2;

            for (String[] row : rows) {
                summary.incrementTotal();
                try {
                    importCsvLegacySevenColumns(row, rowNum, summary, importedExternalKeys);
                } catch (Exception e) {
                    summary.addError(rowNum, "Erreur inattendue: " + e.getMessage());
                }
                rowNum++;
            }

        } catch (Exception e) {
            log.error("Erreur lors de la lecture du CSV", e);
            throw new RuntimeException("Erreur de parsing CSV: " + e.getMessage());
        }

        if (!importedExternalKeys.isEmpty()) {
            deactivateProductsNotInExternalIdSet(importedExternalKeys, summary);
        }
        return summary;
    }

    /**
     * Export catalogue (même format que {@link #processCsvImport}) pour une boutique.
     */
    @Transactional(readOnly = true)
    public byte[] exportCatalogCsv(Long storeId) {
        if (storeId == null) {
            throw new IllegalArgumentException("storeId requis");
        }
        List<Product> list = productRepository.findCatalogListForExport(storeId);
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        try (OutputStreamWriter osw = new OutputStreamWriter(bos, StandardCharsets.UTF_8);
             CSVWriter writer = new CSVWriter(osw)) {
            writer.writeNext(new String[]{"Nom", "Catégorie", "Prix", "ImageURL", "Description", "Stock", "ExternalId"});
            for (Product p : list) {
                String cat = p.getCategory() != null ? p.getCategory().getName() : "";
                String desc = p.getDescription() == null ? "" : p.getDescription();
                String ext = p.getExternalId() == null ? "" : p.getExternalId();
                String price = p.getPrice() != null ? p.getPrice().toPlainString() : "0";
                String img = p.getMainImage() == null ? "" : p.getMainImage();
                int st = p.getStock() != null ? p.getStock() : 0;
                writer.writeNext(new String[]{
                        p.getName(),
                        cat,
                        price,
                        img,
                        desc,
                        String.valueOf(st),
                        ext
                });
            }
        } catch (java.io.IOException e) {
            throw new RuntimeException("Export CSV: " + e.getMessage(), e);
        }
        return withUtf8Bom(bos.toByteArray());
    }

    /**
     * Désactive les produits actifs ayant un {@code externalId} non présent dans l’ensemble (Sheet ou CSV).
     */
    @Transactional
    public void deactivateProductsNotInExternalIdSet(Set<String> sheetExternalIds, ImportSummary summary) {
        Long storeId = StoreContext.getStoreIdOrNull();
        if (storeId == null) {
            log.warn("Désactivation absents ignorée : aucun magasin (StoreContext).");
            return;
        }
        if (sheetExternalIds == null || sheetExternalIds.isEmpty()) {
            log.info("Désactivation absents ignorée : aucun ID externe collecté sur la source.");
            return;
        }
        List<Product> activeProducts = productRepository.findByActiveTrueAndStoreId(storeId);
        for (Product product : activeProducts) {
            String dbKey = ExternalIdNormalizer.normalize(product.getExternalId());
            if (!dbKey.isEmpty() && !sheetExternalIds.contains(dbKey)) {
                product.setActive(false);
                productRepository.save(product);
                summary.incrementDeactivated();
                log.info("Produit désactivé (absent de la source): {} (externalId={})", product.getName(), product.getExternalId());
            }
        }
    }

    /**
     * Import CSV multi-boutiques (super admin) : en-tête avec {@code store_code} + colonnes produit,
     * ou fichier 7 colonnes classique + {@code defaultStoreId} obligatoire.
     */
    @Transactional
    public ImportSummary processSupervisionProductsCsv(MultipartFile file, Long defaultStoreId) {
        ImportSummary summary = new ImportSummary();
        try (Reader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
             CSVReader csvReader = new CSVReader(reader)) {
            List<String[]> all = csvReader.readAll();
            if (all.isEmpty()) {
                summary.addError(0, "Fichier vide");
                return summary;
            }
            Map<String, Integer> col = parseFlexibleHeader(all.get(0));
            boolean hasStore = col.containsKey("store_code") || col.containsKey("boutique_code");
            if (!hasStore && defaultStoreId == null) {
                summary.addError(1, "Ajoutez la colonne store_code ou le paramètre storeId pour un CSV sans colonne boutique.");
                return summary;
            }

            Map<Long, Set<String>> keysByStore = new HashMap<>();
            int rowNum = 2;
            for (int i = 1; i < all.size(); i++) {
                String[] row = all.get(i);
                summary.incrementTotal();
                try {
                    Store store;
                    if (hasStore) {
                        Integer isc = col.containsKey("store_code") ? col.get("store_code") : col.get("boutique_code");
                        if (isc == null || isc >= row.length) {
                            summary.addError(rowNum, "store_code manquant");
                            rowNum++;
                            continue;
                        }
                        String code = row[isc.intValue()].trim().toLowerCase();
                        store = storeRepository.findByCode(code)
                                .orElseThrow(() -> new IllegalArgumentException("Boutique inconnue: " + code));
                    } else {
                        store = storeRepository.findById(defaultStoreId)
                                .orElseThrow(() -> new IllegalArgumentException("Boutique introuvable id=" + defaultStoreId));
                    }
                    StoreContext.set(store);
                    try {
                        Set<String> keys = keysByStore.computeIfAbsent(store.getId(), k -> new HashSet<>());
                        importCsvFlexibleRow(row, col, rowNum, summary, keys);
                    } finally {
                        StoreContext.clear();
                    }
                } catch (Exception e) {
                    summary.addError(rowNum, e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName());
                }
                rowNum++;
            }
            for (Map.Entry<Long, Set<String>> e : keysByStore.entrySet()) {
                if (e.getValue().isEmpty()) {
                    continue;
                }
                Store s = storeRepository.findById(e.getKey()).orElse(null);
                if (s == null) {
                    continue;
                }
                StoreContext.set(s);
                try {
                    deactivateProductsNotInExternalIdSet(e.getValue(), summary);
                } finally {
                    StoreContext.clear();
                }
            }
        } catch (Exception e) {
            log.error("CSV supervision produits", e);
            throw new RuntimeException("Erreur parsing CSV: " + e.getMessage());
        }
        return summary;
    }

    private static byte[] withUtf8Bom(byte[] raw) {
        byte[] bom = new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF};
        byte[] out = new byte[bom.length + raw.length];
        System.arraycopy(bom, 0, out, 0, bom.length);
        System.arraycopy(raw, 0, out, bom.length, raw.length);
        return out;
    }

    private void importCsvLegacySevenColumns(String[] row, int rowNum, ImportSummary summary, Set<String> importedExternalKeys) {
        if (row.length < 5) {
            summary.addError(rowNum, "Colonnes manquantes (Minimum requis: Nom, Catégorie, Prix, Image, Description)");
            return;
        }
        String name = row[0].trim();
        String categoryName = row[1].trim();
        String priceStr = row[2].trim();
        String imageUrl = row[3].trim();
        String description = row[4].trim();
        String stockStr = row.length > 5 ? row[5].trim() : "0";
        String externalId = row.length > 6 ? row[6].trim() : null;
        if (externalId != null && externalId.isEmpty()) {
            externalId = null;
        }

        if (name.isEmpty() || categoryName.isEmpty() || priceStr.isEmpty()) {
            summary.addError(rowNum, "Champs obligatoires manquants (Nom, Catégorie, Prix)");
            return;
        }
        BigDecimal price;
        try {
            price = new BigDecimal(priceStr.replace(",", "."));
        } catch (NumberFormatException e) {
            summary.addError(rowNum, "Format de prix invalide: " + priceStr);
            return;
        }
        int stock = 0;
        try {
            if (!stockStr.isEmpty()) {
                stock = (int) Double.parseDouble(stockStr);
            }
        } catch (NumberFormatException ignored) {
        }
        String slug = name.toLowerCase().replaceAll("[^a-z0-9]+", "-");
        if (externalId != null && !externalId.isEmpty()) {
            slug = externalId + "-" + slug;
            importedExternalKeys.add(ExternalIdNormalizer.normalize(externalId));
        }
        if (slug.length() > 250) {
            slug = slug.substring(0, 250);
        }
        ProductRequest request = new ProductRequest();
        request.setName(name);
        request.setSlug(slug);
        request.setCategoryId(null);
        request.setCategoryName(categoryName);
        request.setPrice(price);
        request.setStock(stock);
        request.setDescription(description);
        request.setShortDescription(description.length() > 100 ? description.substring(0, 100) : description);
        importProduct(request, imageUrl, externalId);
        summary.incrementSuccess();
    }

    private static Map<String, Integer> parseFlexibleHeader(String[] header) {
        Map<String, Integer> m = new HashMap<>();
        for (int i = 0; i < header.length; i++) {
            String key = header[i] == null ? "" : header[i].trim().toLowerCase().replace(' ', '_');
            if (key.isEmpty()) {
                continue;
            }
            m.putIfAbsent(key, i);
            if (key.equals("email") || key.contains("contact")) {
                // no-op
            }
        }
        aliasHeader(m, "nom", "name");
        aliasHeader(m, "categorie", "category");
        aliasHeader(m, "prix", "price");
        aliasHeader(m, "image_url", "imageurl", "image");
        aliasHeader(m, "description", "desc");
        aliasHeader(m, "stock", "qty");
        aliasHeader(m, "external_id", "externalid", "id_externe");
        aliasHeader(m, "store_code", "boutique_code", "code_boutique");
        return m;
    }

    private static void aliasHeader(Map<String, Integer> m, String canonical, String... synonyms) {
        if (m.containsKey(canonical)) {
            return;
        }
        for (String s : synonyms) {
            if (m.containsKey(s)) {
                m.put(canonical, m.get(s));
                return;
            }
        }
    }

    private static String cellAt(String[] row, Map<String, Integer> col, String... keys) {
        for (String k : keys) {
            Integer i = col.get(k);
            if (i != null && i < row.length && row[i] != null) {
                return row[i].trim();
            }
        }
        return "";
    }

    private void importCsvFlexibleRow(String[] row, Map<String, Integer> col, int rowNum, ImportSummary summary, Set<String> importedExternalKeys) {
        String name = cellAt(row, col, "nom", "name");
        String categoryName = cellAt(row, col, "categorie", "category");
        String priceStr = cellAt(row, col, "prix", "price");
        String imageUrl = cellAt(row, col, "image_url", "imageurl", "image");
        String description = cellAt(row, col, "description", "desc");
        String stockStr = cellAt(row, col, "stock", "qty");
        if (stockStr.isEmpty()) {
            stockStr = "0";
        }
        String externalIdRaw = cellAt(row, col, "external_id", "externalid", "id_externe");
        String externalId = externalIdRaw.isEmpty() ? null : externalIdRaw;

        if (name.isEmpty() || categoryName.isEmpty() || priceStr.isEmpty()) {
            summary.addError(rowNum, "Champs obligatoires manquants (nom, categorie, prix)");
            return;
        }
        BigDecimal price;
        try {
            price = new BigDecimal(priceStr.replace(",", "."));
        } catch (NumberFormatException e) {
            summary.addError(rowNum, "Prix invalide: " + priceStr);
            return;
        }
        int stock = 0;
        try {
            if (!stockStr.isEmpty()) {
                stock = (int) Double.parseDouble(stockStr);
            }
        } catch (NumberFormatException ignored) {
        }
        String slug = name.toLowerCase().replaceAll("[^a-z0-9]+", "-");
        if (externalId != null) {
            slug = externalId + "-" + slug;
            importedExternalKeys.add(ExternalIdNormalizer.normalize(externalId));
        }
        if (slug.length() > 250) {
            slug = slug.substring(0, 250);
        }
        ProductRequest request = new ProductRequest();
        request.setName(name);
        request.setSlug(slug);
        request.setCategoryId(null);
        request.setCategoryName(categoryName);
        request.setPrice(price);
        request.setStock(stock);
        request.setDescription(description);
        request.setShortDescription(description.length() > 100 ? description.substring(0, 100) : description);
        importProduct(request, imageUrl, externalId);
        summary.incrementSuccess();
    }
}
