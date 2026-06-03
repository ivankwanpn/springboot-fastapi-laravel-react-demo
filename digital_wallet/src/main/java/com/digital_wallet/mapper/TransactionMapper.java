package com.digital_wallet.mapper;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.digital_wallet.model.dto.AdminTransactionDTO;
import com.digital_wallet.model.dto.DailyVolumeDTO;
import com.digital_wallet.model.entity.Transaction;

@Mapper
public interface TransactionMapper {
    int insert(Transaction transaction);

    List<Transaction> findByWalletId(Long walletId);

    List<AdminTransactionDTO> findAllWithFilters(@Param("username") String username, @Param("fromDate") Date fromDate, @Param("toDate") Date toDate, @Param("offset") int offset, @Param("limit") int limit);

    int countAllWithFilters(@Param("username") String username, @Param("fromDate") Date fromDate, @Param("toDate") Date toDate);

    List<Transaction> findRecentByWalletId(@Param("walletId") Long walletId, @Param("limit") int limit);

    long getTransactionCount();

    BigDecimal getTransactionTotalAmount();

    List<DailyVolumeDTO> getDailyVolume(@Param("fromDate") Date fromDate, @Param("toDate") Date toDate);
}
