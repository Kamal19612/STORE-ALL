package com.storeall.api.service;

import java.io.IOException;
import java.net.MalformedURLException;
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
 * Service gérant le stockage des fichiers (images) sur le disque local.
 */
@Service
public class FileStorageService {

    private final Path fileStorageLocation;
    private static final long MAX_IMAGE_BYTES = 2L * 1024L * 1024L; // 2MB

    // @Autowired n'est pas nécessaire (Spring 4.3+)
    public FileStorageService(AppProperties appProperties) {
        this.fileStorageLocation = Paths.get(appProperties.getStorage().getLocation())
                .toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (IOException ex) {
            throw new RuntimeException("Impossible de créer le dossier de stockage des fichiers.", ex);
        }
    }

    /**
     * Sauvegarde un fichier sur le disque.
     *
     * @param file Le fichier envoyé.
     * @return Le nom du fichier généré (unique).
     */
    public String storeFile(MultipartFile file) {
        // Normaliser le nom du fichier
        String originalFileName = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));

        // Vérifier l'extension (sécurité basique)
        if (originalFileName.contains("..")) {
            throw new RuntimeException("Nom de fichier invalide : " + originalFileName);
        }

        // Générer un nom unique pour éviter les écrasements
        String fileExtension = "";
        int lastDotIndex = originalFileName.lastIndexOf(".");
        if (lastDotIndex > 0) {
            fileExtension = originalFileName.substring(lastDotIndex);
        }

        String newFileName = UUID.randomUUID().toString() + fileExtension;

        try {
            // Copier le fichier dans le dossier cible (remplace si existant)
            Path targetLocation = this.fileStorageLocation.resolve(newFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return newFileName;
        } catch (IOException ex) {
            throw new RuntimeException("Impossible de stocker le fichier " + newFileName + ". Réessayez !", ex);
        }
    }

    /**
     * Sauvegarde une image avec validations (type + taille).
     *
     * @param file Image envoyée.
     * @return Nom de fichier généré.
     */
    public String storeProductImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Fichier image manquant.");
        }

        if (file.getSize() > MAX_IMAGE_BYTES) {
            throw new RuntimeException("Image trop volumineuse (max 2MB).");
        }

        String contentType = file.getContentType();
        boolean isAllowed = "image/jpeg".equalsIgnoreCase(contentType)
                || "image/jpg".equalsIgnoreCase(contentType)
                || "image/png".equalsIgnoreCase(contentType);
        if (!isAllowed) {
            throw new RuntimeException("Format image non supporté. Formats autorisés: JPG, PNG.");
        }

        return storeFile(file);
    }

    /**
     * Charge une ressource (fichier) depuis le disque.
     */
    public Resource loadFileAsResource(String fileName) {
        try {
            Path filePath = this.fileStorageLocation.resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists()) {
                return resource;
            } else {
                throw new RuntimeException("Fichier introuvable : " + fileName);
            }
        } catch (MalformedURLException ex) {
            throw new RuntimeException("Fichier introuvable : " + fileName, ex);
        }
    }
}
