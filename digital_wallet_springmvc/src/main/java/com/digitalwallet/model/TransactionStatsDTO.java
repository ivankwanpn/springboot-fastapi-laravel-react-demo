package com.digitalwallet.model;

import java.math.BigDecimal;
import java.util.List;

public class TransactionStatsDTO {
    private long totalTransactions;
    private BigDecimal totalAmount;
    private List<DailyVolumeDTO> dailyVolume;

    public TransactionStatsDTO() {}

    public TransactionStatsDTO(long totalTransactions, BigDecimal totalAmount, List<DailyVolumeDTO> dailyVolume) {
        this.totalTransactions = totalTransactions;
        this.totalAmount = totalAmount;
        this.dailyVolume = dailyVolume;
    }

    public long getTotalTransactions() { return totalTransactions; }
    public void setTotalTransactions(long totalTransactions) { this.totalTransactions = totalTransactions; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public List<DailyVolumeDTO> getDailyVolume() { return dailyVolume; }
    public void setDailyVolume(List<DailyVolumeDTO> dailyVolume) { this.dailyVolume = dailyVolume; }
}
