# Digital Wallet Backend — Spring MVC（傳統 XML 配置）版 (Demo)

> **技術驗證 / 抄作業項目**：用傳統 Spring MVC + XML 配置（無 Spring Boot）複現數位錢包的所有功能。展示老式 Java Web 專案的底層配置：`web.xml`、Spring XML bean 定義、手動事務管理。**API 合約與其他四個後端完全一致**，前端 `digital_wallet_frontend` 無需任何改動即可對接。

## 六版本技術對照

| 功能 | Spring Boot | Spring MVC | Node.js | FastAPI | Laravel | 純 PHP |
|------|------------|-------------------|---------|---------|--------|
| 語言 | Java 21 | Java 21 | JavaScript | Python 3.12+ | PHP 8.3+ | PHP 8.3+ |
| Web 框架 | Spring Boot 3.5 | **Spring MVC 6.2** | Express.js 4 | FastAPI 0.115+ | Laravel 11 | **無** |
| 配置方式 | `application.yaml` | **`web.xml` + XML** | `.env` | Pydantic Settings | `.env` | 無 |
| ORM / DB | MyBatis XML | **MyBatis + 手動** | pg + 手寫 SQL | SQLAlchemy async | Eloquent | 原生 PDO |
| Bean/DI | `@Component` | **XML `<bean>`** | — | FastAPI Depends | Laravel Container | 無 |
| 事務管理 | `@Transactional` | **`<tx:annotation-driven>`** | BEGIN/COMMIT | `session.begin()` | `DB::transaction()` | 手動 |
| Security | `SecurityFilterChain` | **`<security:http>` XML** | auth middleware | PyJWT + Depends | JwtMiddleware | 靜態方法 |
| 伺服器 | 內嵌 Tomcat | **外部 Tomcat** | 內建 | Uvicorn | PHP-FPM | `php -S` |
| 打包 | Fat JAR | **WAR** | — | — | — | — |

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

## API 端點（六版本完全一致）

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

## 核心實作模式（每個檔案都有完整程式碼 + 解釋）

### 模式 1：Maven WAR 專案初始化

#### pom.xml — 手動管理所有依賴版本（無 Spring Boot BOM）

```xml
<groupId>com.digitalwallet</groupId>
<artifactId>digital_wallet_springmvc</artifactId>
<packaging>war</packaging>

<properties>
    <spring.version>6.2.11</spring.version>
    <spring-security.version>6.5.5</spring-security.version>
    <mybatis.version>3.0.5</mybatis.version>
</properties>

<dependencies>
    <!-- Spring MVC（無 Boot） -->
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
    <!-- MyBatis + MyBatis-Spring -->
    <dependency>
        <groupId>org.mybatis</groupId>
        <artifactId>mybatis</artifactId>
        <version>${mybatis.version}</version>
    </dependency>
    <!-- PostgreSQL、HikariCP、Jackson、jjwt、Lombok、jakarta.servlet-api（provided） -->
</dependencies>

<build>
    <plugins>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-war-plugin</artifactId>
            <version>3.4.0</version>
        </plugin>
    </plugins>
</build>
```

**為什麼用 `maven-war-plugin` 而不是 `spring-boot-maven-plugin`：**
- 這個版本刻意展示傳統 WAR 部署，不用 Boot 的 fat JAR
- WAR 部署到外部 Tomcat，而不是內嵌 Tomcat

#### jdbc.properties + jwt.properties — 環境配置分離

```properties
# jdbc.properties
jdbc.driver=org.postgresql.Driver
jdbc.url=jdbc:postgresql://localhost:5433/digital_wallet
jdbc.username=postgres
jdbc.password=root

# jwt.properties
jwt.secret=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
jwt.expiration=86400000
```

**為什麼用 `.properties` 而不是 `.yaml`：**
- 傳統 Spring 專案慣例
- `PropertyPlaceholderConfigurer` 原生支援 `.properties` 格式
- 與 Spring Boot 版的 `.yaml` 對照，展示兩種配置風格

---

### 模式 2：web.xml — Servlet 生命週期入口

```xml
<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee" version="6.0">
    <!-- Root ApplicationContext：DataSource、MyBatis、Service、Security -->
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

    <!-- Spring Security Filter -->
    <filter>
        <filter-name>springSecurityFilterChain</filter-name>
        <filter-class>org.springframework.web.filter.DelegatingFilterProxy</filter-class>
    </filter>
    <filter-mapping>
        <filter-name>springSecurityFilterChain</filter-name>
        <url-pattern>/*</url-pattern>
    </filter-mapping>

    <!-- DispatcherServlet: Controller + ExceptionHandler -->
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

**為什麼分兩個上下文：**
- **Root Context**（`ContextLoaderListener`）：Service、Mapper、DataSource、Security — 全局共享
- **Web Context**（`DispatcherServlet`）：Controller、ExceptionHandler — 可有多個 DispatcherServlet
- Controller 用 `@Autowired` 引用 Root Context 中的 Bean

**為什麼 `<url-pattern>/</url-pattern>` 而不是 `/api/*`：**
- Controller 已經使用 `@RequestMapping("/api/...")` 定義前綴
- Servlet 再加 `/api/*` 會造成路徑重複 → `/api/api/...`
- 掛 `/` 是確保 Controller 路徑即外部 URL 的最乾淨做法

---

### 模式 3：applicationContext.xml — Root Context Bean 定義

```xml
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:context="http://www.springframework.org/schema/context"
       xmlns:tx="http://www.springframework.org/schema/tx">

    <!-- 載入 properties -->
    <context:property-placeholder location="classpath:jdbc.properties"/>
    <context:property-placeholder location="classpath:jwt.properties"/>

    <!-- HikariCP DataSource -->
    <bean id="dataSource" class="com.zaxxer.hikari.HikariDataSource" destroy-method="close">
        <property name="driverClassName" value="${jdbc.driver}"/>
        <property name="jdbcUrl" value="${jdbc.url}"/>
        <property name="username" value="${jdbc.username}"/>
        <property name="password" value="${jdbc.password}"/>
    </bean>

    <!-- MyBatis SqlSessionFactory — 手動配置 snake_case → camelCase -->
    <bean id="sqlSessionFactory" class="org.mybatis.spring.SqlSessionFactoryBean">
        <property name="dataSource" ref="dataSource"/>
        <property name="mapperLocations" value="classpath:mapper/*.xml"/>
        <property name="configuration">
            <bean class="org.apache.ibatis.session.Configuration">
                <property name="mapUnderscoreToCamelCase" value="true"/>
            </bean>
        </property>
    </bean>

    <!-- MapperScannerConfigurer — 自動掃描 Mapper interface -->
    <bean class="org.mybatis.spring.mapper.MapperScannerConfigurer">
        <property name="basePackage" value="com.digitalwallet.mapper"/>
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

    <!-- JWT Utility -->
    <bean id="jwtUtil" class="com.digitalwallet.util.JwtUtil">
        <property name="secret" value="${jwt.secret}"/>
        <property name="expiration" value="${jwt.expiration}"/>
    </bean>

    <!-- Service Beans — setter 注入 -->
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
</beans>
```

**為什麼用 `<property name="..." ref="..."/>` 而不是 `@Autowired`：**
- 這是傳統 Spring XML 配置的核心模式
- 每個 bean 的依賴關係在 XML 中聲明，一目了然
- Service 類本身不需要任何 Spring 註解，完全由 XML 裝配

**為什麼 `mapUnderscoreToCamelCase` + `resultMap` 雙層：**
- 全域配置作為安全網
- Mapper XML 中的顯式 `resultMap` 更明確
- 兩層一起確保 DB 的 `password_hash` → Java 的 `passwordHash` 等所有映射正確

#### dispatcher-servlet.xml — Web Context

```xml
<beans xmlns="http://www.springframework.org/schema/beans"
       xmlns:mvc="http://www.springframework.org/schema/mvc"
       xmlns:context="http://www.springframework.org/schema/context">

    <mvc:annotation-driven/>
    <context:component-scan base-package="com.digitalwallet.controller"/>
</beans>
```

**為什麼只掃描 controller 包：**
- Service / Mapper 已在 Root Context 中定義
- DispatcherServlet 只負責 Web 層（Controller + ExceptionHandler）
- 分層掃描避免 bean 重複建立

#### spring-security.xml — Stateless JWT 安全配置

```xml
<beans:beans xmlns="http://www.springframework.org/schema/security"
             xmlns:beans="http://www.springframework.org/schema/beans">

    <http auto-config="false" use-expressions="true"
          create-session="stateless"
          entry-point-ref="restAuthEntryPoint">
        <csrf disabled="true"/>
        <cors configuration-source-ref="corsConfig"/>

        <intercept-url pattern="/api/auth/**" access="permitAll()"/>
        <intercept-url pattern="/api/**" access="isAuthenticated()"/>

        <custom-filter ref="jwtAuthFilter" before="PRE_AUTH_FILTER"/>
    </http>

    <authentication-manager/>

    <beans:bean id="restAuthEntryPoint"
                class="com.digitalwallet.security.RestAuthEntryPoint"/>
    <beans:bean id="corsConfig"
                class="com.digitalwallet.security.CorsConfig"/>
    <beans:bean id="jwtAuthFilter"
                class="com.digitalwallet.security.JwtAuthFilter">
        <beans:property name="jwtUtil" ref="jwtUtil"/>
    </beans:bean>
</beans:beans>
```

**為什麼 `create-session="stateless"`：**
- REST API + JWT 不應使用 Server-side Session
- 每次請求都從 JWT 驗證身份
- 對應 Spring Boot 的 `SessionCreationPolicy.STATELESS`

---

### 模式 4：Entity 與 DTO

#### Entity（對應資料庫欄位）

```java
// User.java
@Data
public class User {
    private Long id;
    private String username;
    private String passwordHash;
    private String role;
    private LocalDateTime createdAt;
}

// Wallet.java — 含樂觀鎖 version 欄位
@Data
public class Wallet {
    private Long id;
    private Long userId;
    private String currency;
    private BigDecimal balance;    // NUMERIC(18,4) → BigDecimal
    private Integer version;       // 樂觀鎖版本號
    private LocalDateTime updatedAt;
}

// Transaction.java
@Data
public class Transaction {
    private Long id;
    private Long fromWalletId;
    private Long toWalletId;
    private BigDecimal amount;
    private String txType;
    private String status;
    private LocalDateTime createdAt;
}
```

**為什麼 `BigDecimal` 而不是 `double`：**
- 金額不能用浮點數，會有精度問題
- `NUMERIC(18,4)` 必須對應 `BigDecimal`

#### DTO（API 輸入/輸出）

```java
// ApiResponse.java — 統一 JSON envelope
@Data
@AllArgsConstructor
public class ApiResponse {
    private String status;
    private String message;
    public static ApiResponse success(String msg) { return new ApiResponse("SUCCESS", msg); }
    public static ApiResponse error(String msg) { return new ApiResponse("ERROR", msg); }
}

// LoginRequest.java
@Data
public class LoginRequest {
    @NotBlank private String username;
    @NotBlank private String password;
}

// LoginResponse.java
@Data @AllArgsConstructor
public class LoginResponse {
    private String token;
    private UserDTO user;
}

// TransferRequest.java
@Data
public class TransferRequest {
    @NotBlank private String toUsername;
    @NotNull private BigDecimal amount;
}
```

**為什麼 DTO 不含 `passwordHash`：**
- 安全紅線：敏感欄位絕不透過 API 返回
- 對應 Spring Boot 版的 `UserDTO`（不含 `passwordHash`）vs `User` entity（含 `passwordHash`）

---

### 模式 5：MyBatis Mapper（Java interface + XML SQL）

```java
// UserMapper.java — interface
public interface UserMapper {
    void insert(User user);
    User findByUsername(@Param("username") String username);
}

// WalletMapper.java
public interface WalletMapper {
    void insert(Wallet wallet);
    Wallet findByUserId(@Param("userId") Long userId);
    int deductBalance(@Param("userId") Long userId,
                      @Param("amount") BigDecimal amount,
                      @Param("version") Integer version);
    int addBalance(@Param("userId") Long userId,
                   @Param("amount") BigDecimal amount);
}

// TransactionMapper.java
public interface TransactionMapper {
    void insert(Transaction transaction);
    List<Transaction> findByWalletId(@Param("walletId") Long walletId);
}
```

**為什麼 interface 沒有實現類：**
- MyBatis 用 JDK 動態代理在運行時自動生成實現
- `MapperScannerConfigurer` 掃描 `com.digitalwallet.mapper` 包
- 每個 interface 對應一個 mapper XML 檔案

```xml
<!-- UserMapper.xml — 顯式 resultMap + 顯式欄位列表 -->
<mapper namespace="com.digitalwallet.mapper.UserMapper">
    <resultMap id="userMap" type="com.digitalwallet.model.User">
        <id property="id" column="id"/>
        <result property="passwordHash" column="password_hash"/>
        <result property="createdAt" column="created_at"/>
    </resultMap>

    <insert id="insert" useGeneratedKeys="true" keyProperty="id">
        INSERT INTO users(username, password_hash, role)
        VALUES(#{username}, #{passwordHash}, #{role})
    </insert>

    <select id="findByUsername" resultMap="userMap">
        SELECT id, username, password_hash, role, created_at
        FROM users WHERE username = #{username}
    </select>
</mapper>

<!-- WalletMapper.xml — 樂觀鎖扣款 -->
<mapper namespace="com.digitalwallet.mapper.WalletMapper">
    <resultMap id="walletMap" type="com.digitalwallet.model.Wallet">
        <result property="userId" column="user_id"/>
        <result property="updatedAt" column="updated_at"/>
    </resultMap>

    <update id="deductBalance">
        UPDATE wallets
        SET balance = balance - #{amount},
            version = version + 1,
            updated_at = NOW()
        WHERE user_id = #{userId} AND version = #{version}
    </update>
</mapper>
```

**為什麼用 `resultMap` 而不是 `resultType`：**
- 顯式定義欄位對應，schema 變動時更容易排查
- 搭配 `mapUnderscoreToCamelCase` 提供雙層安全保障
- 不用 `SELECT *`，每個查詢都明確列出所需欄位

**為什麼 `deductBalance` 的 WHERE 帶 version：**
- 樂觀鎖：讀 wallet 時一併讀 version → UPDATE 時比對
- 如果 version 已變（被其他請求更新），`affected rows == 0` → 409

---

### 模式 6：JWT 工具 + 過濾器

#### JwtUtil.java

```java
public class JwtUtil {
    private String secret;
    private long expiration;
    // XML setter 注入
    public void setSecret(String secret) { this.secret = secret; }
    public void setExpiration(long expiration) { this.expiration = expiration; }

    public String generateToken(Long userId, String username) {
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("username", username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret)),
                          SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean isTokenValid(String token) {
        try { parseClaims(token); return true; }
        catch (Exception e) { return false; }
    }
}
```

**為什麼無 `@Component`，用 setter 注入：**
- 這是傳統 Spring XML 配置的核心風格
- 依賴關係在 `applicationContext.xml` 的 `<bean>` 中宣告，不需要任何 Spring 註解

#### JwtAuthFilter.java + RestAuthEntryPoint.java

```java
// JwtAuthFilter.java
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
                SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(userId, null, emptyList())
                );
            }
        }
        chain.doFilter(request, response);
    }
}

// RestAuthEntryPoint.java — 401 → JSON
public class RestAuthEntryPoint implements AuthenticationEntryPoint {
    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException e) throws IOException {
        response.setStatus(401);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
            "{\"status\":\"ERROR\",\"message\":\"Invalid username or password\"}");
    }
}
```

**為什麼 `SecurityContextHolder.getContext().setAuthentication(...)`：**
- JWT filter 把 userId 設為 SecurityContext 的 principal
- Controller 從 SecurityContext 獲取當前用戶，不需傳遞 userId 參數
- IDOR 防護的根本機制

---

### 模式 7：Controller 層

```java
// AuthController.java
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse> register(@Valid @RequestBody LoginRequest request) {
        authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}

// WalletController.java — IDOR 防護
@RestController
@RequestMapping("/api/wallets")
public class WalletController {
    @Autowired private WalletService walletService;

    @GetMapping
    public ResponseEntity<WalletDTO> getWallet() {
        Long userId = (Long) SecurityContextHolder.getContext()
                .getAuthentication().getPrincipal();
        return ResponseEntity.ok(walletService.getByUserId(userId));
    }
}
```

**為什麼 Controller 用 `@Autowired` 而 Service 不用：**
- Controller 在 Web Context 中，用 `component-scan` 掃描
- Service 在 Root Context 中，用 XML `<bean>` 定義
- 刻意展示兩種配置方式的混用

---

### 模式 8：Service 層 — 業務邏輯核心

```java
// AuthService.java
public class AuthService {
    // fields + XML setter 注入...

    @Transactional
    public void register(LoginRequest request) {
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole("ROLE_USER");

        try {
            userMapper.insert(user);
        } catch (DuplicateKeyException e) {
            throw new DuplicateUsernameException("Username already taken");
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
        if (user == null || !passwordEncoder.matches(
                request.getPassword(), user.getPasswordHash())) {
            throw new AuthenticationException("Invalid username or password");
        }
        String token = jwtUtil.generateToken(user.getId(), user.getUsername());
        return new LoginResponse(token, UserDTO.builder()
                .id(user.getId()).username(user.getUsername())
                .role(user.getRole()).createdAt(user.getCreatedAt()).build());
    }
}

// TransactionService.java — 樂觀鎖核心
public class TransactionService {
    @Transactional
    public void transfer(Long fromUserId, TransferRequest request) {
        BigDecimal amount = request.getAmount();
        if (amount.compareTo(BigDecimal.ZERO) <= 0)
            throw new IllegalArgumentException("Transfer amount must be greater than zero");

        User toUser = userMapper.findByUsername(request.getToUsername());
        if (toUser == null) throw new IllegalArgumentException("Recipient not found");
        if (fromUserId.equals(toUser.getId()))
            throw new IllegalArgumentException("Cannot transfer to yourself");

        Wallet fromWallet = walletMapper.findByUserId(fromUserId);
        Wallet toWallet = walletMapper.findByUserId(toUser.getId());
        if (fromWallet.getBalance().compareTo(amount) < 0)
            throw new InsufficientBalanceException("Insufficient balance");

        // 樂觀鎖扣款
        int deducted = walletMapper.deductBalance(fromUserId, amount, fromWallet.getVersion());
        if (deducted == 0) throw new ConcurrentModificationException("Concurrent modification");

        walletMapper.addBalance(toUser.getId(), amount);

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

**為什麼 `@Transactional` 能在傳統 Spring MVC 中生效：**
- `applicationContext.xml` 中有 `<tx:annotation-driven>`
- Spring AOP 在運行時為標記了 `@Transactional` 的方法創建代理
- 必須是 public 方法才生效

---

### 模式 9：GlobalExceptionHandler + 樂觀鎖原理

#### GlobalExceptionHandler.java

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(AppException.class)
    public ResponseEntity<ApiResponse> handleAppException(AppException e) {
        return ResponseEntity.status(e.getStatusCode())
                .body(ApiResponse.error(e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse> handleGeneric(Exception e) {
        log.error("Unhandled exception", e);
        return ResponseEntity.status(500).body(ApiResponse.error("Internal server error"));
    }
}
```

**為什麼 `@RestControllerAdvice` 在傳統 Spring MVC 中可用：**
- `@RestControllerAdvice` 是 Spring MVC 3.2+ 的原生功能，非 Boot 專屬
- `<mvc:annotation-driven>` 自動啟用

#### 樂觀鎖三部曲

1. 讀取 wallet 時一併讀取當前 `version`
2. UPDATE 時帶 `WHERE version = ?` 條件
3. `affected rows == 0` → 另一個請求先更新了 → 409

```xml
<!-- WalletMapper.xml -->
<update id="deductBalance">
    UPDATE wallets
    SET balance = balance - #{amount}, version = version + 1
    WHERE user_id = #{userId} AND version = #{version}
</update>
```

```java
int deducted = walletMapper.deductBalance(fromUserId, amount, fromWallet.getVersion());
if (deducted == 0) {
    throw new ConcurrentModificationException("Concurrent modification detected");
}
```

**對比悲觀鎖：**
- 悲觀鎖 `SELECT ... FOR UPDATE` — 鎖住行，其他排隊，可能死鎖
- 樂觀鎖 `WHERE version = ?` — 不鎖，提交時檢查，衝突時讓用戶重試
- 錢包場景讀多寫少，樂觀鎖更合適

## 部署與使用

### 環境需求

| 軟體 | 版本 | 用途 |
|------|------|------|
| JDK | 21+ | 編譯與運行 |
| Maven | 3.9+ | 構建與依賴管理 |
| Tomcat | 10+ | Servlet 容器（**必須，無內嵌伺服器**） |
| PostgreSQL | 16 | 資料庫（本機 5433 port） |

### 1. 確認 PostgreSQL

本專案預設連線 `localhost:5433`，資料庫 `digital_wallet`：

```bash
# 確認 PostgreSQL 正在運行
psql -h localhost -p 5433 -U postgres -d digital_wallet -c "\dt"
```

相關配置在：
- [jdbc.properties](src/main/resources/jdbc.properties) — 資料庫連線
- [jwt.properties](src/main/resources/jwt.properties) — JWT 密鑰

### 2. 在 IntelliJ IDEA 中配置（推薦）

這是最方便的方式，IntelliJ Ultimate 內建 Tomcat 整合：

**步驟 A — 匯入專案**
1. `File` → `Open` → 選擇 `digital_wallet_springmvc/` 目錄
2. IntelliJ 會自動識別 Maven 專案，等待依賴下載完成

**步驟 B — 配置 Tomcat**
1. `Run` → `Edit Configurations` → `+` → `Tomcat Server` → `Local`
2. `Application server`：點 `Configure`，選擇你的 Tomcat 安裝目錄（如 `C:\apache-tomcat-10.x`）
3. `Deployment` tab → `+` → `Artifact` → 選 `digital_wallet_springmvc:war exploded`
4. `Application context`：可設為 `/`（這樣 API 路徑會是 `/api/auth/...`）或留預設 `/digital_wallet_springmvc`
5. `Server` tab → `HTTP port`：預設 `8080`，如有衝突可改
6. 點 `OK` 儲存

**步驟 C — 啟動**
1. 點右上角綠色 Run 按鈕（或 `Shift+F10`）
2. 等待 Tomcat 啟動，看到 `Server startup in XXXX ms` 即成功
3. 瀏覽器打開 `http://localhost:8080/api/wallets`，應返回 401 JSON

> 如果你用的是 **IntelliJ Community Edition**（無 Tomcat 整合），請改用下方的「手動部署」方式。

### 3. 手動部署到 Tomcat（命令列）

**步驟 A — 打包 WAR**

```bash
# 在專案根目錄執行
mvn clean package

# 成功後 WAR 在 target/digital_wallet_springmvc.war
```

**步驟 B — 部署**

```bash
# 複製 WAR 到 Tomcat 的 webapps 目錄
cp target/digital_wallet_springmvc.war $TOMCAT_HOME/webapps/

# 啟動 Tomcat
$TOMCAT_HOME/bin/startup.sh       # Linux / macOS
$TOMCAT_HOME/bin/startup.bat      # Windows
```

**步驟 C — 確認部署**

Tomcat 啟動後，WAR 會自動解壓到 `webapps/digital_wallet_springmvc/`。API 根路徑為：

```
http://localhost:8080/digital_wallet_springmvc/api/
```

### 4. API 測試流程

以下用 curl 示範完整流程。**如果 IntelliJ 把 context path 設為 `/`，直接把 URL 中的 `/digital_wallet_springmvc` 拿掉。**

```bash
# 設定 BASE URL（根據你的部署方式調整）
BASE="http://localhost:8080/digital_wallet_springmvc"

# --- 1. 註冊 alice ---
curl -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"123456"}'
# → 201 {"status":"SUCCESS","message":"User registered successfully"}

# --- 2. 註冊 bob ---
curl -X POST "$BASE/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"123456"}'
# → 201

# --- 3. 登入 alice（取得 token）---
TOKEN=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"123456"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "Token: $TOKEN"

# --- 4. 查詢錢包 ---
curl "$BASE/api/wallets" \
  -H "Authorization: Bearer $TOKEN"
# → 200 {"id":1,"userId":...,"currency":"USDT","balance":0.0000,"version":0,...}

# --- 5. 轉帳給 bob（需先手動充值 alice）---
curl -X POST "$BASE/api/transactions/transfer" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"toUsername":"bob","amount":"50.0000"}'
# → 200 {"status":"SUCCESS","message":"Transfer completed successfully"}

# --- 6. 查詢交易歷史 ---
curl "$BASE/api/transactions" \
  -H "Authorization: Bearer $TOKEN"
# → 200 [{"id":1,"fromWalletId":...,"toWalletId":...,"amount":...,...}]
```

### 5. 前端對接

修改 `digital_wallet_frontend/vite.config.ts` 的 proxy target：

```ts
// 如果 IntelliJ context path 設為 /
proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } }

// 如果使用預設 context path
proxy: { '/api': { target: 'http://localhost:8080/digital_wallet_springmvc', changeOrigin: true } }
```

然後啟動前端：

```bash
cd digital_wallet_frontend
npm run dev
```

---



## 六版本程式碼量對比

| 關注點 | Spring Boot | Spring MVC | Node.js | FastAPI | Laravel | 純 PHP |
|------|------------|-----------|---------|---------|--------|
| 配置 | ~15 | **~120** | ~15 | ~10 | ~20 | — |
| JWT + 安全 | ~60 | ~65 | ~40 | ~50 | ~55 | ~45 |
| 密碼處理 | ~5 | ~5 | ~3 | ~4 | ~3 | ~3 |
| 樂觀鎖 + 轉賬 | ~60 | ~65 | ~70 | ~40 | ~45 | ~45 |
| 異常處理 | ~55 | ~45 | ~20 | ~35 | ~35 | ~35 |
| API 路由 + Controller | ~40 | ~55 | ~45 | ~30 | ~45 | ~45 |
| Model/DTO | ~120 | ~120 | ~50 | ~100 | ~50 | ~50 |
| **總計** | **~375** | **~475** | **~243** | **~286** | **~253** | **~263** |

Node.js 版最精簡（~243 行），Spring MVC 版最長（~475 行）。，主要因為 XML 配置（`web.xml` + 4 個 Spring XML ~120 行）和顯式 bean 裝配。Spring Boot 的自動配置幫開發者省去大量 XML 配置工作。
