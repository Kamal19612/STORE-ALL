package com.storeall.api.dto;

import java.util.ArrayList;
import java.util.List;

import lombok.Data;

@Data
public class ImportSummary {

    private int totalProcessed;
    private int successCount;
    private int failureCount;
    private int createdCount; // Nouveaux produits créés
    private int updatedCount; // Produits mis à jour
    private int deactivatedCount; // Produits désactivés (supprimés du Sheet)
    private List<String> errorMessages = new ArrayList<>();

    public void addError(int row, String message) {
        errorMessages.add("Ligne " + row + ": " + message);
        failureCount++;
    }

    public void incrementSuccess() {
        successCount++;
    }

    public void incrementTotal() {
        totalProcessed++;
    }

    public void incrementCreated() {
        createdCount++;
    }

    public void incrementUpdated() {
        updatedCount++;
    }

    public void incrementDeactivated() {
        deactivatedCount++;
    }

    public int getErrorCount() {
        return failureCount;
    }
}
