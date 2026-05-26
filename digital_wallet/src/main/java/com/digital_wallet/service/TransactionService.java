package com.digital_wallet.service;

import java.math.BigDecimal;
import java.util.List;

import com.digital_wallet.model.dto.TransactionDTO;

public interface TransactionService {
    void transfer(Long fromUserId, String toUsername, BigDecimal amount);

    List<TransactionDTO> getTransactionHistory(Long userId);
}
