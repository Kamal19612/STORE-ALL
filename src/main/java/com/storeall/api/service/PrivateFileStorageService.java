package com.storeall.api.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;
import java.util.UUID;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import com.storeall.api.config.AppProperties;

/**
 * Stockage privé des PDF (modèles produit, PDF remplis commande).
 * Non exposé via {@code /uploads/**}.
 */
@Service
public class PrivateFileStorageService {

    public static final String PRODUCTS_PDF_DIR = "products-pdf";
    public static final String ORDERS_PDF_DIR = "orders";

    private static final long MAX_TEMPLATE_PDF_BYTES = 5L * 1024L * 1024L; // 5 Mo
    private static final long MAX_FILLED_PDF_BYTES = 10L * 1024L * 1024L; // 10 Mo

    private final Path privateStorageRoot;

    public PrivateFileStorageService(AppProperties appProperties) {
        this.privateStorageRoot = Paths.get(appProperties.getStorage().getPrivateLocation())
                .toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.privateStorageRoot.resolve(PRODUCTS_PDF_DIR));
            Files.createDirectories(this.privateStorageRoot.resolve(ORDERS_PDF_DIR));
        } catch (IOException ex) {
            throw new RuntimeException("Impossible de créer le dossier de stockage privé.", ex);
        }
    }

    /**
     * Sauvegarde un PDF modèle produit.
     *
     * @return chemin relatif (ex: products-pdf/{uuid}.pdf)
     */
    public String storeProductTemplatePdf(MultipartFile file) {
        validatePdfUpload(file, MAX_TEMPLATE_PDF_BYTES);
        return storeInSubdir(file, PRODUCTS_PDF_DIR);
    }

    /**
     * Sauvegarde un PDF rempli lié à une commande.
     *
     * @return chemin relatif (ex: orders/{orderId}/item-{itemId}.pdf)
     */
    public String storeOrderItemPdf(byte[] bytes, Long orderId, Long itemId) {
        if (bytes == null || bytes.length == 0) {
            throw new RuntimeException("PDF rempli manquant.");
        }
        if (bytes.length > MAX_FILLED_PDF_BYTES) {
            throw new RuntimeException("PDF rempli trop volumineux (max 10 Mo).");
        }
        try {
            Path orderDir = privateStorageRoot.resolve(ORDERS_PDF_DIR).resolve(String.valueOf(orderId));
            Files.createDirectories(orderDir);
            String fileName = "item-" + itemId + ".pdf";
            Path target = orderDir.resolve(fileName);
            Files.write(target, bytes);
            return ORDERS_PDF_DIR + "/" + orderId + "/" + fileName;
        } catch (IOException ex) {
            throw new RuntimeException("Impossible de stocker le PDF de commande.", ex);
        }
    }

    public Resource loadAsResource(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            throw new RuntimeException("Fichier introuvable.");
        }
        try {
            Path filePath = resolveSafe(relativePath);
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
            throw new RuntimeException("Fichier introuvable : " + relativePath);
        } catch (IOException ex) {
            throw new RuntimeException("Fichier introuvable : " + relativePath, ex);
        }
    }

    public void deleteIfExists(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return;
        }
        try {
            Path filePath = resolveSafe(relativePath);
            Files.deleteIfExists(filePath);
        } catch (IOException ex) {
            throw new RuntimeException("Impossible de supprimer le fichier : " + relativePath, ex);
        }
    }

    public String extractDisplayName(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return null;
        }
        int slash = relativePath.lastIndexOf('/');
        return slash >= 0 ? relativePath.substring(slash + 1) : relativePath;
    }

    private String storeInSubdir(MultipartFile file, String subdir) {
        String originalFileName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        if (originalFileName.contains("..")) {
            throw new RuntimeException("Nom de fichier invalide : " + originalFileName);
        }
        String newFileName = UUID.randomUUID() + ".pdf";
        try {
            Path targetDir = privateStorageRoot.resolve(subdir);
            Files.createDirectories(targetDir);
            Path targetLocation = targetDir.resolve(newFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            return subdir + "/" + newFileName;
        } catch (IOException ex) {
            throw new RuntimeException("Impossible de stocker le PDF.", ex);
        }
    }

    private void validatePdfUpload(MultipartFile file, long maxBytes) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Fichier PDF manquant.");
        }
        if (file.getSize() > maxBytes) {
            throw new RuntimeException("PDF trop volumineux (max " + (maxBytes / 1024 / 1024) + " Mo).");
        }
        String contentType = file.getContentType();
        boolean isPdf = "application/pdf".equalsIgnoreCase(contentType)
                || (file.getOriginalFilename() != null
                && file.getOriginalFilename().toLowerCase().endsWith(".pdf"));
        if (!isPdf) {
            throw new RuntimeException("Format non supporté. Seuls les fichiers PDF sont autorisés.");
        }
    }

    private Path resolveSafe(String relativePath) throws IOException {
        Path filePath = privateStorageRoot.resolve(relativePath).normalize();
        if (!filePath.startsWith(privateStorageRoot)) {
            throw new RuntimeException("Chemin de fichier invalide.");
        }
        return filePath;
    }
}
