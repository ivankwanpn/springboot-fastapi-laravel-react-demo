package com.digitalwallet.service;

import com.digitalwallet.exception.AuthenticationException;
import com.digitalwallet.exception.DuplicateUsernameException;
import com.digitalwallet.mapper.UserMapper;
import com.digitalwallet.mapper.WalletMapper;
import com.digitalwallet.model.*;
import com.digitalwallet.util.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

public class AuthService {

    private UserMapper userMapper;
    private WalletMapper walletMapper;
    private PasswordEncoder passwordEncoder;
    private JwtUtil jwtUtil;

    public void setUserMapper(UserMapper userMapper) { this.userMapper = userMapper; }
    public void setWalletMapper(WalletMapper walletMapper) { this.walletMapper = walletMapper; }
    public void setPasswordEncoder(PasswordEncoder passwordEncoder) { this.passwordEncoder = passwordEncoder; }
    public void setJwtUtil(JwtUtil jwtUtil) { this.jwtUtil = jwtUtil; }

    @Transactional
    public void register(LoginRequest request) {
        String username = request.getUsername();
        String password = request.getPassword();

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole("ROLE_USER");

        try {
            userMapper.insert(user);
        } catch (org.springframework.dao.DuplicateKeyException e) {
            throw new DuplicateUsernameException("Username '" + username + "' is already taken");
        }

        Wallet wallet = new Wallet();
        wallet.setUserId(user.getId());
        wallet.setCurrency("USDT");
        wallet.setBalance(BigDecimal.ZERO);
        wallet.setVersion(0);

        walletMapper.insert(wallet);
    }

    public LoginResponse login(LoginRequest request) {
        String username = request.getUsername();
        String password = request.getPassword();

        User user = userMapper.findByUsername(username);
        if (user == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new AuthenticationException("Invalid username or password");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getUsername());

        UserDTO userDTO = UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .build();

        return new LoginResponse(token, userDTO);
    }
}
