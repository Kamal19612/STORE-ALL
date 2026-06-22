package com.storeall.api.util;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PdfFieldValuesFormatterTest {

    @Test
    void parseJsonFields() {
        String json = "{\"nom_client\":\"Kamal\",\"accepte_cgv\":true}";
        var fields = PdfFieldValuesFormatter.parse(json);
        assertEquals(2, fields.size());
        assertEquals("Nom client", fields.get(0).label());
        assertEquals("Kamal", fields.get(0).value());
        assertEquals("Oui", fields.get(1).value());
    }

    @Test
    void skipsEmptyFields() {
        String json = "{\"nom_client\":\"Kamal\",\"note\":\"\",\"opt\":false,\"ville\":\"  \"}";
        var fields = PdfFieldValuesFormatter.parse(json);
        assertEquals(1, fields.size());
        assertEquals("Kamal", fields.get(0).value());
    }

    @Test
    void appendPlainTextItemDetails() {
        var fields = PdfFieldValuesFormatter.parse("{\"texte_personnalise\":\"Hello\"}");
        StringBuilder sb = new StringBuilder();
        PdfFieldValuesFormatter.appendPlainTextItemDetails(sb, "Carte", fields);
        assertTrue(sb.toString().contains("Carte"));
        assertTrue(sb.toString().contains("Texte personnalise"));
        assertTrue(sb.toString().contains("Hello"));
    }
}
