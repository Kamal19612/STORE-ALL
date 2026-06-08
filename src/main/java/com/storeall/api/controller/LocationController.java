package com.storeall.api.controller;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Résout les liens Google Maps (courts et longs) en coordonnées GPS.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/public")
public class LocationController {

    private static final String USER_AGENT = "Mozilla/5.0 (Linux; Android 10; Pixel 3) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

    // Patterns pour extraire les coordonnées
    private static final Pattern COORDS_AT = Pattern.compile("/@(-?[0-9]{1,3}\\.[0-9]+),(-?[0-9]{1,3}\\.[0-9]+)");
    private static final Pattern COORDS_Q = Pattern.compile("[?&]q=(-?[0-9]{1,3}\\.[0-9]+),(-?[0-9]{1,3}\\.[0-9]+)");
    private static final Pattern COORDS_LL = Pattern.compile("[?&]ll=(-?[0-9]{1,3}\\.[0-9]+),(-?[0-9]{1,3}\\.[0-9]+)");
    private static final Pattern COORDS_3D4D = Pattern.compile("!3d(-?[0-9]{1,3}\\.[0-9]+)!4d(-?[0-9]{1,3}\\.[0-9]+)");
    private static final Pattern COORDS_SEARCH = Pattern
            .compile("/search/(-?[0-9]{1,3}\\.[0-9]+),\\+?(-?[0-9]{1,3}\\.[0-9]+)");
    private static final Pattern META_REFRESH = Pattern.compile("content=[\"'][^;]*;\\s*url=([^\"'\\s>]+)",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern JS_LOCATION = Pattern
            .compile("window\\.location(?:\\.href)?\\s*=\\s*[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);

    // Plus Code (Open Location Code). Exemple: 9CXR+XVG ou 9FHH+Q75
    private static final Pattern PLUS_CODE = Pattern.compile("([23456789CFGHJMPQRVWX]{4,8}\\+[23456789CFGHJMPQRVWX]{2,3})",
            Pattern.CASE_INSENSITIVE);

    @GetMapping("/resolve-location")
    public ResponseEntity<Map<String, Object>> resolve(@RequestParam String url) {
        Map<String, Object> response = new HashMap<>();
        try {
            double[] coords = null;
            String finalUrl = url;

            // Cas 1 : Plus Code ou texte brut
            if (!url.startsWith("http://") && !url.startsWith("https://")) {
                String raw = url.trim();
                coords = decodePlusCodeIfPresent(raw);
                if (coords == null) coords = geocodeWithNominatim(raw);
                if (coords != null)
                    finalUrl = "https://www.google.com/maps?q=" + coords[0] + "," + coords[1];
            } else {
                // Cas 2 : URL Google Maps (courte ou longue)
                finalUrl = followRedirects(url, 10);
                coords = extractCoordinates(finalUrl);

                // Plus Code présent dans l'URL finale (souvent le cas avec maps.app.goo.gl → /maps/place/<PLUSCODE>...)
                if (coords == null) coords = decodePlusCodeIfPresent(finalUrl);

                // Fallback q param
                if (coords == null) {
                    String q = extractQueryParam(finalUrl, "q");
                    if (q != null && !q.isEmpty())
                        coords = decodePlusCodeIfPresent(q) != null ? decodePlusCodeIfPresent(q) : geocodeWithNominatim(q);
                }

                // Fallback place/dir
                if (coords == null) {
                    String placeName = extractPlaceName(finalUrl);
                    if (placeName != null)
                        coords = geocodeWithNominatim(placeName);
                }

                if (coords != null)
                    finalUrl = "https://www.google.com/maps?q=" + coords[0] + "," + coords[1];
            }

            if (coords != null) {
                response.put("success", true);
                response.put("lat", coords[0]);
                response.put("lng", coords[1]);
                response.put("resolvedUrl", finalUrl);
            } else {
                response.put("success", false);
                response.put("message", "Coordonnées introuvables : " + url);
            }

        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Impossible de résoudre : " + e.getMessage());
        }
        return ResponseEntity.ok(response);
    }

    // --- Méthodes utilitaires ---

    private String followRedirects(String urlStr, int maxHops) throws Exception {
        String current = urlStr;
        for (int i = 0; i < maxHops; i++) {
            HttpURLConnection conn = (HttpURLConnection) new URL(current).openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            conn.setRequestProperty("User-Agent", USER_AGENT);

            int status = conn.getResponseCode();

            if (status == 301 || status == 302 || status == 307 || status == 308) {
                String location = conn.getHeaderField("Location");
                conn.disconnect();
                if (location == null)
                    break;
                current = resolveUrl(current, location);
            } else if (status == 200) {
                String body = readBody(conn, 65536);
                conn.disconnect();

                // Redirection HTML/JS
                String redirect = extractRedirectFromBody(body, current);
                if (redirect != null && !redirect.equals(current))
                    current = redirect;
                else
                    break;
            } else {
                conn.disconnect();
                break;
            }
        }
        return current;
    }

    private String readBody(HttpURLConnection conn, int maxBytes) throws Exception {
        StringBuilder sb = new StringBuilder();
        BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
        char[] buf = new char[1024];
        int total = 0, read;
        while ((read = reader.read(buf)) != -1 && total < maxBytes) {
            sb.append(buf, 0, read);
            total += read;
        }
        reader.close();
        return sb.toString();
    }

    private String extractRedirectFromBody(String body, String currentUrl) {
        Matcher m = META_REFRESH.matcher(body);
        if (m.find())
            return resolveUrl(currentUrl, m.group(1).trim());
        m = JS_LOCATION.matcher(body);
        if (m.find())
            return resolveUrl(currentUrl, m.group(1).trim());
        return null;
    }

    private String extractQueryParam(String url, String param) {
        try {
            Pattern p = Pattern.compile("[?&]" + param + "=([^&]+)");
            Matcher m = p.matcher(url);
            if (m.find())
                return URLDecoder.decode(m.group(1), StandardCharsets.UTF_8);
        } catch (Exception ignored) {
        }
        return null;
    }

    private String resolveUrl(String base, String location) {
        if (location.startsWith("http"))
            return location;
        try {
            return new URL(new URL(base), location).toString();
        } catch (Exception e) {
            return location;
        }
    }

    private String extractPlaceName(String url) {
        try {
            Pattern p = Pattern.compile("/maps/(place|dir)/([^/?#]+)");
            Matcher m = p.matcher(url);
            if (m.find())
                return URLDecoder.decode(m.group(2).replace("+", " "), StandardCharsets.UTF_8);
        } catch (Exception ignored) {
        }
        return null;
    }

    private double[] extractCoordinates(String text) {
        for (Pattern p : new Pattern[] { COORDS_3D4D, COORDS_SEARCH, COORDS_Q, COORDS_LL, COORDS_AT }) {
            Matcher m = p.matcher(text);
            if (m.find()) {
                try {
                    double lat = Double.parseDouble(m.group(1));
                    double lng = Double.parseDouble(m.group(2));
                    if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)
                        return new double[] { lat, lng };
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return null;
    }

    private double[] geocodeWithNominatim(String query) {
        try {
            String cleanQuery = query.replaceAll("^[0-9A-Z]{4}[+\\s][0-9A-Z]{2,3}\\s*", "").trim();
            if (cleanQuery.isEmpty())
                cleanQuery = query;

            // Try multiple candidates (Google place links can include noisy suffixes)
            for (String candidate : buildGeocodeCandidates(cleanQuery)) {
                double[] result = nominatimSearch(candidate);
                if (result != null) return result;
            }

            String noAccent = stripAccents(cleanQuery);
            if (!noAccent.equals(cleanQuery)) {
                for (String candidate : buildGeocodeCandidates(noAccent)) {
                    double[] result = nominatimSearch(candidate);
                    if (result != null) return result;
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    /**
     * Nominatim est sensible au bruit. Les liens Google "place" peuvent contenir
     * des segments non géographiques. On génère donc quelques variantes stables.
     */
    private java.util.List<String> buildGeocodeCandidates(String q) {
        java.util.LinkedHashSet<String> out = new java.util.LinkedHashSet<>();
        if (q == null) return java.util.List.of();

        String base = q.trim();
        if (base.isEmpty()) return java.util.List.of();

        out.add(base);

        // Replace "+", normalize spaces
        String normalized = base.replace("+", " ").replaceAll("\\s+", " ").trim();
        out.add(normalized);

        // If comma-separated, try first parts (hotel name, then hotel+city)
        String[] parts = normalized.split("\\s*,\\s*");
        if (parts.length >= 1) {
            out.add(parts[0].trim());
        }
        if (parts.length >= 2) {
            out.add((parts[0] + ", " + parts[1]).trim());
        }

        // Burkina shorthand
        out.add(normalized.replace("Burkina", "Burkina Faso"));

        // Helpful for your dataset (lots of Ouagadougou links)
        if (!normalized.toLowerCase().contains("ouagadougou")) {
            out.add(normalized + ", Ouagadougou, Burkina Faso");
        } else if (!normalized.toLowerCase().contains("burkina")) {
            out.add(normalized + ", Burkina Faso");
        }

        return new java.util.ArrayList<>(out);
    }

    private String stripAccents(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
    }

    private double[] nominatimSearch(String query) {
        try {
            String encoded = URLEncoder.encode(query, StandardCharsets.UTF_8);
            URL url = new URL("https://nominatim.openstreetmap.org/search?q=" + encoded
                    + "&format=json&limit=1&accept-language=fr");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(8000);
            conn.setReadTimeout(8000);
            conn.setRequestProperty("User-Agent", "STORE-ALL-Location/1.0");
            conn.setRequestProperty("Accept", "application/json");

            if (conn.getResponseCode() != 200) {
                conn.disconnect();
                return null;
            }
            String body = readBody(conn, 4096);
            conn.disconnect();
            if (body.equals("[]"))
                return null;

            Matcher latM = Pattern.compile("\"lat\"\\s*:\\s*\"(-?[0-9.]+)\"").matcher(body);
            Matcher lonM = Pattern.compile("\"lon\"\\s*:\\s*\"(-?[0-9.]+)\"").matcher(body);
            if (latM.find() && lonM.find()) {
                double lat = Double.parseDouble(latM.group(1));
                double lon = Double.parseDouble(lonM.group(1));
                return new double[] { lat, lon };
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    /**
     * Décode un Plus Code (Open Location Code) en coordonnées (centre de cellule).
     * Supporte les formats complets courants (ex: 9FHH+Q75) et la présence dans une URL.
     */
    private double[] decodePlusCodeIfPresent(String text) {
        if (text == null) return null;
        String candidate = text;
        try {
            // Les URLs contiennent souvent le "+" encodé en %2B
            candidate = URLDecoder.decode(text, StandardCharsets.UTF_8);
        } catch (Exception ignored) {
        }
        Matcher m = PLUS_CODE.matcher(candidate.toUpperCase());
        if (!m.find()) return null;
        String code = m.group(1).toUpperCase();
        try {
            return decodeOpenLocationCodeWithFallback(code, candidate);
        } catch (Exception ignored) {
            return null;
        }
    }

    // Implémentation minimale du décodage Open Location Code (sans dépendance externe).
    // Référence: algorithme standard OLC (Google openlocationcode).
    private double[] decodeOpenLocationCodeWithFallback(String code, String contextText) {
        // Alphabet OLC
        final String ALPHABET = "23456789CFGHJMPQRVWX";
        final int ENCODING_BASE = 20;
        final char SEPARATOR = '+';
        final int SEPARATOR_POSITION = 8;

        // Normalisation
        String upper = code.toUpperCase().replaceAll("\\s+", "");
        int sep = upper.indexOf(SEPARATOR);
        if (sep < 0) throw new IllegalArgumentException("Invalid plus code (no '+')");

        // Codes courts (ex: 9FHH+Q75) : tenter une récupération via une localisation de référence.
        if (sep != SEPARATOR_POSITION) {
            double[] ref = guessReferenceLocation(contextText);
            if (ref == null) throw new IllegalArgumentException("Short plus code without reference");
            String full = recoverNearestFullCode(upper, ref[0], ref[1]);
            upper = full;
            sep = upper.indexOf(SEPARATOR);
            if (sep != SEPARATOR_POSITION) throw new IllegalArgumentException("Short plus code recovery failed");
        }

        String pairPart = upper.substring(0, sep);
        String gridPart = upper.substring(sep + 1);

        // Pair decoding (4 paires = 8 chars)
        double latLo = -90.0, latHi = 90.0;
        double lngLo = -180.0, lngHi = 180.0;
        double latRes = 180.0, lngRes = 360.0;

        for (int i = 0; i < pairPart.length(); i += 2) {
            int latDigit = ALPHABET.indexOf(pairPart.charAt(i));
            int lngDigit = ALPHABET.indexOf(pairPart.charAt(i + 1));
            if (latDigit < 0 || lngDigit < 0) throw new IllegalArgumentException("Invalid plus code chars");

            latRes /= ENCODING_BASE;
            lngRes /= ENCODING_BASE;

            latLo += latDigit * latRes;
            lngLo += lngDigit * lngRes;
            latHi = latLo + latRes;
            lngHi = lngLo + lngRes;
        }

        // Grid refinement (jusqu'à 3 chars courants: ex Q75)
        if (!gridPart.isEmpty()) {
            final int GRID_ROWS = 5;
            final int GRID_COLUMNS = 4;
            for (int i = 0; i < gridPart.length() && i < 3; i++) {
                int digit = ALPHABET.indexOf(gridPart.charAt(i));
                if (digit < 0) throw new IllegalArgumentException("Invalid grid char");

                double rowHeight = (latHi - latLo) / GRID_ROWS;
                double colWidth = (lngHi - lngLo) / GRID_COLUMNS;

                int row = digit / GRID_COLUMNS;
                int col = digit % GRID_COLUMNS;

                latLo = latLo + row * rowHeight;
                lngLo = lngLo + col * colWidth;
                latHi = latLo + rowHeight;
                lngHi = lngLo + colWidth;
            }
        }

        // Centre de cellule
        return new double[] { (latLo + latHi) / 2.0, (lngLo + lngHi) / 2.0 };
    }

    /**
     * Essaie de déduire une "référence" pour un Plus Code court depuis le texte (souvent une ville dans l'URL).
     * Objectif: décoder les codes courts partagés par Google Maps (ex: 9FHH+Q75, Ouagadougou).
     */
    private double[] guessReferenceLocation(String text) {
        if (text == null) return null;
        String t = text.toLowerCase();

        // Heuristique simple: vos liens contiennent souvent "Ouagadougou"
        if (t.contains("ouagadougou")) {
            double[] ref = nominatimSearch("Ouagadougou, Burkina Faso");
            if (ref != null) return ref;
        }
        if (t.contains("burkina")) {
            double[] ref = nominatimSearch("Burkina Faso");
            if (ref != null) return ref;
        }
        return null;
    }

    /**
     * Reconstitue un code complet (8 chars avant '+') à partir d'un code court et d'une référence (lat/lng).
     * Implémentation minimaliste inspirée de l'algorithme OLC "recoverNearest".
     */
    private String recoverNearestFullCode(String shortCode, double refLat, double refLng) {
        final char SEPARATOR = '+';
        final int SEPARATOR_POSITION = 8;

        String cleaned = shortCode.toUpperCase().replaceAll("\\s+", "");
        int sep = cleaned.indexOf(SEPARATOR);
        if (sep < 0) throw new IllegalArgumentException("Invalid short code");

        String shortPair = cleaned.substring(0, sep);
        String shortGrid = cleaned.substring(sep + 1);

        // Encode la référence au niveau pair (8 chars), puis prend le préfixe manquant.
        String refPairs = encodePairs8(refLat, refLng);
        int missing = SEPARATOR_POSITION - shortPair.length();
        if (missing <= 0) throw new IllegalArgumentException("Not a short code");

        String fullPairs = refPairs.substring(0, missing) + shortPair;
        return fullPairs + SEPARATOR + shortGrid;
    }

    /**
     * Encode lat/lng en 8 caractères "pairs" OLC (sans '+', sans grid).
     * Suffisant pour récupérer un préfixe de référence.
     */
    private String encodePairs8(double lat, double lng) {
        final String ALPHABET = "23456789CFGHJMPQRVWX";
        final int ENCODING_BASE = 20;

        // Clamp (OLC exclut 90/180 exacts)
        double adjLat = Math.min(89.999999, Math.max(-89.999999, lat));
        double adjLng = Math.min(179.999999, Math.max(-179.999999, lng));

        double latVal = adjLat + 90.0;
        double lngVal = adjLng + 180.0;

        StringBuilder out = new StringBuilder(8);
        double latRes = 180.0;
        double lngRes = 360.0;

        for (int i = 0; i < 4; i++) {
            latRes /= ENCODING_BASE;
            lngRes /= ENCODING_BASE;

            int latDigit = (int) Math.floor(latVal / latRes);
            int lngDigit = (int) Math.floor(lngVal / lngRes);

            // Garde-fou
            latDigit = Math.max(0, Math.min(ENCODING_BASE - 1, latDigit));
            lngDigit = Math.max(0, Math.min(ENCODING_BASE - 1, lngDigit));

            out.append(ALPHABET.charAt(latDigit));
            out.append(ALPHABET.charAt(lngDigit));

            latVal -= latDigit * latRes;
            lngVal -= lngDigit * lngRes;
        }
        return out.toString();
    }
}