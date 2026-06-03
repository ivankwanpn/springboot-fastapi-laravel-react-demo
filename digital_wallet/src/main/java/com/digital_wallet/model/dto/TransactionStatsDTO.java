package com.digital_wallet.model.dto;

import java.math.BigDecimal;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionStatsDTO {
    private long totalTransactions;
    private BigDecimal totalAmount;
    private List<DailyVolumeDTO> dailyVolume;
}
