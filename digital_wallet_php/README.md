# Digital Wallet Backend — PHP (Laravel) 版 (Demo)

> **技術驗證 / 抄作業項目**：用 PHP Laravel 11 生態複現數位錢包的所有功能。**API 合約與 Spring Boot 版和 FastAPI 版完全一致**，前端 `digital_wallet_frontend` 無需任何改動即可對接。

## 三版本技術對照

| 功能 | Spring Boot | FastAPI | Laravel (PHP) |
|------|------------|---------|---------------|
| 語言 | Java 21 | Python 3.12+ | PHP 8.3+ |
| Web 框架 | Spring Boot 3.5 | FastAPI 0.115+ | Laravel 11 |
| ORM | MyBatis (XML SQL) | SQLAlchemy 2.0 async | Eloquent |
| DB 驅動 | JDBC PostgreSQL | asyncpg | PDO pgsql |
| 密碼雜湊 | BCrypt (Spring Security) | passlib[bcrypt] | `Hash::make()` (bcrypt) |
| JWT | jjwt 0.11.5 | PyJWT 2.x | firebase/php-jwt 6.x |
| 序列化 | Jackson (自動) | Pydantic v2 | 手動 array 組裝 (camelCase key) |
| 伺服器 | 內建 Tomcat | Uvicorn | PHP built-in / FPM + Nginx |
| 依賴注入 | Spring DI | FastAPI Depends | Laravel Service Container |
| 事務管理 | `@Transactional` | `session.begin()` | `DB::transaction()` |
| 樂觀鎖 | MyBatis UPDATE + rowcount | SQLAlchemy UPDATE + rowcount | Eloquent `where()->update()` + affected check |
| 全域異常 | `@RestControllerAdvice` | exception_handler | `Exceptions::render()` |
| 中介層 | `OncePerRequestFilter` | FastAPI Depends | Laravel Middleware |
| 驗證 | `@Valid` | Pydantic | FormRequest |
| 容器化 | Docker + docker-compose | Docker + docker-compose | Docker + docker-compose |

## 技術清單

| 技術 | 版本 | 用途 |
|------|------|------|
| PHP | 8.3+ | 核心語言 |
| Laravel | 11 | Web 框架 |
| Eloquent | — (內建) | ORM |
| PDO pgsql | — (內建) | PostgreSQL 驅動 |
| firebase/php-jwt | 6.x | JWT Token (HS256) |
| Laravel Hash | — (內建) | BCrypt 密碼雜湊 |
| Laravel Validation | — (內建) | FormRequest 驗證 |
| Docker | — | 容器化部署 |

---

## 完整專案結構

```
digital_wallet_php/
├── composer.json                     # PHP 依賴（Laravel 11 + firebase/php-jwt）
├── Dockerfile                        # 多階段構建（composer install → copy vendor）
├── docker-compose.yml                # PostgreSQL 16 + PHP App
├── .env                              # 環境變數（DB、JWT）
├── .gitignore                        # vendor/, .env, storage/
│
├── app/
│   ├── Models/
│   │   ├── User.php                  # Eloquent Model：users 表（hasOne Wallet）
│   │   ├── Wallet.php                # Eloquent Model：wallets 表（含 version 樂觀鎖）
│   │   └── Transaction.php           # Eloquent Model：transactions 表
│   │
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Controller.php        #   基礎 Controller
│   │   │   ├── AuthController.php    #   POST /api/auth/register, /login
│   │   │   ├── WalletController.php  #   GET /api/wallets（從 JWT 取得 userId）
│   │   │   └── TransactionController.php # POST /api/transactions/transfer, GET /api/transactions
│   │   │
│   │   ├── Middleware/
│   │   │   └── JwtMiddleware.php     #   提取 Bearer Token → 驗證 → 寫入 request attributes
│   │   │
│   │   └── Requests/
│   │       ├── RegisterRequest.php   #   FormRequest：username/password 驗證
│   │       ├── LoginRequest.php      #   FormRequest：username/password 驗證
│   │       └── TransferRequest.php   #   FormRequest：toUsername/amount 驗證
│   │
│   ├── Services/
│   │   ├── AuthService.php           #   register()（DB::transaction + unique catch）、login()
│   │   ├── WalletService.php         #   getWalletByUserId()：查詢 + camelCase 組裝
│   │   └── TransactionService.php    #   transfer()（樂觀鎖 + DB::transaction）、getHistory()
│   │
│   ├── Exceptions/
│   │   ├── AppException.php          #   基礎業務異常（statusCode + message）
│   │   ├── AuthenticationException.php    # 401
│   │   ├── InsufficientBalanceException.php # 400
│   │   ├── WalletNotFoundException.php  # 404
│   │   ├── ConcurrentModificationException.php # 409
│   │   └── DuplicateUsernameException.php # 409
│   │
│   └── Helpers/
│       └── JwtHelper.php             #   firebase/php-jwt 封裝：generateToken / decodeToken
│
├── bootstrap/
│   └── app.php                       # Laravel 啟動：路由 + middleware 註冊 + 全域異常處理
│
├── config/
│   ├── database.php                  # PostgreSQL 連線配置
│   └── jwt.php                       # JWT secret/expiration 配置
│
├── database/
│   └── migrations/
│       ├── 0001_..._create_users_table.php       # users 表 DDL
│       ├── 0001_..._create_wallets_table.php     # wallets 表（version 樂觀鎖）
│       └── 0001_..._create_transactions_table.php # transactions 表 + indexes
│
├── public/
│   └── index.php                     # Laravel 入口
│
├── routes/
│   └── api.php                       # API 路由（公開 + JWT 保護群組）
│
├── storage/                          # Laravel 儲存目錄（logs, cache）
│   ├── app/
│   ├── framework/
│   └── logs/
│
└── README.md
```

---

## 如何快速找到要抄的部分

| 你想學/抄什麼 | PHP 檔案 | 對應 Spring Boot | 對應 FastAPI |
|-------------|---------|-----------------|-------------|
| 專案初始化 (composer.json) | [composer.json](composer.json) | pom.xml | requirements.txt |
| Laravel 啟動 + 全域異常 | [bootstrap/app.php](bootstrap/app.php) | SecurityConfig + GlobalExceptionHandler | main.py |
| DB 連線配置 | [config/database.php](config/database.php) | application.yaml | config.py |
| Eloquent ORM Model | [app/Models/](app/Models/) | Entity 類 | models/ |
| FormRequest 驗證 | [app/Http/Requests/](app/Http/Requests/) | `@Valid` DTO | Pydantic schemas |
| JWT 生成/驗證 | [app/Helpers/JwtHelper.php](app/Helpers/JwtHelper.php) | JwtUtil.java | security.py |
| Laravel Middleware (JWT) | [app/Http/Middleware/JwtMiddleware.php](app/Http/Middleware/JwtMiddleware.php) | JwtAuthenticationFilter | deps.py |
| BCrypt 密碼 | [app/Services/AuthService.php](app/Services/AuthService.php) | AuthServiceImpl | auth_service.py |
| 樂觀鎖 + DB::transaction | [app/Services/TransactionService.php](app/Services/TransactionService.php) | TransactionServiceImpl + WalletMapper.xml | transaction_service.py |
| Controller (REST) | [app/Http/Controllers/](app/Http/Controllers/) | @RestController | api/ |
| API 路由定義 | [routes/api.php](routes/api.php) | @RequestMapping | APIRouter |
| Laravel Migration | [database/migrations/](database/migrations/) | db.sql | db.sql |
| Docker 容器化 | [Dockerfile](Dockerfile) + [docker-compose.yml](docker-compose.yml) | Dockerfile | Dockerfile |

---

## API 端點（三版本完全一致）

| 方法 | 路徑 | JWT | 請求體 | 響應 | HTTP |
|------|------|-----|--------|------|------|
| POST | `/api/auth/register` | 否 | `{"username":"alice","password":"123456","role":"ROLE_USER"}` | `{"status":"SUCCESS","message":"User registered successfully"}` | 201 |
| POST | `/api/auth/login` | 否 | `{"username":"alice","password":"123456"}` | `{"token":"eyJ...","user":{"id":1,"username":"alice","role":"ROLE_USER","createdAt":"..."}}` | 200 |
| GET | `/api/wallets` | 是 | — | `{"id":1,"userId":1,"currency":"USDT","balance":100.5000,"version":3,"updatedAt":"..."}` | 200 |
| POST | `/api/transactions/transfer` | 是 | `{"toUsername":"bob","amount":50.0}` | `{"status":"SUCCESS","message":"Transfer completed successfully"}` | 200 |
| GET | `/api/transactions` | 是 | — | `[{...TransactionDTO}, ...]` | 200 |

---

## 錯誤響應格式

```json
{"status": "ERROR", "message": "..."}
```

| HTTP | 異常類 | 場景 |
|------|------|------|
| 400 | `InsufficientBalanceException` | 餘額不足 |
| 400 | `AppException` | amount <= 0、自己轉給自己 |
| 400 | `RequestValidationError` | FormRequest 驗證失敗 |
| 401 | `AuthenticationException` | 登入失敗、Token 無效/過期 |
| 404 | `WalletNotFoundException` | 錢包不存在 |
| 409 | `ConcurrentModificationException` | 樂觀鎖版本衝突 |
| 409 | `DuplicateUsernameException` | 用戶名重複 |
| 500 | `Exception` (fallback) | 未預期錯誤 |

---

## 核心實作模式（完整程式碼 + 解釋）

### 1. 專案初始化 (composer.json + bootstrap/app.php)

#### composer.json

```json
{
    "name": "app/digital-wallet",
    "type": "project",
    "require": {
        "php": "^8.3",
        "laravel/framework": "^11.0",
        "firebase/php-jwt": "^6.0"
    },
    "autoload": {
        "psr-4": {
            "App\\": "app/"
        }
    }
}
```

**為什麼只用 `firebase/php-jwt` 而不是 `tymon/jwt-auth`：**
- `tymon/jwt-auth` 是 Laravel 專用封裝，依賴 Laravel 內部 Auth Guard 機制
- `firebase/php-jwt` 是獨立庫，API 與 PyJWT（Python 版）和 jjwt（Java 版）一致
- 三版本保持對稱性更利於學習對比

#### bootstrap/app.php — 全域配置

```php
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(api: __DIR__ . '/../routes/api.php')
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias(['jwt.auth' => JwtMiddleware::class]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // 業務異常 → 對應 HTTP statusCode
        $exceptions->render(function (AppException $e, $request) {
            return response()->json([
                'status' => 'ERROR',
                'message' => $e->getMessage(),
            ], $e->getStatusCode());
        });
        // FormRequest 驗證失敗 → 400（非 Laravel 預設 422）
        $exceptions->render(function (ValidationException $e, $request) {
            return response()->json([
                'status' => 'ERROR',
                'message' => $e->validator->errors()->first(),
            ], 400);
        });
        // 未預期異常 → 500
        $exceptions->render(function (\Exception $e, $request) {
            return response()->json([
                'status' => 'ERROR',
                'message' => 'An unexpected error occurred: ' . $e->getMessage(),
            ], 500);
        });
    })
    ->create();
```

**為什麼 `withExceptions` 中定義三個 render：**
- `AppException` handler：捕獲所有業務異常（401/400/404/409），返回對應 HTTP 狀態碼
- `ValidationException` handler：捕獲 FormRequest 驗證失敗，返回 400（覆蓋 Laravel 預設 422 格式）
- `Exception` handler：兜底捕獲未預期錯誤，返回 500
- Laravel 會先匹配具體的類型（`AppException`），找不到才 fallback 到 `Exception`

**對應關係：**
- `AppException` handler ↔ Spring Boot `@ExceptionHandler(AppException.class)`
- `Exception` handler ↔ Spring Boot `@ExceptionHandler(Exception.class)`
- `jwt.auth` alias ↔ Spring Boot `@Component` 自動掃描 + SecurityConfig 注入

---

### 2. Eloquent Models

```php
// User.php
class User extends Model
{
    protected $table = 'users';
    protected $fillable = ['username', 'password_hash', 'role'];
    public $timestamps = false;  // 手動管理 created_at

    public function wallet()
    {
        return $this->hasOne(Wallet::class, 'user_id');
    }
}

// Wallet.php
class Wallet extends Model
{
    protected $table = 'wallets';
    protected $fillable = ['user_id', 'currency', 'balance', 'version'];
    public $timestamps = false;

    protected $casts = [
        'balance' => 'decimal:4',  // NUMERIC(18,4) → PHP float（decimal cast）
        'version' => 'integer',
    ];
}

// Transaction.php
class Transaction extends Model
{
    protected $table = 'transactions';
    protected $fillable = ['from_wallet_id', 'to_wallet_id', 'amount', 'tx_type', 'status'];
    public $timestamps = false;

    protected $casts = [
        'amount' => 'decimal:4',
    ];
}
```

**為什麼 `$timestamps = false`：**
- Laravel 預設期望 `created_at` 和 `updated_at` 兩個欄位
- 我們只有 `created_at`（users/transactions）或 `updated_at`（wallets）
- 設為 false 後手動管理，避免 Laravel 嘗試寫入不存在的欄位

**為什麼用 `$fillable` 而不是 `$guarded`：**
- `$fillable` 白名單模式更安全，明確指定哪些欄位可以 mass assignment
- 防止攻擊者透過 `User::create($request->all())` 注入 `role = 'ROLE_ADMIN'`

---

### 3. Exception 體系

```php
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

class AuthenticationException extends AppException {
    public function __construct(string $message = 'Invalid username or password') {
        parent::__construct(401, $message);
    }
}

class InsufficientBalanceException extends AppException {
    public function __construct(string $message) {
        parent::__construct(400, $message);
    }
}
// ... 其他 4 個類似
```

**為什麼用 PHP 8.3 constructor promotion（`private int $statusCode`）：**
- 減少樣板程式碼，與 Java 版 Lombok `@AllArgsConstructor` 等效
- 6 個 Exception 類共 6 個檔案，對應 Java 版和 Python 版的 6 個 Exception 類

---

### 4. JWT Helper + Middleware

#### JwtHelper.php

```php
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtHelper
{
    public static function generateToken(int $userId, string $username): string
    {
        $payload = [
            'sub' => (string) $userId,
            'username' => $username,
            'iat' => time(),
            'exp' => time() + (int)(config('jwt.expiration') / 1000),
        ];
        return JWT::encode($payload, config('jwt.secret'), 'HS256');
    }

    public static function decodeToken(string $token): object
    {
        return JWT::decode($token, new Key(config('jwt.secret'), 'HS256'));
    }
}
```

**為什麼 JWT_EXPIRATION 設定 86400000（毫秒）但 PHP 用秒：**
- 與 Java 版和 Python 版的 `.env` 保持一致（`JWT_EXPIRATION=86400000`）
- `time()` 返回 Unix timestamp（秒），所以需要 `/ 1000`

**為什麼 `sub` 存字串：**
- JWT RFC 7519 規定 `sub` 是字串類型
- 三版本行為一致：Java `String.valueOf(userId)`、Python `str(user_id)`、PHP `(string) $userId`

#### JwtMiddleware.php（對應 JwtAuthenticationFilter / get_current_user_id）

```php
class JwtMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $authHeader = $request->header('Authorization');

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            throw new AuthenticationException('Invalid username or password');
        }

        $token = substr($authHeader, 7);

        try {
            $payload = JwtHelper::decodeToken($token);
            $request->attributes->set('userId', (int) $payload->sub);
        } catch (\Exception $e) {
            throw new AuthenticationException('Invalid username or password');
        }

        return $next($request);
    }
}
```

**為什麼 `$request->attributes->set('userId', ...)` 而不是用 Auth Guard：**
- 簡單直接，Controller 用 `$request->attributes->get('userId')` 取得當前用戶
- 對應 Java 版 `SecurityContextHolder.getContext().getAuthentication().getPrincipal()`
- 對應 Python 版 `user_id: int = Depends(get_current_user_id)`

**為什麼 Token 驗證失敗也返回 "Invalid username or password"：**
- 安全考量：不區分 Token 過期/無效/格式錯誤
- 三版本行為一致

---

### 5. Service 層

#### AuthService.php

```php
class AuthService
{
    public function register(string $username, string $password): User
    {
        return DB::transaction(function () use ($username, $password) {
            try {
                $user = User::create([
                    'username' => $username,
                    'password_hash' => Hash::make($password),
                    'role' => 'ROLE_USER',
                ]);
            } catch (UniqueConstraintViolationException $e) {
                throw new DuplicateUsernameException("Username '{$username}' is already taken");
            }

            Wallet::create([
                'user_id' => $user->id,
                'currency' => 'USDT',
                'balance' => 0,
                'version' => 0,
            ]);

            return $user;
        });
    }

    public function login(string $username, string $password): array
    {
        $user = User::where('username', $username)->first();

        if (!$user || !Hash::check($password, $user->password_hash)) {
            throw new AuthenticationException('Invalid username or password');
        }

        $token = JwtHelper::generateToken($user->id, $user->username);

        return [
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'role' => $user->role,
                'createdAt' => $user->created_at?->toISOString(),
            ],
        ];
    }
}
```

**為什麼 Login 不分開檢查 user 不存在和密碼錯誤：**
- 攻擊者可透過不同錯誤訊息列舉有效用戶名
- 三版本行為一致

**為什麼響應用 `createdAt` 而不是 `created_at`：**
- 前端 TypeScript 型別定義用 camelCase
- 三版本行為一致

**為什麼 `DB::transaction()` 而非手動 begin/commit/rollback：**
- 對應 Java 的 `@Transactional` 和 Python 的 `async with session.begin()`
- closure 內拋出例外 → 自動 ROLLBACK
- closure 正常結束 → 自動 COMMIT

#### TransactionService.php — 樂觀鎖核心

```php
class TransactionService
{
    public function transfer(int $fromUserId, string $toUsername, string $amount): void
    {
        if (bccomp($amount, '0', 4) <= 0) {
            throw new AppException(400, 'Transfer amount must be greater than zero');
        }

        // 根據用戶名查找收款用戶
        $toUser = User::where('username', $toUsername)->first();
        if (!$toUser) {
            throw new WalletNotFoundException("User not found: {$toUsername}");
        }
        $toUserId = $toUser->id;

        if ($fromUserId === $toUserId) {
            throw new AppException(400, 'Cannot transfer to yourself');
        }

        DB::transaction(function () use ($fromUserId, $toUserId, $amount) {
            $amountFloat = (float) $amount;
            $fromWallet = Wallet::where('user_id', $fromUserId)->first();
            $toWallet = Wallet::where('user_id', $toUserId)->first();
            // null checks ...

            if (bccomp((string) $fromWallet->balance, $amount, 4) < 0) {
                throw new InsufficientBalanceException("Insufficient balance: {$fromWallet->balance} < {$amount}");
            }

            // 樂觀鎖扣款：WHERE 條件帶 version
            $deducted = Wallet::where('user_id', $fromUserId)
                ->where('version', $fromWallet->version)
                ->update([
                    'balance' => DB::raw("balance - {$amountFloat}"),
                    'version' => DB::raw('version + 1'),
                    'updated_at' => now(),
                ]);

            if ($deducted === 0) {
                throw new ConcurrentModificationException("Concurrent modification detected");
            }

            // 加款
            Wallet::where('user_id', $toUserId)->update([
                'balance' => DB::raw("balance + {$amountFloat}"),
                'version' => DB::raw('version + 1'),
                'updated_at' => now(),
            ]);

            // 記錄交易
            Transaction::create([
                'from_wallet_id' => $fromWallet->id,
                'to_wallet_id' => $toWallet->id,
                'amount' => $amountFloat,
                'tx_type' => 'TRANSFER',
                'status' => 'SUCCESS',
            ]);
        });
    }
}
```

**為什麼用 `DB::raw("balance - {$amount}")` 而不是直接減完再寫入：**
- `DB::raw` 讓 SQL 在 DB 端計算，避免 read-modify-write 競爭
- Eloquent 的 `update()` 是 bulk 操作，不會觸發 model events，但支援 raw expressions

**為什麼 `DB::raw` 而不是 prepared statement 的參數綁定：**
- Eloquent 的 `update()` 中 `DB::raw()` 可以執行算術表達式
- 在 transaction 內執行，SQL injection 風險低（`$amount` 已被 FormRequest 驗證為數值）

---

### 6. Controller + Routes

```php
// AuthController.php
class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function register(RegisterRequest $request)
    {
        $this->authService->register(
            $request->input('username'),
            $request->input('password'),
        );
        return response()->json([
            'status' => 'SUCCESS',
            'message' => 'User registered successfully',
        ], 201);
    }
}

// WalletController.php
class WalletController extends Controller
{
    public function show(Request $request)
    {
        $userId = $request->attributes->get('userId');  // ← JwtMiddleware 寫入
        $wallet = $this->walletService->getWalletByUserId($userId);
        return response()->json($wallet);
    }
}

// routes/api.php
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('jwt.auth')->group(function () {
    Route::get('/wallets', [WalletController::class, 'show']);
    Route::post('/transactions/transfer', [TransactionController::class, 'transfer']);
    Route::get('/transactions', [TransactionController::class, 'history']);
});
```

**為什麼 RegisterRequest 的 `role` 驗證要加 `in:ROLE_USER`：**
- 防止攻擊者傳 `role: "ROLE_ADMIN"` 提升權限
- 白名單限制只能是 `ROLE_USER`，與 Java/Python 版行為一致

**為什麼 `$request->attributes->get('userId')` 而不是路徑參數：**
- IDOR 防護：從 JWT 提取用戶身份，不信任 URL 參數
- 三版本行為一致

**為什麼 `Route::middleware('jwt.auth')->group(...)`：**
- `jwt.auth` 是 `bootstrap/app.php` 中定義的 middleware alias
- 群組內的路由自動套用 JWT 驗證
- 對應 Java 版 `SecurityConfig` 中的 `.anyRequest().authenticated()`
- 對應 Python 版 `Depends(get_current_user_id)`

---

### 7. Laravel 依賴注入 (Service Container)

```php
class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}
    // Laravel 自動解析 AuthService 並注入
}
```

**為什麼不需要手動註冊 Service：**
- Laravel Service Container 自動掃描並解析 type-hinted 依賴
- 對應 Java 版 `@RequiredArgsConstructor` + Spring DI
- 對應 Python 版 FastAPI `Depends()`

---

### 8. Docker

#### Dockerfile

```dockerfile
FROM php:8.3-fpm-alpine AS build
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
RUN apk add --no-cache postgresql-dev && docker-php-ext-install pdo_pgsql
COPY composer.json .
RUN composer install --no-dev --no-scripts --no-interaction --prefer-dist -q

FROM php:8.3-fpm-alpine
RUN apk add --no-cache postgresql-dev && docker-php-ext-install pdo_pgsql
COPY --from=build /app/vendor /app/vendor
COPY . .
RUN mkdir -p storage/framework/{cache,sessions,views} storage/logs && chmod -R 777 storage
EXPOSE 8080
CMD php -S 0.0.0.0:8080 -t public
```

**為什麼兩階段構建：**
1. **build 階段**：安裝 composer + pdo_pgsql 擴展 + 執行 `composer install`
2. **執行階段**：只複製 vendor/，不含 composer 本身
3. 最終 Image 比單階段小很多

**為什麼用 PHP built-in server 而不是 Nginx + PHP-FPM：**
- Demo 專案簡化部署，`php -S` 足以應對開發/測試
- 生產環境替換為 Nginx + PHP-FPM（改一行 CMD 即可）

#### docker-compose.yml

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5435:5432"]
    volumes: [pgdata_php:/var/lib/postgresql/data]

  app:
    build: .
    ports: ["8001:8080"]
    environment:
      APP_KEY: base64:9kQeF1MxP7vL3nR5tW8yZ2aB4cD6eF0gH2iJ4kL6mN=
      DB_HOST: postgres         # Docker 內部主機名
      DB_PORT: 5432             # 容器內部埠
      JWT_SECRET: "404E6352..."
    depends_on:
      postgres:
        condition: service_healthy
```

---

## 數據流

```
POST /api/auth/register
  → RegisterRequest (FormRequest 驗證)
  → AuthService::register() ← DB::transaction()
    ├── Hash::make(password)              // Laravel bcrypt
    ├── User::create(...)                 // INSERT INTO users
    │     └── catch UniqueConstraintViolationException → DuplicateUsernameException → 409
    ├── Wallet::create([user_id, 0, 0])   // INSERT INTO wallets
    └── COMMIT
  → 201 { "status": "SUCCESS", "message": "User registered successfully" }

POST /api/auth/login
  → LoginRequest 驗證
  → AuthService::login()
    ├── User::where('username', ?)->first()          // SELECT
    │     └── null → AuthenticationException → 401
    ├── Hash::check(password, hash)                  // bcrypt verify
    │     └── false → AuthenticationException → 401
    ├── JwtHelper::generateToken(id, name)            // firebase/php-jwt HS256
    └── 200 { "token": "eyJ...", "user": {...} }

GET /api/wallets
  → JwtMiddleware → decodeToken → request->attributes->set('userId', 1)
  → WalletController::show()
  → WalletService::getWalletByUserId(1)
    ├── Wallet::where('user_id', 1)->first()
    │     └── null → WalletNotFoundException → 404
    └── 200 { "id": 1, "userId": 1, "balance": 100.5, "version": 3, ... }

POST /api/transactions/transfer  { toUsername: "bob", amount: 50.0 }
  → TransferRequest 驗證 (toUsername required|string, amount required|numeric|gt:0)
  → JwtMiddleware → fromUserId=1
  → TransactionService::transfer(1, "bob", 50.0) ← DB::transaction()
    ├── 驗證 amount > 0
    ├── User::where('username', 'bob')->first()     // 根據用戶名查找
    │     └── null → WalletNotFoundException → 404
    ├── 驗證 fromUserId != toUser->id
    ├── SELECT from_wallet (version), to_wallet
    ├── 餘額檢查 (fail-fast)
    ├── UPDATE wallets SET balance-50, version+1, updated_at=NOW()
    │     WHERE user_id=1 AND version=3
    │     → affected=1 OK │ affected=0 → ConcurrentModificationException → 409
    ├── UPDATE wallets SET balance+50, version+1, updated_at=NOW()
    │     WHERE user_id=<toUser->id>
    ├── INSERT INTO transactions (...)
    └── COMMIT
  → 200 { "status": "SUCCESS", "message": "Transfer completed successfully" }
```

---

## 啟動方式

```bash
# 安裝依賴
composer install

# 複製 .env
cp .env.example .env  # 或直接編輯 .env

# 生成 APP_KEY
php artisan key:generate

# 執行 Migration（建立資料表）
php artisan migrate

# 啟動開發伺服器
php artisan serve --port=8001

# 或 Docker 一鍵啟動
docker-compose up -d
```

**前端對接：** 修改 `digital_wallet_frontend/vite.config.ts` 的 proxy target 為 `http://localhost:8001`。

---

## 三版本程式碼量對比

| 關注點 | Java (行) | Python (行) | PHP (行) |
|------|------|------|------|
| JWT + 安全 | ~60 | ~50 | ~45 |
| 密碼處理 | ~5 | ~4 | ~3 |
| 樂觀鎖 + 轉賬 | ~60 | ~40 | ~45 |
| 異常處理 | ~55 | ~35 | ~35 |
| API 路由 + Controller | ~40 | ~30 | ~45 |
| Model/DTO | ~120 | ~100 | ~50 |
| Docker | ~20 | ~17 | ~20 |
| 配置 | ~15 | ~10 | ~20 |
| **總計** | **~375** | **~286** | **~263** |

PHP 版最簡潔，主要因為 Eloquent Model 不需分離 Entity 和 DTO（PHP 沒有強型別約束，用 `protected $fillable` 控制暴露欄位即可），且 `DB::transaction()` 比 Java AOP 和 Python context manager 更直觀。
