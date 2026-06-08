package com.storeall.api.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.transaction.annotation.Transactional;


import com.storeall.api.entity.Slider;
import com.storeall.api.repository.SliderRepository;
import com.storeall.api.tenant.StoreContext;
import com.storeall.api.util.MediaUrlUtils;

@Service
@Transactional
public class SliderService {

    @Autowired
    private SliderRepository sliderRepository;

    @Autowired
    private FileStorageService fileStorageService;

    // Récupérer tous les sliders (pour Admin)
    public List<Slider> getAllSliders() {
        Long storeId = StoreContext.getStoreIdOrNull();
        return sliderRepository.findAllByStoreIdOrderByDisplayOrderDesc(storeId).stream()
            .map(this::normalizeSliderMedia)
            .toList();
    }

    // Récupérer les sliders actifs (pour Public)
    public List<Slider> getActiveSliders() {
        Long storeId = StoreContext.getStoreIdOrNull();
        return sliderRepository.findAllByActiveTrueAndStoreIdOrderByDisplayOrderDesc(storeId).stream()
            .map(this::normalizeSliderMedia)
            .toList();
    }

    private Slider normalizeSliderMedia(Slider slider) {
        if (slider != null && slider.getImageUrl() != null) {
            slider.setImageUrl(MediaUrlUtils.normalizeForResponse(slider.getImageUrl()));
        }
        return slider;
    }

    // Créer un slider (fichier ou URL optionnels)
    public Slider createSlider(String title, String description, MultipartFile imageFile, String imageUrl, Integer order, Boolean active) {
        Long storeId = StoreContext.getStoreIdOrNull();
        String finalImageUrl = imageUrl;
        
        if (imageFile != null && !imageFile.isEmpty()) {
            String fileName = fileStorageService.storeFile(imageFile);
            finalImageUrl = "/uploads/" + fileName;
        }

        if (finalImageUrl == null || finalImageUrl.trim().isEmpty()) {
            String debugInfo = String.format("(imageFile is %s, imageUrl is '%s')", 
                (imageFile == null ? "null" : (imageFile.isEmpty() ? "empty" : "present")), 
                (imageUrl == null ? "null" : imageUrl));
            throw new RuntimeException("Une image est obligatoire (Fichier ou URL). " + debugInfo);
        }

        Slider slider = Slider.builder()
                .store(com.storeall.api.entity.Store.builder().id(storeId).build())
                .title(title)
                .description(description)
                .imageUrl(finalImageUrl)
                .displayOrder(order != null ? order : 10)
                .active(active != null ? active : true)
                .build();

        return sliderRepository.save(slider);
    }

    // Supprimer un slider
    public void deleteSlider(Long id) {
        Long storeId = StoreContext.getStoreIdOrNull();
        if (storeId != null) {
            Slider slider = sliderRepository.findByIdAndStore_Id(id, storeId)
                    .orElseThrow(() -> new RuntimeException("Slider introuvable"));
            sliderRepository.delete(slider);
            return;
        }
        Slider slider = sliderRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Le slider avec l'ID " + id + " n'existe pas."));
        sliderRepository.delete(slider);
    }

    // Toggle Active
    public Slider toggleActive(Long id) {
        Long storeId = StoreContext.getStoreIdOrNull();
        Slider slider = sliderRepository.findById(id).orElseThrow(() -> new RuntimeException("Slider introuvable"));
        assertSliderBelongsToStore(slider, storeId);
        slider.setActive(!slider.isActive());
        return sliderRepository.save(slider);
    }

    private void assertSliderBelongsToStore(Slider slider, Long storeId) {
        if (storeId == null) {
            return;
        }
        if (slider.getStore() == null || slider.getStore().getId() == null
                || !slider.getStore().getId().equals(storeId)) {
            throw new RuntimeException("Slider introuvable");
        }
    }
}
