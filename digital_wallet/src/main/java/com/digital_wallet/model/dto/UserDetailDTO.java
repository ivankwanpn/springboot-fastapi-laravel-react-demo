package com.digital_wallet.model.dto;

import java.sql.Timestamp;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDetailDTO {
    private Long id;
    private String username;
    private String role;
    private Timestamp createdAt;
    private WalletDTO wallet;
    private List<TransactionDTO> recentTransactions;
}
