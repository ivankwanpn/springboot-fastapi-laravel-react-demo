package com.digital_wallet.service.impl;

import org.springframework.stereotype.Service;

import com.digital_wallet.exception.WalletNotFoundException;
import com.digital_wallet.mapper.WalletMapper;
import com.digital_wallet.model.dto.WalletDTO;
import com.digital_wallet.model.entity.Wallet;
import com.digital_wallet.service.WalletService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class WalletServiceImpl implements WalletService {

    private final WalletMapper walletMapper;

    @Override
    public WalletDTO getWalletByUserId(Long userId) {
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
