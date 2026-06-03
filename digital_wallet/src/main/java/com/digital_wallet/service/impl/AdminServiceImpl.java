package com.digital_wallet.service.impl;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.digital_wallet.exception.WalletNotFoundException;
import com.digital_wallet.mapper.TransactionMapper;
import com.digital_wallet.mapper.UserMapper;
import com.digital_wallet.mapper.WalletMapper;
import com.digital_wallet.model.dto.AdminTransactionDTO;
import com.digital_wallet.model.dto.PaginatedResponse;
import com.digital_wallet.model.dto.TransactionDTO;
import com.digital_wallet.model.dto.TransactionStatsDTO;
import com.digital_wallet.model.dto.UserDTO;
import com.digital_wallet.model.dto.UserDetailDTO;
import com.digital_wallet.model.dto.WalletDTO;
import com.digital_wallet.model.entity.Transaction;
import com.digital_wallet.model.entity.User;
import com.digital_wallet.model.entity.Wallet;
import com.digital_wallet.service.AdminService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final UserMapper userMapper;
    private final WalletMapper walletMapper;
    private final TransactionMapper transactionMapper;

    private static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd");

    @Override
    public PaginatedResponse<UserDTO> listUsers(String search, int page, int size) {
        if (page < 1) page = 1;
        if (size < 1) size = 20;
        if (size > 100) size = 100;

        int offset = (page - 1) * size;

        List<User> users = userMapper.findAllWithPagination(search, offset, size);
        int total = userMapper.countAll(search);

        List<UserDTO> userDTOs = users.stream()
                .map(u -> UserDTO.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .role(u.getRole())
                        .createdAt(u.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return PaginatedResponse.<UserDTO>builder()
                .data(userDTOs)
                .page(page)
                .size(size)
                .total(total)
                .build();
    }

    @Override
    public UserDetailDTO getUserDetail(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new WalletNotFoundException("User not found: " + userId);
        }

        Wallet wallet = walletMapper.findByUserId(userId);
        List<Transaction> recentTxns = transactionMapper.findRecentByWalletId(
                wallet != null ? wallet.getId() : null, 5);

        List<TransactionDTO> txnDTOs = recentTxns.stream()
                .map(t -> TransactionDTO.builder()
                        .id(t.getId())
                        .fromWalletId(t.getFromWalletId())
                        .toWalletId(t.getToWalletId())
                        .amount(t.getAmount())
                        .txType(t.getTxType())
                        .status(t.getStatus())
                        .createdAt(t.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        WalletDTO walletDTO = wallet != null ? WalletDTO.builder()
                .id(wallet.getId())
                .userId(wallet.getUserId())
                .currency(wallet.getCurrency())
                .balance(wallet.getBalance())
                .version(wallet.getVersion())
                .updatedAt(wallet.getUpdatedAt())
                .build() : null;

        return UserDetailDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .wallet(walletDTO)
                .recentTransactions(txnDTOs)
                .build();
    }

    @Override
    public void disableUser(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new WalletNotFoundException("User not found: " + userId);
        }
        userMapper.updateRole(userId, "ROLE_DISABLED");
    }

    @Override
    public void enableUser(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new WalletNotFoundException("User not found: " + userId);
        }
        userMapper.updateRole(userId, "ROLE_USER");
    }

    @Override
    public PaginatedResponse<AdminTransactionDTO> listTransactions(String username, String from, String to, int page, int size) {
        if (page < 1) page = 1;
        if (size < 1) size = 20;
        if (size > 100) size = 100;

        int offset = (page - 1) * size;

        Date fromDate = parseDate(from);
        Date toDate = parseDate(to);
        if (toDate == null && fromDate == null) {
            Calendar cal = Calendar.getInstance();
            toDate = cal.getTime();
            cal.add(Calendar.DAY_OF_MONTH, -30);
            fromDate = cal.getTime();
        }

        List<AdminTransactionDTO> txns = transactionMapper.findAllWithFilters(username, fromDate, toDate, offset, size);
        int total = transactionMapper.countAllWithFilters(username, fromDate, toDate);

        return PaginatedResponse.<AdminTransactionDTO>builder()
                .data(txns)
                .page(page)
                .size(size)
                .total(total)
                .build();
    }

    @Override
    public TransactionStatsDTO getTransactionStats(String from, String to) {
        Date fromDate = parseDate(from);
        Date toDate = parseDate(to);
        if (toDate == null && fromDate == null) {
            Calendar cal = Calendar.getInstance();
            toDate = cal.getTime();
            cal.add(Calendar.DAY_OF_MONTH, -30);
            fromDate = cal.getTime();
        }

        long totalCount = transactionMapper.getTransactionCount();
        BigDecimal totalAmount = transactionMapper.getTransactionTotalAmount();
        if (totalAmount == null) totalAmount = BigDecimal.ZERO;

        return TransactionStatsDTO.builder()
                .totalTransactions(totalCount)
                .totalAmount(totalAmount)
                .dailyVolume(transactionMapper.getDailyVolume(fromDate, toDate))
                .build();
    }

    private Date parseDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) {
            return null;
        }
        try {
            return DATE_FORMAT.parse(dateStr);
        } catch (Exception e) {
            return null;
        }
    }
}
