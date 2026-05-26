package com.digital_wallet.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.digital_wallet.model.entity.Transaction;

@Mapper
public interface TransactionMapper {
    int insert(Transaction transaction);

    List<Transaction> findByWalletId(Long walletId);
}
