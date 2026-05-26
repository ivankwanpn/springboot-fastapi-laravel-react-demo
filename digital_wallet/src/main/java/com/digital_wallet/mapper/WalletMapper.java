package com.digital_wallet.mapper;

import java.math.BigDecimal;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.digital_wallet.model.entity.Wallet;

@Mapper
public interface WalletMapper {

    int insert(Wallet wallet);

    Wallet findByUserId(Long userId);

    int deductBalanceWithVersion(@Param("userId") Long userId,
                                 @Param("amount") BigDecimal amount,
                                 @Param("version") Long version);

    int addBalance(@Param("userId") Long userId,
                   @Param("amount") BigDecimal amount);
}
