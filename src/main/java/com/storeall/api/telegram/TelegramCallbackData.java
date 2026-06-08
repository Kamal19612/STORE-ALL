package com.storeall.api.telegram;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Encode / decode des {@code callback_data} Telegram (boutons inline commandes).
 * Format multi-boutique : {@code confirm:<storeId>:<orderId>} / {@code cancel:<storeId>:<orderId>}.
 * Legacy : {@code confirm_<orderId>} / {@code cancel_<orderId>}.
 */
public final class TelegramCallbackData {

    private static final Pattern NEW_FORMAT = Pattern.compile("^(confirm|cancel):(\\d+):(\\d+)$");
    private static final Pattern LEGACY_FORMAT = Pattern.compile("^(confirm|cancel)_(\\d+)$");

    private TelegramCallbackData() {}

    public record Parsed(String action, Long storeId, Long orderId) {}

    public static String encodeConfirm(Long storeId, Long orderId) {
        return "confirm:" + storeId + ":" + orderId;
    }

    public static String encodeCancel(Long storeId, Long orderId) {
        return "cancel:" + storeId + ":" + orderId;
    }

    public static Optional<Parsed> parse(String data) {
        if (data == null || data.isBlank()) {
            return Optional.empty();
        }
        String t = data.trim();
        Matcher m = NEW_FORMAT.matcher(t);
        if (m.matches()) {
            return Optional.of(new Parsed(
                    m.group(1),
                    Long.parseLong(m.group(2)),
                    Long.parseLong(m.group(3))));
        }
        m = LEGACY_FORMAT.matcher(t);
        if (m.matches()) {
            return Optional.of(new Parsed(m.group(1), null, Long.parseLong(m.group(2))));
        }
        return Optional.empty();
    }
}
