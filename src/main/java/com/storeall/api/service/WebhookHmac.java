package com.storeall.api.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class WebhookHmac {

    private WebhookHmac() {}

    public static String signSha256Hex(String body, String secret) {
        if (secret == null) secret = "";
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] sig = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
            return toHex(sig);
        } catch (Exception e) {
            throw new IllegalStateException("Unable to compute HMAC", e);
        }
    }

    /**
     * Format attendu pour header: "sha256=<hex>".
     */
    public static boolean verifySignature(String body, String receivedHeader, String secret) {
        if (receivedHeader == null) return false;
        if (!receivedHeader.startsWith("sha256=")) return false;
        String receivedHex = receivedHeader.substring("sha256=".length());
        String expectedHex = signSha256Hex(body, secret);
        return constantTimeEquals(receivedHex, expectedHex);
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) return false;
        byte[] ba = a.getBytes(StandardCharsets.UTF_8);
        byte[] bb = b.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(ba, bb);
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte v : bytes) {
            sb.append(String.format("%02x", v));
        }
        return sb.toString();
    }
}

