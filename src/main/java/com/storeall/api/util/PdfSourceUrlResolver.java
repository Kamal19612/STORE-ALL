package com.storeall.api.util;

import java.net.URI;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Résout une URL (Google Drive, lien direct…) vers une URL de téléchargement PDF.
 */
public final class PdfSourceUrlResolver {

    private static final Pattern DRIVE_FILE_ID = Pattern.compile("/file/d/([a-zA-Z0-9_-]+)");

    private PdfSourceUrlResolver() {}

    public static String resolveDownloadUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return "";
        }
        String url = rawUrl.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            url = "https://" + url;
        }

        try {
            URI uri = URI.create(url);
            String host = uri.getHost() != null ? uri.getHost().toLowerCase(Locale.ROOT) : "";

            if (host.contains("drive.google.com") || host.contains("docs.google.com")) {
                Matcher m = DRIVE_FILE_ID.matcher(url);
                if (m.find()) {
                    return "https://drive.google.com/uc?export=download&id=" + m.group(1);
                }
                String id = queryParam(uri, "id");
                if (id != null && !id.isBlank()) {
                    return "https://drive.google.com/uc?export=download&id=" + id.trim();
                }
            }

            if (url.toLowerCase(Locale.ROOT).contains("export=download")) {
                return url;
            }
            if (url.toLowerCase(Locale.ROOT).contains("export=view")) {
                return url.replace("export=view", "export=download");
            }

            return url;
        } catch (IllegalArgumentException ex) {
            return url;
        }
    }

    private static String queryParam(URI uri, String name) {
        String query = uri.getRawQuery();
        if (query == null || query.isBlank()) {
            return null;
        }
        for (String part : query.split("&")) {
            int eq = part.indexOf('=');
            String key = eq >= 0 ? part.substring(0, eq) : part;
            if (!name.equals(key)) {
                continue;
            }
            return eq >= 0 ? part.substring(eq + 1) : "";
        }
        return null;
    }
}
