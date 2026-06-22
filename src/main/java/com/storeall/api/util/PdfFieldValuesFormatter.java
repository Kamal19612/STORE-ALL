package com.storeall.api.util;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.storeall.api.entity.OrderItem;

/**
 * Formate les valeurs JSON saisies dans un formulaire PDF produit (notifications commande).
 */
public final class PdfFieldValuesFormatter {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private PdfFieldValuesFormatter() {}

    public record FieldEntry(String key, String label, String value) {}

    public static List<FieldEntry> parse(String pdfFieldValuesJson) {
        if (pdfFieldValuesJson == null || pdfFieldValuesJson.isBlank()) {
            return List.of();
        }
        try {
            Map<String, Object> map = MAPPER.readValue(pdfFieldValuesJson, new TypeReference<>() {});
            if (map == null || map.isEmpty()) {
                return List.of();
            }
            List<FieldEntry> out = new ArrayList<>();
            for (Map.Entry<String, Object> entry : map.entrySet()) {
                String key = entry.getKey();
                if (key == null || key.isBlank()) {
                    continue;
                }
                if (!isDisplayableValue(entry.getValue())) {
                    continue;
                }
                out.add(new FieldEntry(key, humanizeFieldName(key), formatValue(entry.getValue())));
            }
            return out;
        } catch (Exception ex) {
            return List.of();
        }
    }

    public static String humanizeFieldName(String name) {
        if (name == null || name.isBlank()) {
            return "";
        }
        String s = name.replaceAll("[_-]+", " ");
        s = s.replaceAll("([a-z])([A-Z])", "$1 $2");
        s = s.trim().replaceAll("\\s+", " ");
        if (s.isEmpty()) {
            return name;
        }
        return Character.toUpperCase(s.charAt(0)) + s.substring(1);
    }

    private static String formatValue(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof Boolean b) {
            return b ? "Oui" : "Non";
        }
        return String.valueOf(value).trim();
    }

    /** Valeurs vides / cases non cochées : non affichées dans les détails commande. */
    static boolean isDisplayableValue(Object value) {
        if (value == null) {
            return false;
        }
        if (value instanceof Boolean b) {
            return b;
        }
        return !String.valueOf(value).trim().isEmpty();
    }

    public static void appendPlainTextItemDetails(StringBuilder sb, String productName, List<FieldEntry> fields) {
        if (fields == null || fields.isEmpty()) {
            return;
        }
        sb.append("    📝 ").append(productName).append(" :\n");
        for (FieldEntry field : fields) {
            sb.append("      • ").append(field.label()).append(" : ").append(field.value()).append("\n");
        }
    }

    public static void appendHtmlItemDetails(StringBuilder sb, String productName, List<FieldEntry> fields) {
        if (fields == null || fields.isEmpty()) {
            return;
        }
        sb.append("    📝 <i>").append(escapeHtml(productName)).append("</i>\n");
        for (FieldEntry field : fields) {
            sb.append("      • ").append(escapeHtml(field.label())).append(" : ")
                    .append(escapeHtml(field.value())).append("\n");
        }
    }

    public static List<Map<String, Object>> itemCustomizationsForNotification(Collection<OrderItem> items) {
        List<Map<String, Object>> result = new ArrayList<>();
        if (items == null) {
            return result;
        }
        for (OrderItem item : items) {
            List<FieldEntry> fields = parse(item.getPdfFieldValues());
            if (fields.isEmpty()) {
                continue;
            }
            String productName = item.getProduct() != null ? item.getProduct().getName() : "Produit";
            List<Map<String, String>> fieldMaps = new ArrayList<>();
            for (FieldEntry field : fields) {
                Map<String, String> fieldMap = new LinkedHashMap<>();
                fieldMap.put("key", field.key());
                fieldMap.put("label", field.label());
                fieldMap.put("value", field.value());
                fieldMaps.add(fieldMap);
            }
            Map<String, Object> itemMap = new LinkedHashMap<>();
            itemMap.put("productName", productName);
            itemMap.put("fields", fieldMaps);
            result.add(itemMap);
        }
        return result;
    }

    /**
     * Résumé court pour Web Push / FCM (une ligne par produit personnalisé).
     */
    public static String compactSummary(Collection<OrderItem> items) {
        if (items == null || items.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        for (OrderItem item : items) {
            List<FieldEntry> fields = parse(item.getPdfFieldValues());
            if (fields.isEmpty()) {
                continue;
            }
            if (!sb.isEmpty()) {
                sb.append("\n");
            }
            String productName = item.getProduct() != null ? item.getProduct().getName() : "Produit";
            sb.append("📝 ").append(productName).append(" : ");
            List<String> parts = new ArrayList<>();
            for (FieldEntry field : fields) {
                String value = field.value();
                if (value.length() > 40) {
                    value = value.substring(0, 37) + "…";
                }
                parts.add(field.label() + " = " + value);
            }
            sb.append(String.join(", ", parts));
        }
        return sb.toString();
    }

    private static String escapeHtml(String text) {
        if (text == null) {
            return "";
        }
        return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
