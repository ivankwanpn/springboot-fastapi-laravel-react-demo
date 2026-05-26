package com.digital_wallet.service.impl;

import java.math.BigDecimal;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.digital_wallet.exception.AuthenticationException;
import com.digital_wallet.exception.DuplicateUsernameException;
import com.digital_wallet.mapper.UserMapper;
import com.digital_wallet.mapper.WalletMapper;
import com.digital_wallet.model.dto.LoginResponseDTO;
import com.digital_wallet.model.dto.UserCreateDTO;
import com.digital_wallet.model.dto.UserDTO;
import com.digital_wallet.model.entity.User;
import com.digital_wallet.model.entity.Wallet;
import com.digital_wallet.service.AuthService;
import com.digital_wallet.util.JwtUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;
    private final WalletMapper walletMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Override
    @Transactional
    public void register(UserCreateDTO userCreateDTO) {
        User user = new User();
        user.setUsername(userCreateDTO.getUsername());
        user.setPasswordHash(passwordEncoder.encode(userCreateDTO.getPassword()));
        user.setRole("ROLE_USER");

        try {
            userMapper.insert(user);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new DuplicateUsernameException("Username '" + user.getUsername() + "' is already taken");
        }

        Wallet wallet = new Wallet();
        wallet.setUserId(user.getId());
        wallet.setCurrency("USDT");
        wallet.setBalance(BigDecimal.ZERO);
        wallet.setVersion(0L);

        walletMapper.insert(wallet);
    }

    @Override
    public LoginResponseDTO login(String username, String password) {
        User user = userMapper.findByUsername(username);
        if (user == null) {
            throw new AuthenticationException("Invalid username or password");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new AuthenticationException("Invalid username or password");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());

        UserDTO userDTO = UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();

        return new LoginResponseDTO(token, userDTO);
    }
}
