# Digital Wallet Backend — 純 PHP（無框架）版 (Demo)

> 技術驗證／參考實作：用零框架純 PHP 複現數位錢包的所有功能。API 合約與其他五個後端完全一致。

## 技術清單

| 技術 | 版本 | 用途 |
|------|------|------|
| PHP | 8.3+ | 核心語言 |
| firebase/php-jwt | ^6.0 | JWT Token HS256 編碼／解碼（**唯一外部依賴**） |
| PDO pgsql | — (內建) | PostgreSQL 原生驅動（prepared statements + 手動 transaction） |
| BCrypt (`password_hash`) | — (內建) | 密碼雜湊／驗證 |
| Composer | 2.x | PSR-4 autoload + 依賴管理 |

> **設計理念**：只依賴 `firebase/php-jwt` 一個 Composer 套件（JWT 手動實作不安全），其餘全部使用 PHP 內建函式。無 ORM、無 DI 容器、無路由器、無模板引擎——回歸 PHP 最原始樣貌。

---

### 與其他版本的技術對照

| 功能 | Spring Boot | Spring MVC | Node.js | FastAPI | Laravel | 純 PHP | Next.js |
|------|------------|------------|---------|---------|---------|--------|---------|
| 語言 | Java 17+ | Java 17+ | JavaScript (Node.js 18+) | Python 3.10+ | PHP 8.2+ | PHP 8.3+ | TypeScript (Node.js 18+) |
| Web 框架 | Spring Boot 3.5 | Spring MVC 6 (XML) | Express 4.x | FastAPI 0.x | Laravel 11 | 無 (純 PHP) | Next.js 16 |
| ORM / DB 層 | MyBatis | MyBatis | pg (raw SQL) | SQLAlchemy (async) | Eloquent | PDO (raw SQL) | Prisma 7 |
| 配置方式 | application.properties / YAML | XML (web.xml + applicationContext.xml) | .env + 手動載入 | .env + Pydantic Settings | .env + config/*.php | getenv() | .env / next.config.ts |
| JWT 套件 | jjwt | jjwt | jsonwebtoken | PyJWT | firebase/php-jwt | firebase/php-jwt | jose |
| DI 方式 | Spring DI (@Autowired) | Spring DI (XML beans) | 無 (手動建立) | FastAPI Depends() | Laravel Service Container (自動注入) | 無 (手動 new) | 無 (手動建立) |
| 事務管理 | @Transactional | @Transactional | BEGIN/COMMIT/ROLLBACK | async with session.begin() | DB::transaction() | beginTransaction()/commit()/rollBack() | Prisma $transaction() |
| 樂觀鎖實作 | version column + WHERE version = ? | version column + WHERE version = ? | version column + rowCount check | version column + rowcount check | version column + DB::update() WHERE version | version column + rowCount() === 0 | version column + where version |
| 分頁方式 | LIMIT/OFFSET + RowBounds | LIMIT/OFFSET + RowBounds | SQL LIMIT/OFFSET | SQLAlchemy offset()/limit() | skip()/take() | SQL LIMIT/OFFSET | Prisma skip/take |
| 密碼雜湊 | BCryptPasswordEncoder | BCryptPasswordEncoder | bcrypt | passlib (bcrypt) | Hash::make() (BCrypt) | password_hash(PASSWORD_BCRYPT) | bcrypt |
| 伺服器 | 內嵌 Tomcat | 外部 Tomcat 10.1 (WAR) | 內建 http | Uvicorn | php artisan serve / PHP-FPM | php -S (內建) | Next.js built-in server |
| Admin 授權機制 | @PreAuthorize + SecurityFilter | @PreAuthorize + SecurityFilter | middleware role check | Depends() + role check | AdminMiddleware (role check) | AdminMiddleware (role check) | middleware role check |

---

## 專案結構

```
digital_wallet_php/
├── composer.json                         # PSR-4 autoload (App\ → src/) + firebase/php-jwt ^6.0
├── schema.sql                            # DDL：users, wallets, transactions 三張表 + 索引
├── Dockerfile                            # php:8.3-cli-alpine, pdo_pgsql, multi-stage build
├── docker-compose.yml                    # PostgreSQL 16 + App（ports 8002/5436）
├── .dockerignore
├── .gitignore
│
├── public/
│   └── index.php                         # 前端控制器：match() 路由表 + switch() dispatch + try/catch 錯誤處理
│
└── src/
    ├── Config/
    │   ├── Database.php                  # PDO singleton（getenv → DSN → PDO with ERRMODE_EXCEPTION）
    │   └── Jwt.php                       # JWT secret / expiration / ALGORITHM 集中管理
    │
    ├── Exception/
    │   ├── AppException.php              # 基礎例外：自帶 HTTP statusCode（PHP 8 constructor promotion）
    │   ├── AuthenticationException.php   # 401 — 登入失敗 / Token 無效
    │   ├── ConcurrentModificationException.php  # 409 — 樂觀鎖版本衝突
    │   ├── DuplicateUsernameException.php       # 409 — 用戶名重複（PostgreSQL unique constraint）
    │   ├── InsufficientBalanceException.php     # 400 — 餘額不足
    │   └── WalletNotFoundException.php   # 404 — 錢包不存在
    │
    ├── Middleware/
    │   ├── JwtMiddleware.php             # Bearer Token 提取 → decode → setAttribute(userId, userRole)
    │   └── AdminMiddleware.php           # 檢查 userRole === 'ROLE_ADMIN'
    │
    ├── Service/
    │   ├── AuthService.php               # register()（PDO transaction + 23505 catch）+ login()
    │   ├── WalletService.php             # getWalletByUserId()：SELECT + 手動 camelCase 組裝
    │   ├── TransactionService.php        # transfer()（樂觀鎖 rowCount() + 手動 transaction）+ history
    │   └── AdminService.php              # listUsers, getUserDetail, disable/enable, listTransactions, stats
    │
    └── Util/
        ├── JwtHelper.php                 # generateToken() / decodeToken() — firebase/php-jwt 靜態包裝
        ├── Request.php                   # php://input 解析 + HTTP headers 解析 + attributes bag
        ├── JsonResponse.php              # json_encode() + http_response_code() + exit
        └── Timestamp.php                 # 共用時間戳格式化：PostgreSQL timestamp → ISO 8601
```

### 與框架版本的對應關係

| 純 PHP 檔案 | 職責 | Laravel 對應 | Spring Boot 對應 |
|------------|------|-------------|-----------------|
| `public/index.php` | 路由 + dispatch + 錯誤處理 | `routes/api.php` + `bootstrap/app.php` | `@RequestMapping` + `@ControllerAdvice` |
| `src/Config/Database.php` | DB 連線 | `config/database.php` | `DataSource` bean |
| `src/Middleware/JwtMiddleware.php` | JWT 驗證 | `app/Http/Middleware/JwtMiddleware.php` | `OncePerRequestFilter` |
| `src/Service/AuthService.php` | 註冊／登入 | `app/Services/AuthService.php` | `AuthService` |
| `src/Service/TransactionService.php` | 轉帳 + 樂觀鎖 | `app/Services/TransactionService.php` | `TransactionService` |
| `src/Util/Request.php` | HTTP 請求解析 | `Illuminate\Http\Request` | `HttpServletRequest` |
| `src/Util/JsonResponse.php` | JSON 響應 | `response()->json()` | `ResponseEntity` |

---

## API 端點

### 使用者端點（5 個）

| 方法 | 路徑 | JWT | 請求體 | 成功響應 | HTTP |
|------|------|-----|--------|---------|------|
| POST | `/api/auth/register` | 否 | `{"username":"alice","password":"123456"}` | `{"status":"SUCCESS","message":"User registered successfully"}` | 201 |
| POST | `/api/auth/login` | 否 | `{"username":"alice","password":"123456"}` | `{"token":"eyJ...","user":{"id":1,"username":"alice","role":"ROLE_USER","createdAt":"..."}}` | 200 |
| GET | `/api/wallets` | 是 | — | `{"id":1,"userId":1,"currency":"USDT","balance":0,"version":0,"updatedAt":"..."}` | 200 |
| POST | `/api/transactions/transfer` | 是 | `{"toUsername":"bob","amount":"50.0000"}` | `{"status":"SUCCESS","message":"Transfer completed successfully"}` | 200 |
| GET | `/api/transactions` | 是 | — | `[{"id":1,"fromWalletId":1,"toWalletId":2,"amount":50,"txType":"TRANSFER","status":"SUCCESS","createdAt":"..."}]` | 200 |

### 管理後台端點（6 個）—— 需 ROLE_ADMIN

| 方法 | 路徑 | JWT | Query 參數 | 響應 | HTTP |
|------|------|-----|-----------|------|------|
| GET | `/api/admin/users` | 是 | `?search=&page=1&size=10` | `{"data":[{id,username,role,createdAt},...],"page":1,"size":10,"total":N}` | 200 |
| GET | `/api/admin/users/{id}` | 是 | — | `{"id":...,"username":"...","role":"...","wallet":{...},"recentTransactions":[...]}` | 200 |
| PUT | `/api/admin/users/{id}/disable` | 是 | — | `{"status":"SUCCESS","message":"User disabled successfully"}` | 200 |
| PUT | `/api/admin/users/{id}/enable` | 是 | — | `{"status":"SUCCESS","message":"User enabled successfully"}` | 200 |
| GET | `/api/admin/transactions` | 是 | `?username=&fromDate=&toDate=&page=1&size=10` | `{"data":[{...,fromUsername,toUsername},...],"page":1,"size":10,"total":N}` | 200 |
| GET | `/api/admin/transactions/stats` | 是 | `?fromDate=&toDate=` | `{"totalTransactions":N,"totalAmount":"...","dailyVolume":[{date,count,amount},...]}` | 200 |

### 錯誤響應格式

所有端點錯誤時統一返回：

```json
{"status":"ERROR","message":"..."}
```

| HTTP | 異常類 | 場景 |
|------|--------|------|
| 400 | `AppException` | 驗證失敗（username < 3、password < 6、amount <= 0、自己轉給自己） |
| 400 | `InsufficientBalanceException` | 餘額不足 |
| 401 | `AuthenticationException` | 登入失敗、Token 無效／過期／缺失、用戶被禁用（ROLE_DISABLED） |
| 403 | `AppException` | 非 admin 用戶訪問 /api/admin/* 路由 |
| 404 | `AppException` | 路由不存在、收款用戶不存在、查詢用戶不存在 |
| 404 | `WalletNotFoundException` | 錢包不存在 |
| 409 | `ConcurrentModificationException` | 樂觀鎖版本衝突（提示用戶重試） |
| 409 | `DuplicateUsernameException` | 用戶名重複（PostgreSQL unique constraint 23505） |
| 500 | `\Exception` (fallback) | 未預期錯誤（訊息記錄到 `error_log`，客戶端只看到 "Internal server error"） |

---

## 如何快速找到要抄的部分

| 你想學/抄什麼 | 直接看這個檔案 |
|-------------|-------------|
| 依賴管理與 PSR-4 autoload | `composer.json` |
| 前端控制器 (路由 + dispatch + 錯誤處理) | `public/index.php` |
| 資料庫連線 (PDO singleton) | `src/Config/Database.php` |
| JWT 設定 (secret + expiration) | `src/Config/Jwt.php` |
| JWT 簽發與解碼工具 | `src/Util/JwtHelper.php` |
| JWT 驗證中介層 (Bearer token 解析) | `src/Middleware/JwtMiddleware.php` |
| Admin 角色檢查中介層 | `src/Middleware/AdminMiddleware.php` |
| 註冊與登入業務邏輯 | `src/Service/AuthService.php` |
| 轉帳核心邏輯 (含樂觀鎖) | `src/Service/TransactionService.php` |
| 後台管理 (分頁、搜尋、統計) | `src/Service/AdminService.php` |
| 基礎例外類 (自帶 HTTP statusCode) | `src/Exception/AppException.php` |
| HTTP 請求解析 (body + headers + attributes bag) | `src/Util/Request.php` |
| JSON 響應工具 | `src/Util/JsonResponse.php` |
| 時間戳格式化 (PostgreSQL → ISO 8601) | `src/Util/Timestamp.php` |
| 資料庫 DDL (三張表 + 索引) | `schema.sql` |

---

## 核心實作模式

以下每個模式包含 **完整原始碼**（非片段）與解釋。

### 模式 1：路由系統（public/index.php）

無框架的核心體現——單一入口檔案負責路由匹配、中介層呼叫、dispatch 與錯誤處理：

```php
<?php

error_reporting(E_ALL);
ini_set('display_errors', '0');

require __DIR__ . '/../vendor/autoload.php';

use App\Exception\AppException;
use App\Middleware\AdminMiddleware;
use App\Middleware\JwtMiddleware;
use App\Service\AdminService;
use App\Service\AuthService;
use App\Service\WalletService;
use App\Service\TransactionService;
use App\Util\JsonResponse;
use App\Util\Request;

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$request = new Request();

try {
    $routeKey = "$method $uri";
    $route = match ($routeKey) {
        'POST /api/auth/register' => false,
        'POST /api/auth/login' => false,
        'GET /api/wallets' => true,
        'POST /api/transactions/transfer' => true,
        'GET /api/transactions' => true,
        'GET /api/admin/users' => 'admin',
        'GET /api/admin/transactions' => 'admin',
        'GET /api/admin/transactions/stats' => 'admin',
        default => null,
    };

    if ($route === null && str_starts_with($uri, '/api/admin/')) {
        $route = 'admin';
    }

    if ($route === null) {
        JsonResponse::send(['status' => 'ERROR', 'message' => 'Not found'], 404);
    }

    if ($route === true) {
        JwtMiddleware::handle($request);
    }

    if ($route === 'admin') {
        JwtMiddleware::handle($request);
        AdminMiddleware::handle($request);
    }

    if ($route === 'admin') {
        $parts = explode('/', trim($uri, '/'));

        // GET /api/admin/users
        if ($method === 'GET' && $uri === '/api/admin/users') {
            $adminService = new AdminService();
            $result = $adminService->listUsers(
                $request->input('search', ''),
                (int) $request->input('page', 0),
                (int) $request->input('size', 10)
            );
            JsonResponse::send($result);
        }

        // GET /api/admin/users/{id}
        if ($method === 'GET' && count($parts) === 4 && $parts[2] === 'users' && is_numeric($parts[3])) {
            $adminService = new AdminService();
            $result = $adminService->getUserDetail((int) $parts[3]);
            JsonResponse::send($result);
        }

        // PUT /api/admin/users/{id}/disable
        if ($method === 'PUT' && count($parts) === 5 && $parts[2] === 'users' && $parts[4] === 'disable' && is_numeric($parts[3])) {
            $adminService = new AdminService();
            $adminService->disableUser((int) $parts[3]);
            JsonResponse::send(['status' => 'SUCCESS', 'message' => 'User disabled successfully']);
        }

        // PUT /api/admin/users/{id}/enable
        if ($method === 'PUT' && count($parts) === 5 && $parts[2] === 'users' && $parts[4] === 'enable' && is_numeric($parts[3])) {
            $adminService = new AdminService();
            $adminService->enableUser((int) $parts[3]);
            JsonResponse::send(['status' => 'SUCCESS', 'message' => 'User enabled successfully']);
        }

        // GET /api/admin/transactions
        if ($method === 'GET' && $uri === '/api/admin/transactions') {
            $adminService = new AdminService();
            $result = $adminService->listTransactions(
                $request->input('username', null),
                $request->input('fromDate', null),
                $request->input('toDate', null),
                (int) $request->input('page', 0),
                (int) $request->input('size', 10)
            );
            JsonResponse::send($result);
        }

        // GET /api/admin/transactions/stats
        if ($method === 'GET' && $uri === '/api/admin/transactions/stats') {
            $adminService = new AdminService();
            $result = $adminService->getTransactionStats(
                $request->input('fromDate', null),
                $request->input('toDate', null)
            );
            JsonResponse::send($result);
        }

        JsonResponse::send(['status' => 'ERROR', 'message' => 'Not found'], 404);
    }

    switch ($uri) {
        case '/api/auth/register':
            $authService = new AuthService();
            $authService->register(
                $request->input('username', ''),
                $request->input('password', '')
            );
            JsonResponse::send(
                ['status' => 'SUCCESS', 'message' => 'User registered successfully'],
                201
            );
            break;

        case '/api/auth/login':
            $authService = new AuthService();
            $result = $authService->login(
                $request->input('username', ''),
                $request->input('password', '')
            );
            JsonResponse::send($result);
            break;

        case '/api/wallets':
            $walletService = new WalletService();
            $result = $walletService->getWalletByUserId(
                $request->getAttribute('userId')
            );
            JsonResponse::send($result);
            break;

        case '/api/transactions/transfer':
            $txService = new TransactionService();
            $txService->transfer(
                $request->getAttribute('userId'),
                (string) $request->input('toUsername', ''),
                (string) $request->input('amount', '')
            );
            JsonResponse::send(
                ['status' => 'SUCCESS', 'message' => 'Transfer completed successfully']
            );
            break;

        case '/api/transactions':
            $txService = new TransactionService();
            $result = $txService->getTransactionHistory(
                $request->getAttribute('userId')
            );
            JsonResponse::send($result);
            break;
    }
} catch (AppException $e) {
    JsonResponse::send(
        ['status' => 'ERROR', 'message' => $e->getMessage()],
        $e->getStatusCode()
    );
} catch (\Exception $e) {
    error_log($e->getMessage() . "\n" . $e->getTraceAsString());
    JsonResponse::send(
        ['status' => 'ERROR', 'message' => 'Internal server error'],
        500
    );
}
```

**設計要點：**

- **兩階段路由**：第一階段 `match()` 判斷路由是否存在 + 需要什麼中介層級別（`false` = 公開、`true` = JWT、`'admin'` = JWT + Admin）。第二階段 `switch()` 或 `if` 鏈執行業務邏輯。
- **動態路由的 admin 前綴補救**：`PUT /api/admin/users/{id}/disable` 和 `PUT /api/admin/users/{id}/enable` 無法在 `match()` 表中用精確字串匹配，因此 `str_starts_with($uri, '/api/admin/')` 做 fallback，再透過 `explode('/', trim($uri, '/'))` 解析路徑段落來手動匹配。
- **`match()` 而非 `if-else`**：PHP 8.0+ 的 `match` 表達式比 `if-else` 鏈更簡潔，且會對未覆蓋的情況拋出 `UnhandledMatchError`（雖然這裡用 `default => null` 攔截）。
- **錯誤處理分兩層**：`catch (AppException)` 取出自帶的 statusCode 和 message；`catch (\Exception)` 記錄到 `error_log` 但只返回通用 500，防止洩漏內部錯誤細節。

---

### 模式 2：JWT 工具（JwtHelper.php + Jwt.php）

```php
<?php

namespace App\Config;

class Jwt
{
    public static function secret(): string
    {
        return getenv('JWT_SECRET') ?: '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970';
    }

    public static function expirationMs(): int
    {
        return (int)(getenv('JWT_EXPIRATION') ?: 86400000);
    }

    public const ALGORITHM = 'HS256';
}
```

```php
<?php

namespace App\Util;

use App\Config\Jwt;
use Firebase\JWT\JWT as FirebaseJWT;
use Firebase\JWT\Key;

class JwtHelper
{
    public static function generateToken(int $userId, string $username, string $role): string
    {
        $payload = [
            'sub' => (string) $userId,
            'username' => $username,
            'role' => $role,
            'iat' => time(),
            'exp' => time() + (int)(Jwt::expirationMs() / 1000),
        ];

        return FirebaseJWT::encode($payload, Jwt::secret(), Jwt::ALGORITHM);
    }

    public static function decodeToken(string $token): object
    {
        return FirebaseJWT::decode($token, new Key(Jwt::secret(), Jwt::ALGORITHM));
    }
}
```

**設計要點：**

- **`role` claim 入 JWT payload**：admin 功能需要從 JWT 中讀取角色（`ROLE_USER` / `ROLE_ADMIN` / `ROLE_DISABLED`），`AdminMiddleware` 據此判斷是否有權限。
- **`sub` 存字串而非整數**：JWT RFC 7519 規定 `sub`（Subject）是 `StringOrURI` 類型。六版本行為一致：Java `String.valueOf(userId)`、Python `str(user_id)`、PHP `(string) $userId`。
- **exp 單位轉換**：`expirationMs()` 回傳毫秒（便於人類閱讀大數字如 `86400000` = 24 小時），但 JWT 標準的 `exp` 要求秒級 Unix timestamp，因此除以 1000。
- **`firebase/php-jwt` v6 API**：`JWT::decode()` 的第二參數從 v5 的純 string 變為 `Key` 物件（`new Key($secret, $algorithm)`），這是 v6 的破壞性變更。

---

### 模式 3：中介層（JwtMiddleware.php + AdminMiddleware.php）

```php
<?php

namespace App\Middleware;

use App\Exception\AuthenticationException;
use App\Util\JwtHelper;
use App\Util\Request;

class JwtMiddleware
{
    public static function handle(Request $request): void
    {
        $authHeader = $request->header('Authorization');

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            throw new AuthenticationException();
        }

        $token = substr($authHeader, 7);

        try {
            $payload = JwtHelper::decodeToken($token);
            $request->setAttribute('userId', (int) $payload->sub);
            $request->setAttribute('userRole', $payload->role ?? 'ROLE_USER');
        } catch (\Exception $e) {
            throw new AuthenticationException();
        }
    }
}
```

```php
<?php

namespace App\Middleware;

use App\Exception\AppException;
use App\Util\Request;

class AdminMiddleware
{
    public static function handle(Request $request): void
    {
        if ($request->getAttribute('userRole') !== 'ROLE_ADMIN') {
            throw new AppException(403, 'Access denied');
        }
    }
}
```

**設計要點：**

- **無介面、無繼承、純靜態方法**：有別於 Laravel 的 `handle($request, $next)` 鏈式中介層或 Spring 的 `doFilterInternal()`，純 PHP 版直接呼叫靜態方法，失敗就拋例外。
- **`userRole` 有 fallback**：`$payload->role ?? 'ROLE_USER'` — 如果 JWT 中沒有 role（舊 token），預設為 `ROLE_USER`，不會因為 `null` 而讓 `AdminMiddleware` 誤判。
- **中介層順序**：`index.php` 中先 `JwtMiddleware`（提取 userId + userRole），再 `AdminMiddleware`（檢查 role）。順序不可顛倒。
- **AdminMiddleware 回傳 403**：有別於 `AuthenticationException` 的 401，admin 權限不足是 403（已驗證但無權限）。

---

### 模式 4：資料庫連線（Database.php）

```php
<?php

namespace App\Config;

use PDO;

class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $host = getenv('DB_HOST') ?: 'localhost';
            $port = getenv('DB_PORT') ?: '5436';
            $dbname = getenv('DB_DATABASE') ?: 'digital_wallet';
            $user = getenv('DB_USERNAME') ?: 'postgres';
            $password = getenv('DB_PASSWORD') ?: 'root';

            $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";

            self::$instance = new PDO($dsn, $user, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);
        }

        return self::$instance;
    }

    public static function reset(): void
    {
        self::$instance = null;
    }
}
```

**設計要點：**

- **靜態單例（Static Singleton）**：整個請求生命週期只有一個 PDO 連線，避免重複建立連線。`reset()` 方法供測試使用。
- **`getenv()` 讀取環境變數，每個都有 fallback**：`DB_HOST` 預設 `localhost`、`DB_PORT` 預設 `5436`（Docker 映射埠），不設環境變數也能在本機跑。
- **`ATTR_EMULATE_PREPARES => false` 是關鍵設定**：PostgreSQL 的 `NUMERIC(18,4)` 欄位在 PDO 模擬模式下可能被轉成 float，導致精度損失。關閉模擬後，DECIMAL 以 PHP string 回傳，配合 `bccomp()` 精確比較金額。**這個選項同時關閉了多語句注入（multi-statement injection）的可能性。**
- **`ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC`**：所有 `fetch()` 和 `fetchAll()` 預設回傳關聯陣列，不用每次手動指定。
- **`ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION`**：PDO 錯誤拋出 `PDOException`，可以 `try/catch` 統一處理，而非檢查每個方法的回傳值。

---

### 模式 5：請求／響應工具（Request.php, JsonResponse.php, Timestamp.php）

```php
<?php

namespace App\Util;

class Request
{
    private array $body;
    private array $headers;
    private array $attributes = [];

    public function __construct()
    {
        $raw = file_get_contents('php://input');
        $decoded = json_decode($raw ?: '{}', true);
        $this->body = is_array($decoded) ? $decoded : [];

        $this->headers = [];
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

    public function getBody(): array
    {
        return $this->body;
    }

    public function header(string $name, mixed $default = null): ?string
    {
        return $this->headers[strtolower($name)] ?? $default;
    }

    public function setAttribute(string $key, mixed $value): void
    {
        $this->attributes[$key] = $value;
    }

    public function getAttribute(string $key): mixed
    {
        return $this->attributes[$key] ?? null;
    }
}
```

```php
<?php

namespace App\Util;

class JsonResponse
{
    public static function send(mixed $data, int $statusCode = 200): never
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
}
```

```php
<?php

namespace App\Util;

class Timestamp
{
    public static function format(?string $ts): ?string
    {
        if ($ts === null) {
            return null;
        }
        $dt = \DateTimeImmutable::createFromFormat('Y-m-d H:i:s.u', $ts, new \DateTimeZone('UTC'));
        if ($dt === false) {
            $dt = \DateTimeImmutable::createFromFormat('Y-m-d H:i:s', $ts, new \DateTimeZone('UTC'));
        }
        return $dt ? $dt->format('Y-m-d\TH:i:s.u\Z') : null;
    }
}
```

**設計要點：**

- **`Request` 的 `php://input`**：`php://input` 是 PHP 的唯讀 input stream，對於 `Content-Type: application/json` 的請求，這是唯一能拿到 raw body 的方法（`$_POST` 只能讀 `application/x-www-form-urlencoded` 和 `multipart/form-data`）。
- **`is_array()` 防禦**：`json_decode()` 在格式錯誤時回傳 `null`，但合法的 JSON 也可能是 `null`（`json_decode("null")` → `null`）。用 `is_array()` 確保 `$this->body` 永遠是 array，避免後續 `$this->body[$key]` 對 null 取值導致 warning。
- **`attributes` bag 模式**：中介層寫入 `userId` 和 `userRole`，Service 層讀取。這是 JWT 驗證結果在請求生命週期中傳遞的機制（對應 Laravel 的 `$request->merge()` 或 Spring 的 `request.setAttribute()`）。
- **`JsonResponse::send()` 回傳型別是 `never`**：PHP 8.1+ 的 `never` 型別表示此方法不會正常返回（因為呼叫了 `exit`），靜態分析工具能據此檢測 unreachable code。
- **`JSON_UNESCAPED_UNICODE`**：確保中文等 Unicode 字元不會被轉成 `\uXXXX`，保持響應可讀。
- **`Timestamp::format()` 容錯兩種格式**：PostgreSQL `TIMESTAMP` 的預設格式是 `Y-m-d H:i:s`（無小數秒），但 `TIMESTAMP WITH TIME ZONE` 或某些情境會帶 `.u`（微秒）。`createFromFormat` 先嘗試帶微秒的格式，失敗再嘗試無微秒，確保兩種都能正確轉換為 ISO 8601（`Y-m-d\TH:i:s.u\Z`）。

---

### 模式 6：Auth 服務（AuthService.php — register + login）

```php
<?php

namespace App\Service;

use App\Config\Database;
use App\Exception\AppException;
use App\Exception\AuthenticationException;
use App\Exception\DuplicateUsernameException;
use App\Util\JwtHelper;
use App\Util\Timestamp;
use PDOException;

class AuthService
{
    public function register(string $username, string $password): void
    {
        if ($username === '' || strlen($username) < 3) {
            throw new AppException(400, 'The username field is required and must be at least 3 characters.');
        }
        if ($password === '' || strlen($password) < 6) {
            throw new AppException(400, 'The password field is required and must be at least 6 characters.');
        }

        $db = Database::getConnection();

        try {
            $db->beginTransaction();

            $hash = password_hash($password, PASSWORD_BCRYPT);

            $stmt = $db->prepare(
                'INSERT INTO users (username, password_hash, role) VALUES (:username, :password_hash, :role) RETURNING id'
            );
            $stmt->execute([
                ':username' => $username,
                ':password_hash' => $hash,
                ':role' => 'ROLE_USER',
            ]);
            $userId = $stmt->fetchColumn();

            $stmt = $db->prepare(
                'INSERT INTO wallets (user_id, currency, balance, version) VALUES (:user_id, :currency, :balance, :version)'
            );
            $stmt->execute([
                ':user_id' => $userId,
                ':currency' => 'USDT',
                ':balance' => 0,
                ':version' => 0,
            ]);

            $db->commit();
        } catch (PDOException $e) {
            $db->rollBack();
            if ($e->getCode() === '23505') {
                throw new DuplicateUsernameException("Username '{$username}' is already taken");
            }
            throw $e;
        }
    }

    public function login(string $username, string $password): array
    {
        if ($username === '') {
            throw new AppException(400, 'The username field is required.');
        }
        if ($password === '') {
            throw new AppException(400, 'The password field is required.');
        }

        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM users WHERE username = :username');
        $stmt->execute([':username' => $username]);
        $user = $stmt->fetch();

        if (!$user) {
            throw new AuthenticationException();
        }

        if (!password_verify($password, $user['password_hash'])) {
            throw new AuthenticationException();
        }

        if ($user['role'] === 'ROLE_DISABLED') {
            throw new AuthenticationException();
        }

        $token = JwtHelper::generateToken($user['id'], $user['username'], $user['role']);

        return [
            'token' => $token,
            'user' => [
                'id' => (int) $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
                'createdAt' => Timestamp::format($user['created_at']),
            ],
        ];
    }
}
```

**設計要點：**

- **註冊使用 `beginTransaction()` + `commit()`**：`INSERT INTO users` 和 `INSERT INTO wallets` 必須同時成功或同時失敗。如果插入 users 成功但 wallets 失敗，會留下沒有錢包的孤兒用戶。
- **`RETURNING id`**：PostgreSQL 特有的語法，在 INSERT 的同時返回自動生成的主鍵，省去一次 `SELECT` 查詢。`fetchColumn()` 取出第一個欄位的值。
- **`23505` 錯誤碼檢測重複用戶名**：PostgreSQL 的 `unique_violation` 錯誤碼是 `23505`。catch `PDOException` 後檢查 `$e->getCode()` 來處理重複用戶名的特殊情況，其他 PDO 錯誤則重新拋出。
- **登入三層檢查，全部返回相同訊息**：用戶不存在、密碼錯誤、帳號被禁用（`ROLE_DISABLED`）三種情況都拋出 `AuthenticationException`，返回相同的 `"Invalid username or password"`。這是安全設計——不讓攻擊者知道具體是哪個環節失敗，避免用戶名枚舉攻擊。
- **`password_hash(PASSWORD_BCRYPT)` 自動加鹽**：BCRYPT 演算法在 `password_hash()` 內部自動生成隨機鹽值，儲存在雜湊字串的前 29 個字元（`$2y$10$...`）。相同密碼每次產生不同雜湊，防止彩虹表攻擊。
- **JWT 包含 `role`**：`generateToken()` 的第三參數傳入 `$user['role']`，這樣前端可以根據 token 判斷是否顯示管理後台入口。

---

### 模式 7：Wallet 服務（WalletService.php）

```php
<?php

namespace App\Service;

use App\Config\Database;
use App\Exception\WalletNotFoundException;
use App\Util\Timestamp;

class WalletService
{
    public function getWalletByUserId(int $userId): array
    {
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM wallets WHERE user_id = :user_id');
        $stmt->execute([':user_id' => $userId]);
        $wallet = $stmt->fetch();

        if (!$wallet) {
            throw new WalletNotFoundException("Wallet not found for userId: {$userId}");
        }

        return [
            'id' => (int) $wallet['id'],
            'userId' => (int) $wallet['user_id'],
            'currency' => $wallet['currency'],
            'balance' => round((float) $wallet['balance'], 4),
            'version' => (int) $wallet['version'],
            'updatedAt' => Timestamp::format($wallet['updated_at']),
        ];
    }
}
```

**設計要點：**

- **`userId` 來自 JWT 中介層，非 URL 參數**：呼叫方傳入 `$request->getAttribute('userId')`，而非從 URL 路徑讀取。這是 IDOR（Insecure Direct Object Reference）防護的核心——用戶只能查自己的錢包，無法透過修改 URL 參數查他人錢包。
- **手動 snake_case → camelCase**：資料庫欄位是 snake_case（`user_id`、`updated_at`），但 API 響應要求 camelCase（`userId`、`updatedAt`）。沒有 ORM 做自動轉換，所有欄位映射都在 Service 層手寫。優點是轉換邏輯完全透明，缺點是重複程式碼較多。
- **`round((float) $wallet['balance'], 4)`**：`ATTR_EMULATE_PREPARES => false` 讓 DECIMAL 以 string 回傳。先轉 float 再 round 到 4 位小數，確保 JSON 輸出美觀（`0.0000` 而非 `"0.0000"` 字串）。

---

### 模式 8：Transaction 服務（TransactionService.php — 樂觀鎖核心）

```php
<?php

namespace App\Service;

use App\Config\Database;
use App\Exception\AppException;
use App\Exception\ConcurrentModificationException;
use App\Exception\InsufficientBalanceException;
use App\Exception\WalletNotFoundException;
use App\Util\Timestamp;

class TransactionService
{
    public function transfer(int $fromUserId, string $toUsername, string $amount): void
    {
        if ($toUsername === '' || strlen($toUsername) < 3) {
            throw new AppException(400, 'The to username field is required.');
        }
        if ($amount === '' || !is_numeric($amount)) {
            throw new AppException(400, 'The amount field is required.');
        }
        if (bccomp($amount, '0', 4) <= 0) {
            throw new AppException(400, 'Transfer amount must be greater than zero');
        }

        $db = Database::getConnection();

        try {
            $db->beginTransaction();

            $stmt = $db->prepare('SELECT * FROM users WHERE username = :username');
            $stmt->execute([':username' => $toUsername]);
            $toUser = $stmt->fetch();
            if (!$toUser) {
                throw new AppException(400, "Recipient not found: {$toUsername}");
            }

            $toUserId = (int) $toUser['id'];
            if ($fromUserId === $toUserId) {
                throw new AppException(400, 'Cannot transfer to yourself');
            }

            $stmt = $db->prepare('SELECT * FROM wallets WHERE user_id = :user_id');
            $stmt->execute([':user_id' => $fromUserId]);
            $fromWallet = $stmt->fetch();
            if (!$fromWallet) {
                throw new WalletNotFoundException("Wallet not found for userId: {$fromUserId}");
            }

            $stmt->execute([':user_id' => $toUserId]);
            $toWallet = $stmt->fetch();
            if (!$toWallet) {
                throw new WalletNotFoundException("Wallet not found for userId: {$toUserId}");
            }

            if (bccomp((string) $fromWallet['balance'], $amount, 4) < 0) {
                throw new InsufficientBalanceException(
                    "Insufficient balance: {$fromWallet['balance']} < {$amount}"
                );
            }

            $stmt = $db->prepare(
                'UPDATE wallets SET balance = balance - :amount, version = version + 1, updated_at = NOW() WHERE user_id = :user_id AND version = :version'
            );
            $stmt->execute([
                ':amount' => $amount,
                ':user_id' => $fromUserId,
                ':version' => (int) $fromWallet['version'],
            ]);

            if ($stmt->rowCount() === 0) {
                throw new ConcurrentModificationException(
                    "Concurrent modification detected for userId: {$fromUserId}"
                );
            }

            $stmt = $db->prepare(
                'UPDATE wallets SET balance = balance + :amount, version = version + 1, updated_at = NOW() WHERE user_id = :user_id'
            );
            $stmt->execute([
                ':amount' => $amount,
                ':user_id' => $toUserId,
            ]);

            $stmt = $db->prepare(
                'INSERT INTO transactions (from_wallet_id, to_wallet_id, amount, tx_type, status) VALUES (:from_wallet_id, :to_wallet_id, :amount, :tx_type, :status)'
            );
            $stmt->execute([
                ':from_wallet_id' => (int) $fromWallet['id'],
                ':to_wallet_id' => (int) $toWallet['id'],
                ':amount' => $amount,
                ':tx_type' => 'TRANSFER',
                ':status' => 'SUCCESS',
            ]);

            $db->commit();
        } catch (\Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    public function getTransactionHistory(int $userId): array
    {
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM wallets WHERE user_id = :user_id');
        $stmt->execute([':user_id' => $userId]);
        $wallet = $stmt->fetch();
        if (!$wallet) {
            throw new WalletNotFoundException("Wallet not found for userId: {$userId}");
        }

        $stmt = $db->prepare(
            'SELECT * FROM transactions WHERE from_wallet_id = :wallet_id OR to_wallet_id = :wallet_id ORDER BY created_at DESC'
        );
        $stmt->execute([':wallet_id' => (int) $wallet['id']]);
        $transactions = $stmt->fetchAll();

        return array_map(function ($tx) {
            return [
                'id' => (int) $tx['id'],
                'fromWalletId' => $tx['from_wallet_id'] !== null ? (int) $tx['from_wallet_id'] : null,
                'toWalletId' => $tx['to_wallet_id'] !== null ? (int) $tx['to_wallet_id'] : null,
                'amount' => round((float) $tx['amount'], 4),
                'txType' => $tx['tx_type'],
                'status' => $tx['status'],
                'createdAt' => Timestamp::format($tx['created_at']),
            ];
        }, $transactions);
    }
}
```

**設計要點——樂觀鎖（Optimistic Locking）核心機制：**

1. **讀取時帶版本號**：`SELECT * FROM wallets WHERE user_id = :user_id` 取得當前 `version` 值（例如 `3`）。
2. **更新時加版本條件**：`UPDATE wallets SET balance = balance - :amount, version = version + 1 WHERE user_id = :user_id AND version = :version`。
3. **檢測並發衝突**：`$stmt->rowCount() === 0` — 如果另一個請求在步驟 1 和步驟 2 之間已經修改了同一行（version 變成 4），WHERE `version = 3` 找不到匹配行，UPDATE 影響 0 行，拋出 `ConcurrentModificationException(409)`。
4. **收款方不加樂觀鎖**：加款端 `UPDATE wallets SET balance = balance + :amount WHERE user_id = :user_id` 沒有 `AND version = :version` 條件。這是設計妥協——兩個同時轉給同一個人的操作不應衝突（它們操作的是同一個錢包但互不影響）。實務上扣款比加款更需要並發保護。

**`bccomp()` 而非 `>` 的原因：**
PostgreSQL `NUMERIC(18,4)` 透過 PDO 回傳為 PHP string。PHP 的 `>` 運算子對字串使用字典序比較：`"9.0000" > "10.0000"` 為 `true`（因為 `'9'` > `'1'`）。`bccomp()` 進行任意精度數值比較，正確處理精度 4 的小數。

**手動 transaction 管理（對比框架版）：**

| 操作 | 純 PHP | Laravel | Spring Boot | FastAPI |
|------|--------|---------|-------------|---------|
| 開始 | `$db->beginTransaction()` | `DB::transaction(fn)` | `@Transactional` | `async with session.begin()` |
| 成功 | `$db->commit()` | closure 正常返回 | 方法正常返回 | context exit |
| 失敗 | `$db->rollBack()` | closure 拋異常 | 拋 RuntimeException | 拋異常 |
| 樂觀鎖檢測 | `$stmt->rowCount() === 0` | `update() === 0` | `deducted == 0` | `result.rowcount == 0` |

---

### 模式 9：Admin 服務（AdminService.php）

```php
<?php

namespace App\Service;

use App\Config\Database;
use App\Exception\AppException;
use App\Util\Timestamp;

class AdminService
{
    public function listUsers(string $search, int $page, int $size): array
    {
        $size = max(1, min(100, $size));
        $offset = ($page - 1) * $size;

        $db = Database::getConnection();
        $searchParam = "%{$search}%";

        $stmt = $db->prepare('SELECT COUNT(*) FROM users WHERE username ILIKE :search');
        $stmt->execute([':search' => $searchParam]);
        $total = (int) $stmt->fetchColumn();

        $stmt = $db->prepare(
            'SELECT id, username, role, created_at FROM users WHERE username ILIKE :search ORDER BY id LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':search', $searchParam, \PDO::PARAM_STR);
        $stmt->bindValue(':limit', $size, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $data = array_map(function ($row) {
            return [
                'id' => (int) $row['id'],
                'username' => $row['username'],
                'role' => $row['role'],
                'createdAt' => Timestamp::format($row['created_at']),
            ];
        }, $rows);

        return [
            'data' => $data,
            'page' => $page,
            'size' => $size,
            'total' => $total,
        ];
    }

    public function getUserDetail(int $userId): array
    {
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM users WHERE id = :id');
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch();

        if (!$user) {
            throw new AppException(404, "User not found with id: {$userId}");
        }

        $stmt = $db->prepare('SELECT * FROM wallets WHERE user_id = :user_id');
        $stmt->execute([':user_id' => $userId]);
        $walletRow = $stmt->fetch();

        $wallet = null;
        $recentTransactions = [];

        if ($walletRow) {
            $walletId = (int) $walletRow['id'];
            $wallet = [
                'id' => $walletId,
                'userId' => (int) $walletRow['user_id'],
                'currency' => $walletRow['currency'],
                'balance' => round((float) $walletRow['balance'], 4),
                'version' => (int) $walletRow['version'],
                'updatedAt' => Timestamp::format($walletRow['updated_at']),
            ];

            $stmt = $db->prepare(
                'SELECT t.*, fu.username AS from_username, tu.username AS to_username
                 FROM transactions t
                 LEFT JOIN wallets fw ON t.from_wallet_id = fw.id
                 LEFT JOIN users fu ON fw.user_id = fu.id
                 LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
                 LEFT JOIN users tu ON tw.user_id = tu.id
                 WHERE t.from_wallet_id = :wallet_id OR t.to_wallet_id = :wallet_id
                 ORDER BY t.created_at DESC
                 LIMIT 5'
            );
            $stmt->execute([':wallet_id' => $walletId]);
            $txRows = $stmt->fetchAll();

            $recentTransactions = array_map(function ($tx) {
                return [
                    'id' => (int) $tx['id'],
                    'fromWalletId' => $tx['from_wallet_id'] !== null ? (int) $tx['from_wallet_id'] : null,
                    'toWalletId' => $tx['to_wallet_id'] !== null ? (int) $tx['to_wallet_id'] : null,
                    'fromUsername' => $tx['from_username'],
                    'toUsername' => $tx['to_username'],
                    'amount' => round((float) $tx['amount'], 4),
                    'txType' => $tx['tx_type'],
                    'status' => $tx['status'],
                    'createdAt' => Timestamp::format($tx['created_at']),
                ];
            }, $txRows);
        }

        return [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'createdAt' => Timestamp::format($user['created_at']),
            'wallet' => $wallet,
            'recentTransactions' => $recentTransactions,
        ];
    }

    public function disableUser(int $userId): void
    {
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id FROM users WHERE id = :id');
        $stmt->execute([':id' => $userId]);
        if (!$stmt->fetch()) {
            throw new AppException(404, "User not found with id: {$userId}");
        }

        $stmt = $db->prepare("UPDATE users SET role = 'ROLE_DISABLED' WHERE id = :id");
        $stmt->execute([':id' => $userId]);
    }

    public function enableUser(int $userId): void
    {
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id FROM users WHERE id = :id');
        $stmt->execute([':id' => $userId]);
        if (!$stmt->fetch()) {
            throw new AppException(404, "User not found with id: {$userId}");
        }

        $stmt = $db->prepare("UPDATE users SET role = 'ROLE_USER' WHERE id = :id");
        $stmt->execute([':id' => $userId]);
    }

    public function listTransactions(?string $username, ?string $fromDate, ?string $toDate, int $page, int $size): array
    {
        $size = max(1, min(100, $size));
        $offset = ($page - 1) * $size;

        $db = Database::getConnection();

        $conditions = [];
        $params = [];

        if ($username !== null && $username !== '') {
            $conditions[] = '(fu.username ILIKE :username OR tu.username ILIKE :username)';
            $params[':username'] = "%{$username}%";
        }
        if ($fromDate !== null && $fromDate !== '') {
            $conditions[] = 't.created_at >= :fromDate';
            $params[':fromDate'] = $fromDate;
        }
        if ($toDate !== null && $toDate !== '') {
            $conditions[] = 't.created_at <= :toDate';
            $params[':toDate'] = $toDate;
        }

        $where = count($conditions) > 0 ? 'WHERE ' . implode(' AND ', $conditions) : '';

        $baseFrom = "FROM transactions t
            LEFT JOIN wallets fw ON t.from_wallet_id = fw.id
            LEFT JOIN users fu ON fw.user_id = fu.id
            LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
            LEFT JOIN users tu ON tw.user_id = tu.id
            {$where}";

        $countStmt = $db->prepare("SELECT COUNT(*) {$baseFrom}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $dataParams = $params;
        $dataStmt = $db->prepare(
            "SELECT t.*, fu.username AS from_username, tu.username AS to_username {$baseFrom} ORDER BY t.created_at DESC LIMIT :limit OFFSET :offset"
        );
        foreach ($dataParams as $key => $value) {
            $dataStmt->bindValue($key, $value, \PDO::PARAM_STR);
        }
        $dataStmt->bindValue(':limit', $size, \PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $dataStmt->execute();
        $rows = $dataStmt->fetchAll();

        $data = array_map(function ($tx) {
            return [
                'id' => (int) $tx['id'],
                'fromWalletId' => $tx['from_wallet_id'] !== null ? (int) $tx['from_wallet_id'] : null,
                'toWalletId' => $tx['to_wallet_id'] !== null ? (int) $tx['to_wallet_id'] : null,
                'fromUsername' => $tx['from_username'],
                'toUsername' => $tx['to_username'],
                'amount' => round((float) $tx['amount'], 4),
                'txType' => $tx['tx_type'],
                'status' => $tx['status'],
                'createdAt' => Timestamp::format($tx['created_at']),
            ];
        }, $rows);

        return [
            'data' => $data,
            'page' => $page,
            'size' => $size,
            'total' => $total,
        ];
    }

    public function getTransactionStats(?string $fromDate, ?string $toDate): array
    {
        $db = Database::getConnection();

        $conditions = [];
        $params = [];

        if ($fromDate !== null && $fromDate !== '') {
            $conditions[] = 'created_at >= :fromDate';
            $params[':fromDate'] = $fromDate;
        }
        if ($toDate !== null && $toDate !== '') {
            $conditions[] = 'created_at <= :toDate';
            $params[':toDate'] = $toDate;
        }

        $where = count($conditions) > 0 ? 'WHERE ' . implode(' AND ', $conditions) : '';

        $summaryStmt = $db->prepare(
            "SELECT COUNT(*)::bigint AS total_transactions, COALESCE(SUM(amount), 0) AS total_amount FROM transactions {$where}"
        );
        $summaryStmt->execute($params);
        $summary = $summaryStmt->fetch();

        $dailyStmt = $db->prepare(
            "SELECT DATE(created_at) AS date, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount FROM transactions {$where} GROUP BY DATE(created_at) ORDER BY date"
        );
        $dailyStmt->execute($params);
        $dailyRows = $dailyStmt->fetchAll();

        $dailyVolume = array_map(function ($row) {
            return [
                'date' => $row['date'],
                'count' => (int) $row['count'],
                'amount' => $row['amount'],
            ];
        }, $dailyRows);

        return [
            'totalTransactions' => (int) $summary['total_transactions'],
            'totalAmount' => $summary['total_amount'],
            'dailyVolume' => $dailyVolume,
        ];
    }
}
```

**設計要點：**

- **動態 SQL 組裝（Dynamic Query Building）**：`listTransactions()` 和 `getTransactionStats()` 根據傳入的 filter 參數動態組裝 WHERE 子句。沒有 ORM 的 `when()` 方法（如 Laravel 的 `->when($filter, fn($q) => $q->where(...))`），純手動拼接 `$conditions[]` 數組再用 `implode(' AND ', $conditions)`。
- **`$baseFrom` 重用**：`listTransactions()` 中 COUNT 查詢和資料查詢共用同一個 `$baseFrom`（FROM + JOIN + WHERE），避免 WHERE 邏輯重複。
- **`bindValue` 指定型別**：LIMIT 和 OFFSET 的參數必須用 `PDO::PARAM_INT` 綁定，否則 PDO 預設將所有參數當作字串處理，PostgreSQL 對 `LIMIT '10'` 會報型別錯誤。
- **`max(1, min(100, $size))` 分頁防禦**：page size 限制在 1 到 100 之間，防止 `size=999999` 拖垮資料庫。
- **禁用用戶不是刪除**：`disableUser()` 只是把 `role` 從 `ROLE_USER` 改成 `ROLE_DISABLED`，不刪除資料。對應 `login()` 中的 `ROLE_DISABLED` 檢查，被禁用的用戶即使密碼正確也無法登入。
- **LEFT JOIN 保留孤兒交易**：`transactions` 表的 `from_wallet_id` 和 `to_wallet_id` 有 `ON DELETE SET NULL` 約束。使用 `LEFT JOIN`（而非 `INNER JOIN`）確保即使錢包或用戶被刪除，交易記錄仍然能被查詢到（username 顯示為 null）。
- **`getTransactionStats()` 使用 GROUP BY**：按 `DATE(created_at)` 分組計算每日交易筆數和金額，用 `COALESCE(SUM(amount), 0)` 處理空結果集的 NULL → 0。

---

### 模式 10：異常處理體系（AppException + 5 個子類）

```php
<?php

namespace App\Exception;

use Exception;

class AppException extends Exception
{
    public function __construct(
        private int $statusCode,
        string $message = ''
    ) {
        parent::__construct($message);
    }

    public function getStatusCode(): int
    {
        return $this->statusCode;
    }
}
```

```php
<?php

namespace App\Exception;

class AuthenticationException extends AppException
{
    public function __construct(string $message = 'Invalid username or password')
    {
        parent::__construct(401, $message);
    }
}
```

```php
<?php

namespace App\Exception;

class ConcurrentModificationException extends AppException
{
    public function __construct(string $message)
    {
        parent::__construct(409, $message);
    }
}
```

```php
<?php

namespace App\Exception;

class DuplicateUsernameException extends AppException
{
    public function __construct(string $message)
    {
        parent::__construct(409, $message);
    }
}
```

```php
<?php

namespace App\Exception;

class InsufficientBalanceException extends AppException
{
    public function __construct(string $message)
    {
        parent::__construct(400, $message);
    }
}
```

```php
<?php

namespace App\Exception;

class WalletNotFoundException extends AppException
{
    public function __construct(string $message)
    {
        parent::__construct(404, $message);
    }
}
```

**設計要點：**

- **PHP 8 constructor promotion**：`AppException` 的 `private int $statusCode` 使用 PHP 8.0+ 的 constructor promotion 語法，一行同時宣告屬性、接收參數、賦值。每個子類只需一行 `parent::__construct()` 呼叫，程式碼極簡。
- **基礎類自帶 HTTP 狀態碼**：每個子類在建構子中寫死對應的 HTTP statusCode（401、404、409、400），呼叫方不需要知道每個例外的 HTTP 碼，統一由 `index.php` 的 `catch (AppException $e)` 透過 `$e->getStatusCode()` 讀取。
- **`ConcurrentModificationException` 與 `DuplicateUsernameException` 都是 409**：雖然一個是樂觀鎖衝突、一個是唯一約束衝突，但語義上都是「衝突」（Conflict），因此共用 409。`CompositeUsernameException` 的 message 包含具體用戶名（`"Username 'alice' is already taken"`），前端可據此展示不同的錯誤提示。
- **`InsufficientBalanceException` 是 400 不是 409**：餘額不足是業務規則違反（用戶知道自己的餘額），不是並發衝突，因此用 400。

---

## 資料庫表結構

來自 `schema.sql`（PostgreSQL DDL），六版本共用相同結構：

```sql
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'ROLE_USER',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wallets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency VARCHAR(10) NOT NULL DEFAULT 'USDT',
    balance NUMERIC(18, 4) NOT NULL DEFAULT 0.0000,
    version INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    from_wallet_id BIGINT REFERENCES wallets(id) ON DELETE SET NULL,
    to_wallet_id BIGINT REFERENCES wallets(id) ON DELETE SET NULL,
    amount NUMERIC(18, 4) NOT NULL,
    tx_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_from_wallet_id ON transactions(from_wallet_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_wallet_id ON transactions(to_wallet_id);
```

**Schema 設計要點：**

| 設計決策 | 說明 |
|---------|------|
| `BIGSERIAL` 主鍵 | PostgreSQL 的 auto-increment bigint，等價 MySQL `BIGINT AUTO_INCREMENT` |
| `NUMERIC(18,4)` 金額 | 定點數而非浮點數，防止 `0.1 + 0.2 != 0.3` 問題。18 位總長度、4 位小數 |
| `version INTEGER` 樂觀鎖 | 每次 UPDATE 時 `version = version + 1`，WHERE 子句檢查版本匹配 |
| `ON DELETE CASCADE` (wallets) | 刪除用戶時自動刪除錢包 |
| `ON DELETE SET NULL` (transactions) | 刪除錢包時保留交易記錄（from_wallet_id / to_wallet_id 設為 NULL） |
| `users.role` 三種值 | `ROLE_USER`（正常）、`ROLE_ADMIN`（管理員）、`ROLE_DISABLED`（被禁用） |
| `idx_transactions_*` 索引 | 支援按 from_wallet_id / to_wallet_id 查詢交易歷史（最常見的查詢模式） |

---

## 數據流圖

### 1. 使用者註冊

```
POST /api/auth/register  { username: "alice", password: "123456" }
  │
  ├─ public/index.php
  │   └─ match("POST /api/auth/register") → false（無需 JWT）
  │
  ├─ switch → case '/api/auth/register'
  │   └─ $authService = new AuthService()
  │       └─ $authService->register("alice", "123456")
  │           ├─ 驗證：strlen(username) < 3 → AppException(400)
  │           ├─ 驗證：strlen(password) < 6 → AppException(400)
  │           ├─ $db->beginTransaction()
  │           ├─ password_hash("123456", PASSWORD_BCRYPT) → $2y$10$...
  │           ├─ INSERT INTO users (username, password_hash, role) VALUES (...)
  │           │   RETURNING id → 1
  │           ├─ INSERT INTO wallets (user_id, currency, balance, version)
  │           │   VALUES (1, 'USDT', 0, 0)
  │           ├─ $db->commit()
  │           └─ return（void）
  │
  └─ JsonResponse::send({status:"SUCCESS", message:"User registered successfully"}, 201)
      └─ http_response_code(201) + json_encode + exit

錯誤路徑：
  ├─ username 已存在 → PDOException code=23505 → rollBack → DuplicateUsernameException → 409
  └─ 其他 DB 錯誤 → rollBack → PDOException → 500
```

### 2. 使用者登入

```
POST /api/auth/login  { username: "alice", password: "123456" }
  │
  ├─ public/index.php
  │   └─ match("POST /api/auth/login") → false（無需 JWT）
  │
  ├─ switch → case '/api/auth/login'
  │   └─ $authService = new AuthService()
  │       └─ $authService->login("alice", "123456")
  │           ├─ SELECT * FROM users WHERE username = 'alice'
  │           │   └─ null → AuthenticationException(401)
  │           ├─ password_verify("123456", $hash)
  │           │   └─ false → AuthenticationException(401)
  │           ├─ $user['role'] === 'ROLE_DISABLED'
  │           │   └─ true → AuthenticationException(401)
  │           ├─ JwtHelper::generateToken(1, "alice", "ROLE_USER")
  │           │   └─ FirebaseJWT::encode({sub:"1", username:"alice", role:"ROLE_USER", iat, exp})
  │           └─ return { token: "eyJ...", user: {id:1, username:"alice", role:"ROLE_USER", ...} }
  │
  └─ JsonResponse::send(result, 200)
```

### 3. 查詢錢包

```
GET /api/wallets
  Authorization: Bearer eyJ... (sub=1, role=ROLE_USER)
  │
  ├─ public/index.php
  │   └─ match("GET /api/wallets") → true（需要 JWT）
  │
  ├─ JwtMiddleware::handle($request)
  │   ├─ 提取 header Authorization → "Bearer eyJ..."
  │   ├─ substr($authHeader, 7) → token string
  │   ├─ JwtHelper::decodeToken(token)
  │   │   └─ FirebaseJWT::decode → {sub:"1", username:"alice", role:"ROLE_USER", ...}
  │   ├─ $request->setAttribute('userId', 1)
  │   └─ $request->setAttribute('userRole', 'ROLE_USER')
  │
  ├─ switch → case '/api/wallets'
  │   └─ $walletService = new WalletService()
  │       └─ $walletService->getWalletByUserId(1)
  │           ├─ SELECT * FROM wallets WHERE user_id = 1
  │           │   └─ null → WalletNotFoundException(404)
  │           └─ return { id, userId, currency:"USDT", balance:0, version:0, updatedAt }
  │
  └─ JsonResponse::send(walletData, 200)
```

### 4. 轉帳（樂觀鎖核心路徑）

```
POST /api/transactions/transfer
  Authorization: Bearer eyJ... (sub=1, role=ROLE_USER)
  Body: { toUsername: "bob", amount: "50.0000" }
  │
  ├─ public/index.php
  │   └─ match("POST /api/transactions/transfer") → true（需要 JWT）
  │
  ├─ JwtMiddleware::handle($request)
  │   └─ $request->setAttribute('userId', 1)
  │
  ├─ switch → case '/api/transactions/transfer'
  │   └─ $txService = new TransactionService()
  │       └─ $txService->transfer(fromUserId=1, toUsername="bob", amount="50.0000")
  │           │
  │           ├─ 驗證：strlen(toUsername) < 3 → AppException(400)
  │           ├─ 驗證：!is_numeric(amount) → AppException(400)
  │           ├─ 驗證：bccomp("50.0000", "0", 4) <= 0 → AppException(400)
  │           │
  │           ├─ $db->beginTransaction()
  │           │
  │           ├─ SELECT * FROM users WHERE username = 'bob'
  │           │   └─ null → AppException(400, "Recipient not found")
  │           │   └─ found → toUserId = 2
  │           │
  │           ├─ 驗證：fromUserId(1) === toUserId(2) → pass（不是自己轉自己）
  │           │
  │           ├─ SELECT * FROM wallets WHERE user_id = 1
  │           │   └─ {id:1, balance:"500.0000", version:3, ...}
  │           ├─ SELECT * FROM wallets WHERE user_id = 2
  │           │   └─ {id:2, balance:"100.0000", version:5, ...}
  │           │
  │           ├─ 驗證：bccomp("500.0000", "50.0000", 4) < 0 → pass（餘額充足）
  │           │
  │           ├─ UPDATE wallets SET balance = balance - 50.0000, version = 4, updated_at = NOW()
  │           │   WHERE user_id = 1 AND version = 3
  │           │   └─ rowCount() = 1 → OK（無並發衝突）
  │           │   └─ rowCount() = 0 → ConcurrentModificationException(409)
  │           │
  │           ├─ UPDATE wallets SET balance = balance + 50.0000, version = 6, updated_at = NOW()
  │           │   WHERE user_id = 2
  │           │
  │           ├─ INSERT INTO transactions (from_wallet_id, to_wallet_id, amount, tx_type, status)
  │           │   VALUES (1, 2, 50.0000, 'TRANSFER', 'SUCCESS')
  │           │
  │           ├─ $db->commit()
  │           └─ return（void）
  │
  └─ JsonResponse::send({status:"SUCCESS", message:"Transfer completed successfully"}, 200)

並發衝突路徑（樂觀鎖觸發）：
  UPDATE ... WHERE user_id = 1 AND version = 3
  → rowCount() = 0（另一個請求已經把 version 改成 4）
  → rollBack → ConcurrentModificationException(409)
  → 客戶端收到 409，可提示用戶重試
```

### 5. 查詢交易歷史

```
GET /api/transactions
  Authorization: Bearer eyJ... (sub=1)
  │
  ├─ JwtMiddleware → $request->setAttribute('userId', 1)
  │
  ├─ switch → case '/api/transactions'
  │   └─ $txService = new TransactionService()
  │       └─ $txService->getTransactionHistory(1)
  │           ├─ SELECT * FROM wallets WHERE user_id = 1 → wallet id = 1
  │           ├─ SELECT * FROM transactions
  │           │   WHERE from_wallet_id = 1 OR to_wallet_id = 1
  │           │   ORDER BY created_at DESC
  │           ├─ array_map: DB row → camelCase JSON shape
  │           └─ return [{id, fromWalletId, toWalletId, amount, txType, status, createdAt}, ...]
  │
  └─ JsonResponse::send(transactions, 200)
```

### 6. Admin：列出所有用戶

```
GET /api/admin/users?search=alice&page=1&size=10
  Authorization: Bearer eyJ... (sub=3, role=ROLE_ADMIN)
  │
  ├─ public/index.php
  │   └─ match("GET /api/admin/users") → 'admin'
  │
  ├─ JwtMiddleware::handle($request)
  │   ├─ decodeToken → setAttribute('userId', 3)
  │   └─ setAttribute('userRole', 'ROLE_ADMIN')
  │
  ├─ AdminMiddleware::handle($request)
  │   ├─ getAttribute('userRole') → 'ROLE_ADMIN'
  │   └─ === 'ROLE_ADMIN' → pass
  │   └─ !== 'ROLE_ADMIN' → AppException(403, "Access denied")
  │
  ├─ if (GET && /api/admin/users)
  │   └─ $adminService = new AdminService()
  │       └─ $adminService->listUsers("alice", 1, 10)
  │           ├─ SELECT COUNT(*) FROM users WHERE username ILIKE '%alice%'
  │           ├─ SELECT id, username, role, created_at FROM users
  │           │   WHERE username ILIKE '%alice%' ORDER BY id LIMIT 10 OFFSET 0
  │           └─ return { data: [...], page: 1, size: 10, total: N }
  │
  └─ JsonResponse::send(result, 200)
```

### 7. Admin：查看用戶詳情（含錢包 + 最近交易）

```
GET /api/admin/users/1
  Authorization: Bearer eyJ... (role=ROLE_ADMIN)
  │
  ├─ JwtMiddleware + AdminMiddleware → pass
  │
  ├─ if (GET && parts[2]==='users' && is_numeric(parts[3]))
  │   └─ $adminService = new AdminService()
  │       └─ $adminService->getUserDetail(1)
  │           ├─ SELECT * FROM users WHERE id = 1
  │           │   └─ null → AppException(404)
  │           ├─ SELECT * FROM wallets WHERE user_id = 1
  │           ├─ SELECT t.*, fu.username AS from_username, tu.username AS to_username
  │           │   FROM transactions t
  │           │   LEFT JOIN wallets fw ON t.from_wallet_id = fw.id
  │           │   LEFT JOIN users fu ON fw.user_id = fu.id
  │           │   LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
  │           │   LEFT JOIN users tu ON tw.user_id = tu.id
  │           │   WHERE t.from_wallet_id = 1 OR t.to_wallet_id = 1
  │           │   ORDER BY t.created_at DESC LIMIT 5
  │           └─ return { id, username, role, createdAt, wallet: {...}, recentTransactions: [...] }
  │
  └─ JsonResponse::send(detail, 200)
```

### 8. Admin：禁用／啟用用戶

```
PUT /api/admin/users/5/disable
  Authorization: Bearer eyJ... (role=ROLE_ADMIN)
  │
  ├─ public/index.php
  │   └─ match("PUT /api/admin/users/5/disable") → null
  │   └─ str_starts_with("/api/admin/users/5/disable", "/api/admin/") → true
  │   └─ route = 'admin'
  │
  ├─ JwtMiddleware + AdminMiddleware → pass
  │
  ├─ if (PUT && parts[4]==='disable' && is_numeric(parts[3]))
  │   └─ $adminService = new AdminService()
  │       └─ $adminService->disableUser(5)
  │           ├─ SELECT id FROM users WHERE id = 5
  │           │   └─ null → AppException(404)
  │           └─ UPDATE users SET role = 'ROLE_DISABLED' WHERE id = 5
  │
  └─ JsonResponse::send({status:"SUCCESS", message:"User disabled successfully"}, 200)

效應：
  被禁用用戶下次登入 → login() 中 role === 'ROLE_DISABLED' → AuthenticationException(401)
  被禁用用戶的現有 JWT → 仍可正常使用直到過期（JWT 是無狀態的，不即時撤銷）
  啟用路徑相同，role 設為 'ROLE_USER'
```

### 9. Admin：查詢所有交易 + 統計

```
GET /api/admin/transactions?username=bob&fromDate=2025-01-01&toDate=2025-12-31&page=1&size=20
  Authorization: Bearer eyJ... (role=ROLE_ADMIN)
  │
  ├─ JwtMiddleware + AdminMiddleware → pass
  │
  ├─ if (GET && /api/admin/transactions)
  │   └─ $adminService = new AdminService()
  │       └─ $adminService->listTransactions("bob", "2025-01-01", "2025-12-31", 1, 20)
  │           ├─ 動態 WHERE：fu.username ILIKE '%bob%' OR tu.username ILIKE '%bob%'
  │           │             AND t.created_at >= '2025-01-01'
  │           │             AND t.created_at <= '2025-12-31'
  │           ├─ SELECT COUNT(*) FROM transactions t LEFT JOIN ... WHERE ...
  │           ├─ SELECT t.*, fu.username, tu.username FROM transactions t LEFT JOIN ...
  │           │   WHERE ... ORDER BY created_at DESC LIMIT 20 OFFSET 0
  │           └─ return { data: [...], page: 1, size: 20, total: N }
  │
  └─ JsonResponse::send(result, 200)

GET /api/admin/transactions/stats?fromDate=2025-01-01&toDate=2025-12-31
  Authorization: Bearer eyJ... (role=ROLE_ADMIN)
  │
  ├─ JwtMiddleware + AdminMiddleware → pass
  │
  ├─ if (GET && /api/admin/transactions/stats)
  │   └─ $adminService = new AdminService()
  │       └─ $adminService->getTransactionStats("2025-01-01", "2025-12-31")
  │           ├─ SELECT COUNT(*)::bigint, COALESCE(SUM(amount), 0) FROM transactions WHERE ...
  │           └─ SELECT DATE(created_at) AS date, COUNT(*), COALESCE(SUM(amount), 0)
  │               FROM transactions WHERE ... GROUP BY DATE(created_at) ORDER BY date
  │
  └─ JsonResponse::send({totalTransactions:N, totalAmount:"...", dailyVolume:[...]}, 200)
```

---

## 啟動方式

```bash
# 1. 安裝依賴（僅 firebase/php-jwt）
composer install

# 2. Docker 一鍵啟動（PostgreSQL 16 + App）
docker-compose up -d

# 3. 或手動啟動（需 PostgreSQL 已運行在 localhost:5436）
DB_HOST=localhost DB_PORT=5436 php -S localhost:8002 -t public

# 4. 停止
docker-compose down
```

**容器埠號映射：**

| 服務 | 主機埠 | 容器埠 | 說明 |
|------|--------|--------|------|
| App (php -S) | `8002` | `8080` | PHP 內建伺服器，監聽 `public/` 目錄 |
| PostgreSQL | `5436` | `5432` | 使用 `5436` 避免與其他版本的 PostgreSQL 衝突 |

**環境變數（docker-compose.yml 內設定）：**

| 變數 | 預設值 | 說明 |
|------|--------|------|
| `DB_HOST` | `postgres` (Docker) / `localhost` (手動) | PostgreSQL 主機 |
| `DB_PORT` | `5432` (Docker) / `5436` (手動) | PostgreSQL 埠號 |
| `DB_DATABASE` | `digital_wallet` | 資料庫名稱 |
| `DB_USERNAME` | `postgres` | 資料庫用戶 |
| `DB_PASSWORD` | `root` | 資料庫密碼 |
| `JWT_SECRET` | (64 字元 hex) | HS256 簽名密鑰 |
| `JWT_EXPIRATION` | `86400000` | Token 有效期（毫秒，24 小時） |

**測試流程：**

```bash
# 註冊用戶
curl -X POST http://localhost:8002/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"test123"}'

curl -X POST http://localhost:8002/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"bob","password":"test123"}'

# 登入（複製 token）
curl -X POST http://localhost:8002/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"test123"}'

# 查詢錢包
curl http://localhost:8002/api/wallets \
  -H 'Authorization: Bearer <TOKEN>'

# 轉帳
curl -X POST http://localhost:8002/api/transactions/transfer \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <TOKEN>' \
  -d '{"toUsername":"bob","amount":"100.0000"}'

# 查詢交易歷史
curl http://localhost:8002/api/transactions \
  -H 'Authorization: Bearer <TOKEN>'

# Admin 端點（需 ROLE_ADMIN token）
curl http://localhost:8002/api/admin/users?page=1&size=10 \
  -H 'Authorization: Bearer <ADMIN_TOKEN>'
```

**前端對接：** 修改 `digital_wallet_frontend/vite.config.ts` 的 proxy target 為 `http://localhost:8002`。

---

## 設計決策問答

### 為什麼選擇零框架？

| 考量 | 說明 |
|------|------|
| **教育目的** | 展示 PHP 生態最底層的運作方式：手動路由、手動 middleware、手動 DI、手動 transaction |
| **對照價值** | 與 Laravel 版（同一語言、有框架 vs 無框架）形成最直接的架構對比 |
| **模擬 legacy** | 許多公司仍在維護無框架的老舊 PHP 專案，這個版本可作為現代化重構的起點參考 |
| **最小依賴** | 只依賴 `firebase/php-jwt` 一個外部套件，其他全部 PHP 內建 |

### 為什麼用 PDO 而不是 mysqli？

- PDO 支援多種資料庫（PostgreSQL、MySQL、SQLite），mysqli 只支援 MySQL
- PDO 的 named parameters（`:user_id`）比 mysqli 的 positional parameters（`?`）更具可讀性
- `ATTR_EMULATE_PREPARES = false` 確保 PostgreSQL DECIMAL 精度，且關閉多語句注入
- PDO 是 PHP 官方推薦的資料庫抽象層

### 為什麼用靜態方法（static）而不是實例方法？

- **無狀態**：Database、JwtHelper、JwtMiddleware、AdminMiddleware、JsonResponse、Timestamp 都是無狀態的工具類，不需要實例變數
- **簡潔**：`Database::getConnection()` 比 `(new Database())->getConnection()` 更簡潔
- **Service 類使用實例方法**：AuthService、WalletService、TransactionService、AdminService 使用實例是因為它們可能被 mock（測試時可繼承並覆蓋方法）
- **PHP 的現實**：在沒有 DI 容器的環境中，靜態方法呼叫是最直接的 service locator 模式

### 為什麼用樂觀鎖而不是悲觀鎖？

| 悲觀鎖 `SELECT ... FOR UPDATE` | 樂觀鎖 `version` 欄位 |
|-------------------------------|----------------------|
| 鎖定行，其他請求排隊等待 | 不鎖定，提交時檢查版本 |
| 高併發寫入時效能差 | 適合讀多寫少的場景 |
| 可能 deadlock | 不會 deadlock |
| 需要連接保持（交易期間持鎖） | 無狀態，無鎖持有 |

錢包大多數時間在查詢（讀），偶爾轉帳（寫），適合樂觀鎖。衝突時返回 409 讓客戶端重試。

### 為什麼禁用用戶不刪除 JWT？

- JWT 是無狀態的，一旦簽發就無法從伺服器端撤銷（除非引入黑名單機制）
- 被禁用的用戶無法獲取新 token（因為 `login()` 檢查 `ROLE_DISABLED`）
- 現有 token 失效時間最長為設定的過期時間（24 小時）
- 對於 Demo 專案，這種程度的防護已足夠；生產環境可考慮引入 Redis token 黑名單

### 為什麼不使用 PHP 8.4+ 的新特性？

專案鎖定 PHP 8.3+，因為：
- PHP 8.3 是撰寫時最新的穩定版本
- Ubuntu 24.04 LTS 的預設 PHP 版本為 8.3
- PHP 8.4 引入 property hooks 和 asymmetric visibility，但目前尚未達到廣泛部署的成熟度

---

## 安全紅線

| 要做的 | 不要做的 |
|--------|---------|
| BCrypt 存密碼（`password_hash(PASSWORD_BCRYPT)`） | 明文、MD5、SHA-256 存密碼 |
| PDO prepared statements（`prepare()` + `execute()`） | 字串拼接 SQL |
| 從 JWT 提取用戶身份（`$request->getAttribute('userId')`） | 從 URL 路徑參數獲取用戶 ID |
| 登入失敗返回統一訊息 | 區分「用戶不存在」vs「密碼錯誤」 |
| 手動 `beginTransaction()` / `commit()` / `rollBack()` 管理事務 | 部分成功、部分失敗的狀態 |
| `error_log()` 記錄伺服器錯誤 | 將錯誤細節洩漏給客戶端（`display_errors = 0`） |
| 捕獲 `PDOException` 且檢查 `$e->getCode() === '23505'` | 捕獲過寬（`catch(Exception)` 誤判其他 DB 錯誤為重複用戶名） |
| 關閉 `ATTR_EMULATE_PREPARES`（設為 `false`） | 使用預設值 `true`（DECIMAL 精度損失 + 多語句注入風險） |
| `bccomp()` 比較金額 | PHP 運算子 `>` / `<` 比較金額字串 |

---

## 常見錯誤

| 錯誤 | 後果 | 正確做法 |
|------|------|---------|
| `ATTR_EMULATE_PREPARES = true`（PDO 預設值） | PostgreSQL DECIMAL 以 float 回傳，`0.1 + 0.2 != 0.3`；多語句注入可能 | 設為 `false` |
| 用 `>` 比較金額字串 | `"9.0000" > "10.0000"` 返回 `true`（字典序 `'9' > '1'`） | 用 `bccomp("9.0000", "10.0000", 4)` |
| `rowCount()` 用在非 UPDATE 語句 | `SELECT` 的 `rowCount()` 在部分驅動中行為不一致 | 只在 `UPDATE` / `DELETE` / `INSERT` 後使用 `rowCount()` |
| 忘記 `rollBack()` | 出錯後未 commit 的交易殘留，可能導致鎖未釋放、連線洩漏 | `catch` 區塊第一個動作就是 `$db->rollBack()` |
| `PDOException` 捕獲過寬 | 連線失敗被誤判為重複用戶名（23505） | 檢查 `$e->getCode() === '23505'`，其餘重新拋出 |
| `php -S` 內建伺服器單執行緒 | 同時請求排隊等待（下一個請求等到上一個完成） | Demo 可接受，生產環境換 PHP-FPM + Nginx |
| 不檢查 `json_decode()` 回傳值 | 請求體格式錯誤時 `$this->body` 為 null，後續 array access 產生 warning | `is_array($decoded) ? $decoded : []` |
| `bindValue` 未指定 `PDO::PARAM_INT` 給 LIMIT/OFFSET | PostgreSQL 對 `LIMIT '10'`（字串）報型別錯誤 | `$stmt->bindValue(':limit', $size, \PDO::PARAM_INT)` |
| `php://input` 讀取後未重置 | 無法讀取第二次（`php://input` 是不可回溯的 stream） | 在 constructor 中讀取一次並存入 `$this->body` |
| JWT `role` claim 遺漏 | `AdminMiddleware` 中 `$request->getAttribute('userRole')` 為 null，`!== 'ROLE_ADMIN'` 永遠為 true，阻止所有請求 | `$payload->role ?? 'ROLE_USER'` 提供 fallback |
| Docker 的 `DB_HOST` 用 `localhost` | 容器內 `localhost` 指向容器自己，找不到 PostgreSQL | Docker 內用 service name：`postgres` |
| `password_hash()` 未指定演算法 | `PASSWORD_DEFAULT` 可能在未來 PHP 版本更換演算法，舊密碼無法驗證 | 始終明確指定 `PASSWORD_BCRYPT` |

---

## 六版本程式碼量對比

| 關注點 | Spring Boot | Spring MVC | Node.js | FastAPI | Laravel | 純 PHP |
|--------|------------|-----------|---------|---------|---------|--------|
| JWT + 安全 | ~60 | ~65 | ~40 | ~50 | ~45 | ~50 |
| 密碼處理 | ~5 | ~5 | ~3 | ~4 | ~3 | ~3 |
| 樂觀鎖 + 轉帳 | ~60 | ~65 | ~70 | ~40 | ~45 | ~80 |
| 異常處理 | ~55 | ~45 | ~20 | ~35 | ~35 | ~30 |
| API 路由 + Controller | ~40 | ~55 | ~45 | ~30 | ~45 | ~100 |
| Model / DTO | ~120 | ~120 | ~50 | ~100 | ~50 | ~0 |
| 配置 | ~15 | ~120 | ~15 | ~10 | ~20 | ~15 |
| Admin 後台 | ~80 | ~80 | ~70 | ~80 | ~80 | ~150 |
| **總計** | **~435** | **~555** | **~313** | **~349** | **~323** | **~428** |

純 PHP 版行數最多在路由（內聯 dispatch）和 admin（手動 JOIN + 動態 SQL），而 ORM 框架的 Model/DTO 層在純 PHP 中為零（因為沒有類別映射，直接操作關聯陣列）。

