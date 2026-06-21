package com.storeall.api.service;

import java.io.IOException;
import java.io.InputStream;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.storeall.api.entity.Product;
import com.storeall.api.repository.ProductRepository;
import com.storeall.api.tenant.StoreContext;

/**
 * Gestion des PDF modèles produit (validation AcroForm, streaming).
 */
@Service
public class ProductPdfService {

    private final PrivateFileStorageService privateFileStorageService;
    private final ProductRepository productRepository;

    public ProductPdfService(
            PrivateFileStorageService privateFileStorageService,
            ProductRepository productRepository) {
        this.privateFileStorageService = privateFileStorageService;
        this.productRepository = productRepository;
    }

    /**
     * Valide et stocke un PDF modèle. Le PDF doit contenir au moins un champ AcroForm.
     *
     * @return chemin relatif stocké en base
     */
    public String storeAndValidateTemplate(MultipartFile file) {
        validateAcroFormPdf(file);
        return privateFileStorageService.storeProductTemplatePdf(file);
    }

    public void validateAcroFormPdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Fichier PDF manquant.");
        }
        try (InputStream in = file.getInputStream()) {
            byte[] bytes = in.readAllBytes();
            try (PDDocument doc = org.apache.pdfbox.Loader.loadPDF(bytes)) {
                PDAcroForm form = doc.getDocumentCatalog().getAcroForm();
                if (form == null || form.getFields() == null || form.getFields().isEmpty()) {
                    throw new RuntimeException(
                            "Le PDF doit contenir des champs de formulaire (AcroForm). "
                            + "Créez le modèle avec LibreOffice ou Adobe Acrobat.");
                }
            }
        } catch (IOException ex) {
            throw new RuntimeException("Impossible de lire le PDF : " + ex.getMessage(), ex);
        }
    }

    public Resource loadTemplateForProduct(Product product) {
        if (product.getTemplatePdfUrl() == null || product.getTemplatePdfUrl().isBlank()) {
            throw new RuntimeException("Aucun PDF modèle pour ce produit.");
        }
        return privateFileStorageService.loadAsResource(product.getTemplatePdfUrl());
    }

    public Product findProductWithTemplateBySlug(String slug) {
        Long storeId = StoreContext.getStoreIdOrNull();
        Product product = productRepository.findBySlugAndStoreId(slug, storeId)
                .orElseThrow(() -> new RuntimeException("Produit introuvable : " + slug));
        if (!product.isRequiresPdfForm() || product.getTemplatePdfUrl() == null
                || product.getTemplatePdfUrl().isBlank()) {
            throw new RuntimeException("Ce produit n'a pas de PDF personnalisable.");
        }
        return product;
    }

    public void deleteTemplateIfExists(String relativePath) {
        privateFileStorageService.deleteIfExists(relativePath);
    }

    public String templateDisplayName(Product product) {
        return privateFileStorageService.extractDisplayName(product.getTemplatePdfUrl());
    }
}
