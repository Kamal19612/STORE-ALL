package com.storeall.api.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.storeall.api.dto.SliderRequest;

import com.storeall.api.entity.Slider;
import com.storeall.api.service.SliderService;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api")
public class SliderController {

    @Autowired
    private SliderService sliderService;

    /**
     * Public : Récupérer les sliders actifs pour la page d'accueil.
     */
    @GetMapping("/sliders")
    public ResponseEntity<List<Slider>> getActiveSliders() {
        return ResponseEntity.ok(sliderService.getActiveSliders());
    }

    /**
     * Admin : Récupérer tous les sliders.
     */
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
    @GetMapping("/manager/{storeId}/sliders")
    public ResponseEntity<List<Slider>> getAllSliders(@PathVariable Long storeId) {
        return ResponseEntity.ok(sliderService.getAllSliders());
    }

    /**
     * Admin : Créer un nouveau slider (upload image obligatoire).
     */
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
    @PostMapping("/manager/{storeId}/sliders")
    public ResponseEntity<Slider> createSlider(@PathVariable Long storeId, @ModelAttribute SliderRequest request) {
        
        System.out.println("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
        System.out.println("!!! DEBUG: SliderController.createSlider called");
        System.out.println("!!! Title: " + request.getTitle());
        System.out.println("!!! Image is null: " + (request.getImage() == null));
        if (request.getImage() != null) {
            System.out.println("!!! Image Original Name: " + request.getImage().getOriginalFilename());
            System.out.println("!!! Image Content Type: " + request.getImage().getContentType());
            System.out.println("!!! Image Size: " + request.getImage().getSize());
        }
        System.out.println("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");

        return ResponseEntity.ok(sliderService.createSlider(
                request.getTitle(), 
                request.getDescription(), 
                request.getImage(), 
                request.getImageUrl(), 
                request.getDisplayOrder(), 
                request.getActive()));
    }

    /**
     * Admin : Supprimer un slider.
     */
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
    @DeleteMapping("/manager/{storeId}/sliders/{id}")
    public ResponseEntity<Void> deleteSlider(@PathVariable Long storeId, @PathVariable Long id) {
        sliderService.deleteSlider(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Admin : Activer/Désactiver un slider.
     */
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MANAGER')")
    @PutMapping("/manager/{storeId}/sliders/{id}/toggle")
    public ResponseEntity<Slider> toggleSlider(@PathVariable Long storeId, @PathVariable Long id) {
        return ResponseEntity.ok(sliderService.toggleActive(id));
    }
}
