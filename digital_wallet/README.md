# Digital Wallet Backend — Spring Boot 3.5 + MyBatis 版 (Demo)
> 技術驗證／參考實作：展示 Spring Boot 3 全棧後端開發的關鍵技術選型與實作模式。API 合約與其他五個後端完全一致。

## 技術清單

| 技術 | 版本 | 用途 |
|------|------|------|
| Java | 21 | 核心語言 |
| Spring Boot | 3.5.14 | 應用框架 |
| Spring Security | 6.x (隨 Boot) | 認證與授權（無狀態 JWT + RBAC） |
| Spring MVC | 6.x (隨 Boot) | REST API 控制器（內嵌 Tomcat） |
| Spring Validation | 3.x (隨 Boot) | 請求參數校驗（`@Valid`、`@NotNull`） |
| MyBatis Spring Boot | 3.0.5 | SQL 映射 ORM |
| PostgreSQL | 16 | 關聯式資料庫（透過 JDBC Driver 42.x） |
| JWT (jjwt) | 0.11.5 | 無狀態 Token 認證（HS256） |
| BCrypt | 內建 (Spring Security) | 密碼雜湊（自動加鹽） |
| SpringDoc OpenAPI | 2.8.6 | Swagger UI / OpenAPI 3 文件 |
| Lombok | 1.18.x | 減少樣板程式碼（`@Data`、`@Builder` 等） |
| Docker | — | 容器化部署（多階段構建 + Compose） |
| Maven Wrapper | — | 免安裝 Maven 即可構建 |

---

## 專案結構

```
digital_wallet/
├── pom.xml                                           # Maven 依賴：Spring Boot、MyBatis、Security、JWT、PostgreSQL、Swagger
├── Dockerfile                                        # 多階段 Docker 構建（JDK 21 編譯 → JRE 21 執行）
├── docker-compose.yml                                # PostgreSQL 16 + App 一鍵啟動，含健康檢查
├── mvnw / mvnw.cmd                                   # Maven Wrapper（免安裝 Maven）
│
├── src/main/resources/
│   ├── application.yaml                              # 資料庫連線、MyBatis 設定、JWT secret/expiration
│   ├── mapper/
│   │   ├── UserMapper.xml                            #   用戶 CRUD + 分頁查詢 + 角色更新
│   │   ├── WalletMapper.xml                          #   錢包 CRUD + 樂觀鎖扣款 + 加款
│   │   └── TransactionMapper.xml                     #   交易 CRUD + 管理端 JOIN 查詢 + 統計
│   └── static/db.sql                                 # 資料庫初始化 DDL（三張表 + 兩個索引）
│
├── src/main/java/com/digital_wallet/
│   ├── DigitalWalletApplication.java                 # @SpringBootApplication 入口
│   │
│   ├── config/
│   │   ├── SecurityConfig.java                       #   Spring Security：無狀態、CSRF 禁用、角色權限控管
│   │   ├── JwtAuthenticationFilter.java              #   OncePerRequestFilter：Bearer Token → SecurityContext（含 role）
│   │   └── OpenApiConfig.java                        #   Swagger UI 帶 Bearer Token 授權按鈕
│   │
│   ├── controller/
│   │   ├── AuthController.java                       #   POST /api/auth/register、/login
│   │   ├── WalletController.java                     #   GET /api/wallets（JWT → userId，防 IDOR）
│   │   ├── TransactionController.java                #   POST /api/transactions/transfer、GET /api/transactions
│   │   ├── AdminController.java                      #   GET/PUT /api/admin/*（管理後台，6 個端點）
│   │   └── GlobalExceptionHandler.java               #   @RestControllerAdvice：8 種異常 → HTTP 狀態碼
│   │
│   ├── service/
│   │   ├── AuthService.java                          #   介面：register()、login()
│   │   ├── WalletService.java                        #   介面：getWalletByUserId()
│   │   ├── TransactionService.java                   #   介面：transfer()、getTransactionHistory()
│   │   ├── AdminService.java                         #   介面：用戶管理 + 交易監控（6 個方法）
│   │   └── impl/
│   │       ├── AuthServiceImpl.java                  #     BCrypt + JWT + 重複用戶名檢測 + 禁用檢查
│   │       ├── WalletServiceImpl.java                #     Entity → DTO 轉換
│   │       ├── TransactionServiceImpl.java           #     @Transactional + 樂觀鎖 + 快速失敗
│   │       └── AdminServiceImpl.java                 #     用戶列表/詳情/禁用/啟用 + 交易列表/統計
│   │
│   ├── mapper/
│   │   ├── UserMapper.java                           #   MyBatis 介面：insert、findByUsername、findById、分頁、updateRole
│   │   ├── WalletMapper.java                         #   MyBatis 介面：insert、findByUserId、樂觀鎖扣款、加款
│   │   └── TransactionMapper.java                    #   MyBatis 介面：insert、查詢、管理端查詢、統計
│   │
│   ├── model/
│   │   ├── entity/
│   │   │   ├── User.java                             #   DB 對應：users 表（id、username、passwordHash、role、createdAt）
│   │   │   ├── Wallet.java                           #   DB 對應：wallets 表（含 version 樂觀鎖欄位）
│   │   │   └── Transaction.java                      #   DB 對應：transactions 表
│   │   └── dto/
│   │       ├── UserCreateDTO.java                    #   註冊請求（username + password）
│   │       ├── UserDTO.java                          #   對外安全響應（不含 passwordHash）
│   │       ├── UserAuthDTO.java                      #   內部認證用 DTO（含 passwordHash，僅 Service/Mapper 層）
│   │       ├── LoginRequestDTO.java                  #   登錄請求
│   │       ├── LoginResponseDTO.java                 #   登錄響應（token + UserDTO）
│   │       ├── WalletDTO.java                        #   錢包響應
│   │       ├── TransactionDTO.java                   #   交易響應
│   │       ├── TransferRequestDTO.java               #   轉賬請求（含 @NotNull 校驗）
│   │       ├── ApiResponse.java                      #   通用 API 響應（SUCCESS/ERROR + message）
│   │       ├── PaginatedResponse.java                #   通用分頁響應（data + page + size + total）
│   │       ├── UserDetailDTO.java                    #   用戶詳情（含 WalletDTO + 最近 5 筆交易）
│   │       ├── AdminTransactionDTO.java              #   管理端交易（含 fromUsername + toUsername）
│   │       ├── TransactionStatsDTO.java              #   交易統計（總筆數 + 總金額 + 每日交易量）
│   │       └── DailyVolumeDTO.java                   #   每日交易量（date + count + amount）
│   │
│   ├── exception/
│   │   ├── AuthenticationException.java              #   401 — 認證失敗
│   │   ├── InsufficientBalanceException.java         #   400 — 餘額不足
│   │   ├── ConcurrentModificationException.java      #   409 — 樂觀鎖版本衝突
│   │   ├── WalletNotFoundException.java              #   404 — 錢包或用戶不存在
│   │   └── DuplicateUsernameException.java           #   409 — 用戶名重複
│   │
│   └── util/
│       └── JwtUtil.java                              # JWT 工具：HMAC-SHA256 生成、解析、驗證（含 role claim）
│
└── src/test/java/com/digital_wallet/
    └── DigitalWalletApplicationTests.java            # Spring Boot 基礎測試
```

---

## API 端點

### 用戶端點（5 個）

| 方法 | 路徑 | JWT | 請求體 | 響應 | 說明 |
|------|------|-----|--------|------|------|
| POST | `/api/auth/register` | 否 | `{"username":"alice","password":"123456"}` | `ApiResponse` (201) | 註冊 + 自動創建錢包（USDT，餘額 0） |
| POST | `/api/auth/login` | 否 | `{"username":"alice","password":"123456"}` | `LoginResponseDTO` (200) | 登錄，返回 JWT token + UserDTO |
| GET | `/api/wallets` | 是 | — | `WalletDTO` (200) | 查詢當前用戶錢包（userId 來自 JWT） |
| POST | `/api/transactions/transfer` | 是 | `{"toUsername":"bob","amount":50.0}` | `ApiResponse` (200) | 轉賬（樂觀鎖 + 事務保護） |
| GET | `/api/transactions` | 是 | — | `List<TransactionDTO>` (200) | 查詢當前用戶交易歷史 |

### 管理端點（6 個，需 ROLE_ADMIN）

| 方法 | 路徑 | JWT | 請求參數 | 響應 | 說明 |
|------|------|-----|----------|------|------|
| GET | `/api/admin/users` | 是 (ADMIN) | `?search=&page=1&size=20` | `PaginatedResponse<UserDTO>` | 分頁列出所有用戶，支援模糊搜尋 |
| GET | `/api/admin/users/{id}` | 是 (ADMIN) | — | `UserDetailDTO` | 查看用戶詳情（錢包 + 最近 5 筆交易） |
| PUT | `/api/admin/users/{id}/disable` | 是 (ADMIN) | — | `ApiResponse` | 禁用用戶（role 設為 `ROLE_DISABLED`） |
| PUT | `/api/admin/users/{id}/enable` | 是 (ADMIN) | — | `ApiResponse` | 啟用用戶（role 設為 `ROLE_USER`） |
| GET | `/api/admin/transactions` | 是 (ADMIN) | `?username=&from=&to=&page=1&size=20` | `PaginatedResponse<AdminTransactionDTO>` | 分頁查看所有交易（含發送/接收用戶名） |
| GET | `/api/admin/transactions/stats` | 是 (ADMIN) | `?from=&to=` | `TransactionStatsDTO` | 交易統計（總筆數、總金額、每日交易量） |

> **Admin 用戶創建方式：** 手動在資料庫中設定 `UPDATE users SET role = 'ROLE_ADMIN' WHERE id = 1;`（Admin 不可透過公開註冊取得）。
>
> **禁用用戶處理：** `ROLE_DISABLED` 角色用戶登入時返回與密碼錯誤相同的 401 訊息，不洩漏帳號狀態。

---

## 核心實作模式

### 模式 1：專案初始化

#### pom.xml — Maven 依賴

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
	<modelVersion>4.0.0</modelVersion>
	<parent>
		<groupId>org.springframework.boot</groupId>
		<artifactId>spring-boot-starter-parent</artifactId>
		<version>3.5.14</version>
		<relativePath/>
	</parent>
	<groupId>com</groupId>
	<artifactId>digital_wallet</artifactId>
	<version>0.0.1-SNAPSHOT</version>
	<name/>
	<description/>
	<url/>
	<licenses>
		<license/>
	</licenses>
	<developers>
		<developer/>
	</developers>
	<scm>
		<connection/>
		<developerConnection/>
		<tag/>
		<url/>
	</scm>
	<properties>
		<java.version>21</java.version>
	</properties>
	<dependencies>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-validation</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-web</artifactId>
		</dependency>
	<dependency>
		<groupId>org.mybatis.spring.boot</groupId>
		<artifactId>mybatis-spring-boot-starter</artifactId>
		<version>3.0.5</version>
	</dependency>
		<dependency>
			<groupId>org.postgresql</groupId>
			<artifactId>postgresql</artifactId>
			<scope>runtime</scope>
		</dependency>
		<dependency>
			<groupId>org.projectlombok</groupId>
			<artifactId>lombok</artifactId>
			<optional>true</optional>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-test</artifactId>
			<scope>test</scope>
		</dependency>
		<dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
		<dependency>
			<groupId>org.springdoc</groupId>
			<artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
			<version>2.8.6</version>
		</dependency>
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
	</dependencies>

	<build>
		<plugins>
			<plugin>
				<groupId>org.springframework.boot</groupId>
				<artifactId>spring-boot-maven-plugin</artifactId>
				<configuration>
					<excludes>
						<exclude>
							<groupId>org.projectlombok</groupId>
							<artifactId>lombok</artifactId>
						</exclude>
					</excludes>
				</configuration>
			</plugin>
			<plugin>
				<groupId>org.apache.maven.plugins</groupId>
				<artifactId>maven-compiler-plugin</artifactId>
				<executions>
					<execution>
						<id>default-compile</id>
						<phase>compile</phase>
						<goals>
							<goal>compile</goal>
						</goals>
						<configuration>
							<annotationProcessorPaths>
								<path>
									<groupId>org.projectlombok</groupId>
									<artifactId>lombok</artifactId>
								</path>
							</annotationProcessorPaths>
						</configuration>
					</execution>
					<execution>
						<id>default-testCompile</id>
						<phase>test-compile</phase>
						<goals>
							<goal>testCompile</goal>
						</goals>
						<configuration>
							<annotationProcessorPaths>
								<path>
									<groupId>org.projectlombok</groupId>
									<artifactId>lombok</artifactId>
								</path>
							</annotationProcessorPaths>
						</configuration>
					</execution>
				</executions>
			</plugin>
		</plugins>
	</build>

</project>
```

**為什麼這樣寫：**
- `jjwt` 三件套分為 `jjwt-api`（編譯依賴）與 `jjwt-impl`、`jjwt-jackson`（runtime 依賴），因為 API 是公開介面，具體實作在執行期才需要
- Lombok 設為 `<optional>true</optional>` 並在 `spring-boot-maven-plugin` 中 exclude，避免打包進最終 JAR（Lombok 只在編譯期需要）
- `maven-compiler-plugin` 中設定 `annotationProcessorPaths` 是 Lombok 在 Java 21 下的必要配置，確保 annotation processor 正確載入
- `spring-boot-starter-web` 已內建 Jackson（JSON 序列化）與內嵌 Tomcat，不需額外添加

#### application.yaml — 完整配置

```yaml
spring:
  application:
    name: digital_wallet
  datasource:
    # 資料庫連線網址
    url: jdbc:postgresql://localhost:5433/digital_wallet?serverTimezone=UTC&useSSL=false
    # 資料庫帳號
    username: postgres
    # 資料庫密碼
    password: ${DB_PASSWORD:root}
    # 驅動程式類別名稱
    driver-class-name: org.postgresql.Driver

mybatis:
  # 設定 Mapper XML 檔案的存放路徑 (放在 resources/mapper/ 底下)
  mapper-locations: classpath:mapper/*.xml
  # 設定實體類別的套件路徑，讓 XML 中可以直接寫類別短名稱 (例如：User 代替 com.example.model.User)
  type-aliases-package: com.digital_wallet.model
  configuration:
    # 自動將資料庫的底線欄位轉為 Java 的駝峰命名 (例如：user_id -> userId)
    map-underscore-to-camel-case: true
    # 開發時開啟日誌，在控制台印出執行的 SQL 與參數
    log-impl: org.apache.ibatis.logging.stdout.StdOutImpl

jwt:
  secret: ${JWT_SECRET:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}
  expiration: 86400000 # Token 有效期為 1 天 (單位：毫秒)
```

**為什麼這樣寫：**
- `${DB_PASSWORD:root}` 是 Spring Boot 的 Property Placeholder 語法：優先讀取環境變數 `DB_PASSWORD`，不存在時 fallback 到 `root`（僅開發用途）。生產環境必須透過環境變數注入真實密碼
- `map-underscore-to-camel-case: true`：MyBatis 核心設定，自動將 DB 欄位 `user_id` 映射到 Java 屬性 `userId`，不需在每個查詢中手寫別名
- `type-aliases-package`：設定後 XML 的 `resultType="User"` 會自動解析為 `com.digital_wallet.model.entity.User`，無需寫全限定名
- `log-impl: StdOutImpl`：開發階段在控制台直接看到執行的 SQL 與參數，生產環境應移除或改為 SLF4J
- JWT secret 必須是 Base64 編碼且長度 >= 256 bits（64 個 hex 字元），否則 `Keys.hmacShaKeyFor()` 會拋出 `WeakKeyException`

#### DigitalWalletApplication.java — Spring Boot 入口

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

**為什麼這樣寫：**
- `@SpringBootApplication` 等價於 `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan` 三個註解的組合
- 放在根包 `com.digital_wallet` 下，Spring 會自動掃描該包及所有子包中的 `@Component`、`@Service`、`@Controller`、`@Configuration` 等
- `SpringApplication.run()` 啟動內嵌 Tomcat，無需部署到外部伺服器

---

### 模式 2：JWT 認證三件套

#### SecurityConfig.java — Spring Security 無狀態配置

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
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/register", "/api/auth/login").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/admin/**").hasAuthority("ROLE_ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

**為什麼這樣寫：**
- `csrf().disable()`：REST API 使用 `Authorization: Bearer <token>` Header 認證，瀏覽器不會自動附加，不存在 CSRF 攻擊面。Cookie-Session 模式才需要 CSRF 保護
- `SessionCreationPolicy.STATELESS`：伺服器不建立 HTTP Session，每個請求獨立驗證 JWT。水平擴展時任何伺服器實例都能處理請求，無需 Session 同步（Redis 等）
- `.requestMatchers("/api/admin/**").hasAuthority("ROLE_ADMIN")`：Spring Security 方法級授權，攔截所有 `/api/admin/**` 路徑，只有 JWT 中 role 為 `ROLE_ADMIN` 的用戶能訪問
- `.addFilterBefore(A, B.class)`：將 JWT 過濾器插入在 `UsernamePasswordAuthenticationFilter` **之前**。因為我們不需要表單登入（已有 `/api/auth/login`），直接用自訂 Filter 從 Header 解析 Token
- `BCryptPasswordEncoder` 作為 `@Bean` 暴露，讓 Spring 容器管理單例，其他類透過 `@RequiredArgsConstructor` 注入

#### JwtAuthenticationFilter.java — Token 攔截器

```java
package com.digital_wallet.config;

import java.io.IOException;
import java.util.Collections;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
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
            String token = authHeader.substring(7);

            if (jwtUtil.isTokenValid(token)) {
                Long userId = jwtUtil.extractUserId(token);
                String role = jwtUtil.extractRole(token);
                if (role == null) {
                    role = "ROLE_USER";
                }

                UsernamePasswordAuthenticationToken authToken =
                        new UsernamePasswordAuthenticationToken(userId, null,
                                Collections.singletonList(new SimpleGrantedAuthority(role)));

                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }

        filterChain.doFilter(request, response);
    }
}
```

**為什麼這樣寫：**
- 繼承 `OncePerRequestFilter` 而非實作 `Filter`：保證每個請求只執行一次過濾邏輯，避免在 Servlet forward/include 時重複執行
- `authHeader.substring(7)`：`"Bearer "` 長度為 7，截取後即為純 Token 字串
- `UsernamePasswordAuthenticationToken` 三個參數：
  - 第 1 參數 (principal)：`userId`，Controller 中透過 `auth.getPrincipal()` 取得
  - 第 2 參數 (credentials)：`null`，Token 已驗證，不需要密碼
  - 第 3 參數 (authorities)：`Collections.singletonList(new SimpleGrantedAuthority(role))`，從 JWT 的 role claim 提取，Spring Security 用此判斷 `hasAuthority("ROLE_ADMIN")`
- `role == null` 的 fallback：向後相容舊版 Token（不含 role claim），預設為 `ROLE_USER`
- `filterChain.doFilter()` 永遠執行：即使 Token 無效也不在此層返回 401，交給後續 Spring Security 的 `.anyRequest().authenticated()` 統一攔截

#### JwtUtil.java — Token 生成與驗證

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

@Component // 交給 Spring 管理
public class JwtUtil {

    // 從 application.yaml 讀取設定
    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration}")
    private long expiration;

    // 1. 產生 Token (將 userId 藏在 Subject 裡面)
    public String generateToken(Long userId, String username, String role) {
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("username", username)
                .claim("role", role)
                .setIssuedAt(new Date(System.currentTimeMillis()))
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // 2. 從 Token 中解析出 userId
    public Long extractUserId(String token) {
        Claims claims = extractAllClaims(token);
        return Long.parseLong(claims.getSubject());
    }

    public String extractRole(String token) {
        Claims claims = extractAllClaims(token);
        return claims.get("role", String.class);
    }

    // 3. 驗證 Token 是否合法且未過期
    public boolean isTokenValid(String token) {
        try {
            extractAllClaims(token);
            return true;
        } catch (Exception e) {
            return false; // 如果被竄改或過期，解析時會拋出例外
        }
    }

    // --- 私有輔助方法 ---
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

**為什麼這樣寫：**
- `generateToken()` 現在接受三個參數（新增 `role`）：將 role 寫入 JWT claim，讓 `JwtAuthenticationFilter` 能提取並設定 Spring Security 權限，實現 RBAC
- `setSubject(userId)`：JWT 標準中 Subject 是主體標識，放最關鍵的身分資訊（userId）。輔助資料（username、role）放 claims
- 選擇 HMAC-SHA256 (HS256) 而非 RS256：對稱加密適合單體服務或小型部署。大型微服務應使用 RS256（公私鑰），因為僅認證服務需要私鑰簽名，其他服務用公鑰驗證
- `isTokenValid()` 用 try-catch 而非檢查過期時間：`parseClaimsJws()` 會自動校驗簽名和過期時間，任何異常（`ExpiredJwtException`、`SignatureException` 等）都表示 Token 無效
- `Keys.hmacShaKeyFor()` 會自動校驗 key 長度：必須 >= 256 bits，否則拋出 `WeakKeyException`，防止使用弱密鑰

---

### 模式 3：Entity 與 DTO 分層

#### Entity — 對應資料庫欄位（三張表）

```java
// User.java — 對應 users 表
package com.digital_wallet.model.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.sql.Timestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    private Long id;
    private String username;
    private String passwordHash;
    private String role;
    private Timestamp createdAt;
}

// Wallet.java — 對應 wallets 表
package com.digital_wallet.model.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.sql.Timestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Wallet {
    private Long id;
    private Long userId;
    private String currency;
    private BigDecimal balance;
    private Long version;
    private Timestamp updatedAt;
}

// Transaction.java — 對應 transactions 表
package com.digital_wallet.model.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.sql.Timestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {
    private Long id;
    private Long fromWalletId;
    private Long toWalletId;
    private BigDecimal amount;
    private String txType;
    private String status;
    private Timestamp createdAt;
}
```

**為什麼這樣寫：**
- `@Data`：Lombok 自動生成 getter/setter/`toString()`/`equals()`/`hashCode()`，Entity 不需要手寫這些方法
- `@NoArgsConstructor` + `@AllArgsConstructor`：MyBatis 需要無參構造函數來建立物件並透過 setter 注入值；全參構造函數方便測試中快速建立物件
- `BigDecimal` 而非 `double`：金額欄位（`balance`、`amount`）對應 DB `NUMERIC(18,4)`，必須用 `BigDecimal`。`double` 是 IEEE 754 浮點數，存在精度問題（例如 `0.1 + 0.2 = 0.30000000000000004`）
- `Wallet.version` 類型為 `Long`：樂觀鎖版本號，每次更新時遞增

#### DTO — API 輸入/輸出

```java
// UserCreateDTO.java — 註冊請求
package com.digital_wallet.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserCreateDTO {
    private String username;
    private String password;
}

// UserDTO.java — 對外安全響應（不含 passwordHash）
package com.digital_wallet.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.sql.Timestamp;

/**
 * 對外安全 DTO - 不含 passwordHash
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Long id;
    private String username;
    private String role;
    private Timestamp createdAt;
}

// UserAuthDTO.java — 內部認證用（含 passwordHash，僅 Service/Mapper 層使用）
package com.digital_wallet.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 內部認證用 DTO - 包含 passwordHash，僅限 Service/Mapper 層使用
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAuthDTO {
    private Long id;
    private String username;
    private String passwordHash;
    private String role;
}

// LoginRequestDTO.java — 登錄請求
package com.digital_wallet.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequestDTO {
    private String username;
    private String password;
}

// LoginResponseDTO.java — 登錄響應
package com.digital_wallet.model.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class LoginResponseDTO {
    private String token;
    private UserDTO user;
}

// WalletDTO.java — 錢包響應
package com.digital_wallet.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.sql.Timestamp;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletDTO {
    private Long id;
    private Long userId;
    private String currency;
    private BigDecimal balance;
    private Long version;
    private Timestamp updatedAt;
}

// TransactionDTO.java — 交易響應
package com.digital_wallet.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.sql.Timestamp;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionDTO {
    private Long id;
    private Long fromWalletId;
    private Long toWalletId;
    private BigDecimal amount;
    private String txType;
    private String status;
    private Timestamp createdAt;
}

// TransferRequestDTO.java — 轉賬請求（含校驗）
package com.digital_wallet.model.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransferRequestDTO {
    private String toUsername;
    @NotNull
    private BigDecimal amount;
}

// ApiResponse.java — 通用 API 響應
package com.digital_wallet.model.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ApiResponse {
    private String status;
    private String message;

    public static ApiResponse success(String message) {
        return new ApiResponse("SUCCESS", message);
    }

    public static ApiResponse error(String message) {
        return new ApiResponse("ERROR", message);
    }
}

// PaginatedResponse.java — 通用分頁響應
package com.digital_wallet.model.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaginatedResponse<T> {
    private List<T> data;
    private int page;
    private int size;
    private long total;
}

// UserDetailDTO.java — 管理端用戶詳情
package com.digital_wallet.model.dto;

import java.sql.Timestamp;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDetailDTO {
    private Long id;
    private String username;
    private String role;
    private Timestamp createdAt;
    private WalletDTO wallet;
    private List<TransactionDTO> recentTransactions;
}

// AdminTransactionDTO.java — 管理端交易（含用戶名）
package com.digital_wallet.model.dto;

import java.math.BigDecimal;
import java.sql.Timestamp;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminTransactionDTO {
    private Long id;
    private Long fromWalletId;
    private Long toWalletId;
    private BigDecimal amount;
    private String txType;
    private String status;
    private Timestamp createdAt;
    private String fromUsername;
    private String toUsername;
}

// TransactionStatsDTO.java — 交易統計
package com.digital_wallet.model.dto;

import java.math.BigDecimal;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionStatsDTO {
    private long totalTransactions;
    private BigDecimal totalAmount;
    private List<DailyVolumeDTO> dailyVolume;
}

// DailyVolumeDTO.java — 每日交易量
package com.digital_wallet.model.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyVolumeDTO {
    private String date;
    private long count;
    private BigDecimal amount;
}
```

**DTO 分層策略詳解：**

| DTO | 方向 | 包含欄位 | 使用場景 |
|-----|------|---------|---------|
| `UserCreateDTO` | 請求 | username, password | 註冊端點接收用戶輸入 |
| `UserDTO` | 響應 | id, username, role, createdAt | 對外返回，**絕不含 passwordHash** |
| `UserAuthDTO` | 內部 | id, username, passwordHash, role | 僅 Service/Mapper 層內部傳遞認證資料 |
| `LoginRequestDTO` | 請求 | username, password | 登錄端點 |
| `LoginResponseDTO` | 響應 | token, UserDTO | 登錄成功返回 JWT + 用戶資訊 |
| `WalletDTO` | 響應 | id, userId, currency, balance, version, updatedAt | 錢包查詢 |
| `TransactionDTO` | 響應 | id, fromWalletId, toWalletId, amount, txType, status, createdAt | 個人交易歷史 |
| `TransferRequestDTO` | 請求 | toUsername, amount (@NotNull) | 轉賬請求，含 Bean Validation |
| `ApiResponse` | 響應 | status, message | 通用操作結果（註冊、轉賬、禁用等） |
| `PaginatedResponse<T>` | 響應 | data, page, size, total | 通用分頁（泛型） |
| `UserDetailDTO` | 響應 | UserDTO 欄位 + WalletDTO + recentTransactions | 管理端查看用戶詳情 |
| `AdminTransactionDTO` | 響應 | TransactionDTO 欄位 + fromUsername, toUsername | 管理端查看所有交易（含用戶名） |
| `TransactionStatsDTO` | 響應 | totalTransactions, totalAmount, dailyVolume | 管理端交易統計 |
| `DailyVolumeDTO` | 響應 | date, count, amount | 每日交易量統計 |

**為什麼分三種 User DTO：**
- `UserCreateDTO`：只包含註冊需要的欄位（username + password），role 由 Service 層固定寫入 `ROLE_USER`，不信任客戶端傳入
- `UserDTO`：對外響應，**絕對不包含 passwordHash**，防止敏感資料洩漏
- `UserAuthDTO`：內部使用，包含 passwordHash，僅限 Service/Mapper 層，Controller 層不可引用

**為什麼 `LoginResponseDTO` 用 `@Getter` 而非 `@Data`：** token 和 user 由服務端設定，客戶端只需讀取，不需要 setter。最小權限原則

**為什麼 `ApiResponse` 用靜態工廠方法：** `ApiResponse.success(msg)` / `ApiResponse.error(msg)` 比 `new ApiResponse("SUCCESS", msg)` 更語義化，減少拼寫錯誤

**為什麼 `PaginatedResponse<T>` 使用泛型：** 一份分頁結構適用於 `UserDTO`、`AdminTransactionDTO` 等不同資料類型，避免重複定義

---

### 模式 4：Controller 層

#### AuthController.java — 認證端點

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
        LoginResponseDTO response = authService.login(loginRequest.getUsername(), loginRequest.getPassword());
        return ResponseEntity.ok(response);
    }
}
```

**為什麼這樣寫：**
- `register()` 返回 `201 Created` 而非 `200 OK`：符合 REST 語義，表示資源（用戶 + 錢包）已成功建立
- `login()` 返回 `200 OK`：登錄是查詢操作，不建立新資源
- 使用 `@RequiredArgsConstructor` + `private final` 進行建構函數注入，而非 `@Autowired` 欄位注入：便於單元測試（可傳入 mock），且避免欄位注入的隱式依賴問題

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
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Long userId = (Long) auth.getPrincipal();
        WalletDTO walletDTO = walletService.getWalletByUserId(userId);
        return ResponseEntity.ok(walletDTO);
    }
}
```

**為什麼不接收路徑參數（IDOR 防護）：**
- 傳統寫法 `GET /api/wallets/{userId}` 會讓攻擊者透過修改 URL 參數查看他人錢包 -- 這是 IDOR (Insecure Direct Object Reference) 漏洞
- 正確做法：從 `SecurityContextHolder.getContext().getAuthentication().getPrincipal()` 獲取當前用戶 ID，該值來自 JWT Token（不可偽造）
- 所有 Controller 方法都不接收 `userId` 路徑參數

#### TransactionController.java — 轉賬與歷史

```java
package com.digital_wallet.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import jakarta.validation.Valid;
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
    public ResponseEntity<ApiResponse> transfer(@Valid @RequestBody TransferRequestDTO request) {
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

**為什麼 `@Valid` 放在 `TransferRequestDTO` 上：** 觸發 Bean Validation，檢查 `@NotNull` 約束（amount 不可為 null），無效請求返回 400 而非進入 Service 層

#### AdminController.java — 管理後台

```java
package com.digital_wallet.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.digital_wallet.model.dto.AdminTransactionDTO;
import com.digital_wallet.model.dto.ApiResponse;
import com.digital_wallet.model.dto.PaginatedResponse;
import com.digital_wallet.model.dto.TransactionStatsDTO;
import com.digital_wallet.model.dto.UserDTO;
import com.digital_wallet.model.dto.UserDetailDTO;
import com.digital_wallet.service.AdminService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<PaginatedResponse<UserDTO>> listUsers(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.listUsers(search, page, size));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<UserDetailDTO> getUserDetail(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getUserDetail(id));
    }

    @PutMapping("/users/{id}/disable")
    public ResponseEntity<ApiResponse> disableUser(@PathVariable Long id) {
        adminService.disableUser(id);
        return ResponseEntity.ok(ApiResponse.success("User disabled successfully"));
    }

    @PutMapping("/users/{id}/enable")
    public ResponseEntity<ApiResponse> enableUser(@PathVariable Long id) {
        adminService.enableUser(id);
        return ResponseEntity.ok(ApiResponse.success("User enabled successfully"));
    }

    @GetMapping("/transactions")
    public ResponseEntity<PaginatedResponse<AdminTransactionDTO>> listTransactions(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(adminService.listTransactions(username, from, to, page, size));
    }

    @GetMapping("/transactions/stats")
    public ResponseEntity<TransactionStatsDTO> getTransactionStats(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        return ResponseEntity.ok(adminService.getTransactionStats(from, to));
    }
}
```

**為什麼這樣寫：**
- `@RequestParam(defaultValue = "1")` 提供預設分頁值，客戶端未傳時不報錯
- 禁用/啟用用戶使用 `PUT` 而非 `POST`：這是對現有資源的部分更新，PUT 語義更準確
- `required = false` 的查詢參數（username、from、to）：可選過濾條件，不傳時顯示全部資料
- Admin 端點的授權由 `SecurityConfig` 中的 `.requestMatchers("/api/admin/**").hasAuthority("ROLE_ADMIN")` 統一控制，Controller 中不需重複檢查

---

### 模式 5：Service 層

#### Service 介面（4 個）

```java
// AuthService.java
package com.digital_wallet.service;

import com.digital_wallet.model.dto.LoginResponseDTO;
import com.digital_wallet.model.dto.UserCreateDTO;

public interface AuthService {
    void register(UserCreateDTO userCreateDTO);

    LoginResponseDTO login(String username, String password);
}

// WalletService.java
package com.digital_wallet.service;

import com.digital_wallet.model.dto.WalletDTO;

public interface WalletService {
    WalletDTO getWalletByUserId(Long userId);
}

// TransactionService.java
package com.digital_wallet.service;

import java.math.BigDecimal;
import java.util.List;

import com.digital_wallet.model.dto.TransactionDTO;

public interface TransactionService {
    void transfer(Long fromUserId, String toUsername, BigDecimal amount);

    List<TransactionDTO> getTransactionHistory(Long userId);
}

// AdminService.java
package com.digital_wallet.service;

import com.digital_wallet.model.dto.AdminTransactionDTO;
import com.digital_wallet.model.dto.PaginatedResponse;
import com.digital_wallet.model.dto.TransactionStatsDTO;
import com.digital_wallet.model.dto.UserDTO;
import com.digital_wallet.model.dto.UserDetailDTO;

public interface AdminService {
    PaginatedResponse<UserDTO> listUsers(String search, int page, int size);

    UserDetailDTO getUserDetail(Long userId);

    void disableUser(Long userId);

    void enableUser(Long userId);

    PaginatedResponse<AdminTransactionDTO> listTransactions(String username, String from, String to, int page, int size);

    TransactionStatsDTO getTransactionStats(String from, String to);
}
```

**為什麼要 Interface + Impl 分離：**
- 便於單元測試：可以 Mock 介面，無需真實資料庫
- 未來切換實作：例如 `TransactionService` 可以換成不同的支付邏輯而不影響 Controller
- Spring AOP 代理機制的基礎：`@Transactional` 需要 JDK 動態代理或 CGLIB 代理，有介面更明確

#### AuthServiceImpl.java — 註冊 + 登錄 + 禁用檢查

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

        if ("ROLE_DISABLED".equals(user.getRole())) {
            throw new AuthenticationException("Invalid username or password");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRole());

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

**為什麼這樣寫：**
- `register()` 標記 `@Transactional`：確保 `userMapper.insert()` + `walletMapper.insert()` 兩個操作要麼全部成功，要麼全部回滾。如果錢包建立失敗，用戶也不會被建立
- `DataIntegrityViolationException`：Spring 對 JDBC 約束違反（含 `UNIQUE` 約束）的統一包裝。捕獲後轉換為業務語義的 `DuplicateUsernameException`，Controller 層無需知道資料庫細節
- `userMapper.insert(user)` 執行後 `user.getId()` 自動有值：MyBatis 的 `useGeneratedKeys="true" keyProperty="id"` 會執行 JDBC `getGeneratedKeys()` 並回填到物件的 id 屬性
- 登入失敗三種情況（用戶不存在、密碼錯誤、帳號被禁用）全部返回相同錯誤訊息 `"Invalid username or password"`：防止攻擊者透過錯誤訊息差異列舉有效用戶名
- `ROLE_DISABLED` 檢查放在密碼比對之後：先檢查密碼可防止攻擊者透過時間差推測哪些帳號存在但被禁用（但實際上 BCrypt 比較本身較慢，時間差難以利用）
- `jwtUtil.generateToken()` 傳入 `user.getRole()`：將角色寫入 JWT，後續請求中 Spring Security 可據此判斷權限

#### WalletServiceImpl.java — Entity → DTO

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

**為什麼手動 Entity → DTO 轉換：** 小專案手動轉換最直接、最可控。欄位多了再引入 MapStruct 或 ModelMapper。避免使用 `BeanUtils.copyProperties()`（反射效能差且無法編譯期檢查）

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
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Transfer amount must be greater than zero");
        }

        User toUser = userMapper.findByUsername(toUsername);
        if (toUser == null) {
            throw new IllegalArgumentException("Recipient not found: " + toUsername);
        }
        Long toUserId = toUser.getId();
        if (fromUserId.equals(toUserId)) {
            throw new IllegalArgumentException("Cannot transfer to yourself");
        }

        Wallet fromWallet = walletMapper.findByUserId(fromUserId);
        if (fromWallet == null) {
            throw new WalletNotFoundException("Wallet not found for userId: " + fromUserId);
        }

        Wallet toWallet = walletMapper.findByUserId(toUserId);
        if (toWallet == null) {
            throw new WalletNotFoundException("Wallet not found for userId: " + toUserId);
        }

        if (fromWallet.getBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException(
                    "Insufficient balance: " + fromWallet.getBalance() + " < " + amount);
        }

        int deducted = walletMapper.deductBalanceWithVersion(
                fromWallet.getUserId(), amount, fromWallet.getVersion());
        if (deducted == 0) {
            throw new ConcurrentModificationException(
                    "Concurrent modification detected for userId: " + fromUserId);
        }

        walletMapper.addBalance(toWallet.getUserId(), amount);

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
                .map(this::toTransactionDTO)
                .collect(Collectors.toList());
    }

    private TransactionDTO toTransactionDTO(Transaction tx) {
        return TransactionDTO.builder()
                .id(tx.getId())
                .fromWalletId(tx.getFromWalletId())
                .toWalletId(tx.getToWalletId())
                .amount(tx.getAmount())
                .txType(tx.getTxType())
                .status(tx.getStatus())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
```

**為什麼這樣寫：**
- `@Transactional` 放在 `transfer()` 上：確保扣款、加款、記錄交易三個資料庫操作在同一事務中。任何一個失敗（包括拋出 RuntimeException），全部回滾
- **快速失敗（Fail-Fast）模式**：在校驗階段就把所有可能失敗的條件檢查完（amount <= 0、用戶不存在、自己轉自己、錢包不存在、餘額不足），檢查通過後才執行實際寫入操作。這樣可以在事務早期就發現問題，避免不必要的事務開啟
- 樂觀鎖核心邏輯：
  1. 讀取錢包時取得 `version`（例如 version=5）
  2. `deductBalanceWithVersion()` 執行 `UPDATE ... WHERE user_id=? AND version=5`
  3. 如果另一筆併發交易已更新該錢包，version 變為 6
  4. `WHERE version=5` 不匹配任何行 → `deducted=0`
  5. 拋出 `ConcurrentModificationException` → 事務回滾 → 前後端提示用戶重試
- `BigDecimal.compareTo()` 而非 `>` `<`：`BigDecimal` 不能用運算子比較
- 收款方使用 `addBalance()`（不加 `version` 條件）：收款方不需要樂觀鎖保護，因為不存在餘額不足的衝突。但仍遞增 version 保持一致性

#### AdminServiceImpl.java — 管理業務邏輯

```java
package com.digital_wallet.service.impl;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.digital_wallet.exception.WalletNotFoundException;
import com.digital_wallet.mapper.TransactionMapper;
import com.digital_wallet.mapper.UserMapper;
import com.digital_wallet.mapper.WalletMapper;
import com.digital_wallet.model.dto.AdminTransactionDTO;
import com.digital_wallet.model.dto.PaginatedResponse;
import com.digital_wallet.model.dto.TransactionDTO;
import com.digital_wallet.model.dto.TransactionStatsDTO;
import com.digital_wallet.model.dto.UserDTO;
import com.digital_wallet.model.dto.UserDetailDTO;
import com.digital_wallet.model.dto.WalletDTO;
import com.digital_wallet.model.entity.Transaction;
import com.digital_wallet.model.entity.User;
import com.digital_wallet.model.entity.Wallet;
import com.digital_wallet.service.AdminService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminServiceImpl implements AdminService {

    private final UserMapper userMapper;
    private final WalletMapper walletMapper;
    private final TransactionMapper transactionMapper;

    private static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd");

    @Override
    public PaginatedResponse<UserDTO> listUsers(String search, int page, int size) {
        if (page < 1) page = 1;
        if (size < 1) size = 20;
        if (size > 100) size = 100;

        int offset = (page - 1) * size;

        List<User> users = userMapper.findAllWithPagination(search, offset, size);
        int total = userMapper.countAll(search);

        List<UserDTO> userDTOs = users.stream()
                .map(u -> UserDTO.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .role(u.getRole())
                        .createdAt(u.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return PaginatedResponse.<UserDTO>builder()
                .data(userDTOs)
                .page(page)
                .size(size)
                .total(total)
                .build();
    }

    @Override
    public UserDetailDTO getUserDetail(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new WalletNotFoundException("User not found: " + userId);
        }

        Wallet wallet = walletMapper.findByUserId(userId);
        List<Transaction> recentTxns = transactionMapper.findRecentByWalletId(
                wallet != null ? wallet.getId() : null, 5);

        List<TransactionDTO> txnDTOs = recentTxns.stream()
                .map(t -> TransactionDTO.builder()
                        .id(t.getId())
                        .fromWalletId(t.getFromWalletId())
                        .toWalletId(t.getToWalletId())
                        .amount(t.getAmount())
                        .txType(t.getTxType())
                        .status(t.getStatus())
                        .createdAt(t.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        WalletDTO walletDTO = wallet != null ? WalletDTO.builder()
                .id(wallet.getId())
                .userId(wallet.getUserId())
                .currency(wallet.getCurrency())
                .balance(wallet.getBalance())
                .version(wallet.getVersion())
                .updatedAt(wallet.getUpdatedAt())
                .build() : null;

        return UserDetailDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .wallet(walletDTO)
                .recentTransactions(txnDTOs)
                .build();
    }

    @Override
    public void disableUser(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new WalletNotFoundException("User not found: " + userId);
        }
        userMapper.updateRole(userId, "ROLE_DISABLED");
    }

    @Override
    public void enableUser(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new WalletNotFoundException("User not found: " + userId);
        }
        userMapper.updateRole(userId, "ROLE_USER");
    }

    @Override
    public PaginatedResponse<AdminTransactionDTO> listTransactions(String username, String from, String to, int page, int size) {
        if (page < 1) page = 1;
        if (size < 1) size = 20;
        if (size > 100) size = 100;

        int offset = (page - 1) * size;

        Date fromDate = parseDate(from);
        Date toDate = parseDate(to);
        if (toDate == null && fromDate == null) {
            Calendar cal = Calendar.getInstance();
            toDate = cal.getTime();
            cal.add(Calendar.DAY_OF_MONTH, -30);
            fromDate = cal.getTime();
        }

        List<AdminTransactionDTO> txns = transactionMapper.findAllWithFilters(username, fromDate, toDate, offset, size);
        int total = transactionMapper.countAllWithFilters(username, fromDate, toDate);

        return PaginatedResponse.<AdminTransactionDTO>builder()
                .data(txns)
                .page(page)
                .size(size)
                .total(total)
                .build();
    }

    @Override
    public TransactionStatsDTO getTransactionStats(String from, String to) {
        Date fromDate = parseDate(from);
        Date toDate = parseDate(to);
        if (toDate == null && fromDate == null) {
            Calendar cal = Calendar.getInstance();
            toDate = cal.getTime();
            cal.add(Calendar.DAY_OF_MONTH, -30);
            fromDate = cal.getTime();
        }

        long totalCount = transactionMapper.getTransactionCount();
        BigDecimal totalAmount = transactionMapper.getTransactionTotalAmount();
        if (totalAmount == null) totalAmount = BigDecimal.ZERO;

        return TransactionStatsDTO.builder()
                .totalTransactions(totalCount)
                .totalAmount(totalAmount)
                .dailyVolume(transactionMapper.getDailyVolume(fromDate, toDate))
                .build();
    }

    private Date parseDate(String dateStr) {
        if (dateStr == null || dateStr.isEmpty()) {
            return null;
        }
        try {
            return DATE_FORMAT.parse(dateStr);
        } catch (Exception e) {
            return null;
        }
    }
}
```

**為什麼這樣寫：**
- 分頁安全限制 `if (size > 100) size = 100`：防止攻擊者傳入 `size=999999` 導致資料庫查詢過大
- 日期預設範圍（最近 30 天）：當 `from` 和 `to` 都未提供時，自動限縮查詢範圍，避免全表掃描
- `disableUser()` 和 `enableUser()` 先檢查用戶是否存在再更新：防止對不存在用戶的無效更新，返回明確錯誤訊息
- `getUserDetail()` 只取最近 5 筆交易（`LIMIT 5`）：避免用戶詳情頁面載入過多交易記錄導致效能問題
- `parseDate()` 回傳 `null` 而非拋出例外：日期格式錯誤時忽略而非中斷請求，MyBatis XML 中的 `<if test="fromDate != null">` 會跳過該過濾條件

---

### 模式 6：MyBatis Mapper（Java 介面 + XML SQL）

#### UserMapper.java + UserMapper.xml

```java
// UserMapper.java
package com.digital_wallet.mapper;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.digital_wallet.model.entity.User;

@Mapper
public interface UserMapper {
    int insert(User user);

    User findByUsername(String username);

    User findById(@Param("id") Long id);

    List<User> findAllWithPagination(@Param("search") String search, @Param("offset") int offset, @Param("limit") int limit);

    int countAll(@Param("search") String search);

    int updateRole(@Param("id") Long id, @Param("role") String role);
}
```

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
        PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">

<mapper namespace="com.digital_wallet.mapper.UserMapper">

    <insert id="insert" useGeneratedKeys="true" keyProperty="id" keyColumn="id">
        INSERT INTO users(username, password_hash, role)
        VALUES(#{username}, #{passwordHash}, #{role})
    </insert>

    <select id="findByUsername" resultType="User">
        SELECT * FROM users
        WHERE username = #{username}
    </select>

    <select id="findById" resultType="User">
        SELECT * FROM users WHERE id = #{id}
    </select>

    <select id="findAllWithPagination" resultType="User">
        SELECT id, username, role, created_at
        FROM users
        <where>
            <if test="search != null and search != ''">
                username ILIKE '%' || #{search} || '%'
            </if>
        </where>
        ORDER BY id
        LIMIT #{limit} OFFSET #{offset}
    </select>

    <select id="countAll" resultType="int">
        SELECT COUNT(*)
        FROM users
        <where>
            <if test="search != null and search != ''">
                username ILIKE '%' || #{search} || '%'
            </if>
        </where>
    </select>

    <update id="updateRole">
        UPDATE users SET role = #{role} WHERE id = #{id}
    </update>

</mapper>
```

**為什麼這樣寫：**
- `<where>` 標籤：MyBatis 動態 SQL 標籤，自動處理 `WHERE` 關鍵字。如果內部條件全部為 false，則不輸出 `WHERE`；如果第一個條件為 true，自動移除多餘的 `AND`/`OR`
- `findAllWithPagination` 使用 `SELECT id, username, role, created_at` 而非 `SELECT *`：刻意不查詢 `password_hash`，即使是管理端也不需要看到密碼雜湊
- `ILIKE`：PostgreSQL 不區分大小寫的 LIKE，比 `LOWER(username) LIKE` 更高效
- `<if test="search != null and search != ''">`：空字串與 null 分別檢查，防止 `search=""` 時產生無效的 `ILIKE '%%'`

#### WalletMapper.java + WalletMapper.xml

```java
// WalletMapper.java
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
```

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
        PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">

<mapper namespace="com.digital_wallet.mapper.WalletMapper">

    <insert id="insert" useGeneratedKeys="true" keyProperty="id" keyColumn="id">
        INSERT INTO wallets(user_id, currency, balance, version)
        VALUES(#{userId}, #{currency}, #{balance}, #{version})
    </insert>

    <select id="findByUserId" resultType="Wallet">
        SELECT * FROM wallets
        WHERE user_id = #{userId}
    </select>

    <update id="deductBalanceWithVersion">
        UPDATE wallets
        SET balance = balance - #{amount},
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = #{userId}
          AND version = #{version}
    </update>

    <update id="addBalance">
        UPDATE wallets
        SET balance = balance + #{amount},
            version = version + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = #{userId}
    </update>

</mapper>
```

**為什麼這樣寫：**
- `deductBalanceWithVersion` 的 WHERE 條件包含 `version = #{version}`：樂觀鎖的關鍵。只有當 version 與讀取時一致才執行更新
- 返回值 `int` 是 JDBC 的 affected rows 數量：1 表示成功，0 表示 version 已變（衝突）
- `addBalance` 不檢查 version：收款方不存在餘額不足衝突，但仍遞增 version 以保持一致性
- `balance = balance - #{amount}` 在 SQL 層計算：避免 Java 層計算後寫入的 race condition。如果先讀取 balance 到 Java 再計算，兩次併發請求可能讀到相同的舊值
- `@Param` 的使用：當方法有多個參數時必須用 `@Param`，MyBatis 才知道 `#{userId}` 對應哪個參數。單一參數不需要

#### TransactionMapper.java + TransactionMapper.xml

```java
// TransactionMapper.java
package com.digital_wallet.mapper;

import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.digital_wallet.model.dto.AdminTransactionDTO;
import com.digital_wallet.model.dto.DailyVolumeDTO;
import com.digital_wallet.model.entity.Transaction;

@Mapper
public interface TransactionMapper {
    int insert(Transaction transaction);

    List<Transaction> findByWalletId(Long walletId);

    List<AdminTransactionDTO> findAllWithFilters(@Param("username") String username, @Param("fromDate") Date fromDate, @Param("toDate") Date toDate, @Param("offset") int offset, @Param("limit") int limit);

    int countAllWithFilters(@Param("username") String username, @Param("fromDate") Date fromDate, @Param("toDate") Date toDate);

    List<Transaction> findRecentByWalletId(@Param("walletId") Long walletId, @Param("limit") int limit);

    long getTransactionCount();

    BigDecimal getTransactionTotalAmount();

    List<DailyVolumeDTO> getDailyVolume(@Param("fromDate") Date fromDate, @Param("toDate") Date toDate);
}
```

```xml
<?xml version="1.0" encoding="UTF-8" ?>
<!DOCTYPE mapper
        PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">

<mapper namespace="com.digital_wallet.mapper.TransactionMapper">

    <resultMap id="adminTransactionMap" type="com.digital_wallet.model.dto.AdminTransactionDTO">
        <id property="id" column="id"/>
        <result property="fromWalletId" column="from_wallet_id"/>
        <result property="toWalletId" column="to_wallet_id"/>
        <result property="amount" column="amount"/>
        <result property="txType" column="tx_type"/>
        <result property="status" column="status"/>
        <result property="createdAt" column="created_at"/>
        <result property="fromUsername" column="from_username"/>
        <result property="toUsername" column="to_username"/>
    </resultMap>

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

    <select id="findAllWithFilters" resultMap="adminTransactionMap">
        SELECT t.id, t.from_wallet_id, t.to_wallet_id, t.amount,
               t.tx_type, t.status, t.created_at,
               fu.username AS from_username, tu.username AS to_username
        FROM transactions t
        LEFT JOIN wallets fw ON t.from_wallet_id = fw.id
        LEFT JOIN users fu ON fw.user_id = fu.id
        LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
        LEFT JOIN users tu ON tw.user_id = tu.id
        <where>
            <if test="username != null and username != ''">
                (fu.username ILIKE '%' || #{username} || '%'
                 OR tu.username ILIKE '%' || #{username} || '%')
            </if>
            <if test="fromDate != null">
                AND t.created_at &gt;= #{fromDate}
            </if>
            <if test="toDate != null">
                AND t.created_at &lt; #{toDate}::date + INTERVAL '1 day'
            </if>
        </where>
        ORDER BY t.created_at DESC
        LIMIT #{limit} OFFSET #{offset}
    </select>

    <select id="countAllWithFilters" resultType="int">
        SELECT COUNT(*)
        FROM transactions t
        LEFT JOIN wallets fw ON t.from_wallet_id = fw.id
        LEFT JOIN users fu ON fw.user_id = fu.id
        LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
        LEFT JOIN users tu ON tw.user_id = tu.id
        <where>
            <if test="username != null and username != ''">
                (fu.username ILIKE '%' || #{username} || '%'
                 OR tu.username ILIKE '%' || #{username} || '%')
            </if>
            <if test="fromDate != null">
                AND t.created_at &gt;= #{fromDate}
            </if>
            <if test="toDate != null">
                AND t.created_at &lt; #{toDate}::date + INTERVAL '1 day'
            </if>
        </where>
    </select>

    <select id="findRecentByWalletId" resultType="Transaction">
        SELECT * FROM transactions
        WHERE from_wallet_id = #{walletId}
           OR to_wallet_id = #{walletId}
        ORDER BY created_at DESC
        LIMIT #{limit}
    </select>

    <select id="getTransactionCount" resultType="long">
        SELECT COUNT(*) FROM transactions
    </select>

    <select id="getTransactionTotalAmount" resultType="java.math.BigDecimal">
        SELECT COALESCE(SUM(amount), 0) FROM transactions
    </select>

    <select id="getDailyVolume" resultType="com.digital_wallet.model.dto.DailyVolumeDTO">
        SELECT DATE(created_at) AS date,
               COUNT(*)::bigint AS count,
               COALESCE(SUM(amount), 0) AS amount
        FROM transactions
        WHERE created_at &gt;= #{fromDate}
          AND created_at &lt; #{toDate}::date + INTERVAL '1 day'
        GROUP BY DATE(created_at)
        ORDER BY date
    </select>

</mapper>
```

**為什麼這樣寫：**
- `resultMap` 用於 `AdminTransactionDTO`：因為 JOIN 查詢的結果欄位（`from_username`、`to_username`）不在 `Transaction` Entity 中，需要明確的欄位映射。`resultMap` 不如 `resultType` 方便（需要手寫每個欄位對應），但提供更大的靈活性
- `LEFT JOIN` 而非 `INNER JOIN`：`from_wallet_id` 可能為 null（例如系統充值），使用 `LEFT JOIN` 確保這些交易仍能查詢到
- `COALESCE(SUM(amount), 0)`：當沒有交易記錄時 `SUM()` 返回 null，`COALESCE` 轉為 0
- `#{toDate}::date + INTERVAL '1 day'`：將日期字串轉為 PostgreSQL date 類型後加一天，使查詢範圍包含 `toDate` 當天的所有記錄（因為 `<` 不包含等於）
- `&gt;` / `&lt;`：XML 中 `<` 和 `>` 是保留字元，必須使用 XML entity 轉義
- `COUNT(*)::bigint`：PostgreSQL 中 `COUNT()` 返回 `bigint`，顯式轉型確保 MyBatis 正確映射到 Java `long`
- `resultType="java.math.BigDecimal"` 用全限定名而非別名：`BigDecimal` 不在 `type-aliases-package` 設定的包中（它在 `java.math` 包），需要全限定名

---

### 模式 7：Exception + GlobalExceptionHandler

#### 五個自定義異常

```java
// AuthenticationException.java — 401
package com.digital_wallet.exception;

public class AuthenticationException extends RuntimeException {
    public AuthenticationException(String message) {
        super(message);
    }
}

// ConcurrentModificationException.java — 409
package com.digital_wallet.exception;

public class ConcurrentModificationException extends RuntimeException {
    public ConcurrentModificationException(String message) {
        super(message);
    }
}

// DuplicateUsernameException.java — 409
package com.digital_wallet.exception;

public class DuplicateUsernameException extends RuntimeException {
    public DuplicateUsernameException(String message) {
        super(message);
    }
}

// InsufficientBalanceException.java — 400
package com.digital_wallet.exception;

public class InsufficientBalanceException extends RuntimeException {
    public InsufficientBalanceException(String message) {
        super(message);
    }
}

// WalletNotFoundException.java — 404
package com.digital_wallet.exception;

public class WalletNotFoundException extends RuntimeException {
    public WalletNotFoundException(String message) {
        super(message);
    }
}
```

**為什麼全部繼承 `RuntimeException` 而非 `Exception`：**
- Spring 的 `@Transactional` 預設只在拋出 `RuntimeException`（及其子類）時回滾事務。Checked Exception 預設不回滾，需要額外配置 `@Transactional(rollbackFor = Exception.class)`
- Checked Exception 需要在方法簽名宣告 `throws` 或到處 try-catch，增加程式碼噪音。業務異常（如餘額不足）不應該強迫呼叫方處理
- Java 生態系統的最佳實踐：業務邏輯異常用 unchecked exception + 全域 exception handler 統一處理

#### GlobalExceptionHandler.java — 8 種異常映射

```java
package com.digital_wallet.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.digital_wallet.exception.AuthenticationException;
import com.digital_wallet.exception.ConcurrentModificationException;
import com.digital_wallet.exception.DuplicateUsernameException;
import com.digital_wallet.exception.InsufficientBalanceException;
import com.digital_wallet.exception.WalletNotFoundException;
import com.digital_wallet.model.dto.ApiResponse;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

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

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ApiResponse> handleAccessDenied(org.springframework.security.access.AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiResponse.error("Access denied"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse> handleGeneric(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Internal server error"));
    }
}
```

**為什麼這樣寫：**
- Spring 的異常匹配順序：先找最具體的 handler（如 `InsufficientBalanceException`），找不到才 fallback 到更通用的（`Exception.class`）。順序由 Spring 內部決定，與方法宣告順序無關
- `handleIllegalArgument`：捕獲 Java 標準異常 `IllegalArgumentException`，統一返回 400。用於 Service 層的快速失敗校驗（如 amount <= 0、收款用戶不存在等）
- `handleAccessDenied`：捕獲 Spring Security 的 `AccessDeniedException`。當非 Admin 用戶訪問 `/api/admin/**` 時，Spring Security 會在 Filter 層拋出此異常，被 `@RestControllerAdvice` 捕獲後返回 403（而非 401，因為用戶已認證但無權限）
- `handleGeneric` 加了 `log.error("Unhandled exception", ex)`：未預期的異常需要記錄完整 stack trace 以便除錯，但不暴露給客戶端（只返回 "Internal server error"）
- `@RestControllerAdvice` = `@ControllerAdvice` + `@ResponseBody`：確保返回值自動序列化為 JSON

**HTTP 狀態碼對應表：**

| 異常 | HTTP 狀態碼 | 原因 |
|------|------------|------|
| `AuthenticationException` | 401 Unauthorized | 認證失敗（用戶不存在、密碼錯誤、帳號禁用） |
| `InsufficientBalanceException` | 400 Bad Request | 轉賬金額超過餘額 |
| `IllegalArgumentException` | 400 Bad Request | 非法參數（amount <= 0、自己轉自己、收款人不存在） |
| `WalletNotFoundException` | 404 Not Found | 錢包或用戶不存在 |
| `DuplicateUsernameException` | 409 Conflict | 用戶名已被註冊 |
| `ConcurrentModificationException` | 409 Conflict | 樂觀鎖版本衝突，需重試 |
| `AccessDeniedException` | 403 Forbidden | 用戶已認證但無權限訪問（如非 Admin 訪問管理端點） |
| `Exception` (fallback) | 500 Internal Server Error | 未預期的伺服器錯誤 |

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

**為什麼這樣寫：**
- `SecurityScheme.Type.HTTP` + `scheme("bearer")`：定義 HTTP Bearer Token 認證方案，Swagger UI 會據此顯示 "Authorize" 按鈕
- `addSecurityItem(new SecurityRequirement().addList("Bearer"))`：將 Bearer Token 設定為全域安全需求，所有端點都會顯示鎖頭圖示
- `bearerFormat("JWT")`：僅供 Swagger UI 顯示用，不影響實際認證行為。提示用戶應輸入 JWT 格式的 Token
- 此配置僅影響 Swagger UI 顯示，不影響 Spring Security 的實際認證邏輯（由 `SecurityConfig` 和 `JwtAuthenticationFilter` 控制）

---

### 模式 9：Docker 容器化

#### Dockerfile — 多階段構建

```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN chmod +x mvnw && ./mvnw dependency:resolve -q
COPY src src
RUN ./mvnw package -DskipTests -q

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**為什麼這樣寫：**
- **多階段構建**：第一階段用 JDK 21（含 javac、Maven）編譯原始碼；第二階段只用 JRE 21（僅含執行環境，不含編譯工具）。最終 Image 體積大幅減少（不含 JDK、Maven cache、原始碼）
- `COPY mvnw pom.xml ./` 和 `dependency:resolve` 在 `COPY src src` 之前：利用 Docker layer cache。只要 `pom.xml` 不變，Maven 依賴就不會重新下載，大幅加速重複構建
- `-DskipTests -q`：跳過測試（假設 CI 流程中已執行過測試）並使用 quiet 模式減少日誌輸出
- `ENTRYPOINT` 而非 `CMD`：`ENTRYPOINT` 定義容器的主要執行檔，`CMD` 定義預設參數。使用 `ENTRYPOINT` 確保容器始終以 `java -jar` 啟動

#### docker-compose.yml — 一鍵啟動

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
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
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
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/digital_wallet
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: root
      JWT_SECRET: "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata:
```

**為什麼這樣寫：**
- 埠映射 `5433:5432`：主機用 5433（避免與本機 PostgreSQL 衝突），容器內部用 5432。app 容器與 postgres 容器在同一個 Docker network，app 連線用容器內部埠 `5432`
- `depends_on` + `condition: service_healthy`：僅 `depends_on` 不足夠（只等待容器啟動，不等服務就緒）。加上 `healthcheck` 條件確保 PostgreSQL 完全接受連線後才啟動 app
- `healthcheck` 使用 `pg_isready`：PostgreSQL 官方提供的輕量級就緒檢查工具，比 `pg_isready` 更可靠
- `volumes: pgdata`：即使容器被刪除（`docker-compose down`），資料庫檔案仍保留在 Docker volume 中。使用 `docker-compose down -v` 才會完全清除
- 環境變數直接覆蓋 `application.yaml` 中的值：Spring Boot 的 `SPRING_DATASOURCE_URL` 環境變數優先級高於 `application.yaml`

---

## 資料庫表結構

來自 `src/main/resources/static/db.sql`：

```sql
CREATE DATABASE digital_wallet;
\c digital_wallet


-- 1. 用戶表
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ROLE_USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 錢包表
CREATE TABLE wallets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    currency VARCHAR(10) NOT NULL DEFAULT 'USDT',
    balance NUMERIC(18,4) NOT NULL DEFAULT 0.0000,
    version INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. 交易紀錄表
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    from_wallet_id BIGINT NULL,
    to_wallet_id BIGINT NULL,
    amount NUMERIC(18,4) NOT NULL,
    tx_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引以優化查詢速度
CREATE INDEX idx_transactions_from ON transactions(from_wallet_id);
CREATE INDEX idx_transactions_to ON transactions(to_wallet_id);
```

**設計說明：**
- `users.role`：使用 `VARCHAR(20)` 儲存 Spring Security 角色格式（`ROLE_USER`、`ROLE_ADMIN`、`ROLE_DISABLED`），而非 ENUM。VARCHAR 更靈活，可直接用 SQL 新增角色
- `wallets.version`：樂觀鎖版本號。類型 `INT` 足夠（非高頻更新的場景），從 `0` 開始，每次更新遞增
- `wallets.balance NUMERIC(18,4)`：18 位總精度，4 位小數。精確度取決於業務需求（例如 USDT 多為 2 位小數，但保留更多精度以備擴展）
- `transactions.from_wallet_id NULL`：系統充值（如初始資金注入）時 `from_wallet_id` 為 NULL
- `ON DELETE CASCADE`：刪除用戶時自動刪除關聯錢包
- 兩個索引（`idx_transactions_from`、`idx_transactions_to`）：加速交易歷史查詢（`WHERE from_wallet_id=? OR to_wallet_id=?`）

---

## 數據流圖

### 1. 用戶註冊

```
POST /api/auth/register  { username, password }
  → AuthController.register(UserCreateDTO)
  → AuthServiceImpl.register(UserCreateDTO) ← @Transactional
    ├── passwordEncoder.encode(password)                   // BCrypt 雜湊（自動加鹽）
    ├── userMapper.insert(User)                           // INSERT INTO users → user.id 自動回填
    │     └── catch DataIntegrityViolationException → DuplicateUsernameException → 409
    ├── walletMapper.insert(Wallet)                       // INSERT INTO wallets (user_id, currency='USDT', balance=0, version=0)
    └── return
  → 201 { "status": "SUCCESS", "message": "User registered successfully" }
```

### 2. 用戶登錄

```
POST /api/auth/login  { username, password }
  → AuthController.login(LoginRequestDTO)
  → AuthServiceImpl.login(username, password)
    ├── userMapper.findByUsername(username)                // SELECT * FROM users WHERE username=?
    │     └── null → AuthenticationException → 401 "Invalid username or password"
    ├── passwordEncoder.matches(password, hash)           // BCrypt 比對（自動解析鹽值）
    │     └── false → AuthenticationException → 401 "Invalid username or password"
    ├── "ROLE_DISABLED".equals(user.getRole())?           // 檢查是否被禁用
    │     └── true → AuthenticationException → 401 "Invalid username or password"
    ├── jwtUtil.generateToken(userId, username, role)     // HMAC-SHA256 簽名，含 role claim
    └── return LoginResponseDTO(token, UserDTO)
  → 200 { "token": "eyJ...", "user": { "id": 1, "username": "alice", "role": "ROLE_USER", ... } }
```

### 3. JWT 請求攔截

```
Request: Authorization: Bearer eyJ...
  → JwtAuthenticationFilter.doFilterInternal()
    ├── 提取 Header → substring(7) → token
    ├── jwtUtil.isTokenValid(token)                       // 檢查簽名 + 過期時間
    │     └── false → 不設置 Authentication → Spring Security 攔截 → 401
    ├── jwtUtil.extractUserId(token)                      // 從 payload 解析 userId
    ├── jwtUtil.extractRole(token)                        // 從 payload 解析 role
    │     └── null → fallback "ROLE_USER"
    ├── new UsernamePasswordAuthenticationToken(userId, null, [SimpleGrantedAuthority(role)])
    ├── SecurityContextHolder.getContext().setAuthentication(authToken)
    └── filterChain.doFilter() → SecurityFilterChain 授權檢查
          ├── /api/admin/** → hasAuthority("ROLE_ADMIN")?
          │     └── false → AccessDeniedException → 403
          └── anyRequest() → authenticated() → OK → Controller
```

### 4. 查詢錢包

```
GET /api/wallets  [JWT: userId=1]
  → WalletController.getWallet()
    ├── SecurityContextHolder.getContext().getAuthentication()
    │     └── auth.getPrincipal() → userId=1
    └── WalletServiceImpl.getWalletByUserId(1)
          ├── walletMapper.findByUserId(1)                // SELECT * FROM wallets WHERE user_id=1
          │     └── null → WalletNotFoundException → 404
          ├── Entity → WalletDTO (Builder)
          └── return
  → 200 WalletDTO { id: 1, userId: 1, currency: "USDT", balance: 100.5000, version: 3, ... }
```

### 5. 轉賬（核心流程，含 @Transactional + 樂觀鎖）

```
POST /api/transactions/transfer  { toUsername: "bob", amount: 50.00 }  [JWT: userId=1]
  → TransactionController.transfer() ← @Valid
    ├── auth.getPrincipal() → fromUserId=1
    └── TransactionServiceImpl.transfer(1, "bob", 50.00) ← @Transactional
          ├── amount.compareTo(ZERO) <= 0? → NO (50 > 0，通過)
          ├── toUser = userMapper.findByUsername("bob")     // 根據用戶名查找收款人
          │     └── null → IllegalArgumentException → 400
          ├── fromUserId == toUser.getId()? → NO (1 != 2，通過)
          ├── fromWallet = walletMapper.findByUserId(1)     // SELECT * FROM wallets WHERE user_id=1
          │     └── null → WalletNotFoundException → 404
          ├── toWallet = walletMapper.findByUserId(2)       // SELECT * FROM wallets WHERE user_id=2
          │     └── null → WalletNotFoundException → 404
          ├── fromWallet.balance < amount? → NO (100 >= 50，通過)
          ├── deducted = walletMapper.deductBalanceWithVersion(1, 50.00, version=3)
          │     SQL: UPDATE wallets SET balance=balance-50, version=4, updated_at=CURRENT_TIMESTAMP
          │          WHERE user_id=1 AND version=3
          │     → affected rows = 1 (扣款成功)
          │     → affected rows = 0 (version 已變) → ConcurrentModificationException → 409（事務回滾）
          ├── walletMapper.addBalance(2, 50.00)             // UPDATE wallets SET balance=balance+50, version=version+1 WHERE user_id=2
          ├── transactionMapper.insert(Transaction)          // INSERT INTO transactions (from_wallet_id, to_wallet_id, amount, tx_type, status)
          └── COMMIT（全部成功）
  → 200 { "status": "SUCCESS", "message": "Transfer completed successfully" }
```

### 6. 交易歷史

```
GET /api/transactions  [JWT: userId=1]
  → TransactionController.getTransactionHistory()
    ├── auth.getPrincipal() → userId=1
    └── TransactionServiceImpl.getTransactionHistory(1)
          ├── walletMapper.findByUserId(1)                  // 取得 wallet.id
          │     └── null → WalletNotFoundException → 404
          ├── transactionMapper.findByWalletId(wallet.id)   // WHERE from_wallet_id=? OR to_wallet_id=?
          ├── stream().map(Entity → TransactionDTO).toList()
          └── return
  → 200 [TransactionDTO, ...]
```

### 7. Admin 用戶管理（列出用戶、查看詳情、禁用/啟用）

```
GET /api/admin/users?search=&page=1&size=20  [JWT: userId=1, role=ROLE_ADMIN]
  → JwtAuthenticationFilter → role=ROLE_ADMIN → hasAuthority("ROLE_ADMIN")? → YES
  → AdminController.listUsers(search, page, size)
    └── AdminServiceImpl.listUsers(search, page, size)
          ├── if page<1 → page=1; if size>100 → size=100
          ├── offset = (page-1) * size
          ├── userMapper.findAllWithPagination(search, offset, size)
          │     SQL: SELECT id, username, role, created_at FROM users
          │          WHERE username ILIKE '%search%' ORDER BY id LIMIT 20 OFFSET 0
          ├── userMapper.countAll(search)                   // 總筆數（計算總頁數用）
          ├── stream().map(User → UserDTO).toList()
          └── return PaginatedResponse<UserDTO>
  → 200 { "data": [...], "page": 1, "size": 20, "total": 150 }

GET /api/admin/users/5  [JWT: role=ROLE_ADMIN]
  → AdminController.getUserDetail(5)
    └── AdminServiceImpl.getUserDetail(5)
          ├── userMapper.findById(5)                        // SELECT * FROM users WHERE id=5
          │     └── null → WalletNotFoundException → 404
          ├── walletMapper.findByUserId(5)                  // 取得錢包
          ├── transactionMapper.findRecentByWalletId(wallet.id, 5)  // 最近 5 筆交易
          ├── Entity → DTO 轉換
          └── return UserDetailDTO (User + WalletDTO + 5 TransactionDTOs)
  → 200 { "id": 5, "username": "bob", "role": "ROLE_USER", "wallet": {...}, "recentTransactions": [...] }

PUT /api/admin/users/5/disable  [JWT: role=ROLE_ADMIN]
  → AdminController.disableUser(5)
    └── AdminServiceImpl.disableUser(5)
          ├── userMapper.findById(5)                        // 確認存在
          │     └── null → WalletNotFoundException → 404
          ├── userMapper.updateRole(5, "ROLE_DISABLED")     // UPDATE users SET role='ROLE_DISABLED' WHERE id=5
          └── return
  → 200 { "status": "SUCCESS", "message": "User disabled successfully" }
```

### 8. Admin 交易監控（列出所有交易、統計數據）

```
GET /api/admin/transactions?username=alice&from=2026-01-01&to=2026-06-03&page=1&size=20  [JWT: role=ROLE_ADMIN]
  → AdminController.listTransactions(username, from, to, page, size)
    └── AdminServiceImpl.listTransactions(...)
          ├── parseDate("2026-01-01") → Date fromDate
          ├── parseDate("2026-06-03") → Date toDate
          ├── transactionMapper.findAllWithFilters(username, fromDate, toDate, offset, size)
          │     SQL: SELECT t.*, fu.username AS from_username, tu.username AS to_username
          │          FROM transactions t
          │          LEFT JOIN wallets fw ON t.from_wallet_id = fw.id
          │          LEFT JOIN users fu ON fw.user_id = fu.id
          │          LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
          │          LEFT JOIN users tu ON tw.user_id = tu.id
          │          WHERE (fu.username ILIKE '%alice%' OR tu.username ILIKE '%alice%')
          │            AND t.created_at >= '2026-01-01'
          │            AND t.created_at < '2026-06-04'
          │          ORDER BY t.created_at DESC LIMIT 20 OFFSET 0
          ├── transactionMapper.countAllWithFilters(...)     // 總筆數
          └── return PaginatedResponse<AdminTransactionDTO>
  → 200 { "data": [...], "page": 1, "size": 20, "total": 42 }

GET /api/admin/transactions/stats?from=2026-05-01&to=2026-06-03  [JWT: role=ROLE_ADMIN]
  → AdminController.getTransactionStats(from, to)
    └── AdminServiceImpl.getTransactionStats(...)
          ├── transactionMapper.getTransactionCount()       // SELECT COUNT(*) FROM transactions（全歷史）
          ├── transactionMapper.getTransactionTotalAmount() // SELECT COALESCE(SUM(amount), 0) FROM transactions
          ├── transactionMapper.getDailyVolume(fromDate, toDate)
          │     SQL: SELECT DATE(created_at) AS date, COUNT(*)::bigint AS count, COALESCE(SUM(amount), 0) AS amount
          │          FROM transactions
          │          WHERE created_at >= fromDate AND created_at < toDate + 1 day
          │          GROUP BY DATE(created_at) ORDER BY date
          └── return TransactionStatsDTO
  → 200 { "totalTransactions": 1250, "totalAmount": 50000.0000, "dailyVolume": [{ "date": "2026-05-01", "count": 15, "amount": 750.0000 }, ...] }
```

### 9. 異常處理（8 種異常 → HTTP 狀態碼對應）

```
Controller → Service → Mapper 任一層拋出異常
  → GlobalExceptionHandler (@RestControllerAdvice)
    ├── AuthenticationException (用戶不存在/密碼錯誤/帳號禁用)
    │     → 401 { "status": "ERROR", "message": "Invalid username or password" }
    ├── AccessDeniedException (非 Admin 訪問 /api/admin/**)
    │     → 403 { "status": "ERROR", "message": "Access denied" }
    ├── WalletNotFoundException (錢包或用戶不存在)
    │     → 404 { "status": "ERROR", "message": "Wallet not found for userId: X" }
    ├── InsufficientBalanceException (餘額不足)
    │     → 400 { "status": "ERROR", "message": "Insufficient balance: X < Y" }
    ├── IllegalArgumentException (amount <= 0、自己轉自己、收款人不存在)
    │     → 400 { "status": "ERROR", "message": "..." }
    ├── DuplicateUsernameException (用戶名重複)
    │     → 409 { "status": "ERROR", "message": "Username 'X' is already taken" }
    ├── ConcurrentModificationException (樂觀鎖衝突)
    │     → 409 { "status": "ERROR", "message": "Concurrent modification detected for userId: X" }
    └── Exception (fallback：NPE、SQLException 等未預期錯誤)
          → 500 { "status": "ERROR", "message": "Internal server error" }
          (完整 stack trace 記錄在伺服器日誌中，不返回客戶端)
```

---

## 啟動方式

### 本機執行

```bash
# 1. 確保 PostgreSQL 在 localhost:5433 運行
# 2. 執行資料庫初始化 SQL
psql -h localhost -p 5433 -U postgres -f src/main/resources/static/db.sql

# 3. 啟動應用（Spring Boot 內嵌 Tomcat）
./mvnw spring-boot:run

# Swagger UI: http://localhost:8080/swagger-ui.html
```

### Docker 一鍵啟動

```bash
# 啟動（PostgreSQL 16 + App，約 30 秒）
docker-compose up -d

# 查看日誌
docker-compose logs -f app

# 停止（保留資料庫 volume）
docker-compose down

# 停止並清除所有資料
docker-compose down -v

# Swagger UI: http://localhost:8080/swagger-ui.html
```

### 測試流程

1. 打開 Swagger UI：`http://localhost:8080/swagger-ui.html`
2. `POST /api/auth/register` 註冊兩個用戶（alice / bob）
3. `POST /api/auth/login` 登錄 alice，複製返回的 token
4. Swagger UI 右上角 **Authorize** 按鈕 → 貼上 token
5. `GET /api/wallets` 查看 alice 的錢包（初始餘額 0）
6. `POST /api/transactions/transfer` 轉賬給 bob（預期 400，因餘額為 0）
7. 手動在資料庫中設定 alice 的餘額：`UPDATE wallets SET balance = 1000 WHERE user_id = 1;`
8. 再次嘗試轉賬（預期 200）
9. `GET /api/transactions` 查看交易歷史
10. （管理端點測試）手動設定 admin：`UPDATE users SET role = 'ROLE_ADMIN' WHERE id = 1;`
11. 重新登錄 alice，用新 token 訪問 `GET /api/admin/users`

---

## 設計決策問答

### 為什麼用 MyBatis 而不是 JPA/Hibernate？

| | MyBatis | JPA/Hibernate |
|------|------|------|
| SQL 控制 | 手寫 SQL，完全掌控 | 自動生成 JPQL/SQL，難以精確優化 |
| 複雜查詢 | XML 直接寫，JOIN/子查詢清晰 | JPQL/Criteria API/Native Query 混用 |
| 除錯體驗 | SQL 日誌直接複製到 DB 執行 | Hibernate SQL 含別名和參數佔位符 |
| 學習成本 | 低，會 SQL 就能上手 | 高，需理解 EntityManager 生命週期、Lazy/Eager、N+1、Dirty Checking |
| 樂觀鎖 | SQL 直接寫 WHERE version = ? | `@Version` 註解自動處理，但不易客製化 |

**選 MyBatis 原因：** 錢包轉賬涉及餘額精確計算和樂觀鎖的精確 SQL，手寫 SQL 比 ORM 自動生成更可靠。對於 SQL 為核心的專案，MyBatis 的透明度優於 JPA 的便利性。

### 為什麼用 JWT 而不是 Session？

| Session（伺服器端） | JWT（客戶端） |
|------|------|
| 伺服器記憶 Session（記憶體或 Redis） | 客戶端攜帶 Token，伺服器無狀態 |
| 水平擴展需 Redis/Sticky Session | 任意伺服器實例都能獨立驗證 |
| Cookie 自動攜帶（SameSite 限制） | 手動附加 Authorization Header |
| 可主動銷毀（刪除 Session） | 無法主動銷毀（需黑名單機制） |

**選 JWT 原因：** 前後端分離架構下，後端不維護 Session 狀態。多台伺服器實例無需 Session 同步（Redis），降低基礎設施複雜度。24 小時短期 Token 降低被盜風險。

### 為什麼用樂觀鎖而不是悲觀鎖？

| 悲觀鎖 `SELECT ... FOR UPDATE` | 樂觀鎖 `version` 欄位 |
|------|------|
| 鎖住資料庫行，其他交易排隊等待 | 不鎖，提交時檢查版本是否變更 |
| 高併發時吞吐量差（排隊阻塞） | 適合讀多寫少的場景 |
| 可能死鎖（兩個交易互相等待） | 不會死鎖 |
| 事務時間長時鎖持有時間長 | 事務時間不影響衝突機率 |

**選樂觀鎖原因：** 錢包大部分時間在查詢餘額（讀），偶爾轉賬（寫）。衝突機率低，發生時讓用戶重試即可。不需要佔用資料庫鎖資源。

### 為什麼密碼用 BCrypt 而不是 SHA-256？

| SHA-256 | BCrypt |
|------|------|
| 計算極快（GPU 可並行暴力破解） | 故意慢（work factor = 10，約 100ms） |
| 不加鹽 → 相同密碼相同雜湊 → 彩虹表攻擊 | 內建隨機鹽值（自動附加在雜湊中） |
| 相同密碼 → 相同雜湊（可批次破解） | 相同密碼 → 每次不同雜湊 |

**BCrypt 的安全性優勢：**
- 每個密碼自動生成不同的鹽值（存在雜湊結果中，格式：`$2a$10$<salt><hash>`）
- 可調 work factor（cost），隨著硬體進步可逐步提高
- **永遠不要用 MD5 或單次 SHA-256 儲存密碼**

### 為什麼 Controller 用 DTO 不直接暴露 Entity？

```
Entity (User)                              DTO (UserDTO)
{                                          {
  id: 1,                                     id: 1,
  username: "alice",                         username: "alice",
  passwordHash: "$2a$10$...",  ← 絕對不該洩漏  role: "ROLE_USER",
  role: "ROLE_USER",                         createdAt: "2026-..."
  createdAt: "2026-..."
}                                          }
```

直接返回 Entity 可能因為 Jackson 序列化而洩漏 `passwordHash`（即使沒設定 getter，`@Data` 也會生成）。DTO 只包含需要返回的欄位，從設計層面消除資料洩漏風險。

### 為什麼 @Transactional 放在 Service 層？

- **事務邊界合理**：Service 層跨多個 Mapper 操作（扣款 + 加款 + 記錄交易），三者在同一事務中
- **避免 Controller 層事務**：Controller 層做事務會讓事務邊界太寬，包含 JSON 序列化等不必要的耗時
- **必要條件**：必須是 public 方法，且必須從外部呼叫（Spring AOP 代理機制。同類內部呼叫 `this.methodB()` 不經過代理，`@Transactional` 不生效）

### 為什麼 Service 分 Interface + Impl？

- **便於 Mock 測試**：單元測試 Controller 時可以 Mock Service 介面，不需要真實資料庫
- **未來替換實作**：例如可切換不同的支付實作而不影響 Controller
- **Spring AOP 代理**：JDK 動態代理需要介面（雖然 Spring Boot 預設使用 CGLIB 代理，不強制需要介面）

---

## 安全紅線

| ✅ 要做的 | ❌ 不要做的 |
|------|------|
| BCrypt 儲存密碼雜湊 | 明文或 MD5/SHA-256 儲存密碼 |
| HTTPS 傳輸 Token | HTTP 明文傳輸 Token（可被中間人攔截） |
| JWT secret 放環境變數（`${JWT_SECRET}`） | JWT secret 硬編碼並 commit 到 Git |
| DTO 過濾敏感欄位（不含 passwordHash） | Entity 直接返回前端（Jackson 可能洩漏 passwordHash） |
| 後端驗證所有輸入（`@Valid`、`compareTo`、null check） | 信任前端傳來的值（攻擊者可繞過前端校驗） |
| 從 `SecurityContextHolder` 獲取用戶 ID | 從 URL 路徑參數獲取用戶 ID（IDOR 漏洞） |
| 統一登入失敗訊息（用戶不存在/密碼錯誤/帳號禁用全部相同） | 區分「用戶不存在」vs「密碼錯誤」（用戶名列舉漏洞） |
| 從 JWT 提取 role 做授權檢查（`hasAuthority("ROLE_ADMIN")`） | 信任客戶端傳入的 role（攻擊者可偽造） |
| Admin 端點由 Spring Security `.hasAuthority("ROLE_ADMIN")` 保護 | 在 Controller 方法內手動檢查 role（容易遺漏） |
| 禁用用戶登入時返回與密碼錯誤相同的訊息 | 返回「帳號已被禁用」（洩漏帳號狀態） |
| 分頁查詢限制最大 size（size > 100 → size = 100） | 允許任意 size 值（DDOS 風險） |
| 記錄未預期異常的完整 stack trace（`log.error`） | 將異常細節返回客戶端（資訊洩漏） |

---

## 常見錯誤

| 錯誤 | 後果 | 正確做法 |
|------|------|------|
| `@Transactional` 放在 private 方法 | 事務不生效（Spring AOP 無法代理 private 方法） | 必須 public 方法 |
| `@Transactional` 同類內部呼叫 `this.method()` | 事務不生效（不經過代理物件） | 注入自身或移到另一個 Bean |
| 樂觀鎖只更新 version 不檢查 | 覆蓋其他交易的修改 | `WHERE version = ?` 並檢查 affected rows == 0 |
| `BigDecimal(double)` 建構子 | 浮點精度問題（`new BigDecimal(0.1)` != `0.1`） | `new BigDecimal("50.00")` 或 `BigDecimal.valueOf()` |
| JWT secret 太短（少於 256 bits） | `WeakKeyException` 拋出或易被暴力破解 | 至少 64 個 hex 字元（256-bit） |
| `NUMERIC(18,4)` 精度不足 | 大額交易時金額截斷 | 根據業務需求選擇精度（加密貨幣可能需 18,8 或更高） |
| 登入失敗區分錯誤類型 | 攻擊者可透過錯誤訊息列舉有效用戶名 | 所有失敗返回相同訊息 "Invalid username or password" |
| Admin 端點忘記在 SecurityConfig 加 `.hasAuthority("ROLE_ADMIN")` | 普通用戶可訪問管理功能（權限提升漏洞） | 所有 `/api/admin/**` 路徑統一設定授權規則 |
| 分頁查詢沒有限制最大 size | 攻擊者傳入 `size=99999999` 導致記憶體溢出或資料庫查詢過大 | `if (size > 100) size = 100` |
| `SUM(amount)` 未用 `COALESCE` 處理 NULL | 空結果集時返回 null 而非 0，可能導致 NPE | `COALESCE(SUM(amount), 0)` |
| MyBatis XML 中 `<if>` 條件只檢查 `search != null` | 空字串 `""` 通過檢查，產生無效 SQL（`LIKE '%%'`） | `test="search != null and search != ''"` |
| `LEFT JOIN` 寫成 `INNER JOIN` | 缺少 `from_wallet_id` 為 null 的系統交易記錄 | 明確哪些欄位可為 null 再決定 JOIN 類型 |
