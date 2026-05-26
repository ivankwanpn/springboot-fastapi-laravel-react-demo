# Digital Wallet Backend (Demo)

> **技術驗證 / 抄作業項目**：展示 Spring Boot 3 全棧後端開發的關鍵技術選型與實作模式。**每一個檔案**、**每一行程式碼**都有解釋，方便後續項目直接複用。

## 技術清單

| 技術 | 版本 | 用途 |
|------|------|------|
| Java | 21 | 核心語言 |
| Spring Boot | 3.5.14 | 應用框架 |
| Spring Security | — | 認證與授權 |
| MyBatis | 3.0.5 | SQL 映射 ORM |
| PostgreSQL | 16 | 關聯式資料庫 |
| JWT (jjwt) | 0.11.5 | 無狀態 Token 認證 |
| BCrypt | — | 密碼雜湊 |
| SpringDoc OpenAPI | 2.8.6 | Swagger API 文檔 |
| Lombok | — | 減少樣板程式碼 |
| Docker | — | 容器化部署 |

---

## 完整專案結構

```
digital_wallet/
├── pom.xml                               # Maven 依賴
├── Dockerfile                            # 多階段 Docker 構建
├── docker-compose.yml                    # PostgreSQL 16 + App 一鍵啟動
├── mvnw / mvnw.cmd                       # Maven Wrapper
│
├── src/main/resources/
│   ├── application.yaml                  # 資料庫、MyBatis、JWT 配置
│   ├── mapper/                           # MyBatis SQL XML
│   │   ├── UserMapper.xml                #   插入/查詢用戶
│   │   ├── WalletMapper.xml              #   查詢錢包、樂觀鎖扣款、加款
│   │   └── TransactionMapper.xml         #   插入交易、查詢交易歷史
│   └── static/db.sql                     # 資料庫初始化 DDL
│
├── src/main/java/com/digital_wallet/
│   ├── DigitalWalletApplication.java     # @SpringBootApplication 入口
│   │
│   ├── config/
│   │   ├── SecurityConfig.java           #   Spring Security：無狀態、CSRF禁用、端點授權
│   │   ├── JwtAuthenticationFilter.java  #   OncePerRequestFilter：Bearer Token → SecurityContext
│   │   └── OpenApiConfig.java            #   Swagger UI 配置
│   │
│   ├── controller/
│   │   ├── AuthController.java           #   POST /api/auth/register、/login
│   │   ├── WalletController.java         #   GET /api/wallets（JWT→userId，防 IDOR）
│   │   ├── TransactionController.java    #   POST /api/transactions/transfer、GET /api/transactions
│   │   └── GlobalExceptionHandler.java   #   @RestControllerAdvice
│   │
│   ├── service/
│   │   ├── AuthService.java              #   介面：register()、login()
│   │   ├── WalletService.java            #   介面：getWalletByUserId()
│   │   ├── TransactionService.java       #   介面：transfer()、getTransactionHistory()
│   │   └── impl/
│   │       ├── AuthServiceImpl.java      #     BCrypt + JWT + 重複用戶名檢測
│   │       ├── WalletServiceImpl.java    #     Entity→DTO 轉換
│   │       └── TransactionServiceImpl.java #   @Transactional + 樂觀鎖
│   │
│   ├── mapper/
│   │   ├── UserMapper.java               #   MyBatis 介面
│   │   ├── WalletMapper.java             #   MyBatis 介面（樂觀鎖方法）
│   │   └── TransactionMapper.java        #   MyBatis 介面
│   │
│   ├── model/
│   │   ├── entity/
│   │   │   ├── User.java                 #   DB 對應：users 表
│   │   │   ├── Wallet.java               #   DB 對應：wallets 表（含 version）
│   │   │   └── Transaction.java          #   DB 對應：transactions 表
│   │   └── dto/
│   │       ├── UserCreateDTO.java        #   註冊請求
│   │       ├── UserDTO.java              #   安全響應（不含密碼）
│   │       ├── UserAuthDTO.java          #   內部認證用（含密碼雜湊）
│   │       ├── LoginRequestDTO.java      #   登錄請求
│   │       ├── LoginResponseDTO.java     #   登錄響應
│   │       ├── WalletDTO.java            #   錢包響應
│   │       ├── TransactionDTO.java       #   交易響應
│   │       ├── TransferRequestDTO.java   #   轉賬請求
│   │       └── ApiResponse.java          #   通用 API 響應
│   │
│   ├── exception/
│   │   ├── AuthenticationException.java  #   401
│   │   ├── InsufficientBalanceException.java # 400
│   │   ├── ConcurrentModificationException.java # 409
│   │   ├── WalletNotFoundException.java  #   404
│   │   └── DuplicateUsernameException.java #  409
│   │
│   └── util/
│       └── JwtUtil.java                  # JWT 工具：HMAC-SHA256
│
└── src/test/java/com/digital_wallet/
    └── DigitalWalletApplicationTests.java
```

---

## 如何快速找到要抄的部分

| 你想學/抄什麼 | 直接看這個檔案 |
|-------------|-------------|
| 專案初始化（pom.xml + application.yaml） | [pom.xml](pom.xml) + [application.yaml](src/main/resources/application.yaml) |
| Spring Security 無狀態 JWT 配置 | [SecurityConfig.java](src/main/java/com/digital_wallet/config/SecurityConfig.java) |
| JWT Token 生成與驗證 | [JwtUtil.java](src/main/java/com/digital_wallet/util/JwtUtil.java) |
| JWT 攔截器 | [JwtAuthenticationFilter.java](src/main/java/com/digital_wallet/config/JwtAuthenticationFilter.java) |
| BCrypt 密碼雜湊（註冊+登錄） | [AuthServiceImpl.java](src/main/java/com/digital_wallet/service/impl/AuthServiceImpl.java) |
| MyBatis 樂觀鎖 | [WalletMapper.xml](src/main/resources/mapper/WalletMapper.xml) + [TransactionServiceImpl.java](src/main/java/com/digital_wallet/service/impl/TransactionServiceImpl.java) |
| @Transactional 事務邊界 | [TransactionServiceImpl.java](src/main/java/com/digital_wallet/service/impl/TransactionServiceImpl.java) |
| Entity vs DTO 分離模式 | [model/entity/](src/main/java/com/digital_wallet/model/entity/) vs [model/dto/](src/main/java/com/digital_wallet/model/dto/) |
| MyBatis Mapper 完整 CRUD 寫法 | [mapper/](src/main/resources/mapper/) 目錄下三個 XML |
| 全域異常處理 @RestControllerAdvice | [GlobalExceptionHandler.java](src/main/java/com/digital_wallet/controller/GlobalExceptionHandler.java) |
| API 端點寫法 (Controller) | [AuthController.java](src/main/java/com/digital_wallet/controller/AuthController.java) |
| Swagger/OpenAPI 配置 | [OpenApiConfig.java](src/main/java/com/digital_wallet/config/OpenApiConfig.java) |
| Docker 多階段構建 | [Dockerfile](Dockerfile) + [docker-compose.yml](docker-compose.yml) |

---

## API 端點

| 方法 | 路徑 | JWT | 請求體 | 響應 | 說明 |
|------|------|-----|--------|------|------|
| POST | `/api/auth/register` | 否 | `{"username":"alice","password":"123456"}` | `ApiResponse` | 註冊 + 自動創建錢包 |
| POST | `/api/auth/login` | 否 | `{"username":"alice","password":"123456"}` | `LoginResponseDTO` | 登錄，返回 JWT |
| GET | `/api/wallets` | 是 | — | `WalletDTO` | 查詢**當前用戶**錢包 |
| POST | `/api/transactions/transfer` | 是 | `{"toUsername":"bob","amount":50.0}` | `ApiResponse` | 轉賬 |
| GET | `/api/transactions` | 是 | — | `List<TransactionDTO>` | 查詢**當前用戶**交易歷史 |

> **安全設計**：錢包和交易端點不接收路徑參數，從 JWT 自動提取用戶身份，防止 IDOR 漏洞。

---

## 資料庫表結構

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ROLE_USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wallets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    currency VARCHAR(10) NOT NULL DEFAULT 'USDT',
    balance NUMERIC(18,4) NOT NULL DEFAULT 0.0000,
    version INT NOT NULL DEFAULT 0,           -- 樂觀鎖版本號
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    from_wallet_id BIGINT NULL,
    to_wallet_id BIGINT NULL,
    amount NUMERIC(18,4) NOT NULL,
    tx_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_from ON transactions(from_wallet_id);
CREATE INDEX idx_transactions_to ON transactions(to_wallet_id);
```

---

## 核心實作模式（每個檔案都有完整程式碼 + 解釋）

### 模式 1：專案初始化

#### pom.xml — Maven 依賴（抄作業時複製 <dependencies> 段落）

```xml
<properties>
    <java.version>21</java.version>
</properties>
<dependencies>
    <!-- Spring Boot Web（含內建 Tomcat） -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <!-- Spring Boot Validation（@Valid、@NotBlank 等） -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
    <!-- Spring Security（認證與授權） -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-security</artifactId>
    </dependency>
    <!-- MyBatis（SQL 映射） -->
    <dependency>
        <groupId>org.mybatis.spring.boot</groupId>
        <artifactId>mybatis-spring-boot-starter</artifactId>
        <version>3.0.5</version>
    </dependency>
    <!-- PostgreSQL 驅動 -->
    <dependency>
        <groupId>org.postgresql</groupId>
        <artifactId>postgresql</artifactId>
        <scope>runtime</scope>
    </dependency>
    <!-- JWT 三件套（API + Impl + Jackson） -->
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-api</artifactId>
        <version>0.11.5</version>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-impl</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>
    <dependency>
        <groupId>io.jsonwebtoken</groupId>
        <artifactId>jjwt-jackson</artifactId>
        <version>0.11.5</version>
        <scope>runtime</scope>
    </dependency>
    <!-- Swagger/OpenAPI 文檔 -->
    <dependency>
        <groupId>org.springdoc</groupId>
        <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
        <version>2.8.6</version>
    </dependency>
    <!-- Lombok（減少樣板程式碼） -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
    <!-- 測試 -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-test</artifactId>
        <scope>test</scope>
    </dependency>
</dependencies>
```

**關鍵說明：**
- `jjwt` 三件套：`jjwt-api` 是編譯依賴，`jjwt-impl` 和 `jjwt-jackson` 設為 `runtime`（只在執行時需要）
- Lombok 設為 `<optional>true</optional>`，且在 `spring-boot-maven-plugin` 中 exclude，避免打包進最終 JAR
- `spring-boot-starter-web` 已內建 Jackson（JSON 序列化），不需額外加

#### application.yaml — 完整配置

```yaml
spring:
  application:
    name: digital_wallet
  datasource:
    url: jdbc:postgresql://localhost:5433/digital_wallet?serverTimezone=UTC&useSSL=false
    username: postgres
    password: ${DB_PASSWORD:root}        # 環境變數，預設 root（demo 用）
    driver-class-name: org.postgresql.Driver

mybatis:
  mapper-locations: classpath:mapper/*.xml    # XML 映射檔位置
  type-aliases-package: com.digital_wallet.model  # 別名包：XML 中可直接寫 "User" 而非全限定名
  configuration:
    map-underscore-to-camel-case: true   # user_id → userId（必開）
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl  # 開發時印 SQL

jwt:
  secret: ${JWT_SECRET:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}
  expiration: 86400000                  # 24 小時（毫秒）
```

**為什麼這樣配置：**
- `${ENV_VAR:default}`：Spring Boot 環境變數語法，本地開發用預設值，生產環境注入真實值
- `map-underscore-to-camel-case: true`：MyBatis 必開設定，自動將 DB 欄位 `user_id` 映射到 Java 屬性 `userId`
- `type-aliases-package`：設定後 XML 的 `resultType="User"` 會自動解析為 `com.digital_wallet.model.entity.User`

#### DigitalWalletApplication.java — 入口

```java
package com.digital_wallet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DigitalWalletApplication {
    public static void main(String[] args) {
        SpringApplication.run(DigitalWalletApplication.class, args);
    }
}
```

`@SpringBootApplication` = `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan`。放在根包 `com.digital_wallet` 下，會自動掃描所有子包。

---

### 模式 2：JWT 認證（三個檔案協同工作）

#### SecurityConfig.java

```java
package com.digital_wallet.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())                               // REST API 不需要 CSRF
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // 無 Session
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter,
                UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

**為什麼 `csrf().disable()` 安全：** 前後端分離時 Token 放在 `Authorization` Header，瀏覽器不會自動發送，不存在 CSRF 攻擊面。如果是傳統的 Cookie-Session 模式才需要 CSRF 保護。

**為什麼 `STATELESS`：** 伺服器不記 Session，每個請求獨立驗證 JWT。水平擴展時任何伺服器都能處理請求。

**`.addFilterBefore(A, B.class)`：** 把 JWT 過濾器插在 Spring Security 的 `UsernamePasswordAuthenticationFilter` **之前**執行，這樣 JWT 驗證先跑，通過後才進到授權檢查。

#### JwtUtil.java

```java
package com.digital_wallet.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    // 1. 產生 Token（把 userId 藏在 Subject 裡）
    public String generateToken(Long userId, String username) {
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("username", username)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // 2. 從 Token 解析出 userId
    public Long extractUserId(String token) {
        Claims claims = extractAllClaims(token);
        return Long.parseLong(claims.getSubject());
    }

    // 3. 驗證 Token（被竄改或過期會拋異常）
    public boolean isTokenValid(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSignInKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    private Key getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
```

**為什麼 `setSubject(userId)`：** JWT 標準中 Subject 是「主體」，放最關鍵的身分標識。`claim()` 放輔助資料（username）。

**為什麼 `HMAC-SHA256` (HS256)：** 對稱加密，適合小型/單體服務。大型微服務用 RS256（公私鑰）更好，因為只有認證服務需要私鑰。

**`Keys.hmacShaKeyFor()` 會自動校驗：** keyBytes 必須 >= 256 bits（32 bytes），否則拋 `WeakKeyException`。

#### JwtAuthenticationFilter.java

```java
package com.digital_wallet.config;

import java.io.IOException;
import java.util.Collections;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.digital_wallet.util.JwtUtil;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);    // "Bearer " 長度 7

            if (jwtUtil.isTokenValid(token)) {
                Long userId = jwtUtil.extractUserId(token);

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(
                            userId, null, Collections.emptyList());

                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);  // 永遠往下傳
    }
}
```

**為什麼繼承 `OncePerRequestFilter`：** 保證每個請求只執行一次，避免在 forward/include 時重複執行。

**`UsernamePasswordAuthenticationToken(userId, null, emptyList)` 三個參數：**
- 第 1 參數 (principal)：userId，Controller 用 `auth.getPrincipal()` 取得
- 第 2 參數 (credentials)：null（已驗證過，不需要密碼）
- 第 3 參數 (authorities)：`Collections.emptyList()` — 此 demo 不用角色授權。需要時改為 `List.of(new SimpleGrantedAuthority(role))`

**`filterChain.doFilter()` 永遠執行：** 即使無 Token 或 Token 無效也往下傳，讓 Spring Security 的 `.anyRequest().authenticated()` 攔截未認證請求並返回 401。

---

### 模式 3：Entity（資料庫對應）與 DTO（API 契約）

#### Entity — 對應資料庫欄位

```java
// User.java — 對應 users 表
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private Long id;
    private String username;
    private String passwordHash;   // BCrypt 雜湊結果
    private String role;
    private Timestamp createdAt;
}

// Wallet.java — 對應 wallets 表
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Wallet {
    private Long id;
    private Long userId;
    private String currency;
    private BigDecimal balance;    // NUMERIC(18,4) → BigDecimal
    private Long version;          // 樂觀鎖版本號
    private Timestamp updatedAt;
}

// Transaction.java — 對應 transactions 表
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {
    private Long id;
    private Long fromWalletId;     // null = 系統充值
    private Long toWalletId;
    private BigDecimal amount;
    private String txType;         // 'TRANSFER'
    private String status;         // 'SUCCESS'
    private Timestamp createdAt;
}
```

**為什麼用 `@Data`：** Lombok 自動生成 getter/setter/toString/equals/hashCode，Entity 物件不需要手寫這些。

**為什麼 `BigDecimal` 而不是 `double`：** 金額不能用浮點數！`double` 會有精度問題（`0.1 + 0.2 = 0.30000000000000004`）。`NUMERIC(18,4)` 必須對應 `BigDecimal`。

#### DTO — API 輸入/輸出

```java
// 註冊請求：用戶提供的資料
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UserCreateDTO {
    private String username;
    private String password;       // 明文密碼（Service 層才做 BCrypt）
}

// 安全響應：不含密碼雜湊
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UserDTO {
    private Long id;
    private String username;
    private String role;
    private Timestamp createdAt;
}

// 內部認證用：含密碼雜湊，僅 Service/Mapper 層使用
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class UserAuthDTO {
    private Long id;
    private String username;
    private String passwordHash;
    private String role;
}

// 登錄請求
@Data @NoArgsConstructor @AllArgsConstructor
public class LoginRequestDTO {
    private String username;
    private String password;
}

// 登錄響應
@Getter @AllArgsConstructor
public class LoginResponseDTO {
    private String token;
    private UserDTO user;
}

// 錢包響應
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class WalletDTO {
    private Long id;
    private Long userId;
    private String currency;
    private BigDecimal balance;
    private Long version;
    private Timestamp updatedAt;
}

// 交易響應
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TransactionDTO {
    private Long id;
    private Long fromWalletId;
    private Long toWalletId;
    private BigDecimal amount;
    private String txType;
    private String status;
    private Timestamp createdAt;
}

// 轉賬請求
@Data @NoArgsConstructor @AllArgsConstructor
public class TransferRequestDTO {
    private String toUsername;
    private BigDecimal amount;
}

// 通用 API 響應
@Getter @AllArgsConstructor
public class ApiResponse {
    private String status;     // "SUCCESS" 或 "ERROR"
    private String message;

    public static ApiResponse success(String message) {
        return new ApiResponse("SUCCESS", message);
    }
    public static ApiResponse error(String message) {
        return new ApiResponse("ERROR", message);
    }
}
```

**DTO 分層策略（為什麼分三種 User DTO）：**
- `UserCreateDTO`：註冊請求，只需 username + password（不需要 id），role 由 Service 層固定寫入
- `UserDTO`：對外響應，id + username + role + createdAt（**絕不含 passwordHash**）
- `UserAuthDTO`：內部認證用，含 passwordHash，僅 Service/Mapper 層使用

**`ApiResponse` 的工廠方法：** `ApiResponse.success()` / `ApiResponse.error()` 比手動 `new ApiResponse("SUCCESS", msg)` 更語義化。

---

### 模式 4：Controller 層（REST API 端點）

#### AuthController.java

```java
package com.digital_wallet.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.digital_wallet.model.dto.ApiResponse;
import com.digital_wallet.model.dto.LoginRequestDTO;
import com.digital_wallet.model.dto.LoginResponseDTO;
import com.digital_wallet.model.dto.UserCreateDTO;
import com.digital_wallet.service.AuthService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse> register(@RequestBody UserCreateDTO userCreateDTO) {
        authService.register(userCreateDTO);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(@RequestBody LoginRequestDTO loginRequest) {
        LoginResponseDTO response = authService.login(
            loginRequest.getUsername(), loginRequest.getPassword());
        return ResponseEntity.ok(response);
    }
}
```

**為什麼 register 返回 201 而不是 200：** REST 語義中 `201 Created` 表示資源已建立。

#### WalletController.java — IDOR 防護

```java
package com.digital_wallet.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.digital_wallet.model.dto.WalletDTO;
import com.digital_wallet.service.WalletService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/wallets")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @GetMapping
    public ResponseEntity<WalletDTO> getWallet() {
        // 從 JWT 提取當前用戶身份（不信任路徑參數）
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        WalletDTO walletDTO = walletService.getWalletByUserId(userId);
        return ResponseEntity.ok(walletDTO);
    }
}
```

#### TransactionController.java — IDOR 防護

```java
package com.digital_wallet.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.digital_wallet.model.dto.ApiResponse;
import com.digital_wallet.model.dto.TransactionDTO;
import com.digital_wallet.model.dto.TransferRequestDTO;
import com.digital_wallet.service.TransactionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @PostMapping("/transfer")
    public ResponseEntity<ApiResponse> transfer(@RequestBody TransferRequestDTO request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long fromUserId = (Long) auth.getPrincipal();

        transactionService.transfer(fromUserId, request.getToUsername(), request.getAmount());
        return ResponseEntity.ok(ApiResponse.success("Transfer completed successfully"));
    }

    @GetMapping
    public ResponseEntity<List<TransactionDTO>> getTransactionHistory() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        List<TransactionDTO> history = transactionService.getTransactionHistory(userId);
        return ResponseEntity.ok(history);
    }
}
```

**為什麼不接收路徑參數 `/{userId}`：**
- 攻擊者可以修改 URL 路徑參數來查看其他人的錢包/交易 → IDOR 漏洞
- 改為從 `SecurityContextHolder` 獲取當前用戶身份，由 JWT 保證不可偽造
- `auth.getPrincipal()` 返回 `JwtAuthenticationFilter` 中設定的 userId

---

### 模式 5：Service 層

#### Service 介面

```java
// AuthService.java
public interface AuthService {
    void register(UserCreateDTO userCreateDTO);
    LoginResponseDTO login(String username, String password);
}

// WalletService.java
public interface WalletService {
    WalletDTO getWalletByUserId(Long userId);
}

// TransactionService.java
public interface TransactionService {
    void transfer(Long fromUserId, String toUsername, BigDecimal amount);
    List<TransactionDTO> getTransactionHistory(Long userId);
}
```

**為什麼要分 Interface + Impl：** 方便單元測試時 Mock，也方便未來換實作（例如換一個支付邏輯）。如果只有一個實作且永不換，不加介面也可以。

#### AuthServiceImpl.java — BCrypt + JWT + 重複用戶名

```java
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
            throw new DuplicateUsernameException(
                "Username '" + user.getUsername() + "' is already taken");
        }

        // 自動創建錢包
        Wallet wallet = new Wallet();
        wallet.setUserId(user.getId());          // userMapper.insert 後自動回填 id
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
```

**為什麼登入失敗不區分錯誤類型：** 攻擊者可能透過錯誤訊息列舉有效用戶名（"User not found" vs "Invalid password"）。統一為 "Invalid username or password" 防止用戶名列舉。

**為什麼 `userMapper.insert(user)` 後 `user.getId()` 有值：** MyBatis 的 `useGeneratedKeys="true" keyProperty="id"` 會自動將 DB 生成的自增主鍵回填到 `user.id`。

**`DataIntegrityViolationException`：** Spring 對資料庫約束違反的包裝（含 unique violation）。捕獲後轉為業務異常 `DuplicateUsernameException`。

#### WalletServiceImpl.java

```java
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
```

**為什麼手動 Entity → DTO 轉換而不是用 MapStruct/BeanUtils：** 小專案手動轉換最直接，欄位多了再引入 MapStruct。

#### TransactionServiceImpl.java — 核心轉賬邏輯

```java
package com.digital_wallet.service.impl;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.digital_wallet.exception.ConcurrentModificationException;
import com.digital_wallet.exception.InsufficientBalanceException;
import com.digital_wallet.exception.WalletNotFoundException;
import com.digital_wallet.mapper.TransactionMapper;
import com.digital_wallet.mapper.UserMapper;
import com.digital_wallet.mapper.WalletMapper;
import com.digital_wallet.model.dto.TransactionDTO;
import com.digital_wallet.model.entity.Transaction;
import com.digital_wallet.model.entity.User;
import com.digital_wallet.model.entity.Wallet;
import com.digital_wallet.service.TransactionService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TransactionServiceImpl implements TransactionService {

    private final UserMapper userMapper;
    private final WalletMapper walletMapper;
    private final TransactionMapper transactionMapper;

    @Override
    @Transactional
    public void transfer(Long fromUserId, String toUsername, BigDecimal amount) {
        // 1. 快速失敗：負數或零
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Transfer amount must be greater than zero");
        }

        // 2. 根據用戶名查找收款用戶
        User toUser = userMapper.findByUsername(toUsername);
        if (toUser == null) {
            throw new WalletNotFoundException("User not found: " + toUsername);
        }
        Long toUserId = toUser.getId();

        // 3. 快速失敗：自己轉給自己
        if (fromUserId.equals(toUserId)) {
            throw new IllegalArgumentException("Cannot transfer to yourself");
        }

        // 4. 讀取雙方錢包（同時取得 version）
        Wallet fromWallet = walletMapper.findByUserId(fromUserId);
        if (fromWallet == null) {
            throw new WalletNotFoundException("Wallet not found for userId: " + fromUserId);
        }

        Wallet toWallet = walletMapper.findByUserId(toUserId);
        if (toWallet == null) {
            throw new WalletNotFoundException("Wallet not found for userId: " + toUserId);
        }

        // 5. 快速失敗：餘額不足
        if (fromWallet.getBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException(
                    "Insufficient balance: " + fromWallet.getBalance() + " < " + amount);
        }

        // 6. 樂觀鎖扣款：WHERE 條件帶 version
        int deducted = walletMapper.deductBalanceWithVersion(
                fromWallet.getUserId(), amount, fromWallet.getVersion());
        if (deducted == 0) {
            throw new ConcurrentModificationException(
                    "Concurrent modification detected for userId: " + fromUserId);
        }

        // 7. 加款
        walletMapper.addBalance(toWallet.getUserId(), amount);

        // 8. 記錄交易
        Transaction transaction = new Transaction();
        transaction.setFromWalletId(fromWallet.getId());
        transaction.setToWalletId(toWallet.getId());
        transaction.setAmount(amount);
        transaction.setTxType("TRANSFER");
        transaction.setStatus("SUCCESS");

        transactionMapper.insert(transaction);
    }

    @Override
    public List<TransactionDTO> getTransactionHistory(Long userId) {
        Wallet wallet = walletMapper.findByUserId(userId);
        if (wallet == null) {
            throw new WalletNotFoundException("Wallet not found for userId: " + userId);
        }

        List<Transaction> transactions = transactionMapper.findByWalletId(wallet.getId());

        return transactions.stream()
                .map(tx -> TransactionDTO.builder()
                    .id(tx.getId())
                    .fromWalletId(tx.getFromWalletId())
                    .toWalletId(tx.getToWalletId())
                    .amount(tx.getAmount())
                    .txType(tx.getTxType())
                    .status(tx.getStatus())
                    .createdAt(tx.getCreatedAt())
                    .build())
                .collect(Collectors.toList());
    }
}
```

**為什麼 @Transactional 放 Service 層而不是 Controller：**
- ✅ Service 層的事務可以跨多個 Mapper 操作（扣款 + 加款 + 記錄交易）
- ❌ Controller 層做事務會讓事務邊界太寬，包含不必要的序列化耗時
- ⚠️ 必須是 public 方法，且從外部呼叫（同類內部呼叫不經過代理，事務不生效）

**`BigDecimal.compareTo()` 而不是 `>`：** BigDecimal 不能用運算子比較。

---

### 模式 6：MyBatis Mapper（Java 介面 + XML SQL）

#### UserMapper.java + UserMapper.xml

```java
// UserMapper.java
@Mapper
public interface UserMapper {
    int insert(User user);
    User findByUsername(String username);
}
```

```xml
<!-- UserMapper.xml -->
<mapper namespace="com.digital_wallet.mapper.UserMapper">

    <insert id="insert" useGeneratedKeys="true" keyProperty="id" keyColumn="id">
        INSERT INTO users(username, password_hash, role)
        VALUES(#{username}, #{passwordHash}, #{role})
    </insert>

    <select id="findByUsername" resultType="User">
        SELECT * FROM users WHERE username = #{username}
    </select>

</mapper>
```

#### WalletMapper.java + WalletMapper.xml

```java
// WalletMapper.java
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
```

```xml
<!-- WalletMapper.xml -->
<mapper namespace="com.digital_wallet.mapper.WalletMapper">

    <insert id="insert" useGeneratedKeys="true" keyProperty="id" keyColumn="id">
        INSERT INTO wallets(user_id, currency, balance, version)
        VALUES(#{userId}, #{currency}, #{balance}, #{version})
    </insert>

    <select id="findByUserId" resultType="Wallet">
        SELECT * FROM wallets WHERE user_id = #{userId}
    </select>

    <!-- 樂觀鎖扣款：WHERE 條件帶 version -->
    <update id="deductBalanceWithVersion">
        UPDATE wallets
        SET balance = balance - #{amount},
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = #{userId}
          AND version = #{version}
    </update>

    <!-- 加款：同樣遞增 version，保持一致性 -->
    <update id="addBalance">
        UPDATE wallets
        SET balance = balance + #{amount},
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = #{userId}
    </update>

</mapper>
```

#### TransactionMapper.java + TransactionMapper.xml

```java
// TransactionMapper.java
@Mapper
public interface TransactionMapper {
    int insert(Transaction transaction);
    List<Transaction> findByWalletId(Long walletId);
}
```

```xml
<!-- TransactionMapper.xml -->
<mapper namespace="com.digital_wallet.mapper.TransactionMapper">

    <insert id="insert" useGeneratedKeys="true" keyProperty="id" keyColumn="id">
        INSERT INTO transactions(from_wallet_id, to_wallet_id, amount, tx_type, status)
        VALUES(#{fromWalletId}, #{toWalletId}, #{amount}, #{txType}, #{status})
    </insert>

    <select id="findByWalletId" resultType="Transaction">
        SELECT * FROM transactions
        WHERE from_wallet_id = #{walletId}
           OR to_wallet_id = #{walletId}
        ORDER BY created_at DESC
    </select>

</mapper>
```

**`useGeneratedKeys="true"` 的作用：** MyBatis 會在 INSERT 後自動呼叫 JDBC 的 `getGeneratedKeys()`，把 DB 生成的自增主鍵回填到物件的 `id` 屬性。

**`@Param` 什麼時候需要：** 當方法有多個參數時必須用，MyBatis 才知道 `#{userId}` 對應哪個參數。單一參數不需要。

**樂觀鎖原理解說：**
1. 讀取錢包時取得 version（例如 version=5）
2. 更新時 SQL 帶 `WHERE version = 5`
3. 如果別的交易已更新過這筆錢包，version 會變成 6
4. `WHERE version = 5` 條件不成立 → 更新 0 行 → `deducted == 0`
5. 拋出 `ConcurrentModificationException` → 前端提示用戶重試

---

### 模式 7：Exception 與 GlobalExceptionHandler

#### 五個自定義異常

```java
// 1. 認證失敗 → 401
public class AuthenticationException extends RuntimeException {
    public AuthenticationException(String message) { super(message); }
}

// 2. 餘額不足 → 400
public class InsufficientBalanceException extends RuntimeException {
    public InsufficientBalanceException(String message) { super(message); }
}

// 3. 樂觀鎖版本衝突 → 409
public class ConcurrentModificationException extends RuntimeException {
    public ConcurrentModificationException(String message) { super(message); }
}

// 4. 錢包不存在 → 404
public class WalletNotFoundException extends RuntimeException {
    public WalletNotFoundException(String message) { super(message); }
}

// 5. 用戶名重複 → 409
public class DuplicateUsernameException extends RuntimeException {
    public DuplicateUsernameException(String message) { super(message); }
}
```

**為什麼全部繼承 `RuntimeException`：**
- Spring 的 `@Transactional` 預設只在 RuntimeException 時回滾
- Checked Exception 需要到處宣告 `throws` 或 try-catch，增加噪音

#### GlobalExceptionHandler.java

```java
package com.digital_wallet.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.digital_wallet.exception.AuthenticationException;
import com.digital_wallet.exception.ConcurrentModificationException;
import com.digital_wallet.exception.DuplicateUsernameException;
import com.digital_wallet.exception.InsufficientBalanceException;
import com.digital_wallet.exception.WalletNotFoundException;
import com.digital_wallet.model.dto.ApiResponse;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(InsufficientBalanceException.class)
    public ResponseEntity<ApiResponse> handleInsufficientBalance(InsufficientBalanceException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(WalletNotFoundException.class)
    public ResponseEntity<ApiResponse> handleWalletNotFound(WalletNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(ConcurrentModificationException.class)
    public ResponseEntity<ApiResponse> handleConcurrentModification(ConcurrentModificationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiResponse> handleAuthentication(AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(DuplicateUsernameException.class)
    public ResponseEntity<ApiResponse> handleDuplicateUsername(DuplicateUsernameException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("An unexpected error occurred: " + ex.getMessage()));
    }
}
```

**HTTP 狀態碼選擇原則：**

| 異常 | HTTP | 原因 |
|------|------|------|
| `InsufficientBalanceException` | 400 | 客戶端輸入超過餘額 |
| `WalletNotFoundException` | 404 | 資源不存在 |
| `AuthenticationException` | 401 | 認證失敗 |
| `ConcurrentModificationException` | 409 | 版本衝突，客戶端應重試 |
| `DuplicateUsernameException` | 409 | 資源已存在衝突 |
| `Exception` (fallback) | 500 | 未預期的伺服器錯誤 |

**Spring 匹配順序：** 先找最具體的 handler，找不到才 fallback 到 `Exception.class`。

---

### 模式 8：OpenAPI/Swagger 配置

```java
package com.digital_wallet.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI digitalWalletOpenAPI() {
        SecurityScheme jwtScheme = new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .in(SecurityScheme.In.HEADER)
                .name("Authorization");

        return new OpenAPI()
                .info(new Info()
                        .title("Digital Wallet API")
                        .version("1.0")
                        .description("數位錢包 REST API 文件"))
                .addSecurityItem(new SecurityRequirement().addList("Bearer"))
                .components(new Components()
                        .addSecuritySchemes("Bearer", jwtScheme));
    }
}
```

**作用：** 在 Swagger UI 右上角顯示 "Authorize" 按鈕，輸入 Bearer Token 後所有需認證的端點會自動附加 `Authorization: Bearer <token>` Header。

---

### 模式 9：Docker 容器化

#### Dockerfile — 多階段構建

```dockerfile
# 第一階段：編譯
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw dependency:resolve -q
COPY src src
RUN ./mvnw package -DskipTests -q

# 第二階段：執行（僅含 JRE，不含 JDK）
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**為什麼多階段構建：**
- 第一階段用 JDK 編譯（含 javac、Maven）
- 第二階段只用 JRE 執行（不含編譯工具）
- 最終 Image 更小（不含 JDK、原始碼、Maven cache）
- `dependency:resolve -q` 在 COPY src 之前執行：利用 Docker layer cache，pom.xml 不變就不重複下載依賴

#### docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: digital_wallet_db
    environment:
      POSTGRES_DB: digital_wallet
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: root
    ports:
      - "5433:5432"                      # 主機:容器
    volumes:
      - pgdata:/var/lib/postgresql/data  # 資料持久化
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d digital_wallet"]
      interval: 5s
      timeout: 5s
      retries: 10

  app:
    build: .
    container_name: digital_wallet_app
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/digital_wallet  # 容器內部通訊用 5432
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: root
      JWT_SECRET: "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata:
```

**關鍵細節：**
- 埠映射 `5433:5432`：主機用 5433 連接，容器內部用 5432。app 容器和 postgres 容器在同一個 Docker network 中，用容器內部埠 5432 通訊
- `depends_on` + `condition: service_healthy`：確保 PostgreSQL 完全就緒後才啟動 app（健康檢查通過 `pg_isready`）
- `volumes`：即使容器刪除，資料庫檔案保留在主機上

---

## 數據流圖

### 1. 用戶註冊

```
POST /api/auth/register  { username, password, role }
  → AuthController.register(UserCreateDTO)
  → AuthServiceImpl.register(UserCreateDTO) ← @Transactional
    ├── passwordEncoder.encode(password)            // BCrypt 雜湊（自動加鹽）
    ├── userMapper.insert(User)                    // INSERT INTO users → user.id 自動回填
    │     └── catch DataIntegrityViolationException → DuplicateUsernameException → 409
    ├── walletMapper.insert(Wallet)                // INSERT INTO wallets (user_id, currency='USDT', balance=0, version=0)
    └── return
  → 201 { "status": "SUCCESS", "message": "User registered successfully" }
```

### 2. 用戶登錄

```
POST /api/auth/login  { username, password }
  → AuthController.login(LoginRequestDTO)
  → AuthServiceImpl.login(username, password)
    ├── userMapper.findByUsername(username)         // SELECT * FROM users WHERE username=?
    │     └── null → AuthenticationException → 401 "Invalid username or password"
    ├── passwordEncoder.matches(password, hash)    // BCrypt 比對（自動解析鹽值）
    │     └── false → AuthenticationException → 401 "Invalid username or password"
    ├── jwtUtil.generateToken(userId, username)    // HMAC-SHA256 簽名，24h 有效
    └── return LoginResponseDTO(token, UserDTO)
  → 200 { "token": "eyJ...", "user": { "id": 1, "username": "alice", ... } }
```

### 3. JWT 請求攔截

```
Request: Authorization: Bearer eyJ...
  → JwtAuthenticationFilter.doFilterInternal()
    ├── 提取 Header → substring(7) → token
    ├── jwtUtil.isTokenValid(token)                // 檢查簽名 + 過期
    │     └── false → 不設置 Authentication → Spring Security 攔截 → 401
    ├── jwtUtil.extractUserId(token)               // 從 payload 解析 userId
    ├── new UsernamePasswordAuthenticationToken(userId, null, emptyList)
    ├── SecurityContextHolder.set(authToken)
    └── filterChain.doFilter() → Controller
```

### 4. 查詢錢包

```
GET /api/wallets  [JWT: userId=1]
  → WalletController.getWallet()
    ├── SecurityContextHolder → userId=1
    ├── WalletServiceImpl.getWalletByUserId(1)
    │     ├── walletMapper.findByUserId(1)         // SELECT * FROM wallets WHERE user_id=1
    │     ├── null → WalletNotFoundException → 404
    │     └── Entity → WalletDTO (Builder)
    └── return
  → 200 WalletDTO { id: 1, userId: 1, currency: "USDT", balance: 100.5000, version: 3, ... }
```

### 5. 轉賬（核心流程，@Transactional）

```
POST /api/transactions/transfer  { toUsername: "bob", amount: 50.00 }  [JWT: userId=1]
  → TransactionController.transfer()
    └── TransactionServiceImpl.transfer(1, "bob", 50.00) ← @Transactional
      ├── 驗證 amount > 0
      ├── toUser = userMapper.findByUsername("bob")   // 根據用戶名查找收款用戶
      │     └── null → WalletNotFoundException → 404
      ├── 驗證 fromUserId ≠ toUser.getId()
      ├── fromWallet = walletMapper.findByUserId(1)    // 取得當前餘額 + version
      ├── toWallet   = walletMapper.findByUserId(toUser.getId())
      │     └── null → WalletNotFoundException → 404
      ├── balance < amount? → NO (快速失敗，100 >= 50)
      ├── deducted = walletMapper.deductBalanceWithVersion(1, 50.00, version=3)
      │     SQL: UPDATE wallets SET balance=balance-50, version=4
      │          WHERE user_id=1 AND version=3
      │     → deducted=1 (成功)
      │     → 如 deducted=0 → ConcurrentModificationException → 409
      ├── walletMapper.addBalance(toUser.getId(), 50.00)
      │     SQL: UPDATE wallets SET balance=balance+50, version=version+1 WHERE user_id=<toUser.id>
      ├── transactionMapper.insert(Transaction)         // 記錄交易
      └── COMMIT (全部成功)
  → 200 { "status": "SUCCESS", "message": "Transfer completed successfully" }
```

### 6. 交易歷史

```
GET /api/transactions  [JWT: userId=1]
  → TransactionController.getTransactionHistory()
    ├── SecurityContextHolder → userId=1
    └── TransactionServiceImpl.getTransactionHistory(1)
      ├── walletMapper.findByUserId(1)                // 取得錢包 ID
      │     └── null → WalletNotFoundException → 404
      ├── transactionMapper.findByWalletId(wallet.id)  // WHERE from_wallet_id=? OR to_wallet_id=?
      ├── stream().map(Entity → TransactionDTO).toList()
      └── return
  → 200 [TransactionDTO, ...]
```

### 7. 異常處理

```
Controller → Service → Mapper 任一層拋出異常
  → GlobalExceptionHandler (@RestControllerAdvice)
    ├── AuthenticationException        → 401 { status: "ERROR", message: "Invalid username or password" }
    ├── InsufficientBalanceException   → 400 { status: "ERROR", message: "Insufficient balance: ..." }
    ├── ConcurrentModificationException → 409 { status: "ERROR", message: "Concurrent modification detected" }
    ├── WalletNotFoundException        → 404 { status: "ERROR", message: "Wallet not found" }
    ├── DuplicateUsernameException     → 409 { status: "ERROR", message: "Username is already taken" }
    ├── IllegalArgumentException      → 400 { status: "ERROR", message: "..." }
    └── Exception (fallback)           → 500 { status: "ERROR", message: "An unexpected error: ..." }
```

---

## 設計決策問答

### 為什麼用 MyBatis 而不是 JPA/Hibernate？

| | MyBatis | JPA/Hibernate |
|------|------|------|
| SQL 控制 | 手寫 SQL，完全掌控 | 自動生成，難以優化 |
| 複雜查詢 | XML 直接寫，清晰 | JPQL/HQL/ Criteria API 學習成本高 |
| 除錯 | SQL 日誌直接複製到 DB 執行 | 需解析 Hibernate SQL |
| 學習成本 | 低，會 SQL 就能上手 | 高，需理解 Entity 生命週期 |

**選 MyBatis：** 錢包轉賬涉及餘額、樂觀鎖的精確 SQL，手寫比 ORM 自動生成可靠。

### 為什麼用 JWT 而不是 Session？

| Session | JWT |
|------|------|
| 伺服器記憶 Session | 客戶端攜帶 Token |
| 水平擴展需 Redis 共享 | 任意伺服器都能驗證 |
| Cookie 自動攜帶 | 手動附加 Header |

**選 JWT：** 前後端分離時後端不需存 Session，多台實例無需同步。

### 為什麼用樂觀鎖而不是悲觀鎖？

| 悲觀鎖 `SELECT ... FOR UPDATE` | 樂觀鎖 `version` 欄位 |
|------|------|
| 鎖住行，其他排隊 | 不鎖，提交時檢查 |
| 高併發時差 | 適合讀多寫少 |
| 可能死鎖 | 不會死鎖 |

**選樂觀鎖：** 錢包大部分時間在查詢，偶爾轉賬。衝突時讓用戶重試即可。

### 為什麼密碼用 BCrypt 而不是 SHA-256？

| SHA-256 | BCrypt |
|------|------|
| 計算極快 | 故意慢（work factor=10） |
| 不加鹽 → 彩虹表攻擊 | 內建隨機鹽值 |
| 相同密碼 → 相同雜湊 | 相同密碼 → 不同雜湊 |

**⚠️ 永遠不要用 MD5 或 SHA-256 存密碼。**

### 為什麼 Controller 用 DTO 不直接暴露 Entity？

```
Entity                     DTO
User {                     UserDTO { id, username, role, createdAt }
  id, username,            ← 絕不含 passwordHash
  passwordHash,  ← 危險！
  role, createdAt
}
```

### 為什麼 @Transactional 放 Service 層？

- ✅ Service 層跨多個 Mapper（扣款 + 加款 + 記錄）
- ❌ Controller 層包含不必要的序列化
- ⚠️ 必須 public 方法，同類內部呼叫不經代理

### 為什麼 Service 分 Interface + Impl？

- ✅ 方便 Mock 測試
- ✅ 未來換實作不改 Controller
- ⚠️ 只有單一實作不加介面也可以

---

## 安全紅線

| ✅ 要做的 | ❌ 不要做的 |
|------|------|
| BCrypt 存密碼 | 明文或 MD5/SHA-256 存密碼 |
| HTTPS 傳輸 Token | HTTP 明文傳輸 |
| JWT secret 放環境變數 | JWT secret 硬編碼 commit |
| DTO 過濾敏感欄位 | Entity 直接返回前端 |
| 後端驗證所有輸入 | 信任前端傳來的值 |
| 從 SecurityContext 獲取用戶 | 從 URL 路徑參數獲取用戶 ID |
| 統一登入失敗訊息 | 區分「用戶不存在」vs「密碼錯誤」 |

---

## 常見錯誤

| 錯誤 | 後果 | 正確做法 |
|------|------|------|
| `@Transactional` 加在 private 方法 | 事務不生效 | 必須 public |
| 樂觀鎖只更新 version 不檢查 | 覆蓋修改 | WHERE 帶 version + 檢查 `deducted == 0` |
| `BigDecimal(double)` 建構子 | 浮點精度問題 | `new BigDecimal("50.00")` |
| JWT secret 太短 | 暴力破解 | 至少 256-bit (64 hex) |
| `NUMERIC(18,4)` 精度不足 | 金額截斷 | 根據業務需求選擇 |
| 同類內部呼叫 `this.methodB()` | 事務/攔截器不生效 | 注入自己或移到另一個類 |

---

## 啟動方式

```bash
# 直接運行（需本機 PostgreSQL:5433）
./mvnw spring-boot:run

# 或 Docker 一鍵啟動
docker-compose up -d

# 停止
docker-compose down
```

Swagger UI: `http://localhost:8080/swagger-ui.html`

**測試流程：**
1. 打開 Swagger UI
2. `POST /api/auth/register` 註冊兩個用戶（alice / bob）
3. `POST /api/auth/login` 登錄 alice，複製返回的 token
4. 右上角 Authorize → 貼上 token
5. `GET /api/wallets` 查看錢包
6. `POST /api/transactions/transfer` 轉賬給 bob
7. `GET /api/transactions` 查看交易歷史
