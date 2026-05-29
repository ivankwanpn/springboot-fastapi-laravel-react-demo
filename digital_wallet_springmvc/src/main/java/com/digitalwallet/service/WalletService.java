package com.digitalwallet.service;

import com.digitalwallet.exception.WalletNotFoundException;
import com.digitalwallet.mapper.WalletMapper;
import com.digitalwallet.model.Wallet;
import com.digitalwallet.model.WalletDTO;

public class WalletService {

    private WalletMapper walletMapper;

    public void setWalletMapper(WalletMapper walletMapper) { this.walletMapper = walletMapper; }

    public WalletDTO getByUserId(Long userId) {
        Wallet wallet = walletMapper.findByUserId(userId);
        if (wallet == null) {
            throw new WalletNotFoundException("Wallet not found for userId: " + userId);
        }

        return WalletDTO.builder()
                .id(wallet.getId())
                .userId(wallet.getUserId())
                .currency(wallet.getCurrency())
                .balance(wallet.getBalance())
                .version(wallet.getVersion())
                .updatedAt(wallet.getUpdatedAt())
                .build();
    }
}
