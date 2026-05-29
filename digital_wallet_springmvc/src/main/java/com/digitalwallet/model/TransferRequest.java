package com.digitalwallet.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class TransferRequest {
    @NotBlank
    private String toUsername;
    @NotNull
    private BigDecimal amount;
}
