package com.digitalwallet.model;

import java.math.BigDecimal;
import java.sql.Timestamp;

public class AdminTransactionDTO {
    private Long id;
    private Long fromWalletId;
    private Long toWalletId;
    private BigDecimal amount;
    private String txType;
    private String status;
    private Timestamp createdAt;
    private String fromUsername;
    private String toUsername;

    public AdminTransactionDTO() {}

    public AdminTransactionDTO(Long id, Long fromWalletId, Long toWalletId, BigDecimal amount,
                               String txType, String status, Timestamp createdAt,
                               String fromUsername, String toUsername) {
        this.id = id;
        this.fromWalletId = fromWalletId;
        this.toWalletId = toWalletId;
        this.amount = amount;
        this.txType = txType;
        this.status = status;
        this.createdAt = createdAt;
        this.fromUsername = fromUsername;
        this.toUsername = toUsername;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFromWalletId() { return fromWalletId; }
    public void setFromWalletId(Long fromWalletId) { this.fromWalletId = fromWalletId; }

    public Long getToWalletId() { return toWalletId; }
    public void setToWalletId(Long toWalletId) { this.toWalletId = toWalletId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getTxType() { return txType; }
    public void setTxType(String txType) { this.txType = txType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public String getFromUsername() { return fromUsername; }
    public void setFromUsername(String fromUsername) { this.fromUsername = fromUsername; }

    public String getToUsername() { return toUsername; }
    public void setToUsername(String toUsername) { this.toUsername = toUsername; }
}
