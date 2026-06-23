package com.storeall.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentStatusResponse {
  private String orderNumber;
  private String orderStatus;
  private String paymentMethod;
  private String paymentStatus;
  private String whatsappLink;
  private String storeCode;
}
