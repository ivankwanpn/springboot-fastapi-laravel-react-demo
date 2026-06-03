package com.digitalwallet.model;

import java.math.BigDecimal;

public class DailyVolumeDTO {
    private String date;
    private long count;
    private BigDecimal amount;

    public DailyVolumeDTO() {}

    public DailyVolumeDTO(String date, long count, BigDecimal amount) {
        this.date = date;
        this.count = count;
        this.amount = amount;
    }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public long getCount() { return count; }
    public void setCount(long count) { this.count = count; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}
