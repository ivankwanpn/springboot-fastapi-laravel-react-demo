# Digital Wallet Backend — Spring MVC 6（傳統 XML 配置）版 (Demo)
> 技術驗證／參考實作：展示 Spring Boot 出現前的傳統開發方式。API 合約與其他五個後端完全一致。

---

## 1. 技術清單

| 技術 | 版本 | 用途 |
|------|------|------|
| Java | 21 | 執行環境 |
| Spring MVC (spring-webmvc) | 6.2.11 | Web 層，DispatcherServlet |
| Spring Security | 6.5.5 | 認證授權，XML namespace 配置 |
| Spring JDBC | 6.2.11 | DataSourceTransactionManager |
| MyBatis (mybatis / mybatis-spring) | 3.0.5 / 3.0.5 | ORM，XML Mapper |
| HikariCP | 6.3.2 | Connection Pool |
| jjwt (jjwt-api / impl / jackson) | 0.11.5 | JWT HS256 簽名與驗證 |
| BCrypt (spring-security-crypto) | 6.5.5 | 密碼雜湊 |
| Jackson | 2.18.3 | JSON 序列化 |
| Hibernate Validator | 8.0.2.Final | Bean Validation (@Valid) |
| PostgreSQL Driver | 42.7.7 | 資料庫連線 |
| Maven WAR Plugin | 3.4.0 | 打包 WAR |
| Tomcat | 10.1 | Servlet Container（部署目標） |

**No Spring Boot（純 XML 配置）**。所有 Bean 透過 XML 定義，依賴注入使用 setter injection 或 @Autowired（混用，詳見下文）。Lombok 用於 Entity 和基本 DTO，Admin DTO 全部手寫 getter/setter。

---

## 2. 專案結構

```
digital_wallet_springmvc/
├── pom.xml                                         # Maven 依賴與 WAR 打包設定
├── src/main/
│   ├── resources/
│   │   ├── jdbc.properties                         # 資料庫連線參數
│   │   ├── jwt.properties                          # JWT secret 與過期時間
│   │   └── mapper/
│   │       ├── UserMapper.xml                      # MyBatis SQL 對應
│   │       ├── WalletMapper.xml
│   │       └── TransactionMapper.xml
│   └── webapp/WEB-INF/
│       ├── web.xml                                 # Servlet 容器配置（DispatcherServlet、Spring Security Filter）
│       ├── applicationContext.xml                  # Spring Root Context（Bean 定義、MyBatis、Transactions）
│       ├── spring-security.xml                     # Spring Security（intercept-url、JWT filter、CORS）
│       └── dispatcher-servlet.xml                  # Spring MVC Web Context（component-scan）
└── src/main/java/com/digitalwallet/
    ├── controller/
    │   ├── AuthController.java                     # POST /api/auth/register, /api/auth/login
    │   ├── WalletController.java                   # GET /api/wallets
    │   ├── TransactionController.java               # POST /api/transactions/transfer, GET /api/transactions
    │   ├── AdminController.java                    # GET/PUT /api/admin/*
    │   └── GlobalExceptionHandler.java              # @RestControllerAdvice
    ├── service/
    │   ├── AuthService.java                        # register() + login()
    │   ├── WalletService.java                      # getByUserId()
    │   ├── TransactionService.java                  # transfer() + getHistory()
    │   └── AdminService.java                       # listUsers(), getUserDetail(), disableUser(), enableUser(), listTransactions(), getTransactionStats()
    ├── mapper/
    │   ├── UserMapper.java                         # MyBatis Mapper 介面
    │   ├── WalletMapper.java
    │   └── TransactionMapper.java
    ├── model/
    │   ├── User.java                               # Entity（對應 users 表）
    │   ├── Wallet.java                             # Entity（對應 wallets 表）
    │   ├── Transaction.java                        # Entity（對應 transactions 表）
    │   ├── UserDTO.java                            # 用戶回傳 DTO
    │   ├── WalletDTO.java                          # 錢包回傳 DTO
    │   ├── TransactionDTO.java                     # 交易回傳 DTO
    │   ├── LoginRequest.java                       # 登入／註冊請求
    │   ├── LoginResponse.java                      # 登入回應（token + user）
    │   ├── TransferRequest.java                    # 轉帳請求
    │   ├── ApiResponse.java                        # 通用 API 回應
    │   ├── PaginatedResponse.java                  # 分頁回應（手動 getter/setter）
    │   ├── UserDetailDTO.java                      # Admin 用戶詳情（手動 getter/setter）
    │   ├── AdminTransactionDTO.java                # Admin 交易記錄（手動 getter/setter）
    │   ├── TransactionStatsDTO.java                # Admin 交易統計（手動 getter/setter）
    │   └── DailyVolumeDTO.java                     # Admin 每日交易量（手動 getter/setter）
    ├── security/
    │   ├── JwtAuthFilter.java                      # OncePerRequestFilter，解析 JWT
    │   ├── RestAuthEntryPoint.java                 # 401 → JSON 回應
    │   └── CorsConfig.java                         # CORS 配置
    ├── util/
    │   └── JwtUtil.java                            # JWT 生成／驗證（setter injection）
    └── exception/
        ├── AppException.java                       # 基礎業務例外（statusCode + message）
        ├── AuthenticationException.java            # 401
        ├── DuplicateUsernameException.java          # 409
        ├── InsufficientBalanceException.java        # 400
        ├── WalletNotFoundException.java             # 404
        └── ConcurrentModificationException.java     # 409（樂觀鎖衝突）
```

**依賴方向**：`Controller → Service → Mapper → XML SQL`，所有 Bean 在 `applicationContext.xml` 中以 `<property>` 注入。

---

## 3. API 端點

### 3.1 用戶端 API（5 個端點）

| 方法 | 路徑 | Auth | 請求體 | 回應 | 說明 |
|------|------|------|--------|------|------|
| POST | `/api/auth/register` | 無 | `{"username":"alice","password":"secret"}` | `{"status":"SUCCESS","message":"User registered successfully"}` | 註冊並自動建立錢包 |
| POST | `/api/auth/login` | 無 | `{"username":"alice","password":"secret"}` | `{"token":"eyJhb...","user":{...}}` | 登入，返回 JWT |
| GET | `/api/wallets` | JWT | — | `{"id":1,"userId":1,"currency":"USDT","balance":100.0000,"version":3,"updatedAt":"..."}` | 查詢當前用戶錢包 |
| POST | `/api/transactions/transfer` | JWT | `{"toUsername":"bob","amount":10.5}` | `{"status":"SUCCESS","message":"Transfer completed successfully"}` | 轉帳（樂觀鎖） |
| GET | `/api/transactions` | JWT | — | `[{"id":1,"fromWalletId":1,"toWalletId":2,"amount":10.5,"txType":"TRANSFER","status":"SUCCESS","createdAt":"..."}]` | 查詢當前用戶交易記錄 |

### 3.2 管理員 API（6 個端點）—— 需 `ROLE_ADMIN`

| 方法 | 路徑 | Auth | 查詢參數 | 回應 | 說明 |
|------|------|------|----------|------|------|
| GET | `/api/admin/users` | JWT + ROLE_ADMIN | `?search=&page=1&size=20` | `{"data":[...],"page":1,"size":20,"total":50}` | 用戶列表（分頁 + 搜尋） |
| GET | `/api/admin/users/{id}` | JWT + ROLE_ADMIN | — | `{"id":1,"username":"alice","role":"ROLE_USER","wallet":{...},"recentTransactions":[...]}` | 用戶詳情 + 錢包 + 最近 5 筆交易 |
| PUT | `/api/admin/users/{id}/disable` | JWT + ROLE_ADMIN | — | `{"status":"SUCCESS","message":"User disabled successfully"}` | 停用用戶（role 改為 ROLE_DISABLED） |
| PUT | `/api/admin/users/{id}/enable` | JWT + ROLE_ADMIN | — | `{"status":"SUCCESS","message":"User enabled successfully"}` | 啟用用戶（role 改為 ROLE_USER） |
| GET | `/api/admin/transactions` | JWT + ROLE_ADMIN | `?username=&from=&to=&page=1&size=20` | `{"data":[{...with fromUsername & toUsername...}],"page":1,"size":20,"total":200}` | 交易列表（分頁 + 日期範圍 + 用戶名篩選） |
| GET | `/api/admin/transactions/stats` | JWT + ROLE_ADMIN | `?from=&to=` | `{"totalTransactions":150,"totalAmount":12345.67,"dailyVolume":[{...}]}` | 交易統計（總筆數 + 總金額 + 每日交易量） |

錯誤回應格式：`{"status":"ERROR","message":"..."}`

---

## 4. 核心實作模式

### 模式 1：專案初始化（pom.xml + web.xml + Properties）

**pom.xml — WAR 打包、無 Spring Boot**

```xml
<groupId>com.digitalwallet</groupId>
<artifactId>digital_wallet_springmvc</artifactId>
<version>1.0-SNAPSHOT</version>
<packaging>war</packaging>

<properties>
    <java.version>21</java.version>
    <spring.version>6.2.11</spring.version>
    <spring-security.version>6.5.5</spring-security.version>
    <mybatis.version>3.0.5</mybatis.version>
    <mybatis-spring.version>3.0.5</mybatis-spring.version>
    <jackson.version>2.18.3</jackson.version>
    <jjwt.version>0.11.5</jjwt.version>
</properties>
```

關鍵依賴（無 spring-boot-starter-*）：

```xml
<!-- Spring MVC（非 Boot） -->
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-webmvc</artifactId>
    <version>${spring.version}</version>
</dependency>

<!-- Spring Security -->
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-web</artifactId>
    <version>${spring-security.version}</version>
</dependency>

<!-- MyBatis -->
<dependency>
    <groupId>org.mybatis</groupId>
    <artifactId>mybatis</artifactId>
    <version>${mybatis.version}</version>
</dependency>
<dependency>
    <groupId>org.mybatis</groupId>
    <artifactId>mybatis-spring</artifactId>
    <version>${mybatis-spring.version}</version>
</dependency>

<!-- HikariCP（手動配置 DataSource） -->
<dependency>
    <groupId>com.zaxxer</groupId>
    <artifactId>HikariCP</artifactId>
    <version>6.3.2</version>
</dependency>
```

> Spring Boot 的 `spring-boot-starter-web` 會自動帶入 embedded Tomcat、auto-configuration、application.properties 等機制。這裡我們全部手動處理。

**web.xml — Servlet 2.x/3.x 風格的部署描述符**

```xml
<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee"
         version="6.0">

    <!-- Root ApplicationContext（載入 Service、Mapper、DataSource 等 Bean） -->
    <listener>
        <listener-class>org.springframework.web.context.ContextLoaderListener</listener-class>
    </listener>
    <context-param>
        <param-name>contextConfigLocation</param-name>
        <param-value>
            /WEB-INF/applicationContext.xml
            /WEB-INF/spring-security.xml
        </param-value>
    </context-param>

    <!-- Spring Security Filter（DelegatingFilterProxy） -->
    <filter>
        <filter-name>springSecurityFilterChain</filter-name>
        <filter-class>org.springframework.web.filter.DelegatingFilterProxy</filter-class>
    </filter>
    <filter-mapping>
        <filter-name>springSecurityFilterChain</filter-name>
        <url-pattern>/*</url-pattern>
    </filter-mapping>

    <!-- DispatcherServlet（Web Context，載入 Controller） -->
    <servlet>
        <servlet-name>dispatcher</servlet-name>
        <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
        <init-param>
            <param-name>contextConfigLocation</param-name>
            <param-value>/WEB-INF/dispatcher-servlet.xml</param-value>
        </init-param>
        <load-on-startup>1</load-on-startup>
    </servlet>
    <servlet-mapping>
        <servlet-name>dispatcher</servlet-name>
        <url-pattern>/</url-pattern>
    </servlet-mapping>
</web-app>
```

**兩層 Context 架構**：
- **Root Context**（`ContextLoaderListener`）：`applicationContext.xml` + `spring-security.xml`。管理 Service、Mapper、DataSource、Security 等全域 Bean。
- **Web Context**（`DispatcherServlet`）：`dispatcher-servlet.xml`。管理 Controller 等 Web 層 Bean。

Root Context 的 Bean 對所有 DispatcherServlet 可見；Web Context 的 Bean 僅在該 Servlet 內可見。

**jdbc.properties**

```properties
jdbc.driver=org.postgresql.Driver
jdbc.url=jdbc:postgresql://localhost:5433/digital_wallet
jdbc.username=postgres
jdbc.password=root
```

**jwt.properties**

```properties
jwt.secret=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
jwt.expiration=86400000
```

屬性檔案透過 `applicationContext.xml` 中的 `<context:property-placeholder>` 載入，在 XML 中以 `${jdbc.url}` 語法引用。

---

### 模式 2：Spring XML Bean 配置（applicationContext.xml）

這是本專案最核心的檔案。所有 Bean（DataSource、MyBatis、TransactionManager、Service、Controller）都在這裡定義。

```xml
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:tx="http://www.springframework.org/schema/tx">

    <!-- Property Files -->
    <context:property-placeholder location="classpath:jdbc.properties" order="0"/>
    <context:property-placeholder location="classpath:jwt.properties" order="1"/>

    <!-- DataSource（HikariCP） -->
    <bean id="dataSource" class="com.zaxxer.hikari.HikariDataSource" destroy-method="close">
        <property name="driverClassName" value="${jdbc.driver}"/>
        <property name="jdbcUrl" value="${jdbc.url}"/>
        <property name="username" value="${jdbc.username}"/>
        <property name="password" value="${jdbc.password}"/>
        <property name="maximumPoolSize" value="10"/>
        <property name="minimumIdle" value="2"/>
    </bean>

    <!-- MyBatis SqlSessionFactory -->
    <bean id="sqlSessionFactory" class="org.mybatis.spring.SqlSessionFactoryBean">
        <property name="dataSource" ref="dataSource"/>
        <property name="mapperLocations" value="classpath:mapper/*.xml"/>
        <property name="configuration">
            <bean class="org.apache.ibatis.session.Configuration">
                <property name="mapUnderscoreToCamelCase" value="true"/>
            </bean>
        </property>
    </bean>

    <!-- MyBatis Mapper Scanner（自動掃描介面並註冊為 Spring Bean） -->
    <bean class="org.mybatis.spring.mapper.MapperScannerConfigurer">
        <property name="basePackage" value="com.digitalwallet.mapper"/>
        <property name="sqlSessionFactoryBeanName" value="sqlSessionFactory"/>
    </bean>

    <!-- Transaction Manager -->
    <bean id="transactionManager"
          class="org.springframework.jdbc.datasource.DataSourceTransactionManager">
        <property name="dataSource" ref="dataSource"/>
    </bean>
    <tx:annotation-driven transaction-manager="transactionManager"/>

    <!-- BCrypt -->
    <bean id="passwordEncoder"
          class="org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder"/>

    <!-- JWT Utility（setter injection） -->
    <bean id="jwtUtil" class="com.digitalwallet.util.JwtUtil">
        <property name="secret" value="${jwt.secret}"/>
        <property name="expiration" value="${jwt.expiration}"/>
    </bean>

    <!-- Service Beans（全部使用 setter injection） -->
    <bean id="authService" class="com.digitalwallet.service.AuthService">
        <property name="userMapper" ref="userMapper"/>
        <property name="walletMapper" ref="walletMapper"/>
        <property name="passwordEncoder" ref="passwordEncoder"/>
        <property name="jwtUtil" ref="jwtUtil"/>
    </bean>

    <bean id="walletService" class="com.digitalwallet.service.WalletService">
        <property name="walletMapper" ref="walletMapper"/>
    </bean>

    <bean id="transactionService" class="com.digitalwallet.service.TransactionService">
        <property name="userMapper" ref="userMapper"/>
        <property name="walletMapper" ref="walletMapper"/>
        <property name="transactionMapper" ref="transactionMapper"/>
    </bean>

    <bean id="adminService" class="com.digitalwallet.service.AdminService">
        <property name="userMapper" ref="userMapper"/>
        <property name="walletMapper" ref="walletMapper"/>
        <property name="transactionMapper" ref="transactionMapper"/>
    </bean>

    <!-- AdminController 也用 XML setter injection -->
    <bean id="adminController" class="com.digitalwallet.controller.AdminController">
        <property name="adminService" ref="adminService"/>
    </bean>
</beans>
```

> **說明**：
> - `AuthController`、`WalletController`、`TransactionController` 使用 `@Autowired` 註解注入（由 `dispatcher-servlet.xml` 的 `<context:component-scan>` 掃描），不在 applicationContext.xml 中定義。
> - `AdminController` 使用 setter injection（在 XML 中明確定義 `<bean id="adminController">` 並注入 `<property name="adminService">`），這是為了展示傳統 XML 配置方式如何手動注入 Controller。
> - MyBatis Mapper 介面由 `MapperScannerConfigurer` 自動掃描註冊，ref 名稱由介面名稱的小駝峰自動生成（`UserMapper` → `userMapper`）。
> - `<tx:annotation-driven>` 啟用 `@Transactional` 註解支援，讓 Service 層可以使用宣告式交易。

**dispatcher-servlet.xml — Web Context 配置**

```xml
<beans xmlns:mvc="http://www.springframework.org/schema/mvc"
       xmlns:context="http://www.springframework.org/schema/context">

    <mvc:annotation-driven/>
    <context:component-scan base-package="com.digitalwallet.controller"/>
</beans>
```

> `<mvc:annotation-driven>` 註冊 `RequestMappingHandlerMapping`、`RequestMappingHandlerAdapter`、`HttpMessageConverter`（含 Jackson JSON 轉換）等 MVC 基礎設施。`<context:component-scan>` 掃描 `@RestController` 並自動註冊為 Bean。

---

### 模式 3：Spring Security XML（spring-security.xml）

```xml
<beans:beans xmlns="http://www.springframework.org/schema/security"
             xmlns:beans="http://www.springframework.org/schema/beans">

    <http auto-config="false"
          use-expressions="true"
          create-session="stateless"
          entry-point-ref="restAuthEntryPoint">

        <csrf disabled="true"/>
        <cors configuration-source-ref="corsConfig"/>

        <!-- URL 授權規則 -->
        <intercept-url pattern="/api/auth/**" access="permitAll()"/>
        <intercept-url pattern="/api/admin/**" access="hasAuthority('ROLE_ADMIN')"/>
        <intercept-url pattern="/api/**" access="isAuthenticated()"/>

        <!-- 自訂 JWT Filter，插入到 PRE_AUTH_FILTER 之前 -->
        <custom-filter ref="jwtAuthFilter" before="PRE_AUTH_FILTER"/>
    </http>

    <authentication-manager/>

    <!-- 401 → JSON -->
    <beans:bean id="restAuthEntryPoint"
                class="com.digitalwallet.security.RestAuthEntryPoint"/>

    <!-- CORS -->
    <beans:bean id="corsConfig"
                class="com.digitalwallet.security.CorsConfig"/>

    <!-- JWT Filter -->
    <beans:bean id="jwtAuthFilter"
                class="com.digitalwallet.security.JwtAuthFilter">
        <beans:property name="jwtUtil" ref="jwtUtil"/>
    </beans:bean>
</beans:beans>
```

> **說明**：
> - `create-session="stateless"`：禁用 HTTP Session，每個請求都透過 JWT 獨立認證。這是 RESTful API 的標準做法。
> - `<csrf disabled="true"/>`：JWT 本身就是 CSRF 防護機制（因為瀏覽器不會自動附加 Authorization header），禁用 Spring Security 內建的 CSRF token 機制以免干擾。
> - `intercept-url` 的順序很重要：先匹配 `/api/auth/**`（公開），再匹配 `/api/admin/**`（需 ADMIN），最後 `/api/**`（僅需登入）。
> - `<custom-filter ref="jwtAuthFilter" before="PRE_AUTH_FILTER"/>`：將 JwtAuthFilter 插入到 Spring Security filter chain 中 `PRE_AUTH_FILTER` 之前，讓 JWT 解析在認證流程之前執行。
> - `<authentication-manager/>` 是空元素，因為我們不使用 Spring Security 內建的 `UserDetailsService`，而是用 JWT Filter 手動設置 `SecurityContext`。

---

### 模式 4：JWT（JwtUtil.java）

```java
package com.digitalwallet.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

import java.security.Key;
import java.util.Date;

public class JwtUtil {

    private String secret;
    private long expiration;

    // setter injection — 沒有 Lombok，手寫 setter
    public void setSecret(String secret) { this.secret = secret; }
    public void setExpiration(long expiration) { this.expiration = expiration; }

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }

    public String generateToken(Long userId, String username, String role) {
        Date now = new Date();
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("username", username)
                .claim("role", role)          // 將 role 寫入 JWT payload
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public Long extractUserId(String token) {
        return Long.parseLong(parseClaims(token).getSubject());
    }

    public String extractRole(String token) {
        return parseClaims(token).get("role", String.class);
    }

    public boolean isTokenValid(String token) {
        if (token == null || token.isEmpty()) return false;
        try {
            parseClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
```

> **說明**：
> - `secret` 和 `expiration` 兩個屬性由 `applicationContext.xml` 中的 `<property>` 注入值（來自 `jwt.properties`）。這是傳統 Spring XML setter injection 模式。
> - `generateToken` 接受 `role` 參數，將 role 作為 JWT claim 寫入。這樣後續 Filter 可以直接從 JWT 讀取 role，無需查詢資料庫。
> - 使用 jjwt 0.11.x API（`Jwts.builder()` / `Jwts.parserBuilder()`），非新版 0.12.x 的 `Jwts.SIG.HS256` API。
> - `isTokenValid` 捕獲所有例外（過期、簽名無效、格式錯誤），統一返回 false。

---

### 模式 5：JWT Filter（JwtAuthFilter.java）

```java
package com.digitalwallet.security;

import com.digitalwallet.util.JwtUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.io.IOException;
import java.util.Collections;

public class JwtAuthFilter extends OncePerRequestFilter {

    private JwtUtil jwtUtil;

    public void setJwtUtil(JwtUtil jwtUtil) { this.jwtUtil = jwtUtil; }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            if (jwtUtil.isTokenValid(token)) {
                Long userId = jwtUtil.extractUserId(token);
                String role = jwtUtil.extractRole(token);
                if (role == null) role = "ROLE_USER";
                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(userId, null,
                                Collections.singletonList(
                                    new SimpleGrantedAuthority(role)));
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        chain.doFilter(request, response);
    }
}
```

> **說明**：
> - 繼承 `OncePerRequestFilter`：保證每個請求只執行一次過濾（Spring Security filter chain 會自動管理）。
> - 從 `Authorization: Bearer <token>` header 提取 JWT，驗證後將使用者資訊放入 `SecurityContext`。
> - `principal` 設置為 `Long userId`（不是 `UserDetails` 物件），Controller 層可以透過 `(Long) auth.getPrincipal()` 直接取得 userId。
> - `SimpleGrantedAuthority(role)` 讓 `hasAuthority('ROLE_ADMIN')` 可以正常工作。role 來自 JWT claim，格式如 `ROLE_USER`、`ROLE_ADMIN`、`ROLE_DISABLED`。
> - Filter 不會對驗證失敗的請求返回 401 —— 它只是不設置 Authentication。真正的 401 由 `RestAuthEntryPoint` 處理（當請求需要 auth 但 SecurityContext 中沒有 Authentication 時觸發）。

---

### 模式 6：Entity / Model / DTO（無 Lombok 風格的 DTO）

本專案混合了兩種風格：
- **使用 Lombok 的檔案**：Entity 層（`User.java`、`Wallet.java`、`Transaction.java`）使用 `@Data`；基本 DTO（`UserDTO.java`、`WalletDTO.java`、`TransactionDTO.java`、`LoginRequest.java`、`LoginResponse.java`、`TransferRequest.java`、`ApiResponse.java`）使用 `@Data`、`@Builder` 等；`AppException.java` 使用 `@Getter`。
- **不使用 Lombok 的檔案**：Admin 相關 DTO（`AdminTransactionDTO.java`、`TransactionStatsDTO.java`、`DailyVolumeDTO.java`、`UserDetailDTO.java`、`PaginatedResponse.java`）全部手寫 getter/setter。

**Entity 例子 — User.java（使用 Lombok）**

```java
package com.digitalwallet.model;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class User {
    private Long id;
    private String username;
    private String passwordHash;
    private String role;
    private LocalDateTime createdAt;
}
```

**手寫 DTO 例子 — AdminTransactionDTO.java（無 Lombok）**

```java
package com.digitalwallet.model;

import java.math.BigDecimal;
import java.sql.Timestamp;

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

    public AdminTransactionDTO() {}

    public AdminTransactionDTO(Long id, Long fromWalletId, Long toWalletId,
                               BigDecimal amount, String txType, String status,
                               Timestamp createdAt, String fromUsername,
                               String toUsername) {
        this.id = id;
        this.fromWalletId = fromWalletId;
        this.toWalletId = toWalletId;
        this.amount = amount;
        this.txType = txType;
        this.status = status;
        this.createdAt = createdAt;
        this.fromUsername = fromUsername;
        this.toUsername = toUsername;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFromWalletId() { return fromWalletId; }
    public void setFromWalletId(Long fromWalletId) { this.fromWalletId = fromWalletId; }

    public Long getToWalletId() { return toWalletId; }
    public void setToWalletId(Long toWalletId) { this.toWalletId = toWalletId; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getTxType() { return txType; }
    public void setTxType(String txType) { this.txType = txType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    public String getFromUsername() { return fromUsername; }
    public void setFromUsername(String fromUsername) { this.fromUsername = fromUsername; }

    public String getToUsername() { return toUsername; }
    public void setToUsername(String toUsername) { this.toUsername = toUsername; }
}
```

**手寫 DTO 例子 — PaginatedResponse.java（泛型分頁）**

```java
package com.digitalwallet.model;

import java.util.List;

public class PaginatedResponse<T> {
    private List<T> data;
    private int page;
    private int size;
    private long total;

    public PaginatedResponse() {}

    public PaginatedResponse(List<T> data, int page, int size, long total) {
        this.data = data;
        this.page = page;
        this.size = size;
        this.total = total;
    }

    public List<T> getData() { return data; }
    public void setData(List<T> data) { this.data = data; }

    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }

    public int getSize() { return size; }
    public void setSize(int size) { this.size = size; }

    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }
}
```

> **說明**：
> - Admin 相關 DTO 全部手寫 getter/setter 是為了展示純 Java 風格，讓讀者清楚看到每個欄位的 get/set 邏輯，不依賴 Lombok 的 annotation processor 魔法。
> - MyBatis 的 `resultMap` 透過 setter 注入查詢結果，因此 DTO 必須有對應的 setter 方法。
> - 使用無 Lombok 風格時，IDE 的 "find usages" 和重構功能可以直接作用於實際的 getter/setter 方法，而不是 Lombok 生成的隱式方法。

---

### 模式 7：Controller 層

**AuthController.java — 混合注入風格**

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse> register(@Valid @RequestBody LoginRequest request) {
        authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }
}
```

> `@Valid` 觸發 Hibernate Validator 對 `LoginRequest` 進行 `@NotBlank` 驗證。驗證失敗時 Spring 自動返回 400。

**WalletController.java — IDOR 防護**

```java
@RestController
@RequestMapping("/api/wallets")
public class WalletController {

    @Autowired
    private WalletService walletService;

    @GetMapping
    public ResponseEntity<WalletDTO> getWallet() {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(walletService.getByUserId(userId));
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }
}
```

> `userId` **永遠從 JWT 中提取**（`auth.getPrincipal()`），不從 URL parameter 或 request body 中讀取。這防止了 IDOR（Insecure Direct Object Reference）攻擊 —— 用戶 A 無法查看用戶 B 的錢包。

**TransactionController.java — 轉帳與查詢**

```java
@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @PostMapping("/transfer")
    public ResponseEntity<ApiResponse> transfer(@Valid @RequestBody TransferRequest request) {
        Long userId = getCurrentUserId();
        transactionService.transfer(userId, request);
        return ResponseEntity.ok(ApiResponse.success("Transfer completed successfully"));
    }

    @GetMapping
    public ResponseEntity<List<TransactionDTO>> getHistory() {
        Long userId = getCurrentUserId();
        return ResponseEntity.ok(transactionService.getHistory(userId));
    }

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }
}
```

**AdminController.java — XML setter injection 風格**

```java
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private AdminService adminService;

    // 沒有 @Autowired — 依賴由 applicationContext.xml 中的 <property> 注入
    public void setAdminService(AdminService adminService) { this.adminService = adminService; }

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

> **說明**：
> - `AdminController` 使用 **setter injection**（沒有 `@Autowired`），依賴由 `applicationContext.xml` 中的 `<bean id="adminController">` 和 `<property name="adminService" ref="adminService"/>` 注入。這是為了展示傳統 XML 配置下如何手動管理 Controller Bean。
> - 其他三個 Controller 使用 `@Autowired` 註解，由 `dispatcher-servlet.xml` 的 `<context:component-scan>` 自動掃描註冊。這種混用展示了兩種 DI 風格可以在同一專案中共存。
> - Admin 端點受 `spring-security.xml` 中 `<intercept-url pattern="/api/admin/**" access="hasAuthority('ROLE_ADMIN')"/>` 保護。

---

### 模式 8：Service 層（全部 setter injection）

所有 Service 類別都使用 **setter injection** 而非 `@Autowired`，與 `applicationContext.xml` 中的 `<property>` 配置對應。

**AuthService.java — 註冊與登入**

```java
public class AuthService {

    private UserMapper userMapper;
    private WalletMapper walletMapper;
    private PasswordEncoder passwordEncoder;
    private JwtUtil jwtUtil;

    public void setUserMapper(UserMapper userMapper) { this.userMapper = userMapper; }
    public void setWalletMapper(WalletMapper walletMapper) { this.walletMapper = walletMapper; }
    public void setPasswordEncoder(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }
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
        User user = userMapper.findByUsername(request.getUsername());
        if (user == null || !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new AuthenticationException("Invalid username or password");
        }

        // ROLE_DISABLED 用戶無法登入
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

        return new LoginResponse(token, userDTO);
    }
}
```

> `@Transactional` 確保 `insert(user)` 和 `insert(wallet)` 在一個事務中完成，若任一操作失敗則全部回滾。`DuplicateKeyException` 捕獲 username 唯一約束違反。

**TransactionService.java — 轉帳與樂觀鎖**

```java
public class TransactionService {

    private UserMapper userMapper;
    private WalletMapper walletMapper;
    private TransactionMapper transactionMapper;

    // setter injection
    public void setUserMapper(UserMapper userMapper) { this.userMapper = userMapper; }
    public void setWalletMapper(WalletMapper walletMapper) { this.walletMapper = walletMapper; }
    public void setTransactionMapper(TransactionMapper transactionMapper) {
        this.transactionMapper = transactionMapper;
    }

    @Transactional
    public void transfer(Long fromUserId, TransferRequest request) {
        String toUsername = request.getToUsername();
        BigDecimal amount = request.getAmount();

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
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
        Wallet toWallet = walletMapper.findByUserId(toUserId);

        if (fromWallet.getBalance().compareTo(amount) < 0) {
            throw new InsufficientBalanceException(
                "Insufficient balance: " + fromWallet.getBalance() + " < " + amount);
        }

        // 樂觀鎖：deductBalance 的 WHERE 條件包含 version
        int deducted = walletMapper.deductBalance(fromUserId, amount, fromWallet.getVersion());
        if (deducted == 0) {
            throw new ConcurrentModificationException(
                "Concurrent modification detected for userId: " + fromUserId);
        }

        walletMapper.addBalance(toUserId, amount);

        Transaction tx = new Transaction();
        tx.setFromWalletId(fromWallet.getId());
        tx.setToWalletId(toWallet.getId());
        tx.setAmount(amount);
        tx.setTxType("TRANSFER");
        tx.setStatus("SUCCESS");
        transactionMapper.insert(tx);
    }
}
```

> 轉帳步驟：1) 驗證金額為正；2) 查找收款人；3) 檢查不能轉給自己；4) 檢查餘額充足；5) 樂觀鎖扣款（`WHERE version = ?`）；6) 若扣款行數為 0，表示並發衝突，拋出 `ConcurrentModificationException`；7) 收款方加款；8) 記錄交易。

**AdminService.java — 管理功能**

```java
public class AdminService {

    private UserMapper userMapper;
    private WalletMapper walletMapper;
    private TransactionMapper transactionMapper;

    private static final SimpleDateFormat DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd");

    // setter injection
    public void setUserMapper(UserMapper userMapper) { this.userMapper = userMapper; }
    public void setWalletMapper(WalletMapper walletMapper) { this.walletMapper = walletMapper; }
    public void setTransactionMapper(TransactionMapper transactionMapper) {
        this.transactionMapper = transactionMapper;
    }

    public PaginatedResponse<UserDTO> listUsers(String search, int page, int size) {
        if (page < 1) page = 1;
        if (size < 1) size = 20;
        if (size > 100) size = 100;

        int offset = (page - 1) * size;
        List<User> users = userMapper.findAllWithPagination(search, offset, size);
        int total = userMapper.countAll(search);

        List<UserDTO> userDTOs = users.stream()
                .map(u -> {
                    UserDTO dto = new UserDTO();
                    dto.setId(u.getId());
                    dto.setUsername(u.getUsername());
                    dto.setRole(u.getRole());
                    dto.setCreatedAt(u.getCreatedAt());
                    return dto;
                })
                .collect(Collectors.toList());

        PaginatedResponse<UserDTO> response = new PaginatedResponse<>();
        response.setData(userDTOs);
        response.setPage(page);
        response.setSize(size);
        response.setTotal(total);
        return response;
    }

    public UserDetailDTO getUserDetail(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) {
            throw new WalletNotFoundException("User not found: " + userId);
        }

        Wallet wallet = walletMapper.findByUserId(userId);
        List<Transaction> recentTxns = transactionMapper.findRecentByWalletId(
                wallet != null ? wallet.getId() : null, 5);

        // 手動轉換（無 Lombok builder）
        List<TransactionDTO> txnDTOs = recentTxns.stream()
                .map(t -> {
                    TransactionDTO dto = new TransactionDTO();
                    dto.setId(t.getId());
                    dto.setFromWalletId(t.getFromWalletId());
                    dto.setToWalletId(t.getToWalletId());
                    dto.setAmount(t.getAmount());
                    dto.setTxType(t.getTxType());
                    dto.setStatus(t.getStatus());
                    dto.setCreatedAt(t.getCreatedAt());
                    return dto;
                })
                .collect(Collectors.toList());

        WalletDTO walletDTO = null;
        if (wallet != null) {
            walletDTO = new WalletDTO();
            walletDTO.setId(wallet.getId());
            walletDTO.setUserId(wallet.getUserId());
            walletDTO.setCurrency(wallet.getCurrency());
            walletDTO.setBalance(wallet.getBalance());
            walletDTO.setVersion(wallet.getVersion());
            walletDTO.setUpdatedAt(wallet.getUpdatedAt());
        }

        UserDetailDTO detailDTO = new UserDetailDTO();
        detailDTO.setId(user.getId());
        detailDTO.setUsername(user.getUsername());
        detailDTO.setRole(user.getRole());
        Timestamp createdAt = user.getCreatedAt() != null ? Timestamp.valueOf(user.getCreatedAt()) : null;
        detailDTO.setCreatedAt(createdAt);
        detailDTO.setWallet(walletDTO);
        detailDTO.setRecentTransactions(txnDTOs);
        return detailDTO;
    }

    public void disableUser(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) throw new WalletNotFoundException("User not found: " + userId);
        userMapper.updateRole(userId, "ROLE_DISABLED");
    }

    public void enableUser(Long userId) {
        User user = userMapper.findById(userId);
        if (user == null) throw new WalletNotFoundException("User not found: " + userId);
        userMapper.updateRole(userId, "ROLE_USER");
    }

    // listTransactions(), getTransactionStats() — 見原始碼
}
```

> AdminService 中的 Entity → DTO 轉換全部使用手動 setter 賦值（`dto.setId(u.getId())` 等），不使用 MapStruct 或 ModelMapper，目的在展示最傳統的 DTO 轉換方式。

---

### 模式 9：MyBatis Mapper（Java 介面 + XML）

**UserMapper.java**

```java
package com.digitalwallet.mapper;

import com.digitalwallet.model.User;
import org.apache.ibatis.annotations.Param;

import java.util.List;

public interface UserMapper {
    void insert(User user);
    User findByUsername(@Param("username") String username);
    User findById(@Param("id") Long id);
    List<User> findAllWithPagination(@Param("search") String search,
                                     @Param("offset") int offset,
                                     @Param("limit") int limit);
    int countAll(@Param("search") String search);
    int updateRole(@Param("id") Long id, @Param("role") String role);
}
```

> 所有參數使用 `@Param` 註解，確保 XML 中可以透過 `#{paramName}` 引用。MyBatis 3.0+ 對單一參數不需要 `@Param`，但為了可讀性全部顯式標註。

**UserMapper.xml**

```xml
<mapper namespace="com.digitalwallet.mapper.UserMapper">

    <resultMap id="userMap" type="com.digitalwallet.model.User">
        <id property="id" column="id"/>
        <result property="username" column="username"/>
        <result property="passwordHash" column="password_hash"/>
        <result property="role" column="role"/>
        <result property="createdAt" column="created_at"/>
    </resultMap>

    <insert id="insert" useGeneratedKeys="true" keyProperty="id" keyColumn="id">
        INSERT INTO users(username, password_hash, role)
        VALUES(#{username}, #{passwordHash}, #{role})
    </insert>

    <select id="findByUsername" resultMap="userMap">
        SELECT id, username, password_hash, role, created_at
        FROM users WHERE username = #{username}
    </select>

    <select id="findAllWithPagination" resultMap="userMap">
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

**WalletMapper.xml — 樂觀鎖扣款**

```xml
<mapper namespace="com.digitalwallet.mapper.WalletMapper">

    <resultMap id="walletMap" type="com.digitalwallet.model.Wallet">
        <id property="id" column="id"/>
        <result property="userId" column="user_id"/>
        <result property="currency" column="currency"/>
        <result property="balance" column="balance"/>
        <result property="version" column="version"/>
        <result property="updatedAt" column="updated_at"/>
    </resultMap>

    <!-- 樂觀鎖：WHERE 條件包含 version -->
    <update id="deductBalance">
        UPDATE wallets
        SET balance = balance - #{amount},
            version = version + 1,
            updated_at = NOW()
        WHERE user_id = #{userId} AND version = #{version}
    </update>

    <update id="addBalance">
        UPDATE wallets
        SET balance = balance + #{amount},
            version = version + 1,
            updated_at = NOW()
        WHERE user_id = #{userId}
    </update>
</mapper>
```

> `deductBalance` 的 WHERE 條件包含 `version = #{version}`，MyBatis 返回受影響的行數（0 表示 version 已變，即並發衝突）。這是經典的樂觀鎖實作。

**TransactionMapper.xml — 複雜查詢與 JOIN**

```xml
<mapper namespace="com.digitalwallet.mapper.TransactionMapper">

    <!-- Admin 查詢用的 resultMap，JOIN 了 users 表取得用戶名 -->
    <resultMap id="adminTransactionMap"
               type="com.digitalwallet.model.AdminTransactionDTO">
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

    <select id="getDailyVolume" resultType="com.digitalwallet.model.DailyVolumeDTO">
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

> `findAllWithFilters` 展示了 MyBatis 的動態 SQL（`<where>` + `<if>`），根據前端傳遞的篩選條件動態組裝 WHERE 子句。`LEFT JOIN` 從 `transactions` 一路關聯到 `wallets` 再到 `users` 以取得發送方和接收方的用戶名。

**關鍵配置**：`applicationContext.xml` 中的 `mapUnderscoreToCamelCase = true` 已處理欄位名稱的下劃線轉駝峰（例如 `from_wallet_id` → `fromWalletId`），但 `resultMap` 中仍顯式指定 column → property 對應以確保正確性和可讀性。

---

### 模式 10：Exception 處理

**基礎類別 — AppException.java**

```java
package com.digitalwallet.exception;

import lombok.Getter;

@Getter
public class AppException extends RuntimeException {
    private final int statusCode;

    public AppException(int statusCode, String message) {
        super(message);
        this.statusCode = statusCode;
    }
}
```

**子類別（全部手寫，無 Lombok）**

| 類別 | HTTP 狀態碼 | 使用場景 |
|------|-------------|----------|
| `AuthenticationException` | 401 | 登入失敗、密碼錯誤、帳號被停用 |
| `WalletNotFoundException` | 404 | 錢包或用戶不存在 |
| `InsufficientBalanceException` | 400 | 餘額不足 |
| `ConcurrentModificationException` | 409 | 樂觀鎖衝突（並發轉帳） |
| `DuplicateUsernameException` | 409 | 用戶名重複註冊 |

```java
// AuthenticationException.java
public class AuthenticationException extends AppException {
    public AuthenticationException(String message) {
        super(401, message);
    }
}

// InsufficientBalanceException.java
public class InsufficientBalanceException extends AppException {
    public InsufficientBalanceException(String message) {
        super(400, message);
    }
}

// ConcurrentModificationException.java
public class ConcurrentModificationException extends AppException {
    public ConcurrentModificationException(String message) {
        super(409, message);
    }
}
```

**GlobalExceptionHandler.java**

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse> handleAppException(AppException e) {
        return ResponseEntity.status(e.getStatusCode())
                .body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse> handleGeneric(Exception e) {
        log.error("Unhandled exception", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Internal server error"));
    }
}
```

> 三層例外處理機制：
> 1. `AppException` 及其子類：根據 statusCode 返回對應 HTTP 狀態碼，訊息直接返回給前端。
> 2. `IllegalArgumentException`（來自轉帳時的驗證邏輯）：返回 400。
> 3. `Exception`（未預期的錯誤）：記錄 log，返回通用 500 訊息（不洩漏內部實作細節）。

---

## 5. 資料庫表結構

資料庫：PostgreSQL 16，database `digital_wallet`

```sql
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
    version INT NOT NULL DEFAULT 0,            -- 樂觀鎖版本號
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

CREATE INDEX idx_transactions_from ON transactions(from_wallet_id);
CREATE INDEX idx_transactions_to ON transactions(to_wallet_id);
```

**欄位說明**：
- `users.role`：`ROLE_USER`（一般用戶）、`ROLE_ADMIN`（管理員）、`ROLE_DISABLED`（被停用）
- `wallets.balance`：`NUMERIC(18,4)` 精確十進制，避免浮點數誤差
- `wallets.version`：樂觀鎖版本號，每次扣款 +1
- `transactions.from_wallet_id`：可為 NULL（未來擴展如系統充值）
- 索引在 `from_wallet_id` 和 `to_wallet_id` 上以加速交易查詢

---

## 6. 數據流圖

### 6.1 註冊流程

```
Client                    AuthController         AuthService              Mapper                   DB
  |                             |                     |                      |                      |
  |--POST /api/auth/register--->|                     |                      |                      |
  |                             |--request----------->|                      |                      |
  |                             |                     |--BCrypt.encode------>|                      |
  |                             |                     |--userMapper.insert-->|--INSERT users------->|
  |                             |                     |                      |<--user (with id)-----|
  |                             |                     |--walletMapper.insert->|--INSERT wallets----->|
  |                             |                     |<--(commit)-----------|                      |
  |<--201 {success}-------------|<--ApiResponse-------|                      |                      |
```

### 6.2 登入流程

```
Client                    AuthController         AuthService              JwtUtil               Mapper
  |                             |                     |                      |                      |
  |--POST /api/auth/login------>|                     |                      |                      |
  |                             |--request----------->|                      |                      |
  |                             |                     |--findByUsername()----|--SELECT user-------->|
  |                             |                     |<--User---------------|                      |
  |                             |                     |--BCrypt.matches()    |                      |
  |                             |                     | (password check)    |                      |
  |                             |                     |--generateToken()---->|                      |
  |                             |                     |<--jwt string---------|                      |
  |<--200 {token, user}---------|<--LoginResponse-----|                      |                      |
```

### 6.3 轉帳流程（含樂觀鎖）

```
Client              TransactionController  TransactionService       WalletMapper            DB
  |                         |                     |                      |                      |
  |--POST /transfer-------->|                     |                      |                      |
  |                         |--transfer(userId,-->|                      |                      |
  |                         |   request)          |                      |                      |
  |                         |                     |--validate(amount>0) |                      |
  |                         |                     |--findByUsername()   |--SELECT to_user------>|
  |                         |                     |--check balance      |                      |
  |                         |                     |--deductBalance(     |                      |
  |                         |                     |  userId, amount,   |                      |
  |                         |                     |  version)----------->|                      |
  |                         |                     |                     |--UPDATE wallets      |
  |                         |                     |                     |  WHERE version=?---->|
  |                         |                     |                     |<--0 rows (conflict)--|
  |                         |                     | OR                  |                      |
  |                         |                     |                     |<--1 row (success)----|
  |                         |                     | (if 0 rows) throw   |                      |
  |                         |                     |  ConcurrentModExc   |                      |
  |                         |                     |--addBalance()------>|--UPDATE wallets +1-->|
  |                         |                     |--insert(tx)-------->|--INSERT transactions->|
  |                         |                     |<--(commit)----------|                      |
  |<--200 {success}---------|<--ApiResponse-------|                      |                      |
```

### 6.4 JWT 認證流程

```
Client              JwtAuthFilter          SecurityContext           Controller
  |                       |                      |                      |
  |--GET /api/wallets---->|                      |                      |
  |  (Authorization:      |                      |                      |
  |   Bearer eyJhb...)    |                      |                      |
  |                       |--extract token       |                      |
  |                       |--jwtUtil.isTokenValid|                      |
  |                       |--extractUserId       |                      |
  |                       |--extractRole         |                      |
  |                       |--setAuthentication-->|                      |
  |                       |  (userId, role)      |                      |
  |                       |--chain.doFilter()------------------->|      |
  |                       |                      |                      |--getCurrentUserId()
  |                       |                      |                      |--auth.getPrincipal()
  |                       |                      |                      |--process request
  |<--200 {wallet data}---|<---------------------|<---------------------|
```

### 6.5 授權失敗流程（401）

```
Client              JwtAuthFilter      Spring Security         RestAuthEntryPoint
  |                       |                   |                      |
  |--GET /api/admin------>|                   |                      |
  |  (no token)           |                   |                      |
  |                       |--no Bearer token  |                      |
  |                       |--chain.doFilter() |                      |
  |                       |                   |--check SecurityContext|
  |                       |                   |  (no Authentication)|
  |                       |                   |--intercept-url check |
  |                       |                   |  (needs auth)       |
  |                       |                   |--commence()-------->|
  |                       |                   |                      |--write 401 JSON
  |<--401 {status:"ERROR"}|<------------------|<---------------------|
  |         message:"..." |                   |                      |
```

### 6.6 Admin 用戶管理流程

```
Client (ROLE_ADMIN)    AdminController       AdminService            UserMapper/WalletMapper
  |                         |                     |                        |
  |--GET /admin/users------>|                     |                        |
  |                         |--listUsers()------->|                        |
  |                         |                     |--findAllWithPagination->|
  |                         |                     |--countAll()------------>|
  |                         |                     |--map → UserDTO[]       |
  |                         |                     |--build PaginatedResponse|
  |<--200 PaginatedResponse-|<--------------------|                        |
```

### 6.7 Admin 用戶詳情流程

```
Client (ROLE_ADMIN)    AdminController       AdminService            Mappers (User/Wallet/Tx)
  |                         |                     |                        |
  |--GET /admin/users/5---->|                     |                        |
  |                         |--getUserDetail(5)-->|                        |
  |                         |                     |--findById(5)---------->|
  |                         |                     |--findByUserId(5)------>|
  |                         |                     |--findRecentByWalletId->|
  |                         |                     |  (LIMIT 5)            |
  |                         |                     |--build UserDetailDTO   |
  |<--200 UserDetailDTO-----|<--------------------|                        |
```

### 6.8 Admin 停用／啟用用戶流程

```
Client (ROLE_ADMIN)    AdminController       AdminService            UserMapper
  |                         |                     |                      |
  |--PUT /admin/users/5    |                     |                      |
  |   /disable------------->|                     |                      |
  |                         |--disableUser(5)---->|                      |
  |                         |                     |--findById(5)-------->|
  |                         |                     |  (check exists)     |
  |                         |                     |--updateRole(        |
  |                         |                     |  5, "ROLE_DISABLED")->|
  |                         |                     |                     |--UPDATE users SET
  |                         |                     |                     |  role='ROLE_DISABLED'
  |<--200 {success}---------|<--------------------|                     |
```

### 6.9 Admin 交易統計流程

```
Client (ROLE_ADMIN)    AdminController       AdminService            TransactionMapper
  |                         |                     |                      |
  |--GET /admin/            |                     |                      |
  |  transactions/stats---->|                     |                      |
  |                         |--getTransactionStats->                    |
  |                         |                     |--parse dates        |
  |                         |                     |--getTransactionCount->|
  |                         |                     |--getTransactionTotal->|
  |                         |                     |--getDailyVolume()--->|
  |                         |                     |--build StatsDTO     |
  |<--200 TransactionStats--|<--------------------|                      |
```

---

## 7. 啟動方式

### 前置條件
- Java 21
- Maven 3.9+
- PostgreSQL 16，database `digital_wallet`（Port 5433）
- Tomcat 10.1（Jakarta EE 9+ 版本，非 javax 舊版）

### 步驟

**1. 初始化資料庫**

```bash
psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE digital_wallet;"
psql -h localhost -p 5433 -U postgres -d digital_wallet -f digital_wallet/src/main/resources/static/db.sql
```

**2. 編譯打包**

```bash
cd digital_wallet_springmvc
mvn clean package
```

產出 WAR 檔案：`target/digital_wallet_springmvc.war`

**3. 部署到 Tomcat**

```bash
cp target/digital_wallet_springmvc.war $TOMCAT_HOME/webapps/digital_wallet_springmvc.war
$TOMCAT_HOME/bin/startup.sh
```

應用可在 `http://localhost:8080/digital_wallet_springmvc/` 存取（取決於 WAR 檔名）。

> **注意**：Spring MVC 專案無法直接以 `java -jar` 執行（因為這是 `packaging=war`，沒有 embedded Tomcat）。這是與 Spring Boot JAR 最大的差別：Spring Boot 內嵌 Tomcat，一個 JAR 即可執行；Spring MVC 傳統專案必須將 WAR 部署到外部 Servlet Container（Tomcat 10.1）。

---

## 8. 設計決策問答

### Q1: 為什麼使用 XML 配置而非 annotation？

**A**: 這是 **教育性決策**。Spring Boot 的 annotation + auto-configuration 雖然開發效率高，但掩蓋了 Spring IoC 容器的底層運作機制。透過 XML `<bean>` 定義，開發者可以清楚看到：
- `DataSource` 如何建立、傳入哪些參數
- `SqlSessionFactory` 需要哪些依賴（`dataSource`、`mapperLocations`）
- Service 依賴哪些 Mapper
- Bean 之間的依賴關係在一個檔案中一目了然

這對於理解 Spring 容器的工作方式（Bean 建立 → 依賴注入 → 生命週期管理）至關重要。

### Q2: 為什麼不使用 Lombok？

**A**: 本專案的 Admin DTO（`AdminTransactionDTO`、`TransactionStatsDTO`、`DailyVolumeDTO`、`UserDetailDTO`、`PaginatedResponse`）全部手寫 getter/setter。這確保：
- 程式碼完全透明，沒有 annotation processor 生成隱式方法
- 適合教學：讀者可以直接看到每個屬性的 get/set 實作
- IDE refactoring 可以直接作用於實體方法
- 不依賴 IDE 的 Lombok plugin

Entity 層（`User`、`Wallet`、`Transaction`）使用 `@Data` 是為了簡潔，但核心 DTO 層保持純 Java 風格。

### Q3: 為什麼是 WAR 而非 JAR？

**A**: 傳統 Spring MVC 應用部署在外部 Servlet Container（Tomcat）中。WAR（Web Application Archive）是 Java EE/Jakarta EE 標準的 Web 應用打包格式，包含 `WEB-INF/web.xml` 部署描述符。相比之下，Spring Boot 的 executable JAR 內嵌 Tomcat，將 Servlet Container 作為應用的一部分。

### Q4: 為什麼使用 setter injection 而非 constructor injection？

**A**: 這是 XML 配置的歷史慣例。Spring XML `<property>` 標籤對應 Java 的 setter 方法。Setter injection 在傳統 Spring 應用中更常見，因為它能處理循環依賴（雖然不推薦），且 XML 中更容易表達。現代 Spring Boot 推薦 constructor injection（配合 `@Autowired`），但在 XML 配置中，setter injection 是更自然的選擇。

### Q5: 為什麼 DispatcherServlet 與 ContextLoaderListener 分開？

**A**: 這是 Spring MVC 的雙層 Context 架構：
- **Root Context**（父）：管理 Service、Repository、Security 等全域 Bean
- **Web Context**（子）：管理 Controller 等 Web 層 Bean

子 Context 可以訪問父 Context 的 Bean（所以 Controller 可以注入 Service），但反過來不行。這種分層確保了關注點分離，讓 Web 層只關注請求處理。

### Q6: 為什麼 `AdminController` 用 XML setter injection，其他 Controller 用 `@Autowired`？

**A**: 刻意混用兩種方式，展示它們可以在同一專案中共存。`dispatcher-servlet.xml` 中的 `<context:component-scan>` 自動掃描 `@RestController` 並透過 `@Autowired` 注入；而 `AdminController` 則在 `applicationContext.xml` 中明確定義，展示傳統的手動 Bean 註冊方式。

---

## 9. 安全紅線

| 紅線 | 實作方式 | 程式位置 |
|------|----------|----------|
| **密碼絕不明文儲存** | BCrypt 雜湊，`passwordEncoder.encode(password)` | `AuthService.java:33` |
| **JWT Secret 不硬編碼** | 從 `jwt.properties` 外部化配置 | `applicationContext.xml:54-57` |
| **IDOR 防護** | `userId` 永遠從 JWT 的 `auth.getPrincipal()` 提取，不從 URL 參數 | `WalletController.java:20`, `TransactionController.java:24-25` |
| **樂觀鎖防止雙花** | `deductBalance` 的 WHERE 條件包含 `version`，若 0 rows affected 拋出 409 | `WalletMapper.xml:27-30`, `TransactionService.java:57-60` |
| **Admin 端點權限控制** | `<intercept-url pattern="/api/admin/**" access="hasAuthority('ROLE_ADMIN')"/>` | `spring-security.xml:21` |
| **錯誤訊息不洩漏內部資訊** | `GlobalExceptionHandler` 對未知例外只返回 "Internal server error" | `GlobalExceptionHandler.java:30-34` |
| **Stateless Session** | `create-session="stateless"` 禁用 HTTP Session，每個請求獨立認證 | `spring-security.xml:13` |
| **停用用戶無法登入** | `AuthService.login()` 檢查 `ROLE_DISABLED` 角色 | `AuthService.java:60-62` |

---

## 10. 常見錯誤

### 錯誤 1：`ClassNotFoundException: jakarta.servlet.Filter`

**原因**：Tomcat 版本不匹配。Spring MVC 6.x 使用 Jakarta EE 9+（`jakarta.servlet.*`），需要 Tomcat 10.1+。Tomcat 9.x 仍使用 `javax.servlet.*`。

**解決方案**：升級到 Tomcat 10.1 或更新版本。

### 錯誤 2：`No mapping for GET /api/wallets`（404）

**原因**：`dispatcher-servlet.xml` 中的 `<context:component-scan>` 未掃描到 Controller，或 Controller 類別不在 `com.digitalwallet.controller` package 下。

**解決方案**：確認 Controller 上有 `@RestController` 和 `@RequestMapping` 註解，且 package 宣告與 `<context:component-scan>` 的 `base-package` 一致。

### 錯誤 3：WAR 部署後無法啟動（`NoClassDefFoundError: org/springframework/web/context/ContextLoaderListener`）

**原因**：Spring 依賴的 JAR 未包含在 WAR 中。

**解決方案**：確認使用 `mvn clean package`（而非 `mvn compile`），Maven 會自動將 `compile` scope 的依賴打包到 `WEB-INF/lib/`。

### 錯誤 4：`NullPointerException` 在 Service 中

**原因**：setter injection 未被執行。可能是 XML 中 `<property>` 名稱與 setter 方法名稱不匹配（`<property name="userMapper">` 對應 `setUserMapper()`，屬性名為 `userMapper`，首字母小寫）。

**解決方案**：檢查 `applicationContext.xml` 中 `<property name="...">` 的值是否與 Service 中 setter 方法名稱對應。

### 錯誤 5：`DuplicateKeyException: duplicate key value violates unique constraint "users_username_key"` 未被捕獲

**原因**：Spring 的 `DataIntegrityViolationException` 和 `DuplicateKeyException` 在不同資料庫驅動下行為可能不同。

**解決方案**：確保 `AuthService.register()` 中的 `catch` 區塊使用 `org.springframework.dao.DuplicateKeyException`（來自 `spring-jdbc`），而非 JDBC driver 原生的例外類別。

### 錯誤 6：樂觀鎖失效（同一時間多筆轉帳成功但餘額不同步）

**原因**：`deductBalance` 的 WHERE 條件中 `version` 參數未正確傳遞，或 Service 層讀取 `version` 後未傳入 Mapper。

**解決方案**：
1. 確認 `WalletMapper.deductBalance` 的 `@Param("version")` 參數名稱與 XML 中 `#{version}` 一致
2. 確認 `TransactionService.transfer()` 傳入 `fromWallet.getVersion()`
3. 在 `psql` 中手動測試：`UPDATE wallets SET balance = balance - 10, version = version + 1 WHERE user_id = 1 AND version = 3;` 查看返回的 affected rows

### 錯誤 7：JWT Token 過期後用戶收到 500 而非 401

**原因**：`JwtUtil.isTokenValid()` 已正確返回 `false`，但 `JwtAuthFilter` 在 token 無效時未拋出例外 —— 這是正確行為。問題可能出在 `GlobalExceptionHandler` 對某種特定 Exception 類別返回了 500。

**解決方案**：確認 `JwtUtil.parseClaims()` 中只 `catch (Exception e)`，將所有 JWT 例外（`ExpiredJwtException`、`MalformedJwtException`、`SignatureException` 等）統一轉換為 `isTokenValid() = false`。

### 錯誤 8：CORS 錯誤（前端無法存取 API）

**原因**：`CorsConfig.java` 返回的 `CorsConfiguration` 中 `allowedOrigins` 可能與前端實際 origin 不匹配，或 `allowedMethods` 缺少 OPTIONS。

**解決方案**：確認 `spring-security.xml` 中有 `<cors configuration-source-ref="corsConfig"/>`，且 `CorsConfig` 的 `setAllowedMethods` 包含 `"OPTIONS"`（瀏覽器 preflight 請求使用）。

---

## 11. 與其他版本對照

| 特性 | Spring MVC (本版) | Spring Boot | Node.js | FastAPI | Laravel | Plain PHP |
|------|-------------------|-------------|---------|---------|---------|-----------|
| 配置方式 | XML | annotation + YAML | JS config | Python decorators | PHP config | manual PHP |
| 依賴注入 | setter / XML | constructor / auto | manual | FastAPI Depends | Laravel Service Container | none |
| 打包 | WAR (Tomcat) | JAR (embedded) | Node process | uvicorn | PHP-FPM | PHP built-in |
| Lombok | partial | full | N/A | N/A | N/A | N/A |
| 開發體驗 | 傳統，verbose | 現代，convention-over-config | 輕量，非同步 | 類型安全，async | 全棧框架 | 最底層，零框架 |
| 學習價值 | 理解 Spring 底層 | 快速開發 | JS 生態 | Python 生態 | PHP 生態 | HTTP 底層 |

---

> 本專案是 **技術驗證／參考實作**，展示 Spring Boot 出現前的傳統 Spring 開發方式。所有程式碼均為可運行的實作，非概念性偽代碼。歡迎與其他五個後端版本對照閱讀。
