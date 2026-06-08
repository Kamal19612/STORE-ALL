package com.storeall.api.dto;

import java.time.LocalDateTime;

import com.storeall.api.entity.Store;
import com.storeall.api.entity.User;

import lombok.Builder;
import lombok.Value;

/** Ligne liste managers (super admin), sans secrets. */
@Value
@Builder
public class ManagerSupervisionRow {

    Long id;
    String username;
    String email;
    String phone;
    /** Nom affiché (firstName / composition). */
    String nom;
    boolean active;
    Long storeId;
    String storeCode;
    String storeName;
    LocalDateTime createdAt;
    LocalDateTime lastLogin;

    public static ManagerSupervisionRow fromEntity(User u) {
        Store s = u.getStore();
        String nom = buildNom(u);
        return ManagerSupervisionRow.builder()
                .id(u.getId())
                .username(u.getUsername())
                .email(u.getEmail())
                .phone(u.getPhone())
                .nom(nom)
                .active(u.isActive())
                .storeId(s != null ? s.getId() : null)
                .storeCode(s != null ? s.getCode() : null)
                .storeName(s != null ? s.getName() : null)
                .createdAt(u.getCreatedAt())
                .lastLogin(u.getLastLogin())
                .build();
    }

    private static String buildNom(User u) {
        String fn = u.getFirstName() != null ? u.getFirstName().trim() : "";
        String ln = u.getLastName() != null ? u.getLastName().trim() : "";
        if (!fn.isEmpty() && !ln.isEmpty()) {
            return fn + " " + ln;
        }
        if (!fn.isEmpty()) {
            return fn;
        }
        if (!ln.isEmpty()) {
            return ln;
        }
        return "";
    }
}
