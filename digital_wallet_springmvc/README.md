# Digital Wallet Backend — Spring MVC（傳統 XML 配置）版 (Demo)

> **技術驗證 / 抄作業項目**：用傳統 Spring MVC + XML 配置（無 Spring Boot）複現數位錢包的所有功能。展示老式 Java Web 專案的底層配置：`web.xml`、Spring XML bean 定義、手動事務管理。**API 合約與其他四個後端完全一致**，前端 `digital_wallet_frontend` 無需任何改動即可對接。

## 五版本技術對照

| 功能 | Spring Boot | Spring MVC（傳統） | FastAPI | Laravel | 純 PHP |
|------|------------|-------------------|---------|---------|--------|
| 語言 | Java 21 | Java 21 | Python 3.12+ | PHP 8.3+ | PHP 8.3+ |
| Web 框架 | Spring Boot 3.5 | **Spring MVC 6.2** | FastAPI 0.115+ | Laravel 11 | **無** |
| 配置方式 | `application.yaml` + 自動配置 | **`web.xml` + Spring XML** | Pydantic Settings | `.env` + config | 無（getenv） |
| ORM / DB | MyBatis XML SQL | **MyBatis + 手動 SqlSessionFactory** | SQLAlchemy async | Eloquent | 原生 PDO |
| Bean 管理 | `@Component` 自動掃描 | **XML `<bean>` 顯式定義** | FastAPI Depends | Laravel Container | 無（直接 new） |
| 事務管理 | `@Transactional` 自動 | **`<tx:annotation-driven>` + DataSourceTransactionManager** | `session.begin()` | `DB::transaction()` | 手動 begin/commit |
| Security | `SecurityFilterChain` @Bean | **`<security:http>` XML** | PyJWT + Depends | JwtMiddleware | 靜態方法 |
| 伺服器 | 內嵌 Tomcat | **外部 Tomcat（WAR 部署）** | Uvicorn | PHP-FPM | `php -S` |
| 打包 | Fat JAR | **WAR** | — | — | — |

## 技術清單

| 技術 | 版本 | 用途 |
|------|------|------|
| Java | 21 | 核心語言 |
| Spring MVC | 6.2.11 | Web 框架（無 Boot） |
| Spring Security | 6.5.5 | 認證與授權（XML 配置） |
| MyBatis | 3.0.5 | SQL 映射 ORM |
| MyBatis-Spring | 3.0.5 | Spring 整合 |
| HikariCP | 6.3.2 | 連線池 |
| PostgreSQL | 16（42.7.7 驅動） | 關聯式資料庫 |
| JWT (jjwt) | 0.11.5 | 無狀態 Token 認證 |
| Jackson | 2.18.3 | JSON 序列化 |
| Lombok | 1.18.38 | 減少樣板程式碼 |
| Tomcat | 10+ | Servlet 容器 |

---

## 完整專案結構

```
digital_wallet_springmvc/
├── pom.xml                                     # Maven 依賴（無 spring-boot-starter）
│
├── src/main/
│   ├── webapp/
│   │   └── WEB-INF/
│   │       ├── web.xml                         # DispatcherServlet + ContextLoaderListener + Security Filter
│   │       ├── applicationContext.xml          # 根上下文：DataSource, MyBatis, Tx, Service Bean
│   │       ├── dispatcher-servlet.xml          # Web 上下文：Controller 掃描
│   │       └── spring-security.xml             # Security：無狀態 JWT, CSRF 關閉
│   │
│   ├── resources/
│   │   ├── jdbc.properties                     # 資料庫連線（PostgreSQL 5433）
│   │   ├── jwt.properties                      # JWT secret / expiration
│   │   └── mapper/                             # MyBatis SQL XML
│   │       ├── UserMapper.xml                  #   插入用戶、按 username 查詢
│   │       ├── WalletMapper.xml                #   插入錢包、按 userId 查詢、樂觀鎖扣款、加款
│   │       └── TransactionMapper.xml           #   插入交易、按 walletId 查詢歷史
│   │
│   └── java/com/digitalwallet/
│       ├── controller/
│       │   ├── AuthController.java             # POST /api/auth/register, /login
│       │   ├── WalletController.java           # GET /api/wallets
│       │   ├── TransactionController.java      # POST /api/transactions/transfer, GET /api/transactions
│       │   └── GlobalExceptionHandler.java     # @RestControllerAdvice：統一 JSON 錯誤
│       │
│       ├── service/
│       │   ├── AuthService.java                # register（BCrypt + 查重 + 創建錢包）, login
│       │   ├── WalletService.java              # getByUserId（查詢 + DTO 轉換）
│       │   └── TransactionService.java         # transfer（樂觀鎖 + @Transactional）, getHistory
│       │
│       ├── mapper/
│       │   ├── UserMapper.java                 # MyBatis interface（insert, findByUsername）
│       │   ├── WalletMapper.java               # MyBatis interface（insert, findByUserId, 樂觀鎖）
│       │   └── TransactionMapper.java          # MyBatis interface（insert, findByWalletId）
│       │
│       ├── model/
│       │   ├── User.java                       # 對應 users 表
│       │   ├── Wallet.java                     # 對應 wallets 表（含 version 樂觀鎖欄位）
│       │   ├── Transaction.java                # 對應 transactions 表
│       │   ├── ApiResponse.java                # { status, message } 統一回應
│       │   ├── LoginRequest.java               # { username, password }
│       │   ├── LoginResponse.java              # { token, user }
│       │   ├── TransferRequest.java            # { toUsername, amount }
│       │   ├── UserDTO.java                    # 不含 passwordHash 的安全 DTO
│       │   ├── WalletDTO.java
│       │   └── TransactionDTO.java
│       │
│       ├── exception/
│       │   ├── AppException.java               # 基礎業務異常（statusCode + message）
│       │   ├── AuthenticationException.java    # 401
│       │   ├── InsufficientBalanceException.java # 400
│       │   ├── WalletNotFoundException.java    # 404
│       │   ├── ConcurrentModificationException.java # 409
│       │   └── DuplicateUsernameException.java # 409
│       │
│       ├── security/
│       │   ├── JwtAuthFilter.java              # OncePerRequestFilter：Bearer Token → SecurityContext
│       │   ├── RestAuthEntryPoint.java         # 401 → JSON（非 Spring Boot 預設）
│       │   └── CorsConfig.java                 # CORS 配置
│       │
│       └── util/
│           └── JwtUtil.java                    # generateToken / extractUserId / isTokenValid
```

---

## 與 Spring Boot 版的關鍵差異：XML 配置 vs 自動配置

> 如果你已經看過 `digital_wallet`（Spring Boot 版），以下是這個傳統版本最核心的差異：

### Bean 定義：XML vs 自動掃描

**Spring Boot 版**用 `@Component` + `@Service` 自動掃描：

```java
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final UserMapper userMapper;
    // Spring 自動注入
}
```

**Spring MVC 版**用 XML `<bean>` 顯式定義，setter 注入：

```xml
<!-- applicationContext.xml -->
<bean id="authService" class="com.digitalwallet.service.AuthService">
    <property name="userMapper" ref="userMapper"/>
    <property name="walletMapper" ref="walletMapper"/>
    <property name="passwordEncoder" ref="passwordEncoder"/>
    <property name="jwtUtil" ref="jwtUtil"/>
</bean>
```

```java
// AuthService.java — 無 @Service、無 @Autowired
public class AuthService {
    private UserMapper userMapper;
    public void setUserMapper(UserMapper userMapper) { this.userMapper = userMapper; }
}
```

**為什麼用 setter 注入而不是 constructor 注入：**
- XML `<property>` 對應 Java setter 方法，這是傳統 Spring 的標準做法
- 如果用 constructor 注入，需要在 XML 中用 `<constructor-arg>` 並嚴格按照參數順序

### DataSource + MyBatis：手動組裝 vs Starter

**Spring Boot 版**一行 `application.yaml` + `mybatis-spring-boot-starter` 自動完成：

```yaml
spring.datasource.url: jdbc:postgresql://localhost:5433/digital_wallet
mybatis.mapper-locations: classpath:mapper/*.xml
```

**Spring MVC 版**需要手動定義三個 bean：

```xml
<!-- DataSource -->
<bean id="dataSource" class="com.zaxxer.hikari.HikariDataSource" destroy-method="close">
    <property name="driverClassName" value="${jdbc.driver}"/>
    <property name="jdbcUrl" value="${jdbc.url}"/>
    <property name="username" value="${jdbc.username}"/>
    <property name="password" value="${jdbc.password}"/>
</bean>

<!-- SqlSessionFactory -->
<bean id="sqlSessionFactory" class="org.mybatis.spring.SqlSessionFactoryBean">
    <property name="dataSource" ref="dataSource"/>
    <property name="mapperLocations" value="classpath:mapper/*.xml"/>
    <!-- snake_case → camelCase：讓 DB 的 password_hash 自動映射到 passwordHash -->
    <property name="configuration">
        <bean class="org.apache.ibatis.session.Configuration">
            <property name="mapUnderscoreToCamelCase" value="true"/>
        </bean>
    </property>
</bean>

<!-- Mapper Scanner -->
<bean class="org.mybatis.spring.mapper.MapperScannerConfigurer">
    <property name="basePackage" value="com.digitalwallet.mapper"/>
    <property name="sqlSessionFactoryBeanName" value="sqlSessionFactory"/>
</bean>
```

**為什麼 mapper XML 要用 `resultMap` 而不是 `resultType`：**
- `resultType = "com.digitalwallet.model.User"` 依賴 MyBatis 隱式映射
- 改用 `<resultMap>` + 顯式 `<result column="password_hash" property="passwordHash"/>` 更明確
- 雙層保障：`mapUnderscoreToCamelCase` 作為全局配置 + `resultMap` 作為每個查詢的顯式映射
- 生產環境不應使用 `SELECT *`，每個查詢都明確列出所需欄位

**為什麼需要 MapperScannerConfigurer：**
- MyBatis Mapper 是 interface，沒有實現類，無法用 `<bean>` 定義
- `MapperScannerConfigurer` 掃描指定 package，自動為每個 Mapper interface 創建 JDK 動態代理

### Spring Security：XML namespace vs @Bean

**Spring Boot 版**用 Java Config：

```java
@Bean
public SecurityFilterChain filterChain(HttpSecurity http) {
    http.csrf(csrf -> csrf.disable())
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/**").permitAll()
            .anyRequest().authenticated()
        );
}
```

**Spring MVC 版**用 XML namespace：

```xml
<http auto-config="false" use-expressions="true"
      create-session="stateless"
      entry-point-ref="restAuthEntryPoint">
    <csrf disabled="true"/>
    <cors configuration-source-ref="corsConfig"/>
    <intercept-url pattern="/api/auth/**" access="permitAll()"/>
    <intercept-url pattern="/api/**" access="isAuthenticated()"/>
    <custom-filter ref="jwtAuthFilter" before="PRE_AUTH_FILTER"/>
</http>
```

### 屬性注入：PropertyPlaceholderConfigurer vs @Value

**Spring Boot 版**用 `@Value("${jwt.secret}")` 自動注入。

**Spring MVC 版**需要先註冊 `PropertyPlaceholderConfigurer`：

```xml
<context:property-placeholder location="classpath:jdbc.properties"/>
<context:property-placeholder location="classpath:jwt.properties"/>
```

然後在 bean 定義中使用 `${}` 佔位符：

```xml
<bean id="jwtUtil" class="com.digitalwallet.util.JwtUtil">
    <property name="secret" value="${jwt.secret}"/>
    <property name="expiration" value="${jwt.expiration}"/>
</bean>
```

### 啟動方式：web.xml vs main()

**Spring Boot**：`java -jar app.jar` — 內嵌 Tomcat，一行指令啟動。

**Spring MVC**：
1. `mvn clean package` → 產出 WAR
2. 將 WAR 放到 Tomcat 的 `webapps/` 目錄
3. 啟動 Tomcat（`startup.sh`）
4. Tomcat 讀取 `web.xml` → 初始化 Spring 容器 → 掛載 DispatcherServlet

`web.xml` 中定義了兩個關鍵元件：

```xml
<!-- Root ApplicationContext：Service, Mapper, DataSource -->
<listener>
    <listener-class>org.springframework.web.context.ContextLoaderListener</listener-class>
</listener>

<!-- DispatcherServlet 掛在 /，Controller 自行帶 /api 前綴 -->
<servlet>
    <servlet-name>dispatcher</servlet-name>
    <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
    <load-on-startup>1</load-on-startup>
</servlet>
<servlet-mapping>
    <servlet-name>dispatcher</servlet-name>
    <url-pattern>/</url-pattern>
</servlet-mapping>
```

**為什麼 Servlet 掛 `/` 而不是 `/api/*`：**
- Controller 使用 `@RequestMapping("/api/...")` 定義路徑
- 如果 Servlet 也掛 `/api/*`，實際路徑會變成 `/api/api/...`
- 把 Servlet 掛 `/` 是最乾淨的做法：Controller 自行管理 `/api` 前綴，Servlet 不疊加
- 同時確保 Spring Security 的 `<intercept-url pattern="/api/**">` 規則直接匹配到正確的外部路徑

**為什麼分兩個上下文：**
- Root Context（`ContextLoaderListener` 載入）：Service、Mapper、DataSource — 全局共享
- Web Context（`DispatcherServlet` 載入）：Controller — 可以有多個 DispatcherServlet
- Controller 可以通過 `@Autowired` 引用 Root Context 中的 Bean

---

## 如何快速找到要抄的部分

| 你想學/抄什麼 | Spring MVC 檔案 | 對應 Spring Boot | 對應 FastAPI | 對應 Laravel | 對應 純 PHP |
|-------------|----------------|-----------------|-------------|-------------|------------|
| Maven 依賴 | [pom.xml](pom.xml) | pom.xml | requirements.txt | composer.json | composer.json |
| web.xml + Spring 啟動 | [web.xml](src/main/webapp/WEB-INF/web.xml) | @SpringBootApplication | main.py | bootstrap/app.php | public/index.php |
| Bean 定義（DataSource, MyBatis, Tx） | [applicationContext.xml](src/main/webapp/WEB-INF/applicationContext.xml) | application.yaml | config.py | config/database.php | src/Config/Database.php |
| Controller 掃描 | [dispatcher-servlet.xml](src/main/webapp/WEB-INF/dispatcher-servlet.xml) | @ComponentScan | APIRouter | routes/api.php | match() |
| Security XML 配置 | [spring-security.xml](src/main/webapp/WEB-INF/spring-security.xml) | SecurityConfig.java | deps.py | JwtMiddleware | src/Middleware/ |
| MyBatis Mapper interface | [mapper/](src/main/java/com/digitalwallet/mapper/) | mapper/ | models/ | app/Models/ | 原生 SQL |
| MyBatis SQL XML | [UserMapper.xml](src/main/resources/mapper/UserMapper.xml) | mapper/*.xml | — | — | 原生 PDO |
| Service（業務邏輯） | [service/](src/main/java/com/digitalwallet/service/) | service/impl/ | services/ | app/Services/ | src/Service/ |
| Controller（REST） | [controller/](src/main/java/com/digitalwallet/controller/) | controller/ | api/ | Controllers/ | switch() |
| JWT 生成/驗證 | [JwtUtil.java](src/main/java/com/digitalwallet/util/JwtUtil.java) | JwtUtil.java | security.py | JwtHelper.php | src/Util/JwtHelper.php |
| JWT Filter | [JwtAuthFilter.java](src/main/java/com/digitalwallet/security/JwtAuthFilter.java) | JwtAuthenticationFilter.java | deps.py | JwtMiddleware | src/Middleware/ |
| 異常處理 | [GlobalExceptionHandler.java](src/main/java/com/digitalwallet/controller/GlobalExceptionHandler.java) | GlobalExceptionHandler.java | handlers.py | Exceptions::render() | try/catch |
| DB Schema | [mapper XML](src/main/resources/mapper/) | db.sql | db.sql | migrations/ | schema.sql |

---

## API 端點（五版本完全一致）

| 方法 | 路徑 | JWT | 請求體 | 響應 | HTTP |
|------|------|-----|--------|------|------|
| POST | `/api/auth/register` | 否 | `{"username":"alice","password":"123456"}` | `{"status":"SUCCESS","message":"User registered successfully"}` | 201 |
| POST | `/api/auth/login` | 否 | `{"username":"alice","password":"123456"}` | `{"token":"eyJ...","user":{"id":1,"username":"alice","role":"ROLE_USER","createdAt":"..."}}` | 200 |
| GET | `/api/wallets` | 是 | — | `{"id":1,"userId":1,"currency":"USDT","balance":100.0000,"version":3,"updatedAt":"..."}` | 200 |
| POST | `/api/transactions/transfer` | 是 | `{"toUsername":"bob","amount":50.00}` | `{"status":"SUCCESS","message":"Transfer completed successfully"}` | 200 |
| GET | `/api/transactions` | 是 | — | `[{...TransactionDTO}, ...]` | 200 |


## 錯誤響應格式

```json
{"status": "ERROR", "message": "..."}
```

| HTTP | 異常類 | 場景 |
|------|------|------|
| 400 | `InsufficientBalanceException` | 餘額不足 |
| 400 | `IllegalArgumentException` | amount <= 0、自己轉給自己、recipient 不存在 |
| 401 | `AuthenticationException` | 登入失敗、Token 無效/過期 |
| 404 | `WalletNotFoundException` | 錢包不存在 |
| 409 | `ConcurrentModificationException` | 樂觀鎖版本衝突 |
| 409 | `DuplicateUsernameException` | 用戶名重複 |
| 500 | `Exception` (fallback) | 未預期錯誤 |

---

## 核心實作模式

### 1. 雙上下文架構（web.xml）

```xml
<!-- Root Context：Service、Mapper、DataSource（全域共享） -->
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

<!-- Web Context：Controller（可有多個 DispatcherServlet） -->
<servlet>
    <servlet-name>dispatcher</servlet-name>
    <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
    <init-param>
        <param-name>contextConfigLocation</param-name>
        <param-value>/WEB-INF/dispatcher-servlet.xml</param-value>
    </init-param>
</servlet>
```

**為什麼分兩個上下文：**
- Root Context（`ContextLoaderListener`）：Service、Mapper、DataSource、Security — 全局唯一
- Web Context（`DispatcherServlet`）：Controller、ExceptionHandler — 可有多個 DispatcherServlet 各自管理
- Controller 可以直接 `@Autowired` 引用 Root Context 中的 Service bean

### 2. Service Bean 定義（XML 顯式裝配）

```xml
<!-- applicationContext.xml -->
<bean id="transactionService" class="com.digitalwallet.service.TransactionService">
    <property name="userMapper" ref="userMapper"/>
    <property name="walletMapper" ref="walletMapper"/>
    <property name="transactionMapper" ref="transactionMapper"/>
</bean>
```

```java
// TransactionService.java — 無 @Service，setter 注入
public class TransactionService {
    private UserMapper userMapper;
    private WalletMapper walletMapper;
    private TransactionMapper transactionMapper;

    public void setUserMapper(UserMapper userMapper) { this.userMapper = userMapper; }
    public void setWalletMapper(WalletMapper walletMapper) { this.walletMapper = walletMapper; }
    public void setTransactionMapper(TransactionMapper m) { this.transactionMapper = m; }

    @Transactional  // 需要 <tx:annotation-driven> 在 XML 中啟用
    public void transfer(Long fromUserId, TransferRequest request) {
        // 6 步業務邏輯：驗證 → 查 recipient → self-transfer guard → 餘額 → 樂觀鎖 → 入賬
    }
}
```

**為什麼不用 `@Service` + `@Autowired` 自動掃描：**
- 這個版本刻意展示傳統 XML 配置方式
- `<property name="userMapper" ref="userMapper"/>` 明確表達依賴關係
- Spring Boot 普及之前，幾乎所有企業級 Spring 專案都這樣寫

### 3. 交易管理：`<tx:annotation-driven>`

```xml
<bean id="transactionManager" class="org.springframework.jdbc.datasource.DataSourceTransactionManager">
    <property name="dataSource" ref="dataSource"/>
</bean>
<tx:annotation-driven transaction-manager="transactionManager"/>
```

**與 Spring Boot 的差異：**
- Boot：`@Transactional` 開箱即用（`DataSourceTransactionManager` 自動配置）
- 傳統：必須顯式定義 `DataSourceTransactionManager` bean + `<tx:annotation-driven>`
- `<tx:annotation-driven>` 背後是 Spring AOP，會在運行時為標記了 `@Transactional` 的方法創建代理

### 4. Spring Security XML 配置

```xml
<http auto-config="false" use-expressions="true"
      create-session="stateless"
      entry-point-ref="restAuthEntryPoint">
    <csrf disabled="true"/>
    <cors configuration-source-ref="corsConfig"/>

    <intercept-url pattern="/api/auth/**" access="permitAll()"/>
    <intercept-url pattern="/api/**" access="isAuthenticated()"/>

    <!-- JWT Filter 插入到 PRE_AUTH_FILTER 之前 -->
    <custom-filter ref="jwtAuthFilter" before="PRE_AUTH_FILTER"/>
</http>
```

**關鍵設計決策：**
- `create-session="stateless"`：不做伺服器端 session，每次請求都從 JWT 驗證身份
- `entry-point-ref="restAuthEntryPoint"`：認證失敗時返回 JSON（而非 Spring Security 預設的 redirect 到登入頁）
- `custom-filter before="PRE_AUTH_FILTER"`：在 Spring Security 的預設認證過濾器之前插入 JWT 驗證

### 5. JWT 過濾器

```java
public class JwtAuthFilter extends OncePerRequestFilter {
    private JwtUtil jwtUtil;
    public void setJwtUtil(JwtUtil jwtUtil) { this.jwtUtil = jwtUtil; }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtUtil.isTokenValid(token)) {
                Long userId = jwtUtil.extractUserId(token);
                // 將 userId 設為 SecurityContext 的 principal
                SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(userId, null, Collections.emptyList())
                );
            }
        }
        chain.doFilter(request, response);
    }
}
```

**為什麼 implement `OncePerRequestFilter`：**
- 保證每個請求只執行一次（Spring 內部可能多次 dispatch）
- Controller 通過 `SecurityContextHolder.getContext().getAuthentication().getPrincipal()` 取得 userId

### 6. Controller 層

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

    // 從 SecurityContext 取得當前用戶 ID（由 JwtAuthFilter 寫入）
    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (Long) auth.getPrincipal();
    }
}
```

**為什麼 Controller 可以用 `@Autowired` 而 Service 不行：**
- Controller 在 Web Context（`dispatcher-servlet.xml`）中，使用 `<context:component-scan>` 掃描
- Service 在 Root Context（`applicationContext.xml`）中，用 XML `<bean>` 顯式定義
- 這是故意展示兩種配置方式的混用：Web 層用註解，業務層用 XML

**為什麼要 `@Valid @RequestBody` 而不是只 `@RequestBody`：**
- `@Valid` 觸發 Jakarta Bean Validation（Hibernate Validator）
- `LoginRequest` 上定義了 `@NotBlank` 約束（username / password 不可為空）
- `TransferRequest` 上定義了 `@NotBlank`（toUsername）和 `@NotNull`（amount）
- 不合規的請求在 Controller 入口就會被攔截 → 400，不需等到 Service 層
- 與 Spring Boot 版和其他後端保持一致的輸入驗證邊界

### 7. 樂觀鎖（Optimistic Locking）

```xml
<!-- WalletMapper.xml -->
<update id="deductBalance">
    UPDATE wallets
    SET balance = balance - #{amount},
        version = version + 1,
        updated_at = NOW()
    WHERE user_id = #{userId}
      AND version = #{version}   <!-- 樂觀鎖條件 -->
</update>
```

```java
int deducted = walletMapper.deductBalance(fromUserId, amount, fromWallet.getVersion());
if (deducted == 0) {
    throw new ConcurrentModificationException(
        "Concurrent modification detected for userId: " + fromUserId);
}
```

**工作原理：**
1. 讀取 wallet 時一併讀取當前 `version`
2. UPDATE 時帶 `WHERE version = ?` 條件
3. 如果另一個請求先更新了這筆記錄，version 會 +1
4. 當前請求的 WHERE 條件就不匹配 → `deducted == 0` → 拋出 409

---

## 啟動方式

```bash
# 1. 編譯 + 打包 WAR
mvn clean package

# 2. 將 target/digital_wallet_springmvc.war 放到 Tomcat webapps/
cp target/digital_wallet_springmvc.war $TOMCAT_HOME/webapps/

# 3. 啟動 Tomcat
$TOMCAT_HOME/bin/startup.sh       # Linux/Mac
$TOMCAT_HOME/bin/startup.bat      # Windows

# 4. 驗證
curl -X POST http://localhost:8080/digital_wallet_springmvc/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"123456"}'

# 或在 IntelliJ 中直接配置 Tomcat Run Configuration
```

**注意：** 這個專案沒有內嵌伺服器（無 Spring Boot），必須部署到外部 Tomcat 10+ 才能運行。

---

## 五版本程式碼量對比

| 關注點 | Spring Boot | Spring MVC | FastAPI | Laravel | 純 PHP |
|------|------------|-----------|---------|---------|--------|
| 配置（XML/YAML/Properties） | ~15 | **~120** | ~10 | ~20 | — |
| JWT + 安全 | ~60 | ~65 | ~50 | ~55 | ~45 |
| 密碼處理 | ~5 | ~5 | ~4 | ~3 | ~3 |
| 樂觀鎖 + 轉賬 | ~60 | ~65 | ~40 | ~45 | ~45 |
| 異常處理 | ~55 | ~45 | ~35 | ~35 | ~35 |
| API 路由 + Controller | ~40 | ~55 | ~30 | ~45 | ~45 |
| Model/DTO | ~120 | ~120 | ~100 | ~50 | ~50 |
| **總計** | **~375** | **~475** | **~286** | **~253** | **~263** |

Spring MVC 版程式碼量最大，主要因為 XML 配置（`web.xml` + 4 個 Spring XML ~120 行）和顯式 bean 裝配。這正好展示了 Spring Boot 的自動配置幫開發者節省了多少底層工作。純 PHP 和 Laravel 版最精簡。
