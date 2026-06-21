package com.storeall.api.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class YengaPayIntentResponse {
  private String id;
  private String status;
  private String checkoutPageUrlWithPaymentToken;
  private long paymentAmount;
  private String currency;
}
