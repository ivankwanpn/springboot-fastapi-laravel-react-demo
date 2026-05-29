package com.digitalwallet.mapper;

import com.digitalwallet.model.Wallet;
import org.apache.ibatis.annotations.Param;
import java.math.BigDecimal;

public interface WalletMapper {
    void insert(Wallet wallet);
    Wallet findByUserId(@Param("userId") Long userId);
    int deductBalance(@Param("userId") Long userId, @Param("amount") BigDecimal amount, @Param("version") Integer version);
    int addBalance(@Param("userId") Long userId, @Param("amount") BigDecimal amount);
}
