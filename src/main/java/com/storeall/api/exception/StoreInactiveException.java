package com.storeall.api.exception;

/**
 * Boutique existante mais désactivée : accès vitrine / tenant refusé.
 */
public class StoreInactiveException extends RuntimeException {

    public StoreInactiveException(String message) {
        super(message);
    }
}
