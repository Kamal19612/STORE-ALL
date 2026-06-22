package com.storeall.api.util;

import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PdfSourceUrlResolverTest {

    @Test
    void resolvesGoogleDriveShareLink() {
        String url = PdfSourceUrlResolver.resolveDownloadUrl(
                "https://drive.google.com/file/d/abc123XYZ/view?usp=sharing");
        assertTrue(url.contains("export=download"));
        assertTrue(url.contains("abc123XYZ"));
    }

    @Test
    void keepsDirectPdfUrl() {
        String url = PdfSourceUrlResolver.resolveDownloadUrl("https://example.com/modele.pdf");
        assertTrue(url.contains("example.com/modele.pdf"));
    }
}
