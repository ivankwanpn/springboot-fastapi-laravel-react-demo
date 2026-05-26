package com.digital_wallet.service;

import com.digital_wallet.model.dto.WalletDTO;

public interface WalletService {
    WalletDTO getWalletByUserId(Long userId);
}
