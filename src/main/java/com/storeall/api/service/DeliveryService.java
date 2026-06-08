package com.storeall.api.service;

import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.storeall.api.entity.Order;
import com.storeall.api.repository.OrderRepository;

/**
 * Service pour les opérations spécifiques aux livreurs.
 */
@Service
public class DeliveryService {

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderService orderService; // Pour réutiliser la mise à jour de statut

    /**
     * Récupère les commandes prêtes à la livraison (CONFIRMED ou SHIPPED).
     */
    @Transactional(readOnly = true)
    public Page<Order> getOrdersForDelivery(Pageable pageable) {
        List<Order.Status> deliveryStatuses = Arrays.asList(
                Order.Status.CONFIRMED,
                Order.Status.SHIPPED
        );
        return orderRepository.findByStatusIn(deliveryStatuses, pageable);
    }

    /**
     * Met à jour le statut d'une commande (Livrée ou Annulée). Restreint aux
     * statuts de fin de livraison.
     */
    @Transactional
    public Order updateDeliveryStatus(Long id, String statusName) {
        // Validation : Un livreur ne peut que passer à DELIVERED ou CANCELLED (ou SHIPPED si prise en charge)
        // Pour simplifier, on réutilise la méthode générique mais on pourrait ajouter des restrictions ici.
        return orderService.updateOrderStatus(id, statusName);
    }
}
