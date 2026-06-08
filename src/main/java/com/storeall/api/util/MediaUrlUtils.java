package com.storeall.api.util;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Chemins médias servis sous {@code /uploads/**} — toujours relatifs en base pour éviter
 * {@code http://127.0.0.1:8085/...} (cassé hors machine locale).
 */
public final class MediaUrlUtils {

    private static final Pattern GOOGLE_DRIVE_FILE_ID =
            Pattern.compile("/file/d/([a-zA-Z0-9_-]+)");

    private MediaUrlUtils() {}

    /** Chemin public pour un fichier stocké localement. */
    public static String uploadPath(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "";
        }
        String name = fileName.trim();
        if (name.startsWith("/uploads/")) {
            return name;
        }
        if (name.startsWith("uploads/")) {
            return "/" + name;
        }
        return "/uploads/" + name;
    }

    /**
     * Extrait l'URL d'image directe lorsque l'admin a collé un lien proxy (Startpage, Google Images…).
     */
    public static String unwrapImageProxyUrl(String url) {
        if (url == null || url.isBlank()) {
            return url;
        }
        String u = url.trim();
        try {
            URI uri = URI.create(u);
            String host = uri.getHost() != null ? uri.getHost().toLowerCase(Locale.ROOT) : "";
            String path = uri.getPath() != null ? uri.getPath() : "";

            if (host.contains("startpage.com") && path.contains("proxy-image")) {
                String piurl = queryParam(uri, "piurl");
                if (piurl != null && !piurl.isBlank()) {
                    return URLDecoder.decode(piurl, StandardCharsets.UTF_8);
                }
            }

            if (host.contains("duckduckgo.com")) {
                String direct = queryParam(uri, "u");
                if (direct != null && !direct.isBlank()) {
                    return direct;
                }
            }

            if (host.contains("google.") && !host.contains("drive.google.com")) {
                String imgurl = queryParam(uri, "imgurl");
                if (imgurl == null || imgurl.isBlank()) {
                    imgurl = queryParam(uri, "url");
                }
                if (imgurl != null && !imgurl.isBlank()) {
                    return URLDecoder.decode(imgurl, StandardCharsets.UTF_8);
                }
            }

            if (host.contains("drive.google.com")) {
                return unwrapGoogleDriveUrl(u, uri);
            }
        } catch (IllegalArgumentException ignored) {
            // URL mal formée — retour inchangé
        }
        return u;
    }

    private static String unwrapGoogleDriveUrl(String original, URI uri) {
        Matcher m = GOOGLE_DRIVE_FILE_ID.matcher(original);
        if (m.find()) {
            return "https://drive.google.com/uc?export=view&id=" + m.group(1);
        }
        String id = queryParam(uri, "id");
        if (id != null && !id.isBlank()) {
            return "https://drive.google.com/uc?export=view&id=" + id;
        }
        return original;
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
            String value = eq >= 0 ? part.substring(eq + 1) : "";
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        }
        return null;
    }

    /**
     * Normalise une URL produit / média pour stockage et réponse API.
     */
    public static String normalizeImageUrl(String url) {
        if (url == null || url.isBlank()) {
            return url;
        }
        String u = unwrapImageProxyUrl(url.trim());

        if (u.startsWith("http://127.0.0.1") || u.startsWith("http://localhost")) {
            int i = u.indexOf("/uploads/");
            if (i >= 0) {
                return u.substring(i);
            }
        }

        if (!u.startsWith("http://") && !u.startsWith("https://") && !u.startsWith("data:")
                && !u.startsWith("/") && u.contains(".")) {
            return "https://" + u;
        }

        if (!u.startsWith("http://") && !u.startsWith("https://") && !u.startsWith("data:")) {
            if (!u.startsWith("/")) {
                u = "/" + u;
            }
        }
        return u;
    }

    /**
     * @deprecated utiliser {@link #normalizeImageUrl(String)}
     */
    public static String normalizeForResponse(String url) {
        return normalizeImageUrl(url);
    }
}
