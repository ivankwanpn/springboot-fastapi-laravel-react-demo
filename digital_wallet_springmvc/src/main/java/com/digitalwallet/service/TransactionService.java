package com.digitalwallet.service;

import com.digitalwallet.exception.*;
import com.digitalwallet.mapper.*;
import com.digitalwallet.model.*;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

public class TransactionService {

    private UserMapper userMapper;
    private WalletMapper walletMapper;
    private TransactionMapper transactionMapper;

    public void setUserMapper(UserMapper userMapper) { this.userMapper = userMapper; }
    public void setWalletMapper(WalletMapper walletMapper) { this.walletMapper = walletMapper; }
    public void setTransactionMapper(TransactionMapper transactionMapper) { this.transactionMapper = transactionMapper; }

    @Transactional
    public void transfer(Long fromUserId, TransferRequest request) {
        String toUsername = request.getToUsername();
        BigDecimal amount = request.getAmount();

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
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

        int deducted = walletMapper.deductBalance(fromUserId, amount, fromWallet.getVersion());
        if (deducted == 0) {
            throw new ConcurrentModificationException(
                "Concurrent modification detected for userId: " + fromUserId);
        }

        walletMapper.addBalance(toUserId, amount);

        Transaction tx = new Transaction();
        tx.setFromWalletId(fromWallet.getId());
        tx.setToWalletId(toWallet.getId());
        tx.setAmount(amount);
        tx.setTxType("TRANSFER");
        tx.setStatus("SUCCESS");

        transactionMapper.insert(tx);
    }

    public List<TransactionDTO> getHistory(Long userId) {
        Wallet wallet = walletMapper.findByUserId(userId);
        if (wallet == null) {
            throw new WalletNotFoundException("Wallet not found for userId: " + userId);
        }

        List<Transaction> transactions = transactionMapper.findByWalletId(wallet.getId());

        return transactions.stream().map(tx ->
            TransactionDTO.builder()
                .id(tx.getId())
                .fromWalletId(tx.getFromWalletId())
                .toWalletId(tx.getToWalletId())
                .amount(tx.getAmount())
                .txType(tx.getTxType())
                .status(tx.getStatus())
                .createdAt(tx.getCreatedAt())
                .build()
        ).collect(Collectors.toList());
    }
}
