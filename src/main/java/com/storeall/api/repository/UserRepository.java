package com.storeall.api.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.storeall.api.entity.User;

/**
 * Repository pour l'accès aux données des Utilisateurs (CRUD).
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Trouve un utilisateur par son nom d'utilisateur.
     *
     * @param username Le nom d'utilisateur recherché.
     * @return Un Optional contenant l'utilisateur s'il existe.
     */
    Optional<User> findByUsername(String username);

    /**
     * Trouve un utilisateur par son email.
     *
     * @param email L'email recherché.
     * @return Un Optional contenant l'utilisateur s'il existe.
     */
    Optional<User> findByEmail(String email);

    /**
     * Trouve un utilisateur par username OU email.
     */
    Optional<User> findByUsernameOrEmail(String username, String email);

    /**
     * Vérifie si un nom d'utilisateur existe déjà.
     */
    Boolean existsByUsername(String username);

    /**
     * Vérifie si un email existe déjà.
     */
    Boolean existsByEmail(String email);

    /**
     * Trouve un utilisateur par son rôle.
     */
    Optional<User> findByRole(User.Role role);

    // Multi-store scoped
    List<User> findByStoreId(Long storeId);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.store WHERE u.role = :role ORDER BY u.id DESC")
    List<User> findAllByRoleWithStore(@Param("role") User.Role role);

    @Query("SELECT u FROM User u LEFT JOIN FETCH u.store WHERE u.username = :username")
    Optional<User> findByUsernameWithStore(@Param("username") String username);

    @Modifying
    @Query("DELETE FROM User u WHERE u.store.id = :storeId")
    void deleteByStore_Id(@Param("storeId") Long storeId);
}
