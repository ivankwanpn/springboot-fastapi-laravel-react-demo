package com.digital_wallet.service;

import com.digital_wallet.model.dto.LoginResponseDTO;
import com.digital_wallet.model.dto.UserCreateDTO;

public interface AuthService {
    void register(UserCreateDTO userCreateDTO);

    LoginResponseDTO login(String username, String password);
}
