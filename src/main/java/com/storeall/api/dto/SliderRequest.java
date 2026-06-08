package com.storeall.api.dto;

import org.springframework.web.multipart.MultipartFile;
import lombok.Data;

@Data
public class SliderRequest {
    private String title;
    private String description;
    private String imageUrl;
    private Integer displayOrder;
    private Boolean active;
    private MultipartFile image;
}
