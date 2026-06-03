package com.digitalwallet.service;

import com.digitalwallet.exception.WalletNotFoundException;
import com.digitalwallet.mapper.TransactionMapper;
import com.digitalwallet.mapper.UserMapper;
import com.digitalwallet.mapper.WalletMapper;
import com.digitalwallet.model.*;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

public class AdminService {

    private UserMapper userMapper;
    private WalletMapper walletMapper;
    private TransactionMapper transactionMapper;

    private static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd");

    public void setUserMapper(UserMapper userMapper) { this.userMapper = userMapper; }
    public void setWalletMapper(WalletMapper walletMapper) { this.walletMapper = walletMapper; }
    public void setTransactionMapper(TransactionMapper transactionMapper) { this.transactionMapper = transactionMapper; }

    public PaginatedResponse<UserDTO> listUsers(String search, int page, int size) {
        if (page < 1) page = 1;
        if (size < 1) size = 20;
        if (size > 100) size = 100;

        int offset = (page - 1) * size;

        List<User> users = userMapper.findAllWithPagination(search, offset, size);
        int total = userMapper.countAll(search);

        List<UserDTO> userDTOs = users.stream()
                .map(u -> {
                    UserDTO dto = new UserDTO();
                    dto.setId(u.getId());
                    dto.setUsername(u.getUsername());
                    dto.setRole(u.getRole());
                    dto.setCreatedAt(u.getCreatedAt());
                    return dto;
                })
                .collect(Collectors.toList());

        PaginatedResponse<UserDTO> response = new PaginatedResponse<>();
        response.setData(userDTOs);
        response.setPage(page);
        response.setSize(size);
        response.setTotal(total);
        return response;
    }

    public UserDetailDTO getUserDetail(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new WalletNotFoundException("User not found: " + userId);
        }

        Wallet wallet = walletMapper.findByUserId(userId);
        List<Transaction> recentTxns = transactionMapper.findRecentByWalletId(
                wallet != null ? wallet.getId() : null, 5);

        List<TransactionDTO> txnDTOs = recentTxns.stream()
                .map(t -> {
                    TransactionDTO dto = new TransactionDTO();
                    dto.setId(t.getId());
                    dto.setFromWalletId(t.getFromWalletId());
                    dto.setToWalletId(t.getToWalletId());
                    dto.setAmount(t.getAmount());
                    dto.setTxType(t.getTxType());
                    dto.setStatus(t.getStatus());
                    dto.setCreatedAt(t.getCreatedAt());
                    return dto;
                })
                .collect(Collectors.toList());

        WalletDTO walletDTO = null;
        if (wallet != null) {
            walletDTO = new WalletDTO();
            walletDTO.setId(wallet.getId());
            walletDTO.setUserId(wallet.getUserId());
            walletDTO.setCurrency(wallet.getCurrency());
            walletDTO.setBalance(wallet.getBalance());
            walletDTO.setVersion(wallet.getVersion());
            walletDTO.setUpdatedAt(wallet.getUpdatedAt());
        }

        UserDetailDTO detailDTO = new UserDetailDTO();
        detailDTO.setId(user.getId());
        detailDTO.setUsername(user.getUsername());
        detailDTO.setRole(user.getRole());
        Timestamp createdAt = user.getCreatedAt() != null ? Timestamp.valueOf(user.getCreatedAt()) : null;
        detailDTO.setCreatedAt(createdAt);
        detailDTO.setWallet(walletDTO);
        detailDTO.setRecentTransactions(txnDTOs);
        return detailDTO;
    }

    public void disableUser(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new WalletNotFoundException("User not found: " + userId);
        }
        userMapper.updateRole(userId, "ROLE_DISABLED");
    }

    public void enableUser(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new WalletNotFoundException("User not found: " + userId);
        }
        userMapper.updateRole(userId, "ROLE_USER");
    }

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

        PaginatedResponse<AdminTransactionDTO> response = new PaginatedResponse<>();
        response.setData(txns);
        response.setPage(page);
        response.setSize(size);
        response.setTotal(total);
        return response;
    }

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

        TransactionStatsDTO stats = new TransactionStatsDTO();
        stats.setTotalTransactions(totalCount);
        stats.setTotalAmount(totalAmount);
        stats.setDailyVolume(transactionMapper.getDailyVolume(fromDate, toDate));
        return stats;
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
