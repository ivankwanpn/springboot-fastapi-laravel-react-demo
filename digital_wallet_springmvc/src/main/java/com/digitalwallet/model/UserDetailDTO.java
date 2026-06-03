package com.digitalwallet.model;

import java.sql.Timestamp;
import java.util.List;

public class UserDetailDTO {
    private Long id;
    private String username;
    private String role;
    private Timestamp createdAt;
    private WalletDTO wallet;
    private List<TransactionDTO> recentTransactions;

    public UserDetailDTO() {}

    public UserDetailDTO(Long id, String username, String role, Timestamp createdAt,
                         WalletDTO wallet, List<TransactionDTO> recentTransactions) {
        this.id = id;
        this.username = username;
        this.role = role;
        this.createdAt = createdAt;
        this.wallet = wallet;
        this.recentTransactions = recentTransactions;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public WalletDTO getWallet() { return wallet; }
    public void setWallet(WalletDTO wallet) { this.wallet = wallet; }

    public List<TransactionDTO> getRecentTransactions() { return recentTransactions; }
    public void setRecentTransactions(List<TransactionDTO> recentTransactions) { this.recentTransactions = recentTransactions; }
}
