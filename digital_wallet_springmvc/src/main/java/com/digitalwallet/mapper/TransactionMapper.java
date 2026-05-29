package com.digitalwallet.mapper;

import com.digitalwallet.model.Transaction;
import org.apache.ibatis.annotations.Param;
import java.util.List;

public interface TransactionMapper {
    void insert(Transaction transaction);
    List<Transaction> findByWalletId(@Param("walletId") Long walletId);
}
