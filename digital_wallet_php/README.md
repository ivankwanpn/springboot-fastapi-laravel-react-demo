# Digital Wallet Backend — 純 PHP（無框架）版 (Demo)

> **技術驗證 / 抄作業項目**：用零框架的純 PHP 複現數位錢包的所有功能，模擬許多公司仍在維護的老舊 PHP 專案風格。**API 合約與其他四個後端完全一致**，前端 `digital_wallet_frontend` 無需任何改動即可對接。

## 五版本技術對照

| 功能 | Spring Boot | Spring MVC | FastAPI | Laravel | 純 PHP |
|------|------------|-----------|---------|---------|--------|
| 語言 | Java 21 | Java 21 | Python 3.12+ | PHP 8.3+ | PHP 8.3+ |
| Web 框架 | Spring Boot 3.5 | **Spring MVC 6（無 Boot）** | FastAPI 0.115+ | Laravel 11 | **無** |
| 配置方式 | `application.yaml` | **`web.xml` + XML** | Pydantic Settings | `.env` | 無 |
| ORM / DB | MyBatis XML | **MyBatis + 手動 SqlSessionFactory** | SQLAlchemy async | Eloquent | 原生 PDO |
| DB 驅動 | JDBC PostgreSQL | JDBC PostgreSQL | asyncpg | PDO pgsql | PDO pgsql |
| 密碼雜湊 | BCrypt | BCrypt | passlib[bcrypt] | `Hash::make()` | `password_hash()` |
| JWT | jjwt 0.11.5 | jjwt 0.11.5 | PyJWT 2.x | firebase/php-jwt | firebase/php-jwt |
| 序列化 | Jackson | Jackson | Pydantic v2 | 手動 array | 手動 array |
| 伺服器 | 內嵌 Tomcat | **外部 Tomcat（WAR）** | Uvicorn | PHP-FPM | `php -S` |
| 依賴注入 | Spring DI | **XML `<bean>`** | FastAPI Depends | Laravel Container | 無 |
| 事務管理 | `@Transactional` | **`<tx:annotation-driven>`** | `session.begin()` | `DB::transaction()` | 手動 |
| 樂觀鎖 | MyBatis UPDATE + rowcount | MyBatis UPDATE + rowcount | SQLAlchemy UPDATE + rowcount | Eloquent `update()` + affected | PDO + `rowCount()` |
| 路由 | `@RequestMapping` | `@RequestMapping` | APIRouter | `routes/api.php` | `match()` + `switch()` |
| 中介層 | `OncePerRequestFilter` | `OncePerRequestFilter` | FastAPI Depends | Laravel Middleware | 靜態方法 |
| 驗證 | `@Valid` | `@Valid` | Pydantic | FormRequest | 內聯 if |
| 打包 | Fat JAR | **WAR** | — | — | — |

## 技術清單

| 技術 | 版本 | 用途 |
|------|------|------|
| PHP | 8.3+ | 核心語言 |
| PDO pgsql | — (內建) | PostgreSQL 驅動（原生） |
| firebase/php-jwt | 6.x | JWT Token (HS256)（**唯一的外部依賴**） |
| `password_hash()` | — (內建) | BCrypt 密碼雜湊 |
| `bccomp()` | — (內建) | 任意精度數值比較（金額） |
| Composer | 2.x | 自動載入 + 依賴管理 |
| Docker | — | 容器化部署 |

> **設計理念**：只依賴 `firebase/php-jwt` 一個 Composer 套件（JWT 手動實作太複雜且不安全），其他全部使用 PHP 內建函數。無 ORM、無 DI 容器、無路由器、無模板引擎 — 回歸 PHP 最原始的樣貌。

---

## 完整專案結構

```
digital_wallet_php_old/
├── composer.json                        # firebase/php-jwt ^6.0 + PSR-4 autoload
├── schema.sql                           # 原始 DDL（三個資料表）
├── Dockerfile                           # php:8.3-cli-alpine + pdo_pgsql
├── docker-compose.yml                   # PostgreSQL + App（埠號 8002:8080 / 5436:5432）
├── .dockerignore
├── .gitignore
│
├── public/
│   └── index.php                        # 前端控制器：路由 + 錯誤處理 + dispatch
│
└── src/
    ├── Config/
    │   ├── Database.php                 # PDO 連線單例（getenv 讀取環境變數）
    │   └── Jwt.php                      # JWT 設定常數（secret / expiration / algorithm）
    │
    ├── Exception/
    │   ├── AppException.php             # 基礎例外：自帶 HTTP statusCode
    │   ├── AuthenticationException.php  # 401（與 Laravel 版的 false, 統一訊息）
    │   ├── ConcurrentModificationException.php # 409（樂觀鎖衝突）
    │   ├── DuplicateUsernameException.php      # 409（唯一約束衝突）
    │   ├── InsufficientBalanceException.php    # 400（餘額不足）
    │   └── WalletNotFoundException.php  # 404（錢包不存在）
    │
    ├── Middleware/
    │   └── JwtMiddleware.php            # Bearer Token 提取 → decode → 寫入 Request attributes
    │
    ├── Service/
    │   ├── AuthService.php              # register()（PDO transaction + unique catch）+ login()
    │   ├── WalletService.php            # getWalletByUserId()：PDO SELECT + camelCase 組裝
    │   └── TransactionService.php       # transfer()（樂觀鎖 + 手動 transaction）+ getTransactionHistory()
    │
    └── Util/
        ├── JsonResponse.php             # json_encode + http_response_code + exit
        ├── Request.php                  # php://input 解析 + headers + attributes bag
        ├── JwtHelper.php                # firebase/php-jwt 靜態包裝
        └── Timestamp.php                # 共用時間戳格式化（ISO 8601）
```

### 與 Laravel 版結構對照

| 純 PHP | Laravel | 說明 |
|--------|---------|------|
| `public/index.php` | `routes/api.php` + `bootstrap/app.php` | 路由 + 異常處理合併在一個檔案 |
| `src/Config/Database.php` | `config/database.php` | PDO 單例 vs Laravel 連線池 |
| `src/Config/Jwt.php` | `config/jwt.php` | 類別常數 vs Laravel config helper |
| `src/Util/Request.php` | `Illuminate\Http\Request` | 手寫 80 行 vs Laravel 內建 |
| `src/Util/JsonResponse.php` | `response()->json()` | 手寫 10 行 vs Laravel helper |
| `src/Util/JwtHelper.php` | `app/Helpers/JwtHelper.php` | 完全相同的邏輯 |
| `src/Middleware/JwtMiddleware.php` | `app/Http/Middleware/JwtMiddleware.php` | 靜態方法 vs Laravel handle() |
| `src/Service/*.php` | `app/Services/*.php` | PDO prepared statements vs Eloquent |
| `src/Util/Timestamp.php` | (三個 Service 各自實作) | 提取共用時間格式化，消除 DRY |
| `src/Exception/*.php` | `app/Exceptions/*.php` | PHP 8.3 constructor promotion（相同） |

---

## 如何快速找到要抄的部分

| 你想學/抄什麼 | 純 PHP 檔案 | 對應 Laravel | 設計要點 |
|-------------|-----------|-------------|---------|
| 前端控制器（路由 + dispatch） | [public/index.php](public/index.php) | routes/api.php + bootstrap/app.php | `match()` 比對路由 + `switch()` dispatch + `try/catch` 錯誤處理 |
| PDO 連線單例 | [src/Config/Database.php](src/Config/Database.php) | config/database.php | `getenv()` 讀取設定 + `ATTR_EMULATE_PREPARES=false` |
| JWT 生成/驗證 | [src/Util/JwtHelper.php](src/Util/JwtHelper.php) | app/Helpers/JwtHelper.php | firebase/php-jwt 包裝，三版本完全相同的邏輯 |
| Bearer Token 中介層 | [src/Middleware/JwtMiddleware.php](src/Middleware/JwtMiddleware.php) | app/Http/Middleware/JwtMiddleware.php | 靜態方法：decode → setAttribute('userId') |
| BCrypt 密碼（原生） | [src/Service/AuthService.php](src/Service/AuthService.php) | app/Services/AuthService.php | `password_hash(PASSWORD_BCRYPT)` + `password_verify()` |
| PDO 手動事務 | [src/Service/TransactionService.php](src/Service/TransactionService.php) | app/Services/TransactionService.php | `beginTransaction()` / `commit()` / `rollBack()` |
| 樂觀鎖（PDO UPDATE） | [src/Service/TransactionService.php](src/Service/TransactionService.php) | app/Services/TransactionService.php | `WHERE version = :version` + `rowCount() === 0` |
| 請求解析（無框架） | [src/Util/Request.php](src/Util/Request.php) | Laravel Request | `file_get_contents('php://input')` + `json_decode()` + headers 解析 |
| JSON 回應輔助 | [src/Util/JsonResponse.php](src/Util/JsonResponse.php) | `response()->json()` | `http_response_code()` + `json_encode()` |
| 例外體系 | [src/Exception/](src/Exception/) | app/Exceptions/ | `AppException(statusCode, message)` + 5 個子類 |
| 時間戳格式化（共用工具） | [src/Util/Timestamp.php](src/Util/Timestamp.php) | (三個 Service 各自實作) | 提取重複的 `formatTimestamp()` 到共用類別，消除 DRY |
| 原始 DDL | [schema.sql](schema.sql) | database/migrations/ | `CREATE TABLE IF NOT EXISTS` + `docker-entrypoint-initdb.d` 自動執行 |
| Docker 容器化 | [Dockerfile](Dockerfile) + [docker-compose.yml](docker-compose.yml) | Dockerfile | `php -S` 內建伺服器 + `php:8.3-cli-alpine` |

---

## API 端點（五版本完全一致）

| 方法 | 路徑 | JWT | 請求體 | 響應 | HTTP |
|------|------|-----|--------|------|------|
| POST | `/api/auth/register` | 否 | `{"username":"alice","password":"123456"}` | `{"status":"SUCCESS","message":"User registered successfully"}` | 201 |
| POST | `/api/auth/login` | 否 | `{"username":"alice","password":"123456"}` | `{"token":"eyJ...","user":{"id":1,"username":"alice","role":"ROLE_USER","createdAt":"..."}}` | 200 |
| GET | `/api/wallets` | 是 | — | `{"id":1,"userId":1,"currency":"USDT","balance":0,"version":0,"updatedAt":"..."}` | 200 |
| POST | `/api/transactions/transfer` | 是 | `{"toUsername":"bob","amount":"50.0000"}` | `{"status":"SUCCESS","message":"Transfer completed successfully"}` | 200 |
| GET | `/api/transactions` | 是 | — | `[{"id":1,"fromWalletId":...,"toWalletId":...,"amount":...,"txType":"TRANSFER","status":"SUCCESS","createdAt":"..."}]` | 200 |

> **安全設計**：錢包和交易端點不接收路徑參數，從 JWT 自動提取用戶身份（`$request->getAttribute('userId')`），防止 IDOR 漏洞。

---

## 錯誤響應格式

```json
{"status": "ERROR", "message": "..."}
```

| HTTP | 異常類 | 場景 |
|------|------|------|
| 400 | `AppException` | amount <= 0、自己轉給自己、驗證失敗 |
| 400 | `InsufficientBalanceException` | 餘額不足 |
| 401 | `AuthenticationException` | 登入失敗、Token 無效/過期/缺失 |
| 404 | `WalletNotFoundException` | 錢包不存在、收款用戶不存在 |
| 409 | `ConcurrentModificationException` | 樂觀鎖版本衝突（提示用戶重試） |
| 409 | `DuplicateUsernameException` | 用戶名重複 |
| 500 | `Exception` (fallback) | 未預期錯誤（訊息記錄到 error_log） |

---

## 核心實作模式

### 1. 前端控制器（public/index.php）

無框架的核心體現 — 不到 80 行的單一入口檔案處理路由、驗證、dispatch 和錯誤處理：

```php
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$request = new Request();

try {
    // 路由匹配：檢查端點存在 + 是否需要 JWT
    $route = match ("$method $uri") {
        'POST /api/auth/register' => false,
        'POST /api/auth/login' => false,
        'GET /api/wallets' => true,
        'POST /api/transactions/transfer' => true,
        'GET /api/transactions' => true,
        default => null,
    };

    if ($route === null) {
        JsonResponse::send(['status' => 'ERROR', 'message' => 'Not found'], 404);
    }

    // JWT 中介層
    if ($route === true) {
        JwtMiddleware::handle($request);
    }

    // Dispatch
    switch ($uri) {
        case '/api/auth/register': /* ... */ break;
        case '/api/auth/login': /* ... */ break;
        case '/api/wallets': /* ... */ break;
        case '/api/transactions/transfer': /* ... */ break;
        case '/api/transactions': /* ... */ break;
    }
} catch (AppException $e) {
    JsonResponse::send(['status' => 'ERROR', 'message' => $e->getMessage()], $e->getStatusCode());
} catch (\Exception $e) {
    error_log($e->getMessage());
    JsonResponse::send(['status' => 'ERROR', 'message' => 'Internal server error'], 500);
}
```

**為什麼用 `match()` + `switch()` 而不是正則路由：**
- 5 個 API 端點用不著複雜路由
- `match()` 是 PHP 8.0+ 表達式，比 `if-else` 鏈更簡潔
- 兩階段路由：先 `match()` 判斷路由是否存在 + 是否需要 auth，再 `switch()` 執行業務邏輯

### 2. PDO 資料庫連線（Database.php）

老派 PHP 的標準模式 — 靜態單例：

```php
class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $dsn = sprintf('pgsql:host=%s;port=%s;dbname=%s',
                getenv('DB_HOST') ?: 'localhost',
                getenv('DB_PORT') ?: '5436',
                getenv('DB_DATABASE') ?: 'digital_wallet'
            );
            self::$instance = new PDO($dsn, $user, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false, // ← 關鍵：保證 DECIMAL 以字串回傳
            ]);
        }
        return self::$instance;
    }
}
```

**為什麼 `ATTR_EMULATE_PREPARES => false`：**
- PostgreSQL 的 `NUMERIC(18,4)` 欄位在 PDO 模擬模式下可能被轉為 float，損失精度
- 關閉模擬後，DECIMAL 以 PHP string 回傳，配合 `bccomp()` 精確比較
- 這是 PDO + PostgreSQL 處理金額的關鍵設定

### 3. 原生 BCrypt（無第三方套件）

PHP 5.5+ 內建 `password_hash()` 和 `password_verify()`，不需要任何外部依賴：

```php
// 註冊：雜湊密碼
$hash = password_hash($password, PASSWORD_BCRYPT);

// 登入：驗證明文 vs 雜湊
if (!password_verify($password, $user['password_hash'])) {
    throw new AuthenticationException();
}
```

**為什麼 `password_hash()` 是安全的：**
- `PASSWORD_BCRYPT` 自動生成隨機鹽值（存在雜湊字串中）
- 相同密碼每次產生不同雜湊，防止彩虹表
- cost factor 預設 10（可在 `password_hash()` 第三參數調整）

**對應 Laravel**：`Hash::make()` / `Hash::check()` 底層也是 `password_hash()` / `password_verify()`。

### 4. PDO 手動事務與樂觀鎖（TransactionService.php）

這是與框架版本最大的差異 — 沒有 `@Transactional`、沒有 `DB::transaction()`、沒有 `session.begin()`，完全手動管理：

```php
public function transfer(int $fromUserId, string $toUsername, string $amount): void
{
    // 輸入驗證（對應 Laravel FormRequest）
    if ($toUsername === '' || strlen($toUsername) < 3) {
        throw new AppException(400, 'The to username field is required.');
    }
    if (bccomp($amount, '0', 4) <= 0) {
        throw new AppException(400, 'Transfer amount must be greater than zero');
    }

    $db = Database::getConnection();

    try {
        $db->beginTransaction();  // 對應 @Transactional / DB::transaction()

        // 根據用戶名查找收款用戶
        $stmt = $db->prepare('SELECT * FROM users WHERE username = :username');
        $stmt->execute([':username' => $toUsername]);
        $toUser = $stmt->fetch();

        // 讀取雙方錢包（含 version）
        $stmt = $db->prepare('SELECT * FROM wallets WHERE user_id = :user_id');
        $stmt->execute([':user_id' => $fromUserId]);
        $fromWallet = $stmt->fetch();

        $stmt->execute([':user_id' => $toUserId]);
        $toWallet = $stmt->fetch();

        // 餘額檢查
        if (bccomp((string) $fromWallet['balance'], $amount, 4) < 0) {
            throw new InsufficientBalanceException("Insufficient balance: ...");
        }

        // 樂觀鎖扣款（對應 MyBatis deductBalanceWithVersion / SQLAlchemy UPDATE + rowcount）
        $stmt = $db->prepare(
            'UPDATE wallets SET balance = balance - :amount, version = version + 1, updated_at = NOW()
             WHERE user_id = :user_id AND version = :version'
        );
        $stmt->execute([
            ':amount' => (float) $amount,
            ':user_id' => $fromUserId,
            ':version' => (int) $fromWallet['version'],
        ]);

        if ($stmt->rowCount() === 0) {  // PDO rowCount() vs MyBatis deducted == 0
            throw new ConcurrentModificationException("Concurrent modification detected");
        }

        // 加款
        $stmt = $db->prepare(
            'UPDATE wallets SET balance = balance + :amount, version = version + 1, updated_at = NOW()
             WHERE user_id = :user_id'
        );
        $stmt->execute([':amount' => (float) $amount, ':user_id' => $toUserId]);

        // 記錄交易
        $stmt = $db->prepare(
            'INSERT INTO transactions (from_wallet_id, to_wallet_id, amount, tx_type, status)
             VALUES (:from, :to, :amount, :type, :status)'
        );
        $stmt->execute([/* ... */]);

        $db->commit();
    } catch (\Exception $e) {
        $db->rollBack();  // 任何失敗 → 全部撤銷
        throw $e;
    }
}
```

**PDO 手動事務 vs 框架事務：**

| 操作 | 純 PHP | Laravel | Spring Boot | FastAPI |
|------|--------|---------|-------------|---------|
| 開始 | `$db->beginTransaction()` | `DB::transaction(fn)` | `@Transactional` | `async with session.begin()` |
| 成功 | `$db->commit()` | closure 正常結束 | 方法正常返回 | context exit |
| 失敗 | `$db->rollBack()` | closure 拋異常 | 拋 RuntimeException | 拋異常 |
| 樂觀鎖檢測 | `$stmt->rowCount() === 0` | `update() === 0` | `deducted == 0` | `result.rowcount == 0` |

### 5. 請求解析（無 Laravel Request）

無框架意味著沒有 `$request->input()` 和 `$request->header()`，需要自己解析：

```php
class Request
{
    private array $body;
    private array $headers;
    private array $attributes = [];

    public function __construct()
    {
        // JSON body 解析（對應 Laravel $request->input()）
        $raw = file_get_contents('php://input');
        $decoded = json_decode($raw ?: '{}', true);
        $this->body = is_array($decoded) ? $decoded : [];

        // HTTP headers 解析（$_SERVER['HTTP_*'] → key-value）
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $headerName = strtolower(str_replace('_', '-', substr($key, 5)));
                $this->headers[$headerName] = $value;
            }
        }
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    public function header(string $name, mixed $default = null): ?string
    {
        return $this->headers[strtolower($name)] ?? $default;
    }

    // attributes bag: 中介層寫入 userId，Controller 讀取
    public function setAttribute(string $key, mixed $value): void
    public function getAttribute(string $key): mixed
}
```

### 6. 例外體系（對應 Laravel AppException）

PHP 8.3 constructor promotion 讓例外類別非常簡潔：

```php
class AppException extends Exception
{
    public function __construct(
        private int $statusCode,   // ← constructor promotion（PHP 8.0+）
        string $message = ''
    ) {
        parent::__construct($message);
    }
}

class AuthenticationException extends AppException {
    public function __construct(string $message = 'Invalid username or password') {
        parent::__construct(401, $message);
    }
}
// InsufficientBalanceException(400), WalletNotFoundException(404),
// ConcurrentModificationException(409), DuplicateUsernameException(409)
```

### 7. 無依賴注入（直接 new）

與 Laravel 的自動 DI 不同，純 PHP 直接在需要的地方 new：

```php
// Laravel 版：Constructor Injection
class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}
}

// 純 PHP 版：直接實例化
$authService = new AuthService();
$authService->register($username, $password);
```

---

## 數據流圖

### 使用者註冊

```
POST /api/auth/register  { username, password }
  → public/index.php match() → /api/auth/register
  → AuthService::register(username, password)
    ├── 驗證 username >= 3 char, password >= 6 char
    ├── $db->beginTransaction()
    ├── password_hash(password, PASSWORD_BCRYPT)     // 原生 PHP（無第三方套件）
    ├── INSERT INTO users (username, password_hash, role) RETURNING id
    │     └── catch PDOException code=23505 → DuplicateUsernameException → 409
    ├── INSERT INTO wallets (user_id, currency='USDT', balance=0, version=0)
    ├── $db->commit()
    └── return
  → 201 { "status": "SUCCESS", "message": "User registered successfully" }
```

### 轉帳（樂觀鎖核心）

```
POST /api/transactions/transfer  { toUsername: "bob", amount: "50.0000" }
  → match() → auth required → JwtMiddleware::handle($request)
    ├── 提取 Authorization: Bearer <token>
    ├── JwtHelper::decodeToken(token) → payload->sub = userId
    └── $request->setAttribute('userId', userId)
  → TransactionService::transfer(fromUserId, toUsername, amount)
    ├── 驗證 toUsername >= 3 char, amount > 0 (bccomp)
    ├── $db->beginTransaction()
    ├── SELECT * FROM users WHERE username = :toUsername  // 根據用戶名查找
    │     └── null → AppException(400, "Recipient not found")
    ├── 驗證 fromUserId != toUser.id                      // 防止自己轉給自己
    ├── SELECT * FROM wallets WHERE user_id = :fromUserId  // 取得 version
    ├── SELECT * FROM wallets WHERE user_id = :toUserId
    ├── bccomp(balance, amount, 4) < 0?                   // 快速失敗
    │     └── true → InsufficientBalanceException → 400
    ├── UPDATE wallets SET balance=balance-amount, version=version+1
    │     WHERE user_id=:uid AND version=:version
    │     → rowCount()=1 OK │ rowCount()=0 → ConcurrentModificationException → 409
    ├── UPDATE wallets SET balance=balance+amount, version=version+1
    │     WHERE user_id=:toUid
    ├── INSERT INTO transactions (from_wallet_id, to_wallet_id, amount, tx_type, status)
    ├── $db->commit()
    └── return
  → 200 { "status": "SUCCESS", "message": "Transfer completed successfully" }
```

---

## 設計決策問答

### 為什麼唯一的外部依賴是 firebase/php-jwt？

- JWT 涉及 base64url 編碼、HMAC-SHA256 簽名、payload 解析，手動實作容易出錯
- `firebase/php-jwt` 是 PHP 生態最廣泛使用的 JWT 庫，API 與 PyJWT（Python）和 jjwt（Java）一致
- 其他功能（BCrypt、PDO、路由）PHP 內建已充分支援

### 為什麼用 PDO 而不是 mysqli？

- PDO 支援多種資料庫（PostgreSQL、MySQL、SQLite 等），mysqli 只支援 MySQL
- `ATTR_EMULATE_PREPARES = false` 確保 PostgreSQL DECIMAL 精度
- PDO 的 named parameters（`:user_id`）比 mysqli 的 positional（`?`）更可讀

### 為什麼用樂觀鎖而不是悲觀鎖？

| 悲觀鎖 `SELECT ... FOR UPDATE` | 樂觀鎖 `version` 欄位 |
|------|------|
| 鎖住行，其他請求排隊 | 不鎖，提交時檢查版本 |
| 高併發時效能差 | 適合讀多寫少 |
| 可能 deadlock | 不會 deadlock |

錢包大部分時間在查詢（讀），偶爾轉賬（寫），適合樂觀鎖。

### 為什麼用 `bccomp()` 而不是 `>` 比較金額？

- PostgreSQL `NUMERIC(18,4)` 透過 PDO 回傳為 PHP string
- PHP 的 `>` 運算子對字串進行字串比較，`"9.0000" > "10.0000"` 結果是 `true`（字典序）
- `bccomp()` 進行任意精度數值比較，正確處理精度 4 的小數

### 為什麼驗證失敗統一返回 400 而不是 422？

- 與 Spring Boot 和 FastAPI 版保持一致（它們也用 400）
- Laravel 預設用 422（Unprocessable Entity），但純 PHP 版選擇與另外兩個非 Laravel 版本對齊

---

## 安全紅線

| ✅ 要做的 | ❌ 不要做的 |
|------|------|
| BCrypt 存密碼（`password_hash()`） | 明文或 MD5/SHA-256 存密碼 |
| PDO prepared statements（`prepare/execute`） | 字串拼接 SQL（SQL injection） |
| 從 JWT 提取用戶身份（`request->getAttribute('userId')`） | 從 URL 路徑參數獲取用戶 ID |
| 登入失敗統一訊息 | 區分「用戶不存在」vs「密碼錯誤」 |
| 手動 `begin/commit/rollback` 管理事務 | 部分成功、部分失敗的狀態 |
| `error_log()` 記錄伺服器錯誤 | 將錯誤訊息洩漏給客戶端 |
| 捕獲 `PDOException` code `23505` 偵測重複 | `except Exception` 誤報其他錯誤 |

---

## 常見錯誤

| 錯誤 | 後果 | 正確做法 |
|------|------|------|
| `ATTR_EMULATE_PREPARES = true`（預設） | DECIMAL 精度損失 | 設為 `false` |
| 用 `>` 比較金額字串 | `"9.0000" > "10.0000"` 回傳 `true` | 用 `bccomp()` |
| `rowCount()` 檢查放在非 UPDATE 語句 | INSERT/SELECT 的 rowCount 行為不一致 | 只在 UPDATE 後檢查 |
| 忘記 `rollBack()` | 未 commit 的交易殘留 | catch 區塊第一個動作就是 rollBack |
| `PDOException` 捕獲過寬 | 連線失敗被誤認為重複用戶名 | 檢查 `$e->getCode() === '23505'` |
| `php -S` 單執行緒 | 同時請求排隊 | Demo 可接受，生產換 FPM/Nginx |
| 不檢查 `json_decode()` 回傳值 | 格式錯誤導致 `$this->body` 為 null | `is_array($decoded) ? $decoded : []` |

---

## 五版本程式碼量對比

| 關注點 | Spring Boot | Spring MVC | FastAPI | Laravel | 純 PHP |
|------|------------|-----------|---------|---------|--------|
| JWT + 安全 | ~60 | ~65 | ~50 | ~45 | ~35 |
| 密碼處理 | ~5 | ~5 | ~4 | ~3 | ~3 |
| 樂觀鎖 + 轉賬 | ~60 | ~65 | ~40 | ~45 | ~80 |
| 異常處理 | ~55 | ~45 | ~35 | ~35 | ~30 |
| API 路由 + Controller | ~40 | ~55 | ~30 | ~45 | ~70 |
| Model/DTO | ~120 | ~120 | ~100 | ~50 | ~0 |
| 配置 | ~15 | ~120 | ~10 | ~20 | ~15 |
| **總計** | **~375** | **~475** | **~286** | **~253** | **~302** |

純 PHP 版行數略多於 Laravel，Spring MVC 版最長（XML 配置佔 ~120 行）。Spring Boot 的自動配置幫開發者省去了大量底層工作。

---

## 啟動方式

```bash
# 安裝依賴（僅 firebase/php-jwt）
composer install

# Docker 一鍵啟動（PostgreSQL + App）
docker-compose up -d

# 或手動啟動（需 PostgreSQL 運行在 localhost:5436）
DB_HOST=localhost DB_PORT=5436 php -S localhost:8002 -t public

# 停止
docker-compose down
```

**容器埠號：**
- App：`8002`（主機） → `8080`（容器）
- PostgreSQL：`5436`（主機） → `5432`（容器）

**測試流程：**

```bash
# 1. 註冊 alice
curl -X POST http://localhost:8002/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"test123"}'

# 2. 註冊 bob
curl -X POST http://localhost:8002/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"bob","password":"test123"}'

# 3. 登入 alice（複製返回的 token）
TOKEN=$(curl -s -X POST http://localhost:8002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"test123"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 4. 查詢錢包
curl http://localhost:8002/api/wallets \
  -H "Authorization: Bearer $TOKEN"

# 5. 轉帳給 bob（需先手動充值 alice）
curl -X POST http://localhost:8002/api/transactions/transfer \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"toUsername":"bob","amount":"100.0000"}'

# 6. 查詢交易歷史
curl http://localhost:8002/api/transactions \
  -H "Authorization: Bearer $TOKEN"
```

**前端對接：** 修改 `digital_wallet_frontend/vite.config.ts` 的 proxy target 為 `http://localhost:8002`。
