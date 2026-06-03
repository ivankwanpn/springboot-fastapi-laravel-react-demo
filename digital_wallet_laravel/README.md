# Digital Wallet Backend — Laravel 11 版 (Demo)

> 技術驗證／參考實作：用 PHP Laravel 11 生態複現數位錢包的所有功能。API 合約與其他五個後端完全一致。

---

## 技術清單

| 類別 | 技術 | 用途 |
|------|------|------|
| 語言 | PHP 8.2+ | 核心語言 |
| 框架 | Laravel 11 (^11.31) | HTTP routing、DI container、middleware pipeline、migration、validation |
| ORM | Eloquent | 模型關聯 (hasOne / belongsTo)、query builder、mass assignment |
| JWT | firebase/php-jwt (^6.0) | HS256 token 簽發與驗證 |
| 密碼雜湊 | Laravel `Hash::make()` / `Hash::check()` (BCrypt) | 密碼單向雜湊儲存與比對 |
| 資料庫 | PostgreSQL (pgsql driver, port 5433) | 主要資料儲存 |
| 高精度計算 | PHP `bccomp()` | 轉帳金額比較，完全避免 IEEE 754 浮點誤差 |
| 原子交易 | Laravel `DB::transaction()` | 確保 register 與 transfer 操作原子性 |
| 樂觀鎖 | `version` column + `DB::update()` WHERE version 條件 | 並發轉帳防護 |
| 請求驗證 | Laravel `FormRequest` | 宣告式輸入校驗，在進入 Controller 前攔截 |

---

## 專案結構

```
digital_wallet_laravel/
├── bootstrap/
│   └── app.php                          # 應用程式啟動：middleware alias 註冊、三層 exception handler
├── config/
│   ├── database.php                     # PostgreSQL / SQLite 連線設定
│   └── jwt.php                          # JWT secret、expiration 設定（讀取自 .env）
├── database/
│   └── migrations/
│       ├── 0001_01_01_000001_create_users_table.php       # users 表 DDL
│       ├── 0001_01_01_000002_create_wallets_table.php     # wallets 表（含 version 樂觀鎖欄位）
│       └── 0001_01_01_000003_create_transactions_table.php # transactions 表 + 雙欄位索引
├── routes/
│   └── api.php                          # 全部 11 個 API route：2 公開 + 3 認證 + 6 admin
├── app/
│   ├── Helpers/
│   │   └── JwtHelper.php                # JWT 簽發／解碼靜態工具類別
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Controller.php           # Laravel 基礎 Controller
│   │   │   ├── AuthController.php       # POST /api/auth/register, POST /api/auth/login
│   │   │   ├── WalletController.php     # GET /api/wallets
│   │   │   ├── TransactionController.php# POST /api/transactions/transfer, GET /api/transactions
│   │   │   └── AdminController.php      # 6 個 admin endpoint
│   │   ├── Middleware/
│   │   │   ├── JwtMiddleware.php        # JWT 驗證：解析 Bearer token → 注入 userId + userRole
│   │   │   └── AdminMiddleware.php      # 角色檢查：userRole !== ROLE_ADMIN → 403
│   │   └── Requests/
│   │       ├── RegisterRequest.php      # username (min:3) + password (min:6) + role (in:ROLE_USER)
│   │       ├── LoginRequest.php         # username + password 必填
│   │       └── TransferRequest.php      # toUsername (min:3) + amount (regex 嚴格十進位格式)
│   ├── Models/
│   │   ├── User.php                     # Eloquent model：users 表，hasOne(Wallet)
│   │   ├── Wallet.php                   # Eloquent model：wallets 表，belongsTo(User)
│   │   └── Transaction.php              # Eloquent model：transactions 表，belongsTo(Wallet) × 2
│   ├── Services/
│   │   ├── AuthService.php              # register (atomic user+wallet 建立)、login (驗證 + JWT 簽發)
│   │   ├── WalletService.php            # 錢包查詢 + snake_case → camelCase 轉換
│   │   ├── TransactionService.php       # transfer (樂觀鎖 + DB::transaction)、history
│   │   └── AdminService.php             # 後台管理：使用者列表/明細、交易列表/統計
│   ├── Exceptions/
│   │   ├── AppException.php             # 基礎業務例外 (statusCode + message)
│   │   ├── AuthenticationException.php  # 401 (所有登入失敗／token 無效的統一出口)
│   │   ├── WalletNotFoundException.php  # 404
│   │   ├── InsufficientBalanceException.php # 400
│   │   ├── DuplicateUsernameException.php   # 409
│   │   └── ConcurrentModificationException.php # 409 (樂觀鎖衝突)
│   └── Providers/
│       └── AppServiceProvider.php       # Laravel service provider (空白，留待擴充)
└── composer.json                        # 依賴宣告：PHP 8.2+ / Laravel ^11.31 / firebase/php-jwt ^6.0
```

---

## API 端點

### 使用者端點（5 個）

| Method | Path | Auth | 說明 |
|--------|------|------|------|
| POST | `/api/auth/register` | 無 | 註冊並自動建立錢包，role 限 `ROLE_USER` |
| POST | `/api/auth/login` | 無 | 登入，回傳 JWT token 與使用者資訊 |
| GET | `/api/wallets` | JWT | 查詢當前登入使用者的錢包 |
| POST | `/api/transactions/transfer` | JWT | 轉帳給其他使用者（by username） |
| GET | `/api/transactions` | JWT | 查詢當前使用者的交易歷史 |

### 管理員端點（6 個，需 `ROLE_ADMIN`）

| Method | Path | Auth | 說明 |
|--------|------|------|------|
| GET | `/api/admin/users` | JWT + Admin | 使用者列表，支援 `?search=&page=1&size=20` |
| GET | `/api/admin/users/{id}` | JWT + Admin | 使用者詳細資料（含錢包與最近 5 筆交易） |
| PUT | `/api/admin/users/{id}/disable` | JWT + Admin | 停用使用者（role → `ROLE_DISABLED`） |
| PUT | `/api/admin/users/{id}/enable` | JWT + Admin | 啟用使用者（role → `ROLE_USER`） |
| GET | `/api/admin/transactions` | JWT + Admin | 交易列表，支援 `?username=&startDate=&endDate=&page=&size=` |
| GET | `/api/admin/transactions/stats` | JWT + Admin | 交易統計（totalCount、totalAmount、daily breakdown） |

**錯誤回應統一格式**：

```json
{"status":"ERROR","message":"錯誤描述訊息"}
```

---

## 核心實作模式

### 模式 1：專案初始化 (`bootstrap/app.php`)

Laravel 11 的應用程式啟動文件是所有配置的入口。middleware alias、exception handling 在此集中宣告。

```php
<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\JwtMiddleware;
use App\Exceptions\AppException;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'jwt.auth' => JwtMiddleware::class,
            'admin.role' => \App\Http\Middleware\AdminMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (AppException $e, $request) {
            return response()->json([
                'status' => 'ERROR',
                'message' => $e->getMessage(),
            ], $e->getStatusCode());
        });

        $exceptions->render(function (ValidationException $e, $request) {
            return response()->json([
                'status' => 'ERROR',
                'message' => $e->validator->errors()->first(),
            ], 400);
        });

        $exceptions->render(function (\Throwable $e, $request) {
            \Illuminate\Support\Facades\Log::error($e);
            return response()->json([
                'status' => 'ERROR',
                'message' => 'Internal server error',
            ], 500);
        });
    })->create();
```

**設計要點**：

- **middleware alias**：`'jwt.auth'` 與 `'admin.role'` 兩個字串別名，讓 `routes/api.php` 以語意化名稱引用，而非裸露完整的 class name。若未來更換 middleware 實作（例如改用 Laravel Sanctum），只需修改此處的 alias 對應，路由檔案完全不受影響。
- **三層 exception render 順序**：Laravel 依註冊順序匹配。`AppException` 先被匹配（所有子類別如 `AuthenticationException`、`WalletNotFoundException` 皆進入此 handler），其次是 `ValidationException`（Laravel FormRequest 驗證失敗），最後是 `\Throwable`（兜底所有未預期錯誤）。
- **為什麼用 `\Throwable` 而非 `\Exception`**：PHP 8 的 `ValueError`、`TypeError` 等不繼承 `\Exception`，而是直接實作 `\Throwable`。用 `\Throwable` 才能保證所有錯誤都以 JSON 回應，不會洩漏成 HTML 500 頁面。
- **`ValidationException` handler 只取 `errors()->first()`**：只回傳第一條驗證失敗訊息（例如 `"The username field is required."`），而非所有欄位的錯誤陣列，簡化前端錯誤處理邏輯。

---

### 模式 2：路由定義 (`routes/api.php`)

```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\AdminController;

// 公開路由 — 無 middleware
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// 認證路由 — 需 JWT
Route::middleware('jwt.auth')->group(function () {
    Route::get('/wallets', [WalletController::class, 'show']);
    Route::post('/transactions/transfer', [TransactionController::class, 'transfer']);
    Route::get('/transactions', [TransactionController::class, 'history']);
});

// 管理員路由 — 需 JWT + ROLE_ADMIN
Route::middleware(['jwt.auth', 'admin.role'])->prefix('admin')->group(function () {
    Route::get('/users', [AdminController::class, 'listUsers']);
    Route::get('/users/{id}', [AdminController::class, 'getUserDetail']);
    Route::put('/users/{id}/disable', [AdminController::class, 'disableUser']);
    Route::put('/users/{id}/enable', [AdminController::class, 'enableUser']);
    Route::get('/transactions', [AdminController::class, 'listTransactions']);
    Route::get('/transactions/stats', [AdminController::class, 'getTransactionStats']);
});
```

**設計要點**：

- **三層 route group**：
  1. **公開路由**：`register` 與 `login`，無需任何 middleware。
  2. **認證路由**：`middleware('jwt.auth')` 包裹的三個 endpoint。`JwtMiddleware` 攔截並驗證 token，失敗則拋出 `AuthenticationException`（由 `bootstrap/app.php` 轉為 401 JSON）。
  3. **管理員路由**：`middleware(['jwt.auth', 'admin.role'])` 包裹的六個 endpoint。Laravel middleware 依陣列順序執行——先經 `JwtMiddleware` 取得 `userId` + `userRole`，再經 `AdminMiddleware` 檢查角色。順序錯誤會導致 `AdminMiddleware` 讀不到 `userRole`。
- **`prefix('admin')`**：自動在所有 admin URL 前加上 `/admin` 前綴，每條 route 定義時不需要重複手寫，且統一變更時只需改一處。
- **Controller action 陣列語法**：`[AuthController::class, 'register']` 優於 magic string `'AuthController@register'`，IDE 可跳轉、可重構。

---

### 模式 3：JWT 工具類別 (`JwtHelper.php`)

```php
<?php

namespace App\Helpers;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use RuntimeException;

class JwtHelper
{
    public static function generateToken(int $userId, string $username, string $role): string
    {
        $secret = self::getSecret();
        $expirationSeconds = self::getExpirationSeconds();

        $payload = [
            'sub' => (string) $userId,
            'username' => $username,
            'role' => $role,
            'iat' => time(),
            'exp' => time() + $expirationSeconds,
        ];

        return JWT::encode($payload, $secret, 'HS256');
    }

    public static function decodeToken(string $token): object
    {
        return JWT::decode($token, new Key(self::getSecret(), 'HS256'));
    }

    private static function getSecret(): string
    {
        $secret = config('jwt.secret');

        if (!is_string($secret) || trim($secret) === '') {
            throw new RuntimeException('JWT secret is not configured');
        }

        return $secret;
    }

    private static function getExpirationSeconds(): int
    {
        $expirationMs = config('jwt.expiration');

        if (!is_numeric($expirationMs) || (int) $expirationMs <= 0) {
            throw new RuntimeException('JWT expiration is invalid');
        }

        $expirationSeconds = intdiv((int) $expirationMs, 1000);

        if ($expirationSeconds <= 0) {
            throw new RuntimeException('JWT expiration must be at least 1000 milliseconds');
        }

        return $expirationSeconds;
    }
}
```

**設計要點**：

- **純靜態方法**：JWT 操作本身無狀態，不需要實例化。所有方法皆為 `static`，Controller 與 Service 直接呼叫 `JwtHelper::generateToken(...)`，無需透過 Laravel container 解析。
- **`sub` claim 儲存 userId**：遵循 JWT RFC 7519 規範，將使用者識別碼放在標準 `sub`（subject）欄位。值型別為字串（`(string) $userId`），與 Java 版 `String.valueOf(userId)` 和 Python 版 `str(user_id)` 保持一致。
- **`role` 寫入 JWT payload**：這是識別 admin 的關鍵資料。`AdminMiddleware` 基於此欄位決定是否放行。將 role 內嵌於 token 意味著後續每個請求不需要查詢資料庫就能得知使用者角色，省下一次 DB round trip。
- **HS256 對稱加密**：六個後端使用相同演算法，確保跨後端 token 互通。
- **`intdiv()` 毫秒轉秒**：`JWT_EXPIRATION` 環境變數以毫秒為單位（預設 86400000 = 24 小時），`intdiv()` 安全地轉為整數秒，與 `time()`（Unix timestamp in seconds）的單位一致。
- **config 雙重驗證**：`getSecret()` 和 `getExpirationSeconds()` 在運行時檢查設定值是否有效。若 `.env` 漏設 `JWT_SECRET`，將拋出 `RuntimeException`（進入 `\Throwable` handler，回傳 500），而非悄悄使用空字串簽章。

---

### 模式 4：中介層 (`JwtMiddleware` + `AdminMiddleware`)

#### JwtMiddleware

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Exceptions\AuthenticationException;
use App\Helpers\JwtHelper;
use Firebase\JWT\BeforeValidException;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use UnexpectedValueException;

class JwtMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();

        if (!$token) {
            throw new AuthenticationException();
        }

        try {
            $payload = JwtHelper::decodeToken($token);
        } catch (ExpiredException|SignatureInvalidException|BeforeValidException|UnexpectedValueException $e) {
            throw new AuthenticationException();
        }

        if (!isset($payload->sub) || !is_scalar($payload->sub) || (string) $payload->sub === '') {
            throw new AuthenticationException();
        }

        $request->attributes->set('userId', (int) $payload->sub);
        $request->attributes->set('userRole', $payload->role ?? 'ROLE_USER');

        return $next($request);
    }
}
```

**設計要點**：

- **`$request->bearerToken()`**：Laravel 內建方法，自動從 `Authorization: Bearer <token>` header 提取 token 字串，無需手動處理 `substr()` 或 `explode()`。
- **四種 JWT 例外統一轉為 401**：`ExpiredException`（過期）、`SignatureInvalidException`（簽章不符）、`BeforeValidException`（尚未生效）、`UnexpectedValueException`（格式錯誤）全部對外回應相同的 `"Invalid username or password"`。不區分錯誤原因，防止攻擊者從錯誤訊息推斷 token 的內部狀態。
- **`sub` 安全檢查**：不只檢查 `isset()`，還檢查 `is_scalar()` 與空字串，防止格式扭曲的 token 注入惡意 payload（例如 `"sub": []` 或 `"sub": ""`）。
- **注入 `userId` 與 `userRole` 到 request attributes**：`$request->attributes->set()` 將這兩個值寫入 request 的 attribute bag（而非 header 或 query string），下游 Controller 透過 `$request->attributes->get('userId')` 取值。這是防止 IDOR 的核心機制——**userId 永遠來自 JWT payload，絕不從 URL path 或 request body 取得**。
- **`$next($request)`**：呼叫下一個 middleware（或最終的 Controller），這是 Laravel middleware pipeline 的標準傳遞模式。

#### AdminMiddleware

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Exceptions\AppException;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $role = $request->attributes->get('userRole');

        if ($role !== 'ROLE_ADMIN') {
            throw new AppException(403, 'Access denied');
        }

        return $next($request);
    }
}
```

**設計要點**：

- **依賴 JwtMiddleware 的輸出**：`AdminMiddleware` 不自己解析 token。它讀取 `$request->attributes->get('userRole')`——這個值由前一層 `JwtMiddleware` 寫入。middleware 執行順序由 route 定義中的陣列 `['jwt.auth', 'admin.role']` 保證。
- **嚴格比對 `ROLE_ADMIN`**：只有 `ROLE_ADMIN` 能通過。`ROLE_USER`、`ROLE_DISABLED` 或任何未定義的角色一律回傳 403。
- **丟出 `AppException(403, ...)` 而非 `AuthenticationException`**：認證（authentication）與授權（authorization）是不同的概念。Token 有效但角色不足是 403 Forbidden（授權失敗），不是 401 Unauthorized（認證失敗）。

---

### 模式 5：Eloquent 模型 (`User`、`Wallet`、`Transaction`)

#### User

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class User extends Model
{
    protected $table = 'users';

    protected $fillable = ['username', 'password_hash', 'role'];

    public $timestamps = false;

    protected $casts = [
        'id' => 'integer',
        'created_at' => 'datetime',
    ];

    public function wallet()
    {
        return $this->hasOne(Wallet::class, 'user_id');
    }
}
```

**設計要點**：

- **`$timestamps = false`**：此專案的 `users` 表只有 `created_at`，沒有 `updated_at`。設為 `false` 防止 Eloquent 在 `save()` 時嘗試寫入不存在的 `updated_at` 欄位。
- **`$fillable` 白名單**：明確宣告允許 mass assignment 的三個欄位。`id` 和 `created_at` 由資料庫自動產生，不列入 fillable，防止惡意請求竄改。
- **`$casts`**：`id` 轉為 `integer`（預設可能是 string），`created_at` 轉為 `Carbon` datetime 物件，方便後續格式化。
- **`hasOne(Wallet)`**：一對一關聯。`$user->wallet`（動態屬性）觸發 `SELECT * FROM wallets WHERE user_id = ?`。

#### Wallet

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wallet extends Model
{
    protected $table = 'wallets';

    protected $fillable = ['user_id', 'currency', 'balance', 'version'];

    public $timestamps = false;

    protected $casts = [
        'id' => 'integer',
        'user_id' => 'integer',
        'balance' => 'decimal:4',
        'version' => 'integer',
        'updated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
```

**設計要點**：

- **`balance` cast 為 `decimal:4`**：Laravel 的 `decimal:<scale>` cast 將 `NUMERIC(18,4)` 值在 PHP 中表示為 string，而非 float。這避免了從資料庫取出後立即產生的浮點精度流失。後續計算使用 `bccomp()` 仍需將 balance 轉為 string（本來就是 string），但展示時用 `round((float) ..., 4)` 安全轉回 float。
- **`version` cast 為 `integer`**：確保樂觀鎖的版本號總是整數型別。
- **`belongsTo(User)`**：反向關聯。`$wallet->user` 回傳所屬的 User 物件。

#### Transaction

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $table = 'transactions';

    protected $fillable = ['from_wallet_id', 'to_wallet_id', 'amount', 'tx_type', 'status'];

    public $timestamps = false;

    protected $casts = [
        'id' => 'integer',
        'from_wallet_id' => 'integer',
        'to_wallet_id' => 'integer',
        'amount' => 'decimal:4',
        'created_at' => 'datetime',
    ];

    public function fromWallet()
    {
        return $this->belongsTo(Wallet::class, 'from_wallet_id');
    }

    public function toWallet()
    {
        return $this->belongsTo(Wallet::class, 'to_wallet_id');
    }
}
```

**設計要點**：

- **兩個 `belongsTo(Wallet)` 關聯**：同一張表被引用兩次，必須顯式指定各自的 foreign key（`from_wallet_id` 和 `to_wallet_id`）。Eloquent 的慣例推斷（會去找 `wallet_id`）與實際欄位名不符，省略第二參數會導致關聯失敗。命名為 `fromWallet()` 和 `toWallet()` 語意清晰，呼叫時一目瞭然：`$tx->fromWallet->user->username`。
- **`$fillable` 不含 `id` 與 `created_at`**：交易記錄一旦建立即不可篡改，這兩個欄位完全由系統控制。
- **`amount` 的 `decimal:4` cast**：保證金額在 PHP 中以精確字串型式存在。

---

### 模式 6：Controller 層

#### AuthController

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\RegisterRequest;
use App\Http\Requests\LoginRequest;
use App\Services\AuthService;

class AuthController extends Controller
{
    private AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

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

    public function login(LoginRequest $request)
    {
        $result = $this->authService->login(
            $request->input('username'),
            $request->input('password'),
        );

        return response()->json($result);
    }
}
```

**設計要點**：

- **建構子注入 (Constructor Injection)**：Laravel 的 service container 自動解析 `AuthService` 並注入。Controller 只需宣告型別提示，不需知道如何建立 service。這是 Laravel "Thin Controller, Fat Service" 設計原則的基礎。
- **FormRequest 自動驗證**：方法參數的 type-hint `RegisterRequest` 觸發 Laravel 的自動驗證。若驗證失敗，Laravel 在 Controller method 執行前就拋出 `ValidationException`，Controller 內的程式碼完全不會執行。異常由 `bootstrap/app.php` 的 handler 轉為 400 JSON 回應。
- **Controller 只做編排 (orchestration)**：`register()` 只負責 (1) 調用 service，(2) 建構 HTTP 回應。沒有業務邏輯、沒有資料庫查詢、沒有 try-catch。

#### WalletController

```php
<?php

namespace App\Http\Controllers;

use App\Services\WalletService;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    private WalletService $walletService;

    public function __construct(WalletService $walletService)
    {
        $this->walletService = $walletService;
    }

    public function show(Request $request)
    {
        $userId = $request->attributes->get('userId');

        $wallet = $this->walletService->getWalletByUserId($userId);

        return response()->json($wallet);
    }
}
```

**設計要點**：

- **userId 來自 JWT middleware**：`$request->attributes->get('userId')`，不從 URL 或 query string 取得，完全防止 IDOR 攻擊。
- **Service 層負責欄位名稱轉換**：Service 回傳 camelCase 的 array（`userId`、`updatedAt`），Controller 不需要知道資料庫的 snake_case 命名慣例。

#### TransactionController

```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\TransferRequest;
use App\Services\TransactionService;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    private TransactionService $transactionService;

    public function __construct(TransactionService $transactionService)
    {
        $this->transactionService = $transactionService;
    }

    public function transfer(TransferRequest $request)
    {
        $fromUserId = $request->attributes->get('userId');

        $this->transactionService->transfer(
            $fromUserId,
            (string) $request->input('toUsername'),
            (string) $request->input('amount'),
        );

        return response()->json([
            'status' => 'SUCCESS',
            'message' => 'Transfer completed successfully',
        ]);
    }

    public function history(Request $request)
    {
        $userId = $request->attributes->get('userId');

        $transactions = $this->transactionService->getTransactionHistory($userId);

        return response()->json($transactions);
    }
}
```

**設計要點**：

- **`fromUserId` 來自 JWT**：轉帳發起人永遠是已認證的使用者，不可能被偽造。Service 接收 `fromUserId` 作為獨立參數，而非從 request body 讀取。
- **`(string)` cast**：`toUsername` 和 `amount` 顯式轉為 string，確保傳入 Service 的型別符合預期。`TransferRequest` 的 regex 驗證保證了格式正確，但不保證 PHP 型別。

#### AdminController

```php
<?php

namespace App\Http\Controllers;

use App\Services\AdminService;
use Illuminate\Http\Request;

class AdminController extends Controller
{
    private AdminService $adminService;

    public function __construct(AdminService $adminService)
    {
        $this->adminService = $adminService;
    }

    public function listUsers(Request $request)
    {
        $search = $request->query('search', '');
        $page = (int) $request->query('page', 1);
        $size = (int) $request->query('size', 20);

        $result = $this->adminService->listUsers($search, $page, $size);

        return response()->json($result);
    }

    public function getUserDetail(Request $request, $id)
    {
        $result = $this->adminService->getUserDetail($id);

        return response()->json($result);
    }

    public function disableUser(Request $request, $id)
    {
        $this->adminService->disableUser($id);

        return response()->json([
            'status' => 'SUCCESS',
            'message' => 'User disabled successfully',
        ]);
    }

    public function enableUser(Request $request, $id)
    {
        $this->adminService->enableUser($id);

        return response()->json([
            'status' => 'SUCCESS',
            'message' => 'User enabled successfully',
        ]);
    }

    public function listTransactions(Request $request)
    {
        $page = (int) $request->query('page', 1);
        $size = (int) $request->query('size', 20);
        $username = $request->query('username', '');
        $startDate = $request->query('startDate', '');
        $endDate = $request->query('endDate', '');

        $result = $this->adminService->listTransactions($page, $size, $username, $startDate, $endDate);

        return response()->json($result);
    }

    public function getTransactionStats(Request $request)
    {
        $startDate = $request->query('startDate', '');
        $endDate = $request->query('endDate', '');

        $result = $this->adminService->getTransactionStats($startDate, $endDate);

        return response()->json($result);
    }
}
```

**設計要點**：

- **Query string 參數提取**：所有 admin endpoint 使用 `$request->query()` 讀取參數，並提供合理的預設值（page=1, size=20）。`(int)` cast 確保數值型別正確。
- **Laravel route model binding**：`{id}` route parameter 自動傳入方法參數 `$id`，無需手動 `$request->route('id')`。
- **disable/enable 對稱設計**：兩個方法結構完全對稱，只差在 target role。PUT 動詞表示冪等操作——對已停用的使用者再次呼叫 disable 不會報錯。

---

### 模式 7：Service 層

#### AuthService — 註冊與登入

```php
<?php

namespace App\Services;

use App\Exceptions\AuthenticationException;
use App\Exceptions\DuplicateUsernameException;
use App\Helpers\JwtHelper;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

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
            } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
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

        if (!$user) {
            throw new AuthenticationException('Invalid username or password');
        }

        if (!Hash::check($password, $user->password_hash)) {
            throw new AuthenticationException('Invalid username or password');
        }

        if ($user->role === 'ROLE_DISABLED') {
            throw new AuthenticationException('Invalid username or password');
        }

        $token = JwtHelper::generateToken($user->id, $user->username, $user->role);

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

**設計要點**：

- **`DB::transaction()` 包裹 register**：`User::create()` 與 `Wallet::create()` 必須原子性完成。若 user 插入成功但 wallet 插入失敗，整個 transaction rollback，不會留下沒有錢包的使用者。Closure 內拋出任何 Exception 會自動觸發 rollback。
- **`UniqueConstraintViolationException` 捕獲**：username 重複時，資料庫層級拋出 integrity constraint violation。捕獲後轉為語意明確的 `DuplicateUsernameException`（HTTP 409），而非讓 Laravel 回傳 500。
- **`Hash::make()` 使用 BCrypt**：Laravel 的 `Hash` facade 預設使用 bcrypt 演算法，rounds 可透過 `.env` 的 `BCRYPT_ROUNDS` 調整（預設 12）。
- **login 三層模糊錯誤**：使用者不存在、密碼錯誤、帳號停用，全部回傳相同的 `"Invalid username or password"`。這防止了使用者列舉攻擊 (user enumeration)——攻擊者無法從錯誤訊息判斷某個 username 是否被註冊。
- **`created_at?->toISOString()`**：PHP 8 的 null-safe 運算子 `?->` 在 `created_at` 為 null 時直接回傳 null，不會拋出 `Call to a member function on null`。
- **`role` 納入 JWT token**：`JwtHelper::generateToken($user->id, $user->username, $user->role)` —— 角色資訊內嵌於 token，省去後續每個請求都查資料庫取 role。

#### WalletService — 錢包查詢

```php
<?php

namespace App\Services;

use App\Exceptions\WalletNotFoundException;
use App\Models\Wallet;

class WalletService
{
    public function getWalletByUserId(int $userId): array
    {
        $wallet = Wallet::where('user_id', $userId)->first();

        if (!$wallet) {
            throw new WalletNotFoundException("Wallet not found for userId: {$userId}");
        }

        return [
            'id' => $wallet->id,
            'userId' => $wallet->user_id,
            'currency' => $wallet->currency,
            'balance' => round((float) $wallet->balance, 4),
            'version' => $wallet->version,
            'updatedAt' => $wallet->updated_at?->toISOString(),
        ];
    }
}
```

**設計要點**：

- **snake_case → camelCase 轉換**：Service 層負責將資料庫欄位名（`user_id`、`updated_at`）對應到前端期望的 camelCase JSON key（`userId`、`updatedAt`）。Controller 只看到服務合約，不需要知道資料庫命名。
- **`round((float) $wallet->balance, 4)`**：`balance` 在 PHP 中是 `decimal:4` cast 的字串。轉為 float 並 round 到 4 位小數後回傳，讓 JSON 輸出為數字而非字串。在展示場景這是安全的——4 位小數在 float 精度範圍內不會失真。計算場景（轉帳）則使用 `bccomp()` 搭配字串。

#### TransactionService — 轉帳核心邏輯

```php
<?php

namespace App\Services;

use App\Exceptions\AppException;
use App\Exceptions\WalletNotFoundException;
use App\Exceptions\InsufficientBalanceException;
use App\Exceptions\ConcurrentModificationException;
use App\Models\User;
use App\Models\Wallet;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class TransactionService
{
    public function transfer(int $fromUserId, string $toUsername, string $amount): void
    {
        if (bccomp($amount, '0', 4) <= 0) {
            throw new AppException(400, 'Transfer amount must be greater than zero');
        }

        DB::transaction(function () use ($fromUserId, $toUsername, $amount) {
            $toUser = User::where('username', $toUsername)->first();
            if (!$toUser) {
                throw new AppException(400, "Recipient not found: {$toUsername}");
            }
            $toUserId = $toUser->id;
            if ($fromUserId === $toUserId) {
                throw new AppException(400, 'Cannot transfer to yourself');
            }

            $fromWallet = Wallet::where('user_id', $fromUserId)->first();
            if (!$fromWallet) {
                throw new WalletNotFoundException("Wallet not found for userId: {$fromUserId}");
            }

            $toWallet = Wallet::where('user_id', $toUserId)->first();
            if (!$toWallet) {
                throw new WalletNotFoundException("Wallet not found for userId: {$toUserId}");
            }

            if (bccomp((string) $fromWallet->balance, $amount, 4) < 0) {
                throw new InsufficientBalanceException(
                    "Insufficient balance: {$fromWallet->balance} < {$amount}"
                );
            }

            // 樂觀鎖扣款：WHERE version = ? 確保無人同時修改
            $deducted = DB::update(
                'UPDATE wallets SET balance = balance - ?, version = version + 1, updated_at = NOW()
                 WHERE user_id = ? AND version = ?',
                [$amount, $fromUserId, $fromWallet->version]
            );

            if ($deducted === 0) {
                throw new ConcurrentModificationException(
                    "Concurrent modification detected for userId: {$fromUserId}"
                );
            }

            // 收款方不需要樂觀鎖——餘額增加沒有衝突
            DB::update(
                'UPDATE wallets SET balance = balance + ?, version = version + 1, updated_at = NOW()
                 WHERE user_id = ?',
                [$amount, $toUserId]
            );

            Transaction::create([
                'from_wallet_id' => $fromWallet->id,
                'to_wallet_id' => $toWallet->id,
                'amount' => $amount,
                'tx_type' => 'TRANSFER',
                'status' => 'SUCCESS',
            ]);
        });
    }

    public function getTransactionHistory(int $userId): array
    {
        $wallet = Wallet::where('user_id', $userId)->first();
        if (!$wallet) {
            throw new WalletNotFoundException("Wallet not found for userId: {$userId}");
        }

        $transactions = Transaction::where('from_wallet_id', $wallet->id)
            ->orWhere('to_wallet_id', $wallet->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return $transactions->map(function ($tx) {
            return [
                'id' => $tx->id,
                'fromWalletId' => $tx->from_wallet_id,
                'toWalletId' => $tx->to_wallet_id,
                'amount' => round((float) $tx->amount, 4),
                'txType' => $tx->tx_type,
                'status' => $tx->status,
                'createdAt' => $tx->created_at?->toISOString(),
            ];
        })->all();
    }
}
```

**設計要點**：

- **`bccomp()` 金額比對**：BCMath 擴展進行任意精度數值比較。`bccomp('100.0000', '100.0000', 4)` 精確比較到小數點後 4 位。所有轉帳相關的金額運算都不經過 PHP float。
- **樂觀鎖 (Optimistic Locking) 完整實作流程**：
  1. 讀取 `fromWallet` 時取得當前 `version` 值（例如 version = 5）。
  2. `DB::update()` 的 WHERE 條件包含 `version = ?`，參數綁定 `$fromWallet->version`。
  3. 若沒有其他請求同時修改此錢包，UPDATE 影響 1 行（`$deducted === 1`），交易繼續。
  4. 若有另一個請求先執行了 UPDATE 並將 version 升為 6，此 UPDATE 的 `WHERE version = 5` 無法匹配任何行，`$deducted === 0`，拋出 `ConcurrentModificationException`（409 Conflict）。
- **為什麼用 `DB::update()` 而非 Eloquent `save()`**：Eloquent 的 `$wallet->update()` 在樂觀鎖場景有兩個問題：(a) Eloquent 可能重新載入 model 屬性，覆蓋已讀取的 version；(b) Eloquent `save()` 預設更新所有 `$fillable` 欄位，無法精確控制只更新 `balance` 和 `version`。使用 `DB::update()` 配合 raw SQL 完全掌控 UPDATE 的欄位與條件。
- **收款方不使用樂觀鎖**：餘額增加不存在衝突——無論多少筆轉帳同時入帳，`SUM(balance + amount)` 在 PostgreSQL 的 row-level locking 下都是正確的。
- **`DB::transaction()` 包裹全流程**：扣款 UPDATE、入帳 UPDATE、交易記錄 INSERT 三者必須原子性。任何一步失敗，整個 transaction rollback。
- **`->map()->all()`**：Eloquent collection 的 `map()` 回傳新 Collection，`all()` 轉為純 PHP array，確保 JSON 序列化時不含 Eloquent 內部 metadata。

#### AdminService — 後台管理

```php
<?php

namespace App\Services;

use App\Models\User;
use App\Models\Wallet;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class AdminService
{
    public function listUsers(string $search, int $page, int $size): array
    {
        $size = max(1, min(100, $size));

        $query = User::select('id', 'username', 'role', 'created_at')
            ->when($search, function ($q) use ($search) {
                $q->where('username', 'like', '%' . $search . '%');
            })
            ->orderBy('id');

        $count = $query->count();
        $users = $query->skip(($page - 1) * $size)->take($size)->get();

        return [
            'data' => $users,
            'page' => $page,
            'size' => $size,
            'total' => $count,
        ];
    }

    public function getUserDetail($id): array
    {
        $user = User::findOrFail($id);
        $wallet = Wallet::where('user_id', $id)->first();
        $recentTransactions = [];

        if ($wallet) {
            $recentTransactions = Transaction::where('from_wallet_id', $wallet->id)
                ->orWhere('to_wallet_id', $wallet->id)
                ->latest()
                ->limit(5)
                ->get();
        }

        return [
            'user' => $user,
            'wallet' => $wallet,
            'recentTransactions' => $recentTransactions,
        ];
    }

    public function disableUser($id): void
    {
        User::findOrFail($id)->update(['role' => 'ROLE_DISABLED']);
    }

    public function enableUser($id): void
    {
        User::findOrFail($id)->update(['role' => 'ROLE_USER']);
    }

    public function listTransactions(int $page, int $size, string $username, string $startDate, string $endDate): array
    {
        $size = max(1, min(100, $size));

        $query = Transaction::with(['fromWallet.user', 'toWallet.user'])
            ->when($username, function ($q) use ($username) {
                $q->whereHas('fromWallet.user', function ($sub) use ($username) {
                    $sub->where('username', 'like', '%' . $username . '%');
                })->orWhereHas('toWallet.user', function ($sub) use ($username) {
                    $sub->where('username', 'like', '%' . $username . '%');
                });
            })
            ->when($startDate, function ($q) use ($startDate) {
                $q->where('created_at', '>=', $startDate);
            })
            ->when($endDate, function ($q) use ($endDate) {
                $q->where('created_at', '<=', $endDate);
            })
            ->orderBy('id', 'desc');

        $count = $query->count();
        $transactions = $query->skip(($page - 1) * $size)->take($size)->get();

        $data = $transactions->map(function ($tx) {
            return [
                'id' => $tx->id,
                'fromWalletId' => $tx->from_wallet_id,
                'toWalletId' => $tx->to_wallet_id,
                'fromUsername' => $tx->fromWallet->user->username ?? null,
                'toUsername' => $tx->toWallet->user->username ?? null,
                'amount' => $tx->amount,
                'txType' => $tx->tx_type,
                'status' => $tx->status,
                'createdAt' => $tx->created_at?->toISOString(),
            ];
        });

        return [
            'data' => $data,
            'page' => $page,
            'size' => $size,
            'total' => $count,
        ];
    }

    public function getTransactionStats(string $startDate, string $endDate): array
    {
        $thirtyDaysAgo = now()->subDays(30)->startOfDay()->toDateTimeString();

        if (!$startDate) {
            $startDate = $thirtyDaysAgo;
        }
        if (!$endDate) {
            $endDate = now()->endOfDay()->toDateTimeString();
        }

        $totalCount = Transaction::whereBetween('created_at', [$startDate, $endDate])->count();
        $totalAmount = Transaction::whereBetween('created_at', [$startDate, $endDate])->sum('amount');

        $daily = DB::select(
            "SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
             FROM transactions
             WHERE created_at >= ? AND created_at <= ?
             GROUP BY DATE(created_at)
             ORDER BY date",
            [$startDate, $endDate]
        );

        $dailyStats = array_map(function ($row) {
            return [
                'date' => $row->date,
                'count' => $row->count,
                'amount' => $row->amount,
            ];
        }, $daily);

        return [
            'totalCount' => $totalCount,
            'totalAmount' => $totalAmount,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'daily' => $dailyStats,
        ];
    }
}
```

**設計要點**：

- **`listUsers` — `when()` 條件式查詢建構**：`$search` 為空字串時不附加 WHERE 條件。比手寫 `if` 更簡潔，保持 query builder chain 的流暢性。`select()` 只選取所需欄位，永遠不回傳 `password_hash`。
- **分頁參數邊界控制**：`max(1, min(100, $size))` 將 size 限制在 1-100 之間，防止惡意請求 `size=999999` 導致記憶體耗盡或資料庫超時。
- **`listTransactions` — `with()` eager loading**：`Transaction::with(['fromWallet.user', 'toWallet.user'])` 告訴 Eloquent 預先載入兩層關聯（transaction → wallet → user）。沒有 `with()` 的話，遍歷每筆交易的 `$tx->fromWallet->user->username` 會觸發 N+1 查詢——每筆交易各自查一次 wallets 和 users。`with()` 用 `WHERE id IN (...)` 批次撈出所有關聯資料（總共 3 條 SQL），將查詢數從 1 + 2N 降至 3。
- **`listTransactions` — `whereHas()` vs `where()`**：
  - `whereHas('fromWallet.user', callback)` 生成 EXISTS 子查詢。意思是「找出 from_wallet 關聯的 user 的 username 包含搜尋字串的交易」。
  - 不能直接用 `where('username', ...)` 因為 `username` 不在 transactions 表上——它在 users 表上，需要經過 wallet 關聯才能抵達。
  - `orWhereHas` 讓搜尋同時覆蓋發送方和接收方的 username。
- **`getTransactionStats` — 混合 Eloquent + raw SQL**：簡單的 `whereBetween()->count()` 和 `whereBetween()->sum()` 使用 Eloquent（語意清晰）。`GROUP BY DATE(created_at)` 的每日聚合統計使用 `DB::select()` raw SQL（Eloquent query builder 難以優雅表達 GROUP BY + aggregate）。參數使用 `?` 佔位符綁定，安全防止 SQL injection。
- **預設 30 天統計範圍**：`now()->subDays(30)->startOfDay()` 取 30 天前的 00:00:00，`now()->endOfDay()` 取今天的 23:59:59。

---

### 模式 8：異常處理體系

#### AppException — 基礎業務例外

```php
<?php

namespace App\Exceptions;

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

**設計要點**：

- **建構子第一參數是 HTTP status code**：與 `\Exception`（第一參數是 message）不同，`AppException` 將 HTTP 狀態碼放在第一位，強制每個子類別在建立時就決定對應的 HTTP 回應碼。
- **PHP 8 constructor promotion**：`private int $statusCode` 同時宣告屬性並在建構子中賦值，無需手寫 `$this->statusCode = $statusCode`。
- **子類別化繼承體系**：
  - `AuthenticationException` → 401（建構子可選 message，預設 `"Invalid username or password"`）
  - `WalletNotFoundException` → 404
  - `InsufficientBalanceException` → 400
  - `DuplicateUsernameException` → 409
  - `ConcurrentModificationException` → 409

#### 子類別範例 — AuthenticationException

```php
<?php

namespace App\Exceptions;

class AuthenticationException extends AppException
{
    public function __construct(string $message = 'Invalid username or password')
    {
        parent::__construct(401, $message);
    }
}
```

所有子類別結構完全相同——只差在第二行的 statusCode 數值。每個異常類別一行即可定義完畢，語意清晰。

#### bootstrap/app.php 的 exception render 回呼

```php
->withExceptions(function (Exceptions $exceptions) {
    // 第一層：所有業務例外
    $exceptions->render(function (AppException $e, $request) {
        return response()->json([
            'status' => 'ERROR',
            'message' => $e->getMessage(),
        ], $e->getStatusCode());
    });

    // 第二層：FormRequest 驗證失敗
    $exceptions->render(function (ValidationException $e, $request) {
        return response()->json([
            'status' => 'ERROR',
            'message' => $e->validator->errors()->first(),
        ], 400);
    });

    // 第三層：未預期錯誤（兜底）
    $exceptions->render(function (\Throwable $e, $request) {
        \Illuminate\Support\Facades\Log::error($e);
        return response()->json([
            'status' => 'ERROR',
            'message' => 'Internal server error',
        ], 500);
    });
})
```

**設計要點**：

- **分層匹配順序**：Laravel 依註冊順序匹配。`AppException` 先被檢查（所有業務例外子類別進入第一層），然後是 `ValidationException`，最後是兜底的 `\Throwable`。
- **統一的 error JSON 格式**：所有錯誤回應都是 `{"status":"ERROR","message":"..."}`，與其他五個後端完全一致。
- **`Log::error($e)`**：未預期的例外記錄到 Laravel log（`storage/logs/laravel.log`），包含完整 stack trace，便於除錯。但對外只回傳 `"Internal server error"`，不洩漏內部錯誤細節。

---

## 資料庫表結構

DDL 由 Laravel migration 定義（`database/migrations/`），`php artisan migrate` 自動建立。

### `users`

| Column | Type | Constraint | 說明 |
|--------|------|------------|------|
| `id` | BIGSERIAL | PRIMARY KEY | 使用者 ID，自增 |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | 登入帳號 |
| `password_hash` | VARCHAR(255) | NOT NULL | BCrypt 雜湊密碼 |
| `role` | VARCHAR(20) | DEFAULT 'ROLE_USER' | ROLE_USER / ROLE_ADMIN / ROLE_DISABLED |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 註冊時間 |

**設計決策**：

- `role` 使用 VARCHAR 而非 ENUM：PostgreSQL ENUM 型別在後續新增角色時需要 `ALTER TYPE ... ADD VALUE`，VARCHAR 只需更新應用程式邏輯，更靈活。
- `password_hash` 長度 255：BCrypt 輸出固定 60 字元，255 留有充分餘裕。
- 無 `updated_at`：此專案使用者不支援修改個人資料，不需要更新時間戳。

### `wallets`

| Column | Type | Constraint | 說明 |
|--------|------|------------|------|
| `id` | BIGSERIAL | PRIMARY KEY | 錢包 ID，自增 |
| `user_id` | BIGINT | UNIQUE, FK → users(id) ON DELETE CASCADE | 1:1 關聯使用者 |
| `currency` | VARCHAR(10) | DEFAULT 'USDT' | 幣種 |
| `balance` | NUMERIC(18,4) | DEFAULT 0 | 餘額 |
| `version` | INTEGER | DEFAULT 0 | 樂觀鎖版本號 |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 最後異動時間 |

**設計決策**：

- `NUMERIC(18,4)` 而非 `FLOAT` / `DOUBLE`：金融系統必須使用定點數而非浮點數。18 位整數 + 4 位小數，最大值約 10^14 USDT。
- `user_id` 為 UNIQUE：強制 1:1 關係，一個使用者只有一個錢包。
- `ON DELETE CASCADE`：刪除使用者時自動刪除其錢包，確保引用完整性。
- 無 `created_at`：錢包在註冊時自動建立，建立時間等於 `users.created_at`。

### `transactions`

| Column | Type | Constraint | 說明 |
|--------|------|------------|------|
| `id` | BIGSERIAL | PRIMARY KEY | 交易 ID，自增 |
| `from_wallet_id` | BIGINT | FK → wallets(id) ON DELETE SET NULL, INDEX | 發送方錢包 |
| `to_wallet_id` | BIGINT | FK → wallets(id) ON DELETE SET NULL, INDEX | 接收方錢包 |
| `amount` | NUMERIC(18,4) | NOT NULL | 交易金額 |
| `tx_type` | VARCHAR(20) | NOT NULL | 交易類型（目前僅 TRANSFER） |
| `status` | VARCHAR(20) | DEFAULT 'SUCCESS' | 交易狀態 |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 交易時間 |

**設計決策**：

- `ON DELETE SET NULL`：若錢包被刪除（使用者被刪除），交易記錄保留但 foreign key 設為 NULL，維持歷史記錄的可追溯性。
- `from_wallet_id` 和 `to_wallet_id` 各自的 INDEX：加速 `WHERE from_wallet_id = ? OR to_wallet_id = ?` 的交易歷史查詢。
- 無 `updated_at`：交易一旦建立即不可更改，只有 `created_at`。

---

## 數據流圖

### 1. 註冊流程 (POST /api/auth/register)

```
Client                    Route               RegisterRequest        AuthController         AuthService             DB
  │                         │                       │                     │                     │                    │
  │──POST /api/auth/register─▶│                       │                     │                     │                    │
  │  {username, password}     │                       │                     │                     │                    │
  │                         │──validate──────────────▶│                     │                     │                    │
  │                         │                       │──(pass)──────────────▶│                     │                    │
  │                         │                       │                     │──register(u,p)─────▶│                    │
  │                         │                       │                     │                     │──BEGIN───────────▶│
  │                         │                       │                     │                     │──INSERT users─────▶│
  │                         │                       │                     │                     │  (Hash::make(pw)) │
  │                         │                       │                     │                     │◀──user {id: 5}────│
  │                         │                       │                     │                     │──INSERT wallets───▶│
  │                         │                       │                     │                     │  (user_id=5)      │
  │                         │                       │                     │                     │◀──OK──────────────│
  │                         │                       │                     │                     │──COMMIT──────────▶│
  │                         │                       │                     │◀──user─────────────│                    │
  │                         │                       │                     │──201 {SUCCESS}─────▶│                    │
  │◀──201 {"status":"SUCCESS"}│                       │                     │                     │                    │
```

### 2. 登入流程 (POST /api/auth/login)

```
Client                    Route               LoginRequest          AuthController         AuthService           JwtHelper
  │                         │                       │                     │                     │                    │
  │──POST /api/auth/login───▶│                       │                     │                     │                    │
  │  {username, password}    │                       │                     │                     │                    │
  │                         │──validate──────────────▶│                     │                     │                    │
  │                         │                       │──(pass)──────────────▶│                     │                    │
  │                         │                       │                     │──login(u,p)────────▶│                    │
  │                         │                       │                     │                     │──User::where()────│
  │                         │                       │                     │                     │◀──user or null────│
  │                         │                       │                     │                     │──Hash::check()────│
  │                         │                       │                     │                     │──role check───────│
  │                         │                       │                     │                     │──generateToken()──▶│
  │                         │                       │                     │                     │◀──JWT string──────│
  │                         │                       │                     │◀──{token, user}────│                    │
  │                         │                       │                     │──200 {token, user}─▶│                    │
  │◀──200 {"token":"...","user":{...}}               │                     │                     │                    │
```

### 3. 查詢錢包流程 (GET /api/wallets)

```
Client                    Route            JwtMiddleware         WalletController       WalletService
  │                         │                    │                     │                     │
  │──GET /api/wallets───────▶│                    │                     │                     │
  │  Authorization: Bearer X │                    │                     │                     │
  │                         │──▶handle()─────────│                     │                     │
  │                         │                    │──$request->bearerToken()                  │
  │                         │                    │──JwtHelper::decodeToken(token)            │
  │                         │                    │──$request->attributes->set('userId', 5)   │
  │                         │                    │──$next($request)──▶│                     │
  │                         │                    │                     │──getWalletByUserId(5)──▶│
  │                         │                    │                     │                     │──Wallet::where()──
  │                         │                    │                     │◀──{id, userId, ...}─│
  │                         │                    │                     │──200 {wallet}──────▶│
  │◀──200 {"id":1,"userId":5,"balance":100.0000,...}                  │                     │
```

### 4. 轉帳流程 (POST /api/transactions/transfer)

```
Client         Route    JwtMiddleware  TransferRequest  TransactionController  TransactionService            DB
  │              │           │               │                 │                      │                     │
  │──POST /api/ │           │               │                 │                      │                     │
  │  transactions/transfer  │               │                 │                      │                     │
  │  {toUsername, amount}   │               │                 │                      │                     │
  │              │──▶handle()               │                 │                      │                     │
  │              │           │──decode JWT──▶│                 │                      │                     │
  │              │           │──set userId──▶│                 │                      │                     │
  │              │           │──$next()──────▶│                 │                      │                     │
  │              │           │               │──validate──────▶│                      │                     │
  │              │           │               │──(pass)─────────▶│                      │                     │
  │              │           │               │                 │──transfer(fromUserId,│                     │
  │              │           │               │                 │   toUsername,amount)─▶│                     │
  │              │           │               │                 │                      │──BEGIN────────────▶│
  │              │           │               │                 │                      │──SELECT toUser────▶│
  │              │           │               │                 │                      │──SELECT fromWallet▶│
  │              │           │               │                 │                      │──SELECT toWallet──▶│
  │              │           │               │                 │                      │──bccomp check─────│
  │              │           │               │                 │                      │──UPDATE fromWallet▶│
  │              │           │               │                 │                      │  SET balance=-,   │
  │              │           │               │                 │                      │  version=+1       │
  │              │           │               │                 │                      │  WHERE version=?  │
  │              │           │               │                 │                      │──(affected rows:  │
  │              │           │               │                 │                      │   1=OK, 0=409)    │
  │              │           │               │                 │                      │──UPDATE toWallet──▶│
  │              │           │               │                 │                      │──INSERT transact.─▶│
  │              │           │               │                 │                      │──COMMIT───────────▶│
  │              │           │               │                 │◀──void─────────────│                      │
  │              │           │               │                 │──200 {"SUCCESS"}───▶│                      │
  │◀──200 {"status":"SUCCESS","message":"Transfer completed successfully"}             │                      │
```

### 5. 交易歷史流程 (GET /api/transactions)

```
Client         Route    JwtMiddleware    TransactionController    TransactionService
  │              │           │                 │                       │
  │──GET /api/transactions──▶│                 │                       │
  │  Authorization: Bearer X │                 │                       │
  │              │──▶handle()│                 │                       │
  │              │           │──set userId=5──▶│                       │
  │              │           │──$next()────────▶│                       │
  │              │           │                 │──history()───────────▶│
  │              │           │                 │                       │──Wallet::where(user_id=5)
  │              │           │                 │                       │──Transaction::where(from)
  │              │           │                 │                       │  ->orWhere(to)
  │              │           │                 │                       │  ->orderBy(desc)
  │              │           │                 │◀──[{...}, {...}]─────│
  │              │           │                 │──200 [{...}, ...]────▶│
  │◀──200 [{"id":10,"amount":50.0000,"txType":"TRANSFER",...}, ...]
```

### 6. 管理員查詢使用者 (GET /api/admin/users)

```
Client         Route    JwtMiddleware   AdminMiddleware    AdminController         AdminService
  │              │           │                │                  │                      │
  │──GET /api/admin/users?search=john&page=1&size=20                                      │
  │  Authorization: Bearer X│                │                  │                      │
  │              │──▶handle()│                │                  │                      │
  │              │           │──set userId+role                 │                      │
  │              │           │──$next()──────▶│                  │                      │
  │              │           │                │──userRole===                    │
  │              │           │                │  "ROLE_ADMIN"?                  │
  │              │           │                │──(yes) $next()──▶│                      │
  │              │           │                │                  │──listUsers(s,p,s)───▶│
  │              │           │                │                  │                      │──User::select()
  │              │           │                │                  │                      │  ->when(search)
  │              │           │                │                  │                      │  ->orderBy('id')
  │              │           │                │                  │                      │  ->skip()->take()
  │              │           │                │                  │◀──{data,page,...}───│
  │              │           │                │                  │──200 {data,...}─────▶│
  │◀──200 {"data":[...],"page":1,"size":20,"total":42}                                 │
```

### 7. 管理員查詢交易 (GET /api/admin/transactions)

```
Client         Route    JwtMiddleware   AdminMiddleware    AdminController         AdminService
  │              │           │                │                  │                      │
  │──GET /api/admin/transactions?username=alice&startDate=2025-01-01&endDate=2025-12-31  │
  │              │──▶JWT驗證─▶│──▶角色檢查─────▶│                  │                      │
  │              │           │                │                  │──listTransactions()──▶│
  │              │           │                │                  │                      │──Transaction::with()
  │              │           │                │                  │                      │  ['fromWallet.user',
  │              │           │                │                  │                      │   'toWallet.user']
  │              │           │                │                  │                      │  ->whereHas(...)
  │              │           │                │                  │                      │  ->when(startDate)
  │              │           │                │                  │                      │  ->when(endDate)
  │              │           │                │                  │                      │  ->orderBy('id','desc')
  │              │           │                │                  │                      │  ->skip()->take()
  │              │           │                │                  │◀──{data:[...],...}──│
  │              │           │                │                  │──200────────────────▶│
  │◀──200 {"data":[{"id":...,"fromUsername":"alice","toUsername":"bob",...}],...}       │
```

**效能說明**：`Transaction::with(['fromWallet.user', 'toWallet.user'])` 觸發 3 條 SQL：

1. `SELECT * FROM transactions WHERE ... LIMIT 20 OFFSET 0`
2. `SELECT * FROM wallets WHERE id IN (1, 2, 3, ..., 20)` — 批次撈出所有 from/to wallets
3. `SELECT * FROM users WHERE id IN (10, 11, ..., 30)` — 批次撈出所有關聯 users

沒有 `with()` 的話，步驟 1 之後每筆交易各自查 wallets，每個 wallet 再各自查 users，總計 1 + 20*2 = 41 條 SQL（N+1 問題）。

### 8. 交易統計流程 (GET /api/admin/transactions/stats)

```
Client         Route    JwtMiddleware   AdminMiddleware    AdminController         AdminService
  │              │           │                │                  │                      │
  │──GET /api/admin/transactions/stats?startDate=...&endDate=...                      │
  │              │──▶JWT驗證─▶│──▶角色檢查─────▶│                  │                      │
  │              │           │                │                  │──getTransactionStats()─▶│
  │              │           │                │                  │                      │──Transaction::whereBetween()
  │              │           │                │                  │                      │  ->count() → totalCount
  │              │           │                │                  │                      │──Transaction::whereBetween()
  │              │           │                │                  │                      │  ->sum('amount') → totalAmount
  │              │           │                │                  │                      │──DB::select("SELECT DATE(...)
  │              │           │                │                  │                      │  GROUP BY DATE(...)" )
  │              │           │                │                  │                      │  → daily breakdown
  │              │           │                │                  │◀──{totalCount,...}───│
  │              │           │                │                  │──200────────────────▶│
  │◀──200 {"totalCount":1523,"totalAmount":"250000.5000","daily":[{"date":"2025-06-03",...}]}
```

### 9. 錯誤流程（以 401 為例）

```
Client         Route    JwtMiddleware         Exception Handler (bootstrap/app.php)
  │              │           │                         │
  │──GET /api/wallets───────▶│                         │
  │  (no Authorization)      │                         │
  │              │──▶handle()│                         │
  │              │           │──$request->bearerToken()│
  │              │           │──(null)                 │
  │              │           │──throw new AuthenticationException()   │
  │              │           │──▶Exception propagates──▶│
  │              │           │                         │──AppException handler 匹配
  │              │           │                         │──$e->getStatusCode() → 401
  │              │           │                         │──$e->getMessage() → "Invalid username or password"
  │              │           │                         │──response()->json([...], 401)
  │◀──401 {"status":"ERROR","message":"Invalid username or password"}
```

---

## 啟動方式

### 前置需求

- PHP 8.2 或更高版本（含 `pdo_pgsql`、`bcmath` 擴展）
- Composer 2
- PostgreSQL（或 SQLite 用於快速開發驗證）

### 步驟

```bash
# 1. 進入專案目錄
cd digital_wallet_laravel

# 2. 安裝依賴
composer install

# 3. 複製環境設定檔
cp .env.example .env

# 4. 編輯 .env，設定資料庫連線（PostgreSQL 範例）
# DB_CONNECTION=pgsql
# DB_HOST=127.0.0.1
# DB_PORT=5433
# DB_DATABASE=digital_wallet
# DB_USERNAME=postgres
# DB_PASSWORD=postgres
#
# JWT_SECRET=your-256-bit-secret-minimum
# JWT_EXPIRATION=86400000

# 5. 產生應用程式金鑰（Laravel 內部加密用）
php artisan key:generate

# 6. 執行資料庫遷移（建立 users、wallets、transactions 三張表）
php artisan migrate

# 7. 啟動開發伺服器（預設 http://localhost:8000）
php artisan serve
```

### 使用 SQLite（零依賴快速啟動）

若無 PostgreSQL，可直接使用 SQLite：

```env
# .env
DB_CONNECTION=sqlite
# DB_DATABASE 留空，Laravel 自動使用 database/database.sqlite
```

```bash
php artisan migrate  # 自動建立 SQLite 資料庫檔案
php artisan serve
```

**注意**：SQLite 的 `NUMERIC` 精度與 PostgreSQL 不同，且部分 raw SQL（`GROUP BY DATE(created_at)`）的日期函數行為有差異。正式環境請使用 PostgreSQL。

### 執行測試

```bash
php artisan test
```

---

## 設計決策問答

### Q1: 為什麼選擇 Laravel 而非 Slim / Symfony？

Laravel 提供最完整的開箱即用生態。本專案需要的所有功能——middleware pipeline、Eloquent ORM、validation、migration、dependency injection container、exception handling——Laravel 全部內建。相比之下，Slim 需要手動拼裝太多第三方套件（router、ORM、validation 各自獨立且需要自行整合），Symfony 則配置繁重且學習曲線陡峭。Laravel 的 convention-over-configuration 理念讓本專案能以極少程式碼完成所有 API 功能。

### Q2: 為什麼用 Eloquent 而非 Query Builder 或 raw SQL？

Eloquent 提供三項關鍵價值：

1. **關聯定義**：`hasOne`、`belongsTo` 讓跨表查詢極度簡潔。`$user->wallet` 一行即完成 JOIN，不需要手寫 SQL。
2. **Eager loading**：`with()` 只需一行宣告就能解決 N+1 問題。
3. **型別 cast**：`decimal:4` 自動處理 NUMERIC 精度問題。

但在樂觀鎖 UPDATE 場景（`TransactionService::transfer` 中的 `DB::update()`），我們刻意使用 raw SQL。原因是樂觀鎖需要精確控制 UPDATE 的 WHERE 條件與更新的欄位——Eloquent 的 `save()` 會自動更新所有 `$fillable` 欄位，且可能重新載入 model 屬性覆蓋已讀取的 version。這是**務實的混合策略**：一般 CRUD 用 Eloquent 加速開發，正確性關鍵路徑用 raw SQL 精確控制。

### Q3: 為什麼 Service 層要獨立於 Controller？

Controller 的職責是 HTTP 協定處理（parse request、format response），Service 的職責是業務邏輯。分離帶來三個好處：

1. **可測試性**：Service 可以用純 PHP unit test 測試，不需要模擬 HTTP request、middleware pipeline 或 JSON 序列化。
2. **可重用性**：同一段業務邏輯可以在不同 Controller（REST API、GraphQL resolver、CLI command）中調用。
3. **變更隔離**：HTTP 層的改動（例如從 REST 改成 gRPC）不影響業務邏輯，反之亦然。

### Q4: 為什麼用 Middleware alias 而非直接寫 FQCN？

`'jwt.auth'` 比 `\App\Http\Middleware\JwtMiddleware::class` 更具語意。alias 有三個好處：

1. **可讀性**：route 檔案一眼就能看出哪些 route 需要 JWT 驗證，哪些需要 admin 角色。
2. **可更換性**：若未來要更換 middleware 實作（例如改用 Laravel Sanctum），只需修改 `bootstrap/app.php` 的 alias 對應關係，路由檔案完全不用變更。
3. **可組合性**：`['jwt.auth', 'admin.role']` 清晰表達「先驗證 JWT，再檢查角色」的層疊語意。

### Q5: 為什麼 role 要寫進 JWT payload 而非每次查詢資料庫？

這是**效能與即時性之間的取捨**。將 role 寫入 JWT 的優點是每個請求省下一次 `SELECT role FROM users WHERE id = ?` 查詢。代價是若管理者在後台將使用者停用（`ROLE_USER` → `ROLE_DISABLED`），已簽發的 token 在過期前仍然有效（最多 24 小時）。

本專案的取捨理由：

- Token 過期時間為 24 小時（`JWT_EXPIRATION=86400000`），停用後最多 24 小時內自然失效，多數場景可接受。
- 登入時已檢查 `ROLE_DISABLED`——已被停用的使用者無法取得新 token。
- 其他五個參考後端皆採用相同策略，保持一致性。

---

## 安全紅線

本專案實作以下安全措施，每一項都是必須遵守的硬性規則。

### 1. IDOR 防護（Insecure Direct Object Reference）

**原則**：userId 永遠從 JWT 取得，絕不從 URL path、query string 或 request body 取得。

- `WalletController::show()` 使用 `$request->attributes->get('userId')`
- `TransactionController::transfer()` 使用 `$request->attributes->get('userId')` 作為 `fromUserId`
- 沒有任何使用者 endpoint 接受 `userId` 作為 URL 參數（admin endpoint 的 `{id}` 僅限 `ROLE_ADMIN` 使用，由 `AdminMiddleware` 保護）

### 2. 密碼儲存與驗證

- 使用 BCrypt（`Hash::make()`），單向雜湊，永不明文儲存。
- 登入比對使用 `Hash::check()`，利用 BCrypt 的 constant-time comparison，防止 timing attack。

### 3. JWT 簽章驗證

- 所有受保護路由經過 `JwtMiddleware`，檢查 token 存在性、簽章有效性、過期時間、`sub` claim 格式。
- JWT secret 儲存於 `.env`（`JWT_SECRET`），不提交進版本控制。`JwtHelper::getSecret()` 運行時檢查 secret 是否為空字串，空值將拋出 `RuntimeException` 回傳 500。
- 使用 HS256（HMAC-SHA256），Firebase JWT library 自動驗證簽章。

### 4. 樂觀鎖防止超額轉帳與資金流失

- `TransactionService::transfer()` 使用 `WHERE user_id = ? AND version = ?` 條件確保扣款操作的原子性。
- `$deducted === 0` 代表並發衝突，交易被拒絕（409 Conflict），不會出現兩筆交易同時扣款成功但只扣一次餘額的問題。

### 5. 使用者列舉防護

- 登入失敗（帳號不存在、密碼錯誤、帳號停用）全部回傳相同的 `"Invalid username or password"`，攻擊者無法從錯誤訊息區分三種情況，無法確認某個 username 是否已註冊。

### 6. 金額精度保護

- 所有轉帳金額比對使用 `bccomp()`（BCMath 任意精度比較），不使用 PHP 的 `>` / `<` 浮點運算。
- `amount` 在 Eloquent model 中 cast 為 `decimal:4`，在 PHP 中以精確字串型式傳遞。
- `TransferRequest` 使用正則表達式 `/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/` 限制金額格式為嚴格十進位（拒絕科學記號如 `1e3`）。

### 7. Mass Assignment 防護

- 所有 Model 的 `$fillable` 白名單明確列出允許批量賦值的欄位。
- `id`、`created_at`、`updated_at` 等系統控制欄位全部不列入 fillable。
- `RegisterRequest` 限制 `role` 只能傳入 `ROLE_USER`（`'role' => 'sometimes|string|in:ROLE_USER'`），防止任何人透過註冊 API 建立管理員帳號。

---

## 常見錯誤

### 1. N+1 查詢問題

**錯誤寫法**：

```php
// BAD：每筆交易都觸發獨立 SQL 查詢關聯資料
$transactions = Transaction::all();
foreach ($transactions as $tx) {
    echo $tx->fromWallet->user->username;  // 每次 ->fromWallet 是一次 SQL
    echo $tx->toWallet->user->username;    // 每次 ->toWallet 是一次 SQL
}
// 100 筆交易 = 1 (all) + 100*2 (from/to wallets) + 200*1 (users) = 301 條 SQL
```

**正確寫法**：

```php
// GOOD：with() eager loading，3 條 SQL 解決
$transactions = Transaction::with(['fromWallet.user', 'toWallet.user'])->get();
foreach ($transactions as $tx) {
    echo $tx->fromWallet->user->username;  // 已在記憶體中，無額外 SQL
    echo $tx->toWallet->user->username;    // 已在記憶體中，無額外 SQL
}
// 任意筆數交易 = 3 條 SQL
```

**原理**：`with()` 使用 `WHERE id IN (1, 2, 3, ...)` 批次撈取所有關聯資料，然後在 PHP 記憶體中進行配對（Eloquent 稱此機制為 "eager loading"）。

### 2. `whereHas` 與 `where` 的混淆

**錯誤寫法**：

```php
// BAD：transactions 表上沒有 username 欄位，直接報錯
Transaction::where('username', 'like', '%alice%')->get();
// SQLSTATE[42703]: Column not found: 1054 Unknown column 'username' in 'where clause'
```

**正確寫法**：

```php
// GOOD：whereHas 在關聯表上建立 EXISTS 子查詢
Transaction::whereHas('fromWallet.user', function ($q) use ($search) {
    $q->where('username', 'like', '%' . $search . '%');
})->get();

// 生成的 SQL 結構（簡化）：
// SELECT * FROM transactions
// WHERE EXISTS (
//     SELECT 1 FROM wallets
//     INNER JOIN users ON users.id = wallets.user_id
//     WHERE wallets.id = transactions.from_wallet_id
//       AND users.username LIKE '%alice%'
// )
```

**判斷規則**：

| 場景 | 使用方法 |
|------|----------|
| 在本表欄位上過濾 | `where('column', value)` |
| 在關聯表的欄位上過濾 | `whereHas('relation', callback)` |
| 查詢「有至少一筆關聯記錄」的記錄 | `has('relation')` |
| 跨多層關聯過濾 | `whereHas('relation.nestedRelation', callback)` |

### 3. `DB::update()` 回傳值的誤判

**錯誤寫法**：

```php
// BAD：將 int 回傳值當作 boolean
$result = DB::update('UPDATE wallets SET balance = balance - ? WHERE ...', [$amount]);
if (!$result) {
    // $result 是受影響行數 (int)，不是 boolean
    // 若 UPDATE 成功但 match 0 行 ($result === 0)，!0 === true，條件成立
    // 可能誤判為「更新失敗」但實際上是「沒有行被更新」
}
```

**正確寫法**：

```php
// GOOD：精確比對受影響行數
$deducted = DB::update(
    'UPDATE wallets SET balance = balance - ?, version = version + 1, updated_at = NOW()
     WHERE user_id = ? AND version = ?',
    [$amount, $fromUserId, $fromWallet->version]
);

if ($deducted === 0) {
    // 0 行被更新 → version 不匹配 → 並發衝突
    throw new ConcurrentModificationException(...);
}
// $deducted === 1 → 成功更新 1 行 → 正常流程
```

**Laravel 中三種資料庫操作的回傳值**：

| 方法 | 回傳值型別 | 意義 |
|------|-----------|------|
| `DB::update()` | `int` | 受影響的行數 |
| `DB::delete()` | `int` | 受影響的行數 |
| `DB::insert()` | `bool` | 是否成功執行 |
| `DB::statement()` | `bool` | 是否成功執行 |
| `DB::select()` | `array` | 查詢結果（stdClass objects） |

### 4. Mass Assignment 漏洞

**錯誤寫法**：

```php
// BAD：直接使用 $request->all() 建立 Model
$user = User::create($request->all());
// 若攻擊者傳入 {"username":"hacker","password":"123456","role":"ROLE_ADMIN"}
// 且 'role' 在 $fillable 中但未在 RegisterRequest 中限制，則會建立管理員帳號
```

**正確寫法**：

```php
// GOOD：雙重防護
// 第一層：Model $fillable 白名單
class User extends Model
{
    protected $fillable = ['username', 'password_hash', 'role'];
}

// 第二層：FormRequest 驗證限制 role 值
class RegisterRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'username' => 'required|string|min:3',
            'password' => 'required|string|min:6',
            'role' => 'sometimes|string|in:ROLE_USER',  // 只能是 ROLE_USER
        ];
    }
}

// Controller 中使用
$service->register($request->input('username'), $request->input('password'));
// 不直接傳入 $request->all()，而是明確指定哪些欄位進入 Service
```

### 5. 浮點數金額計算

**錯誤寫法**：

```php
// BAD：直接使用 >/< 比較 float
if ($fromWallet->balance < $amount) {
    // 0.1 + 0.2 = 0.30000000000000004（IEEE 754 浮點誤差）
    // 可能導致餘額比較結果不正確
}
```

**正確寫法**：

```php
// GOOD：使用 bccomp() 進行任意精度比較
if (bccomp((string) $fromWallet->balance, $amount, 4) < 0) {
    // bccomp 使用字串進行精確的十進位比較
    // 第三參數 4 表示精確到小數點後 4 位
    // 回傳 -1（小於）、0（等於）、1（大於）
}
```

---

> 此專案為技術驗證／教育用途示範實作。API 合約與 Spring Boot、Spring MVC、Node.js、FastAPI、Plain PHP 版本完全互通。前端 `digital_wallet_frontend` 可連接此 Laravel 後端，無需修改任何程式碼。
