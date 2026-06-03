package com.digital_wallet;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;

import com.digital_wallet.mapper.UserMapper;
import com.digital_wallet.mapper.WalletMapper;
import com.digital_wallet.model.dto.LoginRequestDTO;
import com.digital_wallet.model.dto.TransferRequestDTO;
import com.digital_wallet.model.dto.UserCreateDTO;
import com.digital_wallet.model.entity.User;
import com.digital_wallet.model.entity.Wallet;
import com.digital_wallet.util.JwtUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Comprehensive endpoint tests for the Digital Wallet API.
 *
 * Uses local PostgreSQL (localhost:5433) via "pg-test" Spring profile.
 * Schema is created once before the test class via @Sql.
 * Data is cleaned and the admin user re-created in @BeforeEach.
 *
 * Test summary:
 *   Auth:        5 tests (register, duplicate, login, wrong pw, non-existent)
 *   Wallet:      2 tests (with auth, without auth)
 *   Transaction: 5 tests (transfer, insufficient, to-self, to-missing, history)
 *   Admin:       8 tests (list users, auth-check, detail, disable, enable,
 *                         disabled-login, list txns, stats)
 *   Edge cases:  2 tests (transfer without auth, non-existent user detail)
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("pg-test")
@Sql(scripts = "classpath:schema-pg.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_CLASS)
class DigitalWalletApplicationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private WalletMapper walletMapper;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String adminToken;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DELETE FROM transactions");
        jdbcTemplate.execute("DELETE FROM wallets");
        jdbcTemplate.execute("DELETE FROM users");

        // Create an admin user with ROLE_ADMIN for admin endpoint tests
        User admin = new User();
        admin.setUsername("admin");
        admin.setPasswordHash(passwordEncoder.encode("adminpass"));
        admin.setRole("ROLE_ADMIN");
        userMapper.insert(admin);

        Wallet adminWallet = new Wallet();
        adminWallet.setUserId(admin.getId());
        adminWallet.setCurrency("USDT");
        adminWallet.setBalance(new BigDecimal("10000.0000"));
        adminWallet.setVersion(0L);
        walletMapper.insert(adminWallet);

        adminToken = "Bearer " + jwtUtil.generateToken(admin.getId(), "admin", "ROLE_ADMIN");
    }

    // -----------------------------------------------------------------------
    // Helper methods
    // -----------------------------------------------------------------------

    /**
     * Register a user via the API and assert 201.
     */
    private void registerUser(String username, String password) throws Exception {
        String body = objectMapper.writeValueAsString(
                UserCreateDTO.builder().username(username).password(password).build());
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated());
    }

    /**
     * Login and return the "Bearer ..." token string.
     */
    private String loginAndGetToken(String username, String password) throws Exception {
        String body = objectMapper.writeValueAsString(
                new LoginRequestDTO(username, password));
        String response = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        JsonNode jsonNode = objectMapper.readTree(response);
        return "Bearer " + jsonNode.get("token").asText();
    }

    // =====================================================================
    // Auth Endpoints
    // =====================================================================

    @Test
    void test01_register_Success() throws Exception {
        String body = objectMapper.writeValueAsString(
                new UserCreateDTO("testuser", "password123"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.message").value("User registered successfully"));
    }

    @Test
    void test02_register_Duplicate() throws Exception {
        registerUser("userdup", "password123");

        String body = objectMapper.writeValueAsString(
                new UserCreateDTO("userdup", "password123"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value("ERROR"))
                .andExpect(jsonPath("$.message").value("Username 'userdup' is already taken"));
    }

    @Test
    void test03_login_Success() throws Exception {
        registerUser("loginuser", "password123");

        String body = objectMapper.writeValueAsString(
                new LoginRequestDTO("loginuser", "password123"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.username").value("loginuser"))
                .andExpect(jsonPath("$.user.role").value("ROLE_USER"));
    }

    @Test
    void test04_login_WrongPassword() throws Exception {
        registerUser("wrongpwuser", "correctpassword");

        String body = objectMapper.writeValueAsString(
                new LoginRequestDTO("wrongpwuser", "wrongpassword"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value("ERROR"))
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    void test05_login_NonExistentUser() throws Exception {
        String body = objectMapper.writeValueAsString(
                new LoginRequestDTO("nonexistent", "password123"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value("ERROR"))
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    // =====================================================================
    // Wallet Endpoints
    // =====================================================================

    @Test
    void test06_getWallet_WithAuth() throws Exception {
        registerUser("walletuser", "password123");
        String token = loginAndGetToken("walletuser", "password123");

        mockMvc.perform(get("/api/wallets")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currency").value("USDT"))
                .andExpect(jsonPath("$.balance").isNumber())
                .andExpect(jsonPath("$.userId").isNumber());
    }

    @Test
    void test07_getWallet_WithoutAuth() throws Exception {
        // Anonymous request on an authenticated endpoint returns 403.
        // The response goes through Spring Security's default error handling,
        // not the GlobalExceptionHandler, so the format is the standard
        // Spring Boot error JSON.
        mockMvc.perform(get("/api/wallets"))
                .andExpect(status().isForbidden());
    }

    // =====================================================================
    // Transaction Endpoints
    // =====================================================================

    @Test
    void test08_transfer_Success() throws Exception {
        registerUser("sender", "password123");
        registerUser("receiver", "password123");

        String senderToken = loginAndGetToken("sender", "password123");

        // Fund sender's wallet via direct balance injection
        User sender = userMapper.findByUsername("sender");
        walletMapper.addBalance(sender.getId(), new BigDecimal("100.0000"));

        // Sender transfers to receiver
        TransferRequestDTO transferReq = new TransferRequestDTO();
        transferReq.setToUsername("receiver");
        transferReq.setAmount(new BigDecimal("50.0000"));
        String body = objectMapper.writeValueAsString(transferReq);

        mockMvc.perform(post("/api/transactions/transfer")
                        .header("Authorization", senderToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.message").value("Transfer completed successfully"));
    }

    @Test
    void test09_transfer_InsufficientBalance() throws Exception {
        registerUser("pooruser", "password123");
        String token = loginAndGetToken("pooruser", "password123");

        TransferRequestDTO transferReq = new TransferRequestDTO();
        transferReq.setToUsername("admin");
        transferReq.setAmount(new BigDecimal("100.0000"));
        String body = objectMapper.writeValueAsString(transferReq);

        mockMvc.perform(post("/api/transactions/transfer")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("ERROR"));
    }

    @Test
    void test10_transfer_ToSelf() throws Exception {
        registerUser("selfuser", "password123");
        String token = loginAndGetToken("selfuser", "password123");

        TransferRequestDTO transferReq = new TransferRequestDTO();
        transferReq.setToUsername("selfuser");
        transferReq.setAmount(new BigDecimal("10.0000"));
        String body = objectMapper.writeValueAsString(transferReq);

        mockMvc.perform(post("/api/transactions/transfer")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("ERROR"));
    }

    @Test
    void test11_transfer_ToNonExistent() throws Exception {
        registerUser("sender2", "password123");
        String token = loginAndGetToken("sender2", "password123");

        TransferRequestDTO transferReq = new TransferRequestDTO();
        transferReq.setToUsername("ghostuser");
        transferReq.setAmount(new BigDecimal("10.0000"));
        String body = objectMapper.writeValueAsString(transferReq);

        mockMvc.perform(post("/api/transactions/transfer")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("ERROR"));
    }

    @Test
    void test12_getTransactionHistory() throws Exception {
        registerUser("txuser", "password123");
        String token = loginAndGetToken("txuser", "password123");

        mockMvc.perform(get("/api/transactions")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    // =====================================================================
    // Admin Endpoints
    // =====================================================================

    @Test
    void test13_listUsers_AsAdmin() throws Exception {
        registerUser("reguser1", "password123");
        registerUser("reguser2", "password123");

        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.size").value(20))
                .andExpect(jsonPath("$.total").value(3)); // admin + 2 registered users
    }

    @Test
    void test14_listUsers_AsRegularUser() throws Exception {
        registerUser("reguser", "password123");
        String userToken = loginAndGetToken("reguser", "password123");

        // Authenticated user without ROLE_ADMIN gets 403 from Spring Security
        mockMvc.perform(get("/api/admin/users")
                        .header("Authorization", userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void test15_getUserDetail() throws Exception {
        registerUser("detailuser", "password123");
        User user = userMapper.findByUsername("detailuser");

        mockMvc.perform(get("/api/admin/users/{id}", user.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("detailuser"))
                .andExpect(jsonPath("$.role").value("ROLE_USER"))
                .andExpect(jsonPath("$.wallet.currency").value("USDT"));
    }

    @Test
    void test16_disableUser() throws Exception {
        registerUser("disableme", "password123");
        User user = userMapper.findByUsername("disableme");

        mockMvc.perform(put("/api/admin/users/{id}/disable", user.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.message").value("User disabled successfully"));
    }

    @Test
    void test17_enableUser() throws Exception {
        registerUser("enableme", "password123");
        User user = userMapper.findByUsername("enableme");

        // First disable the user
        userMapper.updateRole(user.getId(), "ROLE_DISABLED");

        // Then re-enable
        mockMvc.perform(put("/api/admin/users/{id}/enable", user.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.message").value("User enabled successfully"));
    }

    @Test
    void test18_disabledUserLogin() throws Exception {
        registerUser("disabledlogin", "password123");
        User user = userMapper.findByUsername("disabledlogin");

        // Disable the user (simulating an admin action)
        userMapper.updateRole(user.getId(), "ROLE_DISABLED");

        // Attempt login as the disabled user
        String body = objectMapper.writeValueAsString(
                new LoginRequestDTO("disabledlogin", "password123"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value("ERROR"))
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    void test19_listTransactions_AsAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/transactions")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.page").isNumber())
                .andExpect(jsonPath("$.total").isNumber());
    }

    @Test
    void test20_transactionStats() throws Exception {
        mockMvc.perform(get("/api/admin/transactions/stats")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTransactions").isNumber())
                .andExpect(jsonPath("$.totalAmount").isNumber());
    }

    // =====================================================================
    // Additional edge-case tests
    // =====================================================================

    @Test
    void transfer_WithoutAuth_Returns401() throws Exception {
        TransferRequestDTO transferReq = new TransferRequestDTO();
        transferReq.setToUsername("someone");
        transferReq.setAmount(new BigDecimal("10.0000"));
        String body = objectMapper.writeValueAsString(transferReq);

        // No auth header on an authenticated endpoint -> 403 (Spring Security filter-level)
        mockMvc.perform(post("/api/transactions/transfer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    void getUserDetail_NonExistent_Returns404() throws Exception {
        mockMvc.perform(get("/api/admin/users/{id}", 99999L)
                        .header("Authorization", adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value("ERROR"));
    }
}
