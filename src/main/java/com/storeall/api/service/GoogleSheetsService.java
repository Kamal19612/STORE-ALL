package com.storeall.api.service;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.opencsv.CSVReader;
import com.opencsv.exceptions.CsvException;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.api.services.sheets.v4.model.ClearValuesRequest;
import com.google.api.services.sheets.v4.model.UpdateValuesResponse;
import com.google.api.services.sheets.v4.model.ValueRange;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import com.storeall.api.config.GoogleConfig;
import com.storeall.api.dto.ImportSummary;
import com.storeall.api.dto.ProductRequest;
import com.storeall.api.dto.ProductResponse;
import com.storeall.api.entity.Product;
import com.storeall.api.entity.AppSetting;
import com.storeall.api.util.ExternalIdNormalizer;
import com.storeall.api.entity.Store;
import com.storeall.api.repository.ProductRepository;
import com.storeall.api.repository.AppSettingRepository;
import com.storeall.api.repository.StoreRepository;
import com.storeall.api.tenant.StoreContext;
import com.storeall.api.tenant.TenantProperties;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class GoogleSheetsService {

    @Autowired
    private GoogleConfig googleConfig;

    @Autowired
    private ProductService productService;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private AppSettingRepository appSettingRepository;

    @Autowired
    private StoreRepository storeRepository;

    @Autowired
    private StoreService storeService;

    @Autowired
    private TenantProperties tenantProperties;

    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    // NOTE: utilisé aussi pour l'export (écriture) des commandes.
    private static final List<String> SCOPES = Collections.singletonList(SheetsScopes.SPREADSHEETS);

    private static final Pattern SPREADSHEET_ID_IN_URL = Pattern.compile("/spreadsheets/d/([a-zA-Z0-9_-]+)");
    private static final Pattern SPREADSHEET_ID_PLAIN = Pattern.compile("^[a-zA-Z0-9_-]+$");
    /** « non » comme mot entier (évite faux positifs type « mignon », « pignon »). */
    private static final Pattern AVAILABILITY_NEGATIVE_NON = Pattern.compile("(?i)\\bnon\\b");

    /**
     * Mapping de colonnes basé sur l'en-tête du Sheet (plus robuste que des index fixes).
     * Si une colonne n'est pas trouvée, l'import retombe sur l'ancien mapping indexé.
     */
    private record ProductSheetColumns(
            int externalId,
            int imageUrl,
            int name,
            int description,
            int volumeWeight,
            int categoryName,
            int availability,
            int price) {
    }

    private static String normalizeHeaderCell(String raw) {
        if (raw == null) return "";
        String t = raw.trim().toLowerCase(Locale.ROOT);
        if (t.isEmpty()) return "";
        // Supprime accents + ponctuation pour matcher "Nom du produit", "NOM", "nom_produit", etc.
        t = java.text.Normalizer.normalize(t, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        t = t.replaceAll("[^a-z0-9]+", " ").trim();
        return t;
    }

    private static boolean looksLikeProductHeaderRow(List<Object> row) {
        if (row == null || row.isEmpty()) return false;
        int hits = 0;
        for (Object c : row) {
            String h = normalizeHeaderCell(c == null ? "" : String.valueOf(c));
            if (h.isEmpty()) continue;
            if (h.contains("nom") || h.contains("name")) hits++;
            if (h.contains("categorie") || h.contains("category")) hits++;
            if (h.contains("prix") || h.contains("price")) hits++;
            if (h.contains("disponibilite") || h.contains("disponible") || h.contains("availability")) hits++;
        }
        return hits >= 2;
    }

    private static int findHeaderRowIndex(List<List<Object>> values) {
        if (values == null) return -1;
        int maxProbe = Math.min(values.size(), 25);
        for (int i = 0; i < maxProbe; i++) {
            if (looksLikeProductHeaderRow(values.get(i))) {
                return i;
            }
        }
        return -1;
    }

    private static int headerIndexOf(java.util.Map<String, Integer> idx, String... keys) {
        for (String k : keys) {
            Integer v = idx.get(k);
            if (v != null) return v.intValue();
        }
        return -1;
    }

    private static ProductSheetColumns buildProductColumnsFromHeader(List<Object> headerRow) {
        if (headerRow == null) return null;
        java.util.Map<String, Integer> idx = new java.util.HashMap<>();
        for (int i = 0; i < headerRow.size(); i++) {
            String h = normalizeHeaderCell(headerRow.get(i) == null ? "" : String.valueOf(headerRow.get(i)));
            if (!h.isEmpty() && !idx.containsKey(h)) {
                idx.put(h, i);
            }
        }

        // Nom (obligatoire) : essaye plusieurs libellés courants
        int name = headerIndexOf(idx,
                "nom", "nom du produit", "produit", "designation", "designation du produit", "name", "product name");
        // Catégorie
        int category = headerIndexOf(idx, "categorie", "categorie produit", "category", "category name");
        // Prix
        int price = headerIndexOf(idx, "prix", "price", "prix unitaire", "tarif");
        // Disponibilité / stock
        int avail = headerIndexOf(idx, "disponibilite", "disponibilite stock", "disponible", "stock", "availability");
        // ID / Code
        int externalId = headerIndexOf(idx, "id", "code", "id produit", "product id", "external id");
        // Photo / image url
        int image = headerIndexOf(idx, "photo", "image", "image url", "url image", "url", "photo url");
        // Description / mode d'emploi
        int desc = headerIndexOf(idx, "mode d emploi", "mode emploi", "description", "details", "instructions");
        // Volume / poids
        int vol = headerIndexOf(idx, "volume poids", "volume", "poids", "volume/poids", "volume poids (ex 50ml)");

        // Si on n'a même pas la colonne nom, on considère que l'en-tête n'est pas exploitable
        if (name < 0) return null;

        return new ProductSheetColumns(
                externalId >= 0 ? externalId : 0,
                image >= 0 ? image : 1,
                name,
                desc >= 0 ? desc : 3,
                vol >= 0 ? vol : 4,
                category >= 0 ? category : 5,
                avail >= 0 ? avail : 6,
                price >= 0 ? price : 7);
    }

    /**
     * Initialise et retourne le service Sheets API.
     */
    private Sheets getSheetsService() throws IOException, GeneralSecurityException {
        final NetHttpTransport HTTP_TRANSPORT = GoogleNetHttpTransport.newTrustedTransport();

        // Charger les crédentials depuis le fichier JSON (supporte classpath: et chemins fichiers)
        java.io.InputStream credentialsStream;
        String path = googleConfig.getCredentialsFilePath();

        if (path.startsWith("classpath:")) {
            // Charger depuis le classpath (resources)
            String resourcePath = path.replace("classpath:", "");
            credentialsStream = getClass().getClassLoader().getResourceAsStream(resourcePath);
            if (credentialsStream == null) {
                throw new IOException("Fichier credentials non trouvé dans le classpath: " + resourcePath);
            }
            log.info("Credentials chargés depuis le classpath: {}", resourcePath);
        } else {
            // Charger depuis le système de fichiers
            credentialsStream = new FileInputStream(path);
            log.info("Credentials chargés depuis le fichier: {}", path);
        }

        GoogleCredentials credentials = GoogleCredentials.fromStream(credentialsStream)
                .createScoped(SCOPES);

        return new Sheets.Builder(HTTP_TRANSPORT, JSON_FACTORY, new HttpCredentialsAdapter(credentials))
                .setApplicationName(googleConfig.getApplicationName())
                .build();
    }

    private RestTemplate createSheetsImportRestTemplate() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(googleConfig.getHttpConnectTimeoutMs());
        f.setReadTimeout(googleConfig.getHttpReadTimeoutMs());
        return new RestTemplate(f);
    }

    /**
     * Extrait l’ID du classeur depuis une URL de partage ou valide un ID nu.
     */
    static String normalizeSpreadsheetId(String raw) {
        if (raw == null) {
            return null;
        }
        String t = raw.trim();
        if (t.isEmpty()) {
            return null;
        }
        var m = SPREADSHEET_ID_IN_URL.matcher(t);
        if (m.find()) {
            return m.group(1);
        }
        if (SPREADSHEET_ID_PLAIN.matcher(t).matches()) {
            return t;
        }
        return null;
    }

    private String importMode() {
        String m = googleConfig.getProductImportMode();
        return m == null || m.isBlank() ? "auto" : m.trim().toLowerCase(Locale.ROOT);
    }

    private Long resolveSheetGid(Long storeId, Long requestGid) {
        if (requestGid != null) {
            return requestGid;
        }
        if (storeId != null) {
            Optional<Long> scoped = appSettingRepository.findByKeyAndStoreId("google_sheet_gid", storeId)
                    .map(AppSetting::getValue)
                    .filter(v -> !v.isBlank())
                    .map(this::parseSheetGidValue);
            if (scoped.isPresent()) {
                return scoped.get();
            }
        }
        if (storeId == null || storeRepository.count() <= 1) {
            return appSettingRepository.findByKeyAndStoreIsNull("google_sheet_gid")
                    .map(AppSetting::getValue)
                    .filter(v -> !v.isBlank())
                    .map(this::parseSheetGidValue)
                    .orElse(googleConfig.getCsvExportSheetGid());
        }
        return googleConfig.getCsvExportSheetGid();
    }

    private Long parseSheetGidValue(String v) {
        try {
            return Long.parseLong(v.trim());
        } catch (NumberFormatException e) {
            log.warn("app_settings.google_sheet_gid invalide (nombre attendu): {}", v);
            return null;
        }
    }

    /**
     * Résout l’ID du classeur produits pour la boutique courante uniquement (pas de repli sur une autre boutique).
     */
    private String resolveProductSpreadsheetId(Long storeId, String explicitSpreadsheetId) {
        if (explicitSpreadsheetId != null && !explicitSpreadsheetId.isBlank()) {
            return normalizeSpreadsheetId(explicitSpreadsheetId.trim());
        }
        if (storeId == null) {
            return appSettingRepository.findByKeyAndStoreIsNull("google_sheet_id")
                    .map(AppSetting::getValue)
                    .filter(v -> !v.isBlank())
                    .map(String::trim)
                    .map(GoogleSheetsService::normalizeSpreadsheetId)
                    .orElseGet(() -> {
                        String yamlId = googleConfig.getSpreadsheetId();
                        return (yamlId != null && !yamlId.isBlank())
                                ? normalizeSpreadsheetId(yamlId.trim())
                                : null;
                    });
        }
        String scoped = appSettingRepository.findByKeyAndStoreId("google_sheet_id", storeId)
                .map(AppSetting::getValue)
                .filter(v -> !v.isBlank())
                .map(String::trim)
                .orElse(null);
        if (scoped != null) {
            return normalizeSpreadsheetId(scoped);
        }
        if (storeRepository.count() <= 1) {
            String yamlId = googleConfig.getSpreadsheetId();
            if (yamlId != null && !yamlId.isBlank()) {
                log.warn(
                    "[sheets] Boutique id={} : pas de google_sheet_id en base ; repli YAML (mono-boutique).",
                    storeId);
                return normalizeSpreadsheetId(yamlId.trim());
            }
        }
        return null;
    }

    /**
     * Empêche qu’un même classeur alimente deux catalogues non vides.
     * Si l’autre boutique n’a plus de produits (catalogue vidé), l’import est autorisé ;
     * {@link #releaseSheetBindingFromEmptyStores} retire alors le lien sheet sur l’autre boutique.
     */
    private boolean assertSpreadsheetExclusiveToStore(
            Long storeId, String normalizedSheetId, ImportSummary summary) {
        if (storeId == null || normalizedSheetId == null || normalizedSheetId.isEmpty()) {
            return true;
        }
        for (Store other : storeRepository.findAll()) {
            if (other.getId() == null || other.getId().equals(storeId)) {
                continue;
            }
            Optional<AppSetting> otherSheet = appSettingRepository.findByKeyAndStoreId("google_sheet_id", other.getId());
            if (otherSheet.isEmpty()) {
                continue;
            }
            String otherId = normalizeSpreadsheetId(otherSheet.get().getValue());
            if (otherId == null || !otherId.equals(normalizedSheetId)) {
                continue;
            }
            long otherProductCount = productRepository.countByStore_Id(other.getId());
            if (otherProductCount == 0) {
                log.info(
                    "[sheets] Classeur partagé en paramètres avec « {} » mais catalogue vide — import autorisé pour storeId={}",
                    other.getCode(), storeId);
                continue;
            }
            String msg = "Ce Google Sheet est déjà lié à la boutique « " + other.getCode()
                    + " » qui contient encore " + otherProductCount + " produit(s). "
                    + "Utilisez un classeur distinct, ou videz d’abord le catalogue « " + other.getCode()
                    + " », ou retirez google_sheet_id dans ses paramètres manager.";
            summary.addError(0, msg);
            log.warn("[sheets] Import bloqué pour storeId={} : {}", storeId, msg);
            return false;
        }
        return true;
    }

    /**
     * Après un import réussi sur une boutique, retire {@code google_sheet_id} des autres boutiques
     * qui pointaient vers le même classeur mais n’ont plus de produits (évite la synchro auto double).
     */
    private void releaseSheetBindingFromEmptyStores(Long ownerStoreId, String normalizedSheetId) {
        if (ownerStoreId == null || normalizedSheetId == null || normalizedSheetId.isEmpty()) {
            return;
        }
        for (Store other : storeRepository.findAll()) {
            if (other.getId() == null || other.getId().equals(ownerStoreId)) {
                continue;
            }
            if (productRepository.countByStore_Id(other.getId()) > 0) {
                continue;
            }
            appSettingRepository.findFirstByKeyAndStoreIdOrderByIdAsc("google_sheet_id", other.getId())
                    .ifPresent(setting -> {
                        String otherId = normalizeSpreadsheetId(setting.getValue());
                        if (otherId != null && otherId.equals(normalizedSheetId)) {
                            setting.setValue("");
                            appSettingRepository.save(setting);
                            log.info(
                                "[sheets] google_sheet_id retiré pour « {} » (catalogue vide, classeur repris par storeId={})",
                                other.getCode(), ownerStoreId);
                        }
                    });
        }
    }

    private boolean isSheetSyncEnabledForStore(Long storeId) {
        if (storeId != null) {
            Optional<AppSetting> scoped = appSettingRepository.findByKeyAndStoreId("google_sheet_sync_enabled", storeId);
            if (scoped.isPresent()) {
                return !"false".equalsIgnoreCase(scoped.get().getValue());
            }
        }
        return appSettingRepository.findByKeyAndStoreIsNull("google_sheet_sync_enabled")
                .map(s -> !"false".equalsIgnoreCase(s.getValue()))
                .orElse(true);
    }

    private void persistSheetIdForStore(Long storeId, String normalizedSheetId, boolean explicitFromRequest) {
        if (storeId == null || normalizedSheetId == null || normalizedSheetId.isEmpty()) {
            return;
        }
        if (!explicitFromRequest) {
            return;
        }
        AppSetting sheetSetting = appSettingRepository.findByKeyAndStoreId("google_sheet_id", storeId)
                .orElseGet(() -> AppSetting.builder()
                        .key("google_sheet_id")
                        .store(Store.builder().id(storeId).build())
                        .description("ID Google Sheet produits (par boutique)")
                        .build());
        sheetSetting.setValue(normalizedSheetId);
        appSettingRepository.save(sheetSetting);
    }

    /**
     * Télécharge le Sheet en CSV via l’URL d’export publique (aucun jeton OAuth).
     * Fonctionne si le fichier est accessible sans compte Google (ex. « Toute personne disposant du lien » en lecteur).
     */
    private List<List<Object>> fetchValuesViaPublicCsvExport(String spreadsheetId, Long sheetGid)
            throws IOException, CsvException {
        StringBuilder url = new StringBuilder("https://docs.google.com/spreadsheets/d/")
            .append(spreadsheetId)
            .append("/export?format=csv");
        if (sheetGid != null) {
            url.append("&gid=").append(sheetGid);
        }
        String urlStr = url.toString();
        log.info("Téléchargement export CSV Google (sans API): {}", urlStr);

        RestTemplate rt = createSheetsImportRestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.add(HttpHeaders.USER_AGENT, "STORE-ALL-ProductImport/1.0");
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<byte[]> response;
        try {
            response = rt.exchange(urlStr, HttpMethod.GET, entity, byte[].class);
        } catch (HttpStatusCodeException e) {
            throw new IOException("HTTP " + e.getStatusCode().value() + " sur l’export CSV: " + e.getStatusText(), e);
        } catch (RestClientException e) {
            throw new IOException("Erreur réseau lors du téléchargement CSV: " + e.getMessage(), e);
        }

        byte[] body = response.getBody();
        if (body == null || body.length == 0) {
            throw new IOException("Réponse CSV vide (HTTP " + response.getStatusCode().value() + ")");
        }

        int probe = Math.min(512, body.length);
        String head = new String(body, 0, probe, StandardCharsets.UTF_8).trim();
        if (head.startsWith("<!DOCTYPE") || head.startsWith("<html") || head.startsWith("<HTML")) {
            throw new IOException(
                "La réponse n’est pas du CSV (page HTML). Le fichier n’est probablement pas en « Toute personne disposant du lien » "
                    + "ou l’export est bloqué. Partagez en lecture publique par lien, ou donnez accès au compte de service (fichier JSON) "
                    + "et utilisez product-import-mode=api.");
        }

        return parseCsvBytesToGrid(body);
    }

    private static List<List<Object>> parseCsvBytesToGrid(byte[] body) throws IOException, CsvException {
        try (CSVReader reader = new CSVReader(new InputStreamReader(new ByteArrayInputStream(body), StandardCharsets.UTF_8))) {
            List<String[]> rows = reader.readAll();
            List<List<Object>> grid = new ArrayList<>(rows.size());
            for (String[] row : rows) {
                List<Object> line = new ArrayList<>(row.length);
                for (String cell : row) {
                    line.add(cell);
                }
                grid.add(line);
            }
            return grid;
        }
    }

    /**
     * Récupère les valeurs brutes d'une plage donnée.
     */
    public List<List<Object>> getSpreadsheetValues(String spreadsheetId, String range) throws IOException, GeneralSecurityException {
        Sheets service = getSheetsService();
        ValueRange response = service.spreadsheets().values()
                .get(spreadsheetId, range)
                .execute();
        return response.getValues();
    }

    /**
     * Efface une plage (ou une feuille via "NomFeuille!A:Z").
     */
    public void clearValues(String spreadsheetId, String range) throws IOException, GeneralSecurityException {
        Sheets service = getSheetsService();
        service.spreadsheets().values()
            .clear(spreadsheetId, range, new ClearValuesRequest())
            .execute();
    }

    /**
     * Écrit des valeurs dans une plage.
     */
    public UpdateValuesResponse updateValues(String spreadsheetId, String range, List<List<Object>> values)
            throws IOException, GeneralSecurityException {
        Sheets service = getSheetsService();
        ValueRange body = new ValueRange().setValues(values);
        return service.spreadsheets().values()
            .update(spreadsheetId, range, body)
            .setValueInputOption("RAW")
            .execute();
    }

    /**
     * Orchestre la récupération et l'importation des produits depuis le Sheet
     * configuré (même comportement qu’avant : pas de {@code sheetGid} explicite).
     */
    public ImportSummary fetchProducts(String spreadsheetId) {
        return fetchProducts(spreadsheetId, null);
    }

    /**
     * @param sheetGid identifiant d’onglet ({@code gid} dans l’URL du Sheet) pour l’export CSV ; optionnel (1er onglet).
     */
    public ImportSummary fetchProducts(String spreadsheetId, Long sheetGid) {
        long startTime = System.currentTimeMillis();
        ImportSummary summary = new ImportSummary();
        java.util.Set<String> sheetExternalIds = new java.util.HashSet<>();

        Long ctxStoreId = StoreContext.getStoreIdOrNull();
        boolean explicitFromRequest = spreadsheetId != null && !spreadsheetId.isBlank();

        String finalSpreadsheetId = resolveProductSpreadsheetId(ctxStoreId, spreadsheetId);
        log.info("Début synchronisation Google Sheets (boutique={}, mode={}, ID normalisé={})",
            ctxStoreId, importMode(), finalSpreadsheetId);

        if (finalSpreadsheetId == null || finalSpreadsheetId.isEmpty()) {
            summary.addError(0,
                "ID du Google Sheet invalide ou non configuré pour cette boutique. "
                    + "Renseignez google_sheet_id dans les paramètres manager (un classeur distinct par boutique).");
            log.error("Import échoué: aucun classeur pour storeId={}", ctxStoreId);
            return summary;
        }

        if (!assertSpreadsheetExclusiveToStore(ctxStoreId, finalSpreadsheetId, summary)) {
            return summary;
        }

        releaseSheetBindingFromEmptyStores(ctxStoreId, finalSpreadsheetId);
        persistSheetIdForStore(ctxStoreId, finalSpreadsheetId, explicitFromRequest);

        Long resolvedGid = resolveSheetGid(ctxStoreId, sheetGid);
        String mode = importMode();

        String[] possibleRanges = {
            "Produits!A:H",
            "PRODUITS!A:H",
            "Products!A:H",
            "Feuille 1!A:H",
            "Feuille1!A:H",
            "Sheet1!A:H",
            "A:H"
        };
        String range = possibleRanges[0];

        log.info("Synchronisation produits: spreadsheetId={}, sheetGid={}, importMode={}", finalSpreadsheetId, resolvedGid, mode);

        try {
            List<List<Object>> values = null;
            String sourceLabel = null;
            Exception csvFailure = null;
            Exception apiFailure = null;

            boolean tryCsv = "auto".equals(mode) || "csv".equals(mode);
            boolean tryApi = "auto".equals(mode) || "api".equals(mode);

            if (tryCsv) {
                try {
                    values = fetchValuesViaPublicCsvExport(finalSpreadsheetId, resolvedGid);
                    sourceLabel = "export CSV public (gid=" + resolvedGid + ")";
                    // Sanity check: le CSV peut viser le mauvais onglet (gid absent) ou une feuille "catégories"
                    // et ne pas contenir la colonne Nom. Dans ce cas, on bascule sur l'API (ranges nommés).
                    int hdr = findHeaderRowIndex(values);
                    ProductSheetColumns detected = hdr >= 0 ? buildProductColumnsFromHeader(values.get(hdr)) : null;
                    if (detected == null) {
                        log.warn(
                            "Export CSV téléchargé mais en-tête produits non reconnu (gid={}): bascule vers API Google Sheets. "
                                + "Astuce: passez sheetGid (onglet produits) ou définissez app_settings.google_sheet_gid.",
                            resolvedGid);
                        values = null;
                        sourceLabel = null;
                    }
                } catch (IOException | CsvException e) {
                    csvFailure = e;
                    log.warn("Export CSV public indisponible ou invalide: {}", e.getMessage());
                }
            }

            if ((values == null || values.isEmpty()) && tryApi) {
                log.info("Lecture via API Google Sheets (compte de service)…");
                for (String candidateRange : possibleRanges) {
                    try {
                        log.info("Tentative API avec range: {}", candidateRange);
                        List<List<Object>> candidateValues = getSpreadsheetValues(finalSpreadsheetId, candidateRange);
                        if (candidateValues != null && !candidateValues.isEmpty()) {
                            values = candidateValues;
                            range = candidateRange;
                            sourceLabel = "API Google Sheets, range=" + candidateRange;
                            break;
                        }
                    } catch (IOException | GeneralSecurityException e) {
                        apiFailure = e;
                        log.warn("Échec lecture API range {}: {}", candidateRange, e.getMessage());
                    }
                }
            }

            if (values == null || values.isEmpty()) {
                StringBuilder hint = new StringBuilder();
                if ("csv".equals(mode) && csvFailure != null) {
                    hint.append("CSV: ").append(csvFailure.getMessage());
                } else if ("api".equals(mode) && apiFailure != null) {
                    hint.append("API: ").append(apiFailure.getMessage())
                        .append(" — Vérifiez credentials.json et que le compte de service a accès au fichier.");
                } else {
                    if (csvFailure != null) {
                        hint.append("CSV: ").append(csvFailure.getMessage()).append(". ");
                    }
                    if (apiFailure != null) {
                        hint.append("API: ").append(apiFailure.getMessage());
                    }
                    if (hint.length() == 0) {
                        hint.append("Aucune donnée (sheet vide sur les plages testées ou export CSV vide).");
                    } else {
                        hint.append(" — Pour CSV sans compte Google : partage « Toute personne disposant du lien » (lecteur). "
                            + "Pour l’API : partager le Sheet avec l’e-mail du compte de service du fichier JSON.");
                    }
                }
                summary.addError(0, "Impossible de lire le Sheet. " + hint);
                log.error("Import produits annulé. {}", hint);
                return summary;
            }

            consumeProductRows(values, sourceLabel != null ? sourceLabel : range, summary, sheetExternalIds);
            productService.deactivateProductsNotInExternalIdSet(sheetExternalIds, summary);

        } catch (Exception e) {
            log.error("Erreur Google Sheets (inattendue)", e);
            summary.addError(0, "Erreur Google Sheets: " + e.getMessage());
        }

        long duration = System.currentTimeMillis() - startTime;
        log.info("Synchronisation terminée en {}ms", duration);

        return summary;
    }

    /**
     * Résultat du parsing de la colonne « Disponibilité » (aligné PHP + séparation rupture / fiche inactive).
     */
    private record SheetDisponibiliteParse(int stock, boolean purchaseAllowed, boolean catalogActive) {}

    /**
     * Colonne « Disponibilité » du sheet :
     * <ul>
     *   <li>Valeurs PHP « vrai » : DISPONIBLE, OUI, 1, TRUE (et équivalents) → vente autorisée ; stock par défaut 100 ou 1 si cellule "1".</li>
     *   <li>Rupture / épuisé / hors stock → stock 0 mais {@code purchaseAllowed true} (réassort possible).</li>
     *   <li>INACTIF / masqué / désactivé → fiche inactive + pas de vente.</li>
     *   <li>NON, FALSE, indisponible, « non » mot entier → pas de vente.</li>
     *   <li>Chiffres → stock numérique ; quantité 0 → pas de vente.</li>
     *   <li>Cellule vide → stock 100, vente autorisée (comportement historique).</li>
     * </ul>
     */
    private static SheetDisponibiliteParse parseSheetDisponibiliteColumn(String availabilityStr) {
        String raw = availabilityStr == null ? "" : availabilityStr.trim();
        if (raw.isEmpty()) {
            return new SheetDisponibiliteParse(100, true, true);
        }
        String lower = raw.toLowerCase(Locale.ROOT);

        if (lower.contains("inactif")
            || lower.contains("désactivé")
            || lower.contains("desactive")
            || lower.contains("masqué")
            || lower.contains("masque")) {
            return new SheetDisponibiliteParse(0, false, false);
        }

        if (lower.contains("rupture")
            || lower.contains("épuisé")
            || lower.contains("epuise")
            || lower.contains("hors stock")
            || lower.contains("hors-stock")
            || lower.contains("plus de stock")
            || lower.contains("stock épuisé")
            || lower.contains("stock epuise")) {
            return new SheetDisponibiliteParse(0, true, true);
        }

        if (lower.contains("indisponible")
            || AVAILABILITY_NEGATIVE_NON.matcher(lower).find()
            || lower.equals("false")
            || lower.equals("faux")
            || lower.equals("no")
            || lower.equals("0")
            || raw.matches("0+")) {
            return new SheetDisponibiliteParse(0, false, true);
        }

        if (lower.contains("disponible")
            || lower.equals("oui")
            || lower.equals("ok")
            || lower.equals("yes")
            || lower.equals("true")
            || lower.equals("1")
            || lower.contains("en stock")) {
            int stock = "1".equals(lower) ? 1 : 100;
            return new SheetDisponibiliteParse(stock, true, true);
        }

        if (raw.matches("\\d+")) {
            try {
                int n = Integer.parseInt(raw);
                return new SheetDisponibiliteParse(Math.max(0, n), n > 0, true);
            } catch (NumberFormatException e) {
                return new SheetDisponibiliteParse(0, false, true);
            }
        }

        if (lower.matches(".*\\d.*")) {
            String cleanStock = raw.replaceAll("[^0-9]", "");
            if (cleanStock.isEmpty()) {
                return new SheetDisponibiliteParse(0, false, true);
            }
            try {
                int n = Integer.parseInt(cleanStock);
                return new SheetDisponibiliteParse(Math.max(0, n), n > 0, true);
            } catch (NumberFormatException e) {
                return new SheetDisponibiliteParse(0, false, true);
            }
        }

        return new SheetDisponibiliteParse(100, true, true);
    }

    private void consumeProductRows(List<List<Object>> values, String sourceLabel, ImportSummary summary,
            java.util.Set<String> sheetExternalIds) {
        log.info("{} lignes lues ({})", values.size(), sourceLabel);

        int rowNum = 0;
        int processedCount = 0;
        int skippedCount = 0;

        int headerIdx0 = findHeaderRowIndex(values);
        List<Object> headerRow = (headerIdx0 >= 0 && headerIdx0 < values.size()) ? values.get(headerIdx0) : null;
        ProductSheetColumns cols = buildProductColumnsFromHeader(headerRow);
        if (headerIdx0 >= 0) {
            log.info("En-tête détecté à la ligne {}: {}", headerIdx0 + 1, headerRow);
        } else {
            log.warn("En-tête non détecté dans les 25 premières lignes — fallback indexé (A:H).");
        }
        if (cols != null) {
            log.info("Mapping colonnes détecté: externalId={}, imageUrl={}, name={}, description={}, volumeWeight={}, category={}, availability={}, price={}",
                    cols.externalId(), cols.imageUrl(), cols.name(), cols.description(), cols.volumeWeight(),
                    cols.categoryName(), cols.availability(), cols.price());
        } else {
            log.warn("Mapping colonnes non déterminé — fallback indexé (A:H).");
        }

        for (List<Object> row : values) {
            rowNum++;
            if (headerIdx0 >= 0) {
                // Ignore toutes les lignes jusqu'à l'en-tête inclus
                if (rowNum <= headerIdx0 + 1) {
                    continue;
                }
            } else {
                // Compat historique : 1ère ligne = en-tête
                if (rowNum == 1) {
                    log.info("En-tête (fallback): {}", row);
                    continue;
                }
            }
            if (rowNum <= 4) {
                log.info("[DEBUG] Ligne {}: {}", rowNum, row);
            }
            try {
                int externalIdIdx = cols != null ? cols.externalId() : 0;
                String externalId = ExternalIdNormalizer.normalize(SafeGet(row, externalIdIdx));
                if (!externalId.isEmpty()) {
                    sheetExternalIds.add(externalId);
                }
                if (rowNum % 50 == 0) {
                    log.info("Progression: {} lignes…", rowNum);
                }
                boolean isNew = processRow(row, summary, rowNum, cols);
                processedCount++;
                if (isNew) {
                    summary.incrementCreated();
                } else {
                    summary.incrementUpdated();
                }
            } catch (RuntimeException e) {
                String errorMsg = "Erreur ligne " + rowNum + ": " + e.getMessage();
                summary.addError(rowNum, errorMsg);
                log.error(errorMsg, e);
                skippedCount++;
            }
        }
        log.info("Traitement terminé: {} lignes données, {} erreurs ligne", processedCount, skippedCount);
    }

    private boolean processRow(List<Object> row, ImportSummary summary, int rowNum, ProductSheetColumns cols) {
        summary.incrementTotal();

        // Mapping par en-tête si disponible, sinon index historique A:H
        int externalIdIdx = cols != null ? cols.externalId() : 0;
        int imageIdx = cols != null ? cols.imageUrl() : 1;
        int nameIdx = cols != null ? cols.name() : 2;
        int descIdx = cols != null ? cols.description() : 3;
        int volIdx = cols != null ? cols.volumeWeight() : 4;
        int catIdx = cols != null ? cols.categoryName() : 5;
        int availIdx = cols != null ? cols.availability() : 6;
        int priceIdx = cols != null ? cols.price() : 7;

        String externalId = ExternalIdNormalizer.normalize(SafeGet(row, externalIdIdx));
        String imageUrl = SafeGet(row, imageIdx);
        String name = SafeGet(row, nameIdx);
        String description = SafeGet(row, descIdx); // Mode d'emploi
        String volumeWeight = SafeGet(row, volIdx); // Volume_poids (ex: "50ml", "100g")
        String categoryName = SafeGet(row, catIdx);
        String availabilityStr = SafeGet(row, availIdx);
        String priceStr = SafeGet(row, priceIdx);

        log.info("📝 [ROW {}] Processing: ID={}, Name={}, Category={}, Price={}, Availability={}",
            rowNum, externalId, name, categoryName, priceStr, availabilityStr);

        if (name.isEmpty()) {
            // Parfois l'ID est là mais pas le nom, on ignore
            if (SafeGet(row, 0).isEmpty()) {
                log.trace("Ligne {}: Ligne vide ignorée", rowNum);
                return false; // Ligne vide
            }
            summary.addError(rowNum, "Nom du produit obligatoire");
            log.warn("Ligne {}: Nom manquant.", rowNum);
            return false;
        }

        // Si catégorie vide, on met "Divers" par défaut ? Non, erreur pour l'instant
        if (categoryName.isEmpty()) {
            categoryName = "Divers"; // Fallback
        }

        try {
            ProductRequest request = new ProductRequest();
            request.setName(name);
            request.setCategoryName(categoryName);

            // Parsing Prix
            String cleanPrice = priceStr.replace(",", ".").replaceAll("[^0-9.]", "");
            request.setPrice(cleanPrice.isEmpty() ? BigDecimal.ZERO : new BigDecimal(cleanPrice));
            log.debug("💰 [ROW {}] Prix parsé: {} -> {}", rowNum, priceStr, request.getPrice());

            request.setDescription(description);
            request.setVolumeWeight(volumeWeight); // Volume/Poids depuis colonne E
            // Description courte générée automatiquement à partir de description si vide
            request.setShortDescription(
                    description.length() > 100 ? description.substring(0, 97) + "..." : description
            );

            SheetDisponibiliteParse disp = parseSheetDisponibiliteColumn(availabilityStr);
            request.setStock(disp.stock());
            request.setPurchaseAllowed(disp.purchaseAllowed());
            request.setActive(disp.catalogActive());
            log.debug("📦 [ROW {}] Disponibilité: raw={} → stock={}, purchaseAllowed={}, active={}",
                rowNum, availabilityStr, disp.stock(), disp.purchaseAllowed(), disp.catalogActive());

            // Slug : préfixer par l’ID externe si présent (évite deux lignes Sheet → même slug → une seule ligne en base).
            String baseSlug = name.toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-").replaceAll("^-|-$", "");
            String slug;
            if (externalId != null && !externalId.isBlank()) {
                String idPart = externalId.toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-").replaceAll("^-|-$", "");
                slug = idPart + "-" + baseSlug;
            } else {
                slug = baseSlug;
            }
            if (slug.length() > 200) {
                slug = slug.substring(0, 200);
            }
            request.setSlug(slug);

            log.info("🚀 [ROW {}] Appel importProduct pour: {} (ID={}, Stock={}, disponibleAPI={})",
                rowNum, name, externalId, disp.stock(), disp.purchaseAllowed() && disp.stock() > 0 && disp.catalogActive());

            // MODIFIÉ: Passer l'externalId au service
            ProductResponse savedProduct = productService.importProduct(request, imageUrl, externalId);
            log.info("✅ [ROW {}] Produit importé: {} (ID externe: {}, Slug: {}, Created: {})",
                rowNum, savedProduct.getName(), externalId, savedProduct.getSlug(), savedProduct.isCreated());
            summary.incrementSuccess();

            // Retourner vrai si c'est une création, faux si c'est une mise à jour
            return savedProduct.isCreated();

        } catch (RuntimeException e) {
            log.error("❌ [ROW {}] Erreur traitement: {}", rowNum, e.getMessage(), e);
            throw new RuntimeException("Erreur traitement: " + e.getMessage(), e);
        }
    }

    private String SafeGet(List<Object> row, int index) {
        if (index >= row.size()) {
            return "";
        }
        Object val = row.get(index);
        return val == null ? "" : val.toString().trim();
    }

    /**
     * Tâche planifiée : importe les produits automatiquement.
     * Cadence : {@code google.sheets.sync-rate} — {@code fixedRate} = tentative toutes les N ms (défaut 60000 = 1 minute).
     */
    @org.springframework.scheduling.annotation.Scheduled(
        fixedRateString = "${google.sheets.sync-rate:60000}",
        initialDelayString = "${google.sheets.sync-initial-delay:15000}")
    public void importProductsScheduled() {
        List<Store> stores = storeRepository.findAll();
        if (stores.isEmpty()) {
            log.warn("Synchronisation Google Sheets : aucune boutique en base.");
            return;
        }

        for (Store store : stores) {
            if (store.getId() == null || !store.isActive()) {
                continue;
            }
            if (!isSheetSyncEnabledForStore(store.getId())) {
                log.debug("⏸️ Synchro Sheets ignorée pour {} (désactivée)", store.getCode());
                continue;
            }
            String sheetId = resolveProductSpreadsheetId(store.getId(), null);
            if (sheetId == null || sheetId.isEmpty()) {
                log.debug("⏸️ Synchro Sheets ignorée pour {} (pas de google_sheet_id)", store.getCode());
                continue;
            }

            log.info("Démarrage synchronisation automatique Google Sheets (boutique={}, id={})…",
                store.getCode(), store.getId());
            try {
                StoreContext.set(store);
                ImportSummary summary = fetchProducts(null, null);

                log.info(
                    "Résultats synchro Sheets [{}] : créations={}, mises à jour={}, désactivations={}, erreurs={}",
                    store.getCode(),
                    summary.getCreatedCount(), summary.getUpdatedCount(), summary.getDeactivatedCount(),
                    summary.getErrorCount());

                if (summary.getErrorCount() > 0) {
                    log.warn("Synchro [{}] avec {} erreur(s) : {}", store.getCode(), summary.getErrorCount(),
                        summary.getErrorMessages());
                }
            } catch (RuntimeException e) {
                log.error("Échec synchronisation Sheets pour boutique {}", store.getCode(), e);
            } finally {
                StoreContext.clear();
            }
        }
    }

    /**
     * Diagnostic : classeurs Google Sheet par boutique et conflits (même sheet sur plusieurs boutiques).
     */
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public Map<String, Object> buildSheetDiagnostics() {
        Map<String, Object> out = new LinkedHashMap<>();
        List<Map<String, String>> perStore = new ArrayList<>();
        Map<String, List<String>> sheetToStoreCodes = new LinkedHashMap<>();

        for (Store store : storeRepository.findAll()) {
            if (store.getId() == null) {
                continue;
            }
            String sheet = resolveProductSpreadsheetId(store.getId(), null);
            String sheetDisplay = sheet == null ? "" : sheet;
            long productCount = productRepository.countByStore_Id(store.getId());
            perStore.add(Map.of(
                    "storeId", String.valueOf(store.getId()),
                    "storeCode", store.getCode() == null ? "" : store.getCode(),
                    "spreadsheetId", sheetDisplay,
                    "productCount", String.valueOf(productCount),
                    "syncEnabled", String.valueOf(isSheetSyncEnabledForStore(store.getId()))));
            if (sheet != null && !sheet.isEmpty()) {
                sheetToStoreCodes.computeIfAbsent(sheet, k -> new ArrayList<>())
                        .add(store.getCode() == null ? String.valueOf(store.getId()) : store.getCode());
            }
        }

        List<String> conflicts = sheetToStoreCodes.entrySet().stream()
                .filter(e -> e.getValue().size() > 1)
                .map(e -> "Classeur " + e.getKey() + " partagé par : " + String.join(", ", e.getValue()))
                .collect(Collectors.toList());

        out.put("stores", perStore);
        out.put("sharedSheetConflicts", conflicts);
        out.put("hint", conflicts.isEmpty()
                ? "Chaque boutique active devrait avoir son propre google_sheet_id."
                : "Si une boutique a productCount=0, l’import Sheets sur l’autre boutique retirera automatiquement "
                    + "le lien sheet de la boutique vide. Sinon : classeurs distincts ou vider le catalogue.");
        return out;
    }

    /**
     * Import / mise à jour de boutiques depuis un Google Sheet (super admin).
     * Ne modifie pas {@code google_sheet_id} des paramètres produits.
     */
    public ImportSummary fetchStoresFromGoogleSheets(String spreadsheetId, Long sheetGid) {
        String rawId = spreadsheetId != null && !spreadsheetId.isBlank()
                ? spreadsheetId.trim()
                : appSettingRepository.findByKeyAndStoreIsNull("google_sheet_id")
                        .map(AppSetting::getValue)
                        .filter(v -> !v.isBlank())
                        .orElse(googleConfig.getSpreadsheetId());

        String finalSpreadsheetId = normalizeSpreadsheetId(rawId);
        if (finalSpreadsheetId == null || finalSpreadsheetId.isEmpty()) {
            ImportSummary summary = new ImportSummary();
            summary.addError(0, "ID du Google Sheet invalide ou non configuré.");
            return summary;
        }

        Long resolvedGid = resolveSheetGid(null, sheetGid);
        try {
            List<List<Object>> values = fetchValuesViaPublicCsvExport(finalSpreadsheetId, resolvedGid);
            if (values == null || values.isEmpty()) {
                ImportSummary summary = new ImportSummary();
                summary.addError(0, "Feuille vide ou export CSV indisponible.");
                return summary;
            }
            return storeService.importStoresFromSheetGrid(values);
        } catch (IOException | CsvException e) {
            ImportSummary summary = new ImportSummary();
            summary.addError(0, "Erreur lecture Sheet: " + e.getMessage());
            return summary;
        }
    }
}
