package com.digitalwallet.mapper;

import com.digitalwallet.model.AdminTransactionDTO;
import com.digitalwallet.model.DailyVolumeDTO;
import com.digitalwallet.model.Transaction;
import org.apache.ibatis.annotations.Param;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

public interface TransactionMapper {
    void insert(Transaction transaction);
    List<Transaction> findByWalletId(@Param("walletId") Long walletId);

    List<Transaction> findRecentByWalletId(@Param("walletId") Long walletId, @Param("limit") int limit);

    List<AdminTransactionDTO> findAllWithFilters(@Param("username") String username, @Param("fromDate") Date fromDate, @Param("toDate") Date toDate, @Param("offset") int offset, @Param("limit") int limit);

    int countAllWithFilters(@Param("username") String username, @Param("fromDate") Date fromDate, @Param("toDate") Date toDate);

    long getTransactionCount();

    BigDecimal getTransactionTotalAmount();

    List<DailyVolumeDTO> getDailyVolume(@Param("fromDate") Date fromDate, @Param("toDate") Date toDate);
}
