package com.storeall.api.service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.storeall.api.dto.ImportSummary;
import com.storeall.api.dto.ProductRequest;

@Service
public class ProductImportService {

    @Autowired
    private ProductService productService;

    /**
     * Traite l'importation de fichiers CSV. Note: Pas de @Transactional ici
     * pour permettre le "Best Effort" (succès partiel). Chaque ligne est
     * traitée dans sa propre transaction via productService.importProduct.
     */
    public ImportSummary importProducts(MultipartFile file) {
        ImportSummary summary = new ImportSummary();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            int rowNum = 0;

            while ((line = reader.readLine()) != null) {
                rowNum++;
                // Skip empty lines
                if (line.trim().isEmpty()) {
                    continue;
                }

                String[] values = parseCsvLine(line);

                if (rowNum == 1) {
                    // Skip Header
                    continue;
                }

                try {
                    processRow(values, summary, rowNum);
                } catch (Exception e) {
                    summary.addError(rowNum, "Erreur interne: " + e.getMessage());
                }
            }
        } catch (Exception e) {
            summary.addError(0, "Erreur lecture fichier: " + e.getMessage());
        }

        return summary;
    }

    private String[] parseCsvLine(String line) {
        // Regex simplifiée pour SPLIT par virgule en ignorant celles entre guillemets
        return line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);
    }

    private void processRow(String[] values, ImportSummary summary, int rowNum) {
        summary.incrementTotal();

        // Nettoyage des guillemets
        for (int i = 0; i < values.length; i++) {
            values[i] = values[i].trim().replace("\"", "");
        }

        if (values.length < 3) {
            summary.addError(rowNum, "Ligne incomplète (Nom, Catégorie, Prix requis)");
            return;
        }

        String name = values.length > 0 ? values[0] : "";
        String categoryName = values.length > 1 ? values[1] : "";
        String priceStr = values.length > 2 ? values[2] : "0";
        String imageUrl = values.length > 3 ? values[3] : "";
        String description = values.length > 4 ? values[4] : "";
        String stockStr = values.length > 5 ? values[5] : "0";

        if (name.isEmpty() || categoryName.isEmpty()) {
            summary.addError(rowNum, "Nom et Catégorie obligatoires");
            return;
        }

        try {
            // Création DTO
            ProductRequest request = new ProductRequest();
            request.setName(name);
            request.setCategoryName(categoryName);

            // Parsing Robust du Prix (Gère "1 200,00" et "1200.00")
            // 1. Remplacer virgule par point
            // 2. Supprimer tout ce qui n'est pas chiffre ou point
            String cleanPrice = priceStr.replace(",", ".");
            cleanPrice = cleanPrice.replaceAll("[^0-9.]", "");
            if (cleanPrice.isEmpty()) {
                cleanPrice = "0";
            }
            request.setPrice(BigDecimal.valueOf(Double.parseDouble(cleanPrice)));

            request.setDescription(description);
            request.setShortDescription(description.length() > 100 ? description.substring(0, 97) + "..." : description);

            // Parsing Stock
            // Parsing Stock
            String cleanStock = stockStr.replaceAll("[^0-9]", "");
            request.setStock(cleanStock.isEmpty() ? 0 : Integer.valueOf(cleanStock));

            request.setActive(true);

            // Génération Slug
            String slug = name.toLowerCase()
                    .replaceAll("[^a-z0-9]", "-")
                    .replaceAll("-+", "-")
                    .replaceAll("^-|-$", "");
            request.setSlug(slug);

            // Appel Service (Transactional)
            // Note: CSV n'a pas d'externalId, on passe null
            productService.importProduct(request, imageUrl, null);
            summary.incrementSuccess();

        } catch (RuntimeException e) {
            summary.addError(rowNum, "Erreur création: " + e.getMessage());
        }
    }
}
