package com.storeall.api.exception;

import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import jakarta.validation.ConstraintViolationException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, String>> handleAuthenticationException(AuthenticationException ex) {
        logger.warn("AuthenticationException: {}", ex.getMessage());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Identifiants incorrects.");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDeniedException(AccessDeniedException ex) {
        logger.warn("AccessDeniedException: {}", ex.getMessage());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Accès non autorisé.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(com.storeall.api.exception.StoreInactiveException.class)
    public ResponseEntity<Map<String, String>> handleStoreInactive(com.storeall.api.exception.StoreInactiveException ex) {
        logger.warn("StoreInactiveException: {}", ex.getMessage());
        Map<String, String> response = new HashMap<>();
        response.put("message", ex.getMessage() != null ? ex.getMessage() : "Cette boutique est désactivée.");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        logger.error("RuntimeException: ", ex);
        Map<String, String> response = new HashMap<>();
        response.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleUnreadable(HttpMessageNotReadableException ex) {
        logger.warn("HttpMessageNotReadableException: {}", ex.getMessage());
        Map<String, String> response = new HashMap<>();
        response.put("message", "Corps JSON invalide ou incompatible avec l'API : " + ex.getMostSpecificCause().getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
            .findFirst()
            .map(err -> err.getField() + " " + (err.getDefaultMessage() == null ? "invalide" : err.getDefaultMessage()))
            .orElse("Paramètres invalides.");
        logger.warn("MethodArgumentNotValidException: {}", msg);
        Map<String, String> response = new HashMap<>();
        response.put("message", msg);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, String>> handleConstraintViolation(ConstraintViolationException ex) {
        String msg = ex.getConstraintViolations().stream()
            .findFirst()
            .map(v -> v.getPropertyPath() + " " + v.getMessage())
            .orElse("Paramètres invalides.");
        logger.warn("ConstraintViolationException: {}", msg);
        Map<String, String> response = new HashMap<>();
        response.put("message", msg);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, String>> handleMaxSizeException(MaxUploadSizeExceededException exc) {
        logger.error("MaxUploadSizeExceededException: ", exc);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Fichier trop volumineux !");
        return ResponseEntity.status(HttpStatus.EXPECTATION_FAILED).body(response);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<Map<String, String>> handleMissingParams(MissingServletRequestParameterException ex) {
        logger.error("MissingServletRequestParameterException: ", ex);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Paramètre manquant : " + ex.getParameterName());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<Map<String, String>> handleMissingPart(MissingServletRequestPartException ex) {
        logger.error("MissingServletRequestPartException: ", ex);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Partie manquante (fichier/donnée) : " + ex.getRequestPartName());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        logger.error("MethodArgumentTypeMismatchException: ", ex);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Type de paramètre invalide : " + ex.getName() + " (attendu: " + ex.getRequiredType().getSimpleName() + ")");
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleException(Exception ex) {
        logger.error("Exception inattendue: ", ex);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Une erreur inattendue est survenue: " + ex.getMessage());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
