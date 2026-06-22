package com.storeall.api.service;

import java.io.IOException;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.springframework.core.io.Resource;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import com.storeall.api.entity.Product;
import com.storeall.api.repository.ProductRepository;
import com.storeall.api.tenant.StoreContext;
import com.storeall.api.util.PdfSourceUrlResolver;

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

    /**
     * Télécharge un PDF modèle depuis une URL (Sheet/CSV) et le stocke après validation AcroForm.
     */
    public String storeAndValidateTemplateFromUrl(String sourceUrl) {
        if (sourceUrl == null || sourceUrl.isBlank()) {
            throw new RuntimeException("URL PDF manquante.");
        }
        byte[] bytes = downloadPdfBytes(sourceUrl.trim());
        validateAcroFormPdfBytes(bytes);
        return privateFileStorageService.storeProductTemplatePdfBytes(bytes);
    }

    public void validateAcroFormPdf(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Fichier PDF manquant.");
        }
        try {
            validateAcroFormPdfBytes(file.getBytes());
        } catch (IOException ex) {
            throw new RuntimeException("Impossible de lire le PDF : " + ex.getMessage(), ex);
        }
    }

    public void validateAcroFormPdfBytes(byte[] bytes) {
        if (bytes == null || bytes.length == 0) {
            throw new RuntimeException("Fichier PDF manquant.");
        }
        try (PDDocument doc = org.apache.pdfbox.Loader.loadPDF(bytes)) {
            PDAcroForm form = doc.getDocumentCatalog().getAcroForm();
            if (form == null || form.getFields() == null || form.getFields().isEmpty()) {
                throw new RuntimeException(
                        "Le PDF doit contenir des champs de formulaire (AcroForm). "
                                + "Créez le modèle avec LibreOffice ou Adobe Acrobat.");
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
        if (product.getTemplatePdfUrl() == null || product.getTemplatePdfUrl().isBlank()) {
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

    private byte[] downloadPdfBytes(String sourceUrl) {
        String downloadUrl = PdfSourceUrlResolver.resolveDownloadUrl(sourceUrl);
        if (downloadUrl.isBlank()) {
            throw new RuntimeException("URL PDF invalide.");
        }
        try {
            SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
            factory.setConnectTimeout(15_000);
            factory.setReadTimeout(45_000);
            RestTemplate rt = new RestTemplate(factory);
            byte[] body = rt.getForObject(downloadUrl, byte[].class);
            if (body == null || body.length == 0) {
                throw new RuntimeException("Téléchargement PDF vide.");
            }
            if (body.length > PrivateFileStorageService.MAX_TEMPLATE_PDF_BYTES) {
                throw new RuntimeException("PDF trop volumineux (max 5 Mo).");
            }
            if (!looksLikePdf(body)) {
                throw new RuntimeException(
                        "Le lien ne pointe pas vers un PDF (vérifiez le partage Google Drive : accès « Toute personne disposant du lien »).");
            }
            return body;
        } catch (RestClientException ex) {
            throw new RuntimeException("Impossible de télécharger le PDF : " + ex.getMessage(), ex);
        }
    }

    private static boolean looksLikePdf(byte[] bytes) {
        return bytes.length >= 5
                && bytes[0] == '%'
                && bytes[1] == 'P'
                && bytes[2] == 'D'
                && bytes[3] == 'F';
    }
}
