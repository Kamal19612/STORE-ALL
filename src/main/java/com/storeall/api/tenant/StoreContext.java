package com.storeall.api.tenant;

import com.storeall.api.entity.Store;

/**
 * StoreContext = tenant scope for the current request/thread.
 */
public final class StoreContext {
    private StoreContext() {}

    private static final ThreadLocal<Store> CURRENT = new ThreadLocal<>();

    public static void set(Store store) {
        CURRENT.set(store);
    }

    public static Store get() {
        return CURRENT.get();
    }

    public static Long getStoreIdOrNull() {
        Store s = CURRENT.get();
        return s == null ? null : s.getId();
    }

    public static String getStoreCodeOrNull() {
        Store s = CURRENT.get();
        return s == null ? null : s.getCode();
    }

    public static void clear() {
        CURRENT.remove();
    }
}

