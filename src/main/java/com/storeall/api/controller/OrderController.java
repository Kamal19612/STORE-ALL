package com.storeall.api.controller;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.storeall.api.dto.OrderRequest;
import com.storeall.api.dto.OrderResponse;
import com.storeall.api.service.OrderService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.Validator;

/**
 * Contrôleur REST pour la gestion des commandes publiques.
 */
@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    @Autowired
    private OrderService orderService;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private Validator validator;

    /**
     * POST /api/orders : Créer une nouvelle commande (JSON).
     */
    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<OrderResponse> createOrder(@Valid @RequestBody OrderRequest orderRequest) {
        OrderResponse response = orderService.createOrder(orderRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * POST /api/orders : Créer une commande avec PDF remplis (multipart).
     * Parts : {@code order} (JSON) + {@code filledPdf_0}, {@code filledPdf_1}, …
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<OrderResponse> createOrderMultipart(
            @RequestPart("order") String orderJson,
            HttpServletRequest request) throws IOException {
        OrderRequest orderRequest = objectMapper.readValue(orderJson, OrderRequest.class);
        validateOrderRequest(orderRequest);
        Map<Integer, MultipartFile> filledPdfs = extractFilledPdfs(request);
        OrderResponse response = orderService.createOrder(orderRequest, filledPdfs);
        return ResponseEntity.ok(response);
    }

    private Map<Integer, MultipartFile> extractFilledPdfs(HttpServletRequest request) {
        Map<Integer, MultipartFile> filledPdfs = new HashMap<>();
        if (!(request instanceof MultipartHttpServletRequest multipartRequest)) {
            return filledPdfs;
        }
        multipartRequest.getFileMap().forEach((key, file) -> {
            if (key == null || !key.startsWith("filledPdf_") || file == null || file.isEmpty()) {
                return;
            }
            try {
                int index = Integer.parseInt(key.substring("filledPdf_".length()));
                filledPdfs.put(index, file);
            } catch (NumberFormatException ignored) {
                // ignore malformed keys
            }
        });
        return filledPdfs;
    }

    private void validateOrderRequest(OrderRequest orderRequest) {
        BeanPropertyBindingResult errors = new BeanPropertyBindingResult(orderRequest, "orderRequest");
        validator.validate(orderRequest, errors);
        if (errors.hasErrors()) {
            String msg = errors.getFieldErrors().stream()
                    .findFirst()
                    .map(err -> err.getField() + " " + (err.getDefaultMessage() == null ? "invalide" : err.getDefaultMessage()))
                    .orElse("Paramètres invalides.");
            throw new IllegalArgumentException(msg);
        }
    }
}
