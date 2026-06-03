package com.digital_wallet.service;

import com.digital_wallet.model.dto.AdminTransactionDTO;
import com.digital_wallet.model.dto.PaginatedResponse;
import com.digital_wallet.model.dto.TransactionStatsDTO;
import com.digital_wallet.model.dto.UserDTO;
import com.digital_wallet.model.dto.UserDetailDTO;

public interface AdminService {
    PaginatedResponse<UserDTO> listUsers(String search, int page, int size);

    UserDetailDTO getUserDetail(Long userId);

    void disableUser(Long userId);

    void enableUser(Long userId);

    PaginatedResponse<AdminTransactionDTO> listTransactions(String username, String from, String to, int page, int size);

    TransactionStatsDTO getTransactionStats(String from, String to);
}
