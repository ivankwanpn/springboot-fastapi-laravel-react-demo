package com.digital_wallet.service.impl;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.digital_wallet.exception.ConcurrentModificationException;
import com.digital_wallet.exception.InsufficientBalanceException;
import com.digital_wallet.exception.WalletNotFoundException;
import com.digital_wallet.mapper.TransactionMapper;
import com.digital_wallet.mapper.UserMapper;
import com.digital_wallet.mapper.WalletMapper;
import com.digital_wallet.model.dto.TransactionDTO;
import com.digital_wallet.model.entity.Transaction;
import com.digital_wallet.model.entity.User;
import com.digital_wallet.model.entity.Wallet;
import com.digital_wallet.service.TransactionService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TransactionServiceImpl implements TransactionService {

    private final UserMapper userMapper;
    private final WalletMapper walletMapper;
    private final TransactionMapper transactionMapper;

    @Override
    @Transactional
    public void transfer(Long fromUserId, String toUsername, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Transfer amount must be greater than zero");
        }

        User toUser = userMapper.findByUsername(toUsername);
        if (toUser == null) {
            throw new IllegalArgumentException("Recipient not found: " + toUsername);
        }
        Long toUserId = toUser.getId();
        if (fromUserId.equals(toUserId)) {
            throw new IllegalArgumentException("Cannot transfer to yourself");
        }

        Wallet fromWallet = walletMapper.findByUserId(fromUserId);
        if (fromWallet == null) {
            throw new WalletNotFoundException("Wallet not found for userId: " + fromUserId);
        }

        Wallet toWallet = walletMapper.findByUserId(toUserId);
        if (toWallet == null) {
            throw new WalletNotFoundException("Wallet not found for userId: " + toUserId);
        }

        if (fromWallet.getBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException(
                    "Insufficient balance: " + fromWallet.getBalance() + " < " + amount);
        }

        int deducted = walletMapper.deductBalanceWithVersion(
                fromWallet.getUserId(), amount, fromWallet.getVersion());
        if (deducted == 0) {
            throw new ConcurrentModificationException(
                    "Concurrent modification detected for userId: " + fromUserId);
        }

        walletMapper.addBalance(toWallet.getUserId(), amount);

        Transaction transaction = new Transaction();
        transaction.setFromWalletId(fromWallet.getId());
        transaction.setToWalletId(toWallet.getId());
        transaction.setAmount(amount);
        transaction.setTxType("TRANSFER");
        transaction.setStatus("SUCCESS");

        transactionMapper.insert(transaction);
    }

    @Override
    public List<TransactionDTO> getTransactionHistory(Long userId) {
        Wallet wallet = walletMapper.findByUserId(userId);
        if (wallet == null) {
            throw new WalletNotFoundException("Wallet not found for userId: " + userId);
        }

        List<Transaction> transactions = transactionMapper.findByWalletId(wallet.getId());

        return transactions.stream()
                .map(this::toTransactionDTO)
                .collect(Collectors.toList());
    }

    private TransactionDTO toTransactionDTO(Transaction tx) {
        return TransactionDTO.builder()
                .id(tx.getId())
                .fromWalletId(tx.getFromWalletId())
                .toWalletId(tx.getToWalletId())
                .amount(tx.getAmount())
                .txType(tx.getTxType())
                .status(tx.getStatus())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
