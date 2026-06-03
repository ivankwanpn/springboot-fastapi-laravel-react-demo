# Digital Wallet Backend — Node.js（Express）版 (Demo)

> **技術驗證 / 抄作業項目**：用 Node.js + Express 生態複現數位錢包的所有功能。展示 JavaScript 後端的標準實作方式：手寫 SQL（無 ORM）、中介層模式、`async/await` 非同步。**API 合約與其他五個後端完全一致**，前端 `digital_wallet_frontend` 無需任何改動即可對接。

## 六版本技術對照

| 功能 | Spring Boot | Spring MVC | Node.js | FastAPI | Laravel | 純 PHP |
|------|------------|-----------|---------|---------|---------|--------|
| 語言 | Java 21 | Java 21 | **JavaScript (Node.js 20+）** | Python 3.12+ | PHP 8.3+ | PHP 8.3+ |
| Web 框架 | Spring Boot 3.5 | Spring MVC 6.2 | **Express.js 4.x** | FastAPI 0.115+ | Laravel 11 | 無 |
| ORM / DB | MyBatis XML | MyBatis + SqlSessionFactory | **`pg` + 手寫 SQL** | SQLAlchemy async | Eloquent | 原生 PDO |
| DB 驅動 | JDBC PostgreSQL | JDBC PostgreSQL | **node-postgres** | asyncpg | PDO pgsql | PDO pgsql |
| 密碼雜湊 | BCrypt | BCrypt | **bcrypt** | passlib[bcrypt] | `Hash::make()` | `password_hash()` |
| JWT | jjwt 0.11.5 | jjwt 0.11.5 | **jsonwebtoken** | PyJWT 2.x | firebase/php-jwt | firebase/php-jwt |
| 序列化 | Jackson | Jackson | **JSON.stringify（內建）** | Pydantic v2 | 手動 array | 手動 array |
| 非同步 | 執行緒池 | 執行緒池 | **async/await（事件迴圈）** | asyncio | — | — |
| 伺服器 | 內嵌 Tomcat | 外部 Tomcat | **內建（無需外部容器）** | Uvicorn | PHP-FPM | `php -S` |
| 事務管理 | `@Transactional` | `<tx:annotation-driven>` | **`BEGIN/COMMIT/ROLLBACK`** | `session.begin()` | `DB::transaction()` | 手動 |
| 樂觀鎖 | MyBatis UPDATE + rowcount | MyBatis UPDATE + rowcount | **`rowCount === 0`** | SQLAlchemy UPDATE + rowcount | Eloquent `update()` | PDO + `rowCount()` |
| 驗證 | `@Valid` | `@Valid` | **express-validator** | Pydantic | FormRequest | 內聯 if |
| 打包 | Fat JAR | WAR | — | — | — | — |

## 技術清單

| 技術 | 版本 | 用途 |
|------|------|------|
| Node.js | 20+ | 執行環境 |
| Express.js | 4.x | Web 框架 |
| `pg` (node-postgres) | 8.x | PostgreSQL 驅動 + 連線池 |
| `jsonwebtoken` | 9.x | JWT Token (HS256） |
| `bcrypt` | 6.x | 密碼雜湊 |
| `express-validator` | 7.x | 請求驗證中介層 |
| `dotenv` | 17.x | 環境變數載入 |
| `cors` | 2.x | CORS 中介層 |

---

## 完整專案結構

```
digital_wallet_nodejs/
├── package.json                          # npm 依賴與 scripts
├── .env                                  # 環境變數（DB、JWT、PORT）
├── .gitignore
│
├── src/
│   ├── index.js                          # Express 入口：middleware 掛載 + 路由 + 啟動
│   │
│   ├── config/
│   │   └── db.js                         # pg Pool 初始化（HikariCP 等效）
│   │
│   ├── middleware/
│   │   ├── auth.js                       # JWT 驗證中介層（Bearer token → req.userId）
│   │   ├── admin.js                      # Admin 角色檢查中介層（ROLE_ADMIN → next/403）
│   │   └── errorHandler.js              # 全域錯誤處理（AppError → JSON）
│   │
│   ├── routes/
│   │   ├── auth.js                       # POST /api/auth/register, /login
│   │   ├── wallets.js                    # GET /api/wallets
│   │   ├── transactions.js              # POST /api/transactions/transfer, GET /api/transactions
│   │   └── admin.js                      # GET/PUT /api/admin/users, /api/admin/transactions
│   │
│   ├── services/
│   │   ├── authService.js               # register（bcrypt + 查重 + 創建錢包）, login
│   │   ├── walletService.js             # findByUserId → camelCase DTO
│   │   ├── transactionService.js        # transfer（樂觀鎖 + pg transaction）, getHistory
│   │   └── adminService.js              # listUsers, getUserDetail, disable/enableUser, transaction history/stats
│   │
│   ├── utils/
│   │   ├── AppError.js                  # 自訂錯誤類（statusCode + message）
│   │   └── jwt.js                       # generateToken / verifyToken / extractUserId
│   │
│   └── validators/
│       ├── authValidator.js              # register / login 驗證規則
│       └── transferValidator.js          # transfer 驗證規則（含十進位格式）
│
└── README.md
```

---

## 與其他版本的關鍵差異

### 無 ORM，手寫 SQL + AS 別名轉 camelCase

Node.js 版使用 `pg` 原生驅動 + 手寫 SQL，沒有 ORM。所有查詢用 `AS` 別名將 snake_case 欄位轉為 camelCase：

```javascript
// walletService.js — 手寫 SQL alias
const result = await pool.query(
  'SELECT id, user_id AS "userId", currency, balance, version, updated_at AS "updatedAt" FROM wallets WHERE user_id = $1',
  [userId]
);
```

**為什麼不用 Sequelize / Prisma：**
- 與純 PHP 版的 PDO 手寫 SQL 呼應，展示無 ORM 時的 SQL 控制力
- 學習者可以直接看到實際執行的 SQL，對應 Java 版 MyBatis XML 和 PHP 版 PDO
- 所有查詢使用 `$1`/`$2` 參數化，SQL injection 防護與其他版本一致

### pg BIGINT → JS Number 轉型

`pg` 驅動將 PostgreSQL 的 `BIGINT` / `NUMERIC` 作為字串返回（避免 JS number 精度遺失）。所有 service 在返回前手動轉型：

```javascript
return {
  id: parseInt(wallet.id, 10),        // BIGSERIAL → JS number
  userId: parseInt(wallet.userId, 10),
  balance: parseFloat(wallet.balance), // NUMERIC(18,4) → JS number
  version: parseInt(wallet.version, 10),
  updatedAt: wallet.updatedAt,         // TIMESTAMP → string (ISO 8601)
};
```

### 手動 Transaction 管理（無 AOP / closure）

Java 版用 `@Transactional`、PHP Laravel 版用 `DB::transaction()`、Python 版用 `async with session.begin()`。Node.js 版手動管理：

```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // 扣款
  // 加款
  // 記錄交易
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

### 中介層模式（Express Middleware）

JWT 驗證和錯誤處理都用 Express 中介層，無需 AOP / Filter 類：

```javascript
// auth.js — Express middleware
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next(new AppError(401, 'Invalid username or password'));
  // ...
  req.userId = extractUserId(token);
  next();
}

// routes/wallets.js — 中介層鏈
router.get('/', auth, async (req, res, next) => { ... });
```

對應關係：
- `auth.js` ↔ Spring Boot `OncePerRequestFilter` / Laravel `JwtMiddleware`
- `errorHandler.js` ↔ Spring Boot `@RestControllerAdvice` / Laravel `Exceptions::render()`

### express-validator（中介層驗證）

```javascript
const transferRules = [
  body('toUsername').trim().notEmpty(),
  body('amount').matches(/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/),
];
router.post('/transfer', auth, transferRules, validate, async (...) => {...});
```

對應關係：
- `express-validator` ↔ Spring Boot `@Valid` + `@NotBlank` / Laravel FormRequest

---

## 如何快速找到要抄的部分

| 你想學/抄什麼 | Node.js 檔案 | 對應 Spring Boot | 對應 FastAPI | 對應 Laravel | 對應 純 PHP |
|-------------|------------|-----------------|-------------|-------------|------------|
| 專案初始化 | [package.json](package.json) | pom.xml | requirements.txt | composer.json | composer.json |
| Express 啟動 + 路由掛載 | [src/index.js](src/index.js) | @SpringBootApplication | main.py | bootstrap/app.php | public/index.php |
| DB 連線（pg Pool） | [src/config/db.js](src/config/db.js) | application.yaml | config.py | config/database.php | src/Config/Database.php |
| Service（業務邏輯） | [src/services/](src/services/) | service/impl/ | services/ | app/Services/ | src/Service/ |
| JWT 生成/驗證 | [src/utils/jwt.js](src/utils/jwt.js) | JwtUtil.java | security.py | JwtHelper.php | src/Util/JwtHelper.php |
| JWT 中介層 | [src/middleware/auth.js](src/middleware/auth.js) | JwtAuthenticationFilter.java | deps.py | JwtMiddleware | src/Middleware/ |
| 路由定義 | [src/routes/](src/routes/) | @RequestMapping | APIRouter | routes/api.php | match() |
| 樂觀鎖 + Transaction | [src/services/transactionService.js](src/services/transactionService.js) | TransactionServiceImpl | transaction_service.py | TransactionService.php | src/Service/TransactionService.php |
| 輸入驗證 | [src/validators/](src/validators/) | @Valid + DTO | Pydantic | FormRequest | 內聯 if |
| 錯誤處理 | [src/middleware/errorHandler.js](src/middleware/errorHandler.js) | GlobalExceptionHandler.java | handlers.py | Exceptions::render() | try/catch |
| 自訂錯誤類 | [src/utils/AppError.js](src/utils/AppError.js) | AppException.java | AppException | AppException.php | AppException |

---

## API 端點（六版本完全一致）

| 方法 | 路徑 | JWT | 請求體 | 響應 | HTTP |
|------|------|-----|--------|------|------|
| POST | `/api/auth/register` | 否 | `{"username":"alice","password":"123456"}` | `{"status":"SUCCESS","message":"User registered successfully"}` | 201 |
| POST | `/api/auth/login` | 否 | `{"username":"alice","password":"123456"}` | `{"token":"eyJ...","user":{"id":1,"username":"alice","role":"ROLE_USER","createdAt":"..."}}` | 200 |
| GET | `/api/wallets` | 是 | — | `{"id":1,"userId":1,"currency":"USDT","balance":0.0000,"version":0,"updatedAt":"..."}` | 200 |
| POST | `/api/transactions/transfer` | 是 | `{"toUsername":"bob","amount":"50.0000"}` | `{"status":"SUCCESS","message":"Transfer completed successfully"}` | 200 |
| GET | `/api/transactions` | 是 | — | `[{...TransactionDTO}, ...]` | 200 |
| GET | `/api/admin/users` | 是 | ?search=&page=1&size=20 | `{"data":[...],"page":1,"size":20,"total":N}` | 列出所有用戶（需 ROLE_ADMIN） |
| GET | `/api/admin/users/{id}` | 是 | — | `{"id":...,"username":"...","role":"...","wallet":{...},"recentTransactions":[...]}` | 用戶詳情 |
| PUT | `/api/admin/users/{id}/disable` | 是 | — | `{"status":"SUCCESS","message":"User disabled successfully"}` | 禁用用戶 |
| PUT | `/api/admin/users/{id}/enable` | 是 | — | `{"status":"SUCCESS","message":"User enabled successfully"}` | 啟用用戶 |
| GET | `/api/admin/transactions` | 是 | ?username=&from=&to=&page=1&size=20 | `{"data":[{...fromUsername,toUsername}],"page":1,"size":20,"total":N}` | 所有交易記錄 |
| GET | `/api/admin/transactions/stats` | 是 | ?from=&to= | `{"totalTransactions":N,"totalAmount":"...","dailyVolume":[{date,count,amount}]}` | 交易統計 |

### 管理後台（Admin Dashboard）

**認證與授權變更：**
- JWT Token 現包含 `role` claim
- `ROLE_DISABLED` 角色用戶登入時返回 401
- `/api/admin/**` 路由由 `auth` + `admin` 中介層保護
- Admin 用戶通過手動設置 DB 中 `role = 'ROLE_ADMIN'` 創建

**新增檔案：**
- `src/middleware/admin.js` — Admin 角色檢查中介層
- `src/services/adminService.js` — 管理業務邏輯（6 個方法）
- `src/routes/admin.js` — 6 個管理端點

## 錯誤響應格式

```json
{"status": "ERROR", "message": "..."}
```

| HTTP | 場景 |
|------|------|
| 400 | 餘額不足、amount <= 0、自己轉給自己、輸入驗證失敗 |
| 401 | 登入失敗、Token 無效/過期 |
| 404 | 錢包不存在、recipient 不存在 |
| 409 | 樂觀鎖版本衝突、用戶名重複 |
| 500 | 未預期錯誤（內部 log，對外只顯示 "Internal server error"） |

---

## 資料庫表結構

與 Spring Boot 版**完全相同**，PostgreSQL DDL：

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

**樂觀鎖原理：** 每次扣款時帶 `WHERE version = ?`，如果 `rowCount === 0`（版本已被其他請求更新），則拒絕此次扣款並回傳 409。適合「讀多寫少」的錢包場景，不會死鎖。

---

## 核心實作模式（完整程式碼 + 解釋）

### 1. 專案初始化（package.json + index.js）

```json
{
  "dependencies": {
    "express": "^5.2.1",
    "pg": "^8.21.0",
    "jsonwebtoken": "^9.0.3",
    "bcrypt": "^6.0.0",
    "express-validator": "^7.3.2",
    "dotenv": "^17.4.2",
    "cors": "^2.8.6"
  }
}
```

**為什麼不選 TypeScript：** 所有後端版本都用動態語言（Python/PHP/JS），保持一致的學習體驗。TypeScript 版本可以作為後續擴展。

### 2. pg Pool（src/config/db.js）

```javascript
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  database: process.env.DB_DATABASE || 'digital_wallet',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  max: 10,
});
module.exports = pool;
```

**為什麼 Pool 的 max=10：** Node.js 單執行緒事件迴圈，連線池不需要像 Java 執行緒池那麼大。`pg` Pool 內建 idle 回收，無需額外配置。

### 3. 自訂錯誤類（src/utils/AppError.js）

```javascript
class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}
```

對應 Spring Boot `AppException(statusCode, message)`，FastAPI `AppException`，PHP `AppException`。

### 4. JWT 工具（src/utils/jwt.js）

```javascript
function generateToken(userId, username) {
  return jwt.sign({ sub: String(userId), username }, SECRET, {
    algorithm: 'HS256', expiresIn: EXPIRATION / 1000,
  });
}

function extractUserId(token) {
  const payload = jwt.verify(token, SECRET, { algorithms: ['HS256'] });
  return parseInt(payload.sub, 10);
}
```

**為什麼 `algorithms: ['HS256']` 要寫死：** 防止 JWT `none` algorithm 攻擊 — 攻擊者可以偽造 `alg: "none"` 的 token 繞過驗證。`jsonwebtoken` 庫在 v9+ 預設拒絕 `none`，但顯式指定更安全。

### 5. JWT 中介層（src/middleware/auth.js）

```javascript
function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'Invalid username or password'));
  }
  try {
    req.userId = extractUserId(header.substring(7));
    next();
  } catch (err) {
    next(new AppError(401, 'Invalid username or password'));
  }
}
```

對應 Spring Boot `OncePerRequestFilter`，FastAPI `Depends(get_current_user_id)`。

### 6. Auth Service（src/services/authService.js）

```javascript
// register — 在同一個 transaction 中建立 user + wallet
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await client.query(
    'INSERT INTO users(username, password_hash, role) VALUES($1, $2, $3) RETURNING id',
    [username, passwordHash, 'ROLE_USER']
  );
  await client.query(
    'INSERT INTO wallets(user_id, currency, balance, version) VALUES($1, $2, $3, $4)',
    [result.rows[0].id, 'USDT', '0', 0]
  );
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  if (err.code === '23505') throw new AppError(409, 'Username already taken');
  throw err;
} finally { client.release(); }
```

**為什麼 bcrypt 12 rounds：** bcrypt 的 cost factor 每 +1 計算時間翻倍。12 在安全和效能之間平衡。Spring Boot 和 Laravel 預設也是 10-12。

**為什麼用 PostgreSQL error code `23505` 偵測重複：** 這是 PostgreSQL 的唯一約束違反碼，精確對應 `UNIQUE(username)`。

### 7. Transaction Service — 樂觀鎖轉賬

```javascript
// 樂觀鎖扣款
const deductResult = await client.query(
  `UPDATE wallets SET balance = balance - $1, version = version + 1, updated_at = NOW()
   WHERE user_id = $2 AND version = $3`,
  [amount, fromUserId, fromWallet.version]
);
if (deductResult.rowCount === 0) {
  throw new AppError(409, 'Concurrent modification detected');
}
```

**樂觀鎖流程：**
1. 讀取 wallet 時一起讀 `version`
2. UPDATE 時帶 `WHERE version = ?`
3. `rowCount === 0` → 其他請求先更新了 → 409

---

## 數據流圖

```
POST /api/auth/register
  → authValidator (express-validator)
  → AuthService.register() ← BEGIN/COMMIT/ROLLBACK
    ├── bcrypt.hash(password, 12)
    ├── INSERT INTO users (...)
    │     └── error code 23505 → 409 DuplicateUsername
    ├── INSERT INTO wallets (user_id, 0, 0)
    └── COMMIT
  → 201 { status: "SUCCESS", message: "User registered successfully" }

POST /api/auth/login
  → authValidator
  → AuthService.login()
    ├── SELECT * FROM users WHERE username = $1
    │     └── null → 401
    ├── bcrypt.compare(password, hash)
    │     └── false → 401
    ├── jwt.sign({ sub, username }, SECRET, HS256)
    └── 200 { token, user: { id, username, role, createdAt } }

GET /api/wallets
  → authMiddleware → req.userId = 1
  → WalletService.getByUserId(1)
    ├── SELECT * FROM wallets WHERE user_id = $1
    │     └── null → 404
    ├── parseInt, parseFloat 轉型
    └── 200 { id, userId, currency, balance, version, updatedAt }

POST /api/transactions/transfer  { toUsername: "bob", amount: "50.0000" }
  → authMiddleware → req.userId = 1
  → transferValidator (express-validator)
  → TransactionService.transfer(1, "bob", 50.0000) ← BEGIN/COMMIT/ROLLBACK
    ├── parseFloat(amount) <= 0? → 400
    ├── SELECT id FROM users WHERE username = 'bob'
    │     └── null → 404
    ├── userId === toUserId? → 400 self-transfer
    ├── SELECT balance, version FROM wallets WHERE user_id = 1
    │     └── null → 404
    ├── balance < amount? → 400 InsufficientBalance
    ├── UPDATE wallets SET balance - 50, version + 1 WHERE user_id=1 AND version=3
    │     └── rowCount=0 → 409 ConcurrentModification
    ├── UPDATE wallets SET balance + 50, version + 1 WHERE user_id=<toUserId>
    ├── INSERT INTO transactions (...)
    └── COMMIT
  → 200 { status: "SUCCESS", message: "Transfer completed successfully" }

GET /api/transactions
  → authMiddleware → req.userId = 1
  → TransactionService.getHistory(1)
    ├── SELECT id FROM wallets WHERE user_id = 1
    ├── SELECT * FROM transactions WHERE from_wallet_id=? OR to_wallet_id=? ORDER BY created_at DESC
    └── 200 [{ id, fromWalletId, toWalletId, amount, txType, status, createdAt }]
```

---

## 設計決策問答

### 為什麼不用 Sequelize / Prisma 而是手寫 SQL？

| | 手寫 SQL (`pg`) | ORM (Sequelize/Prisma) |
|------|------|------|
| SQL 控制 | 完全掌控，直接複製到 DB 執行 | 自動生成，難以優化 |
| 學習成本 | 會 SQL 就能上手 | 需學 ORM 特定 API |
| 與其他版本對照 | 直接對應 MyBatis XML / PDO SQL | 抽象層遮蔽實際 SQL |

**選手寫 SQL：** 這個專案的目的是展示六種技術棧實現相同規格，手寫 SQL 讓學習者能直接對照各版本的 SQL 語句。

### 為什麼用 async/await 而不是 callback？

- async/await 讓非同步程式碼讀起來像同步，減少 callback hell
- 與 Python FastAPI 的 `async/await` 直接對應
- Node.js 8+ 原生支援，無需額外套件

### 為什麼 pg 驅動的 BIGINT 返回字串？

PostgreSQL 的 `BIGINT` 是 64-bit，JavaScript 的 `Number` 是 IEEE 754 雙精度（安全整數範圍 ±2^53）。`pg` 預設以字串返回避免精度丟失。在 wallet/transaction 場景中，ID 不會超過安全範圍，所以用 `parseInt()` 轉回 number。

### 為什麼用 express-validator 中介層？

- 驗證邏輯在 request 進入 controller 之前執行，符合 fail-fast 原則
- 對應 Spring Boot 的 `@Valid` + Bean Validation 模式
- 中介層是 Express 的核心設計模式，比在 service 層手寫 if 更清晰

---

## 安全紅線

| ✅ 要做的 | ❌ 不要做的 |
|------|------|
| bcrypt 12 rounds 存密碼 | 明文或 MD5/SHA-256 存密碼 |
| JWT algorithms 固定 HS256 | 允許 `none` algorithm |
| SQL 用 `$1`/`$2` 參數化 | 字串拼接 SQL |
| Bigint ID 用 `parseInt` 轉型 | 依賴 `==` 自動轉型（可能導致 self-transfer 繞過） |
| 500 錯誤對外只顯示 "Internal server error" | 洩漏 stack trace 給 client |
| 從 JWT 提取 userId | 從 URL 或 request body 取 userId |
| 統一登入失敗訊息 | 區分「用戶不存在」vs「密碼錯誤」 |

---

## 常見錯誤

| 錯誤 | 後果 | 正確做法 |
|------|------|------|
| `pool.query()` 用在 transaction 內 | 不同連線，無法 ROLLBACK | 用 `client.query()`（從 `pool.connect()` 取得） |
| 忘記 `finally { client.release() }` | 連線洩漏，pool 耗盡 | always release in finally |
| `req.userId === toUser.id` 比較字串和數字 | self-transfer 檢查失效 | `parseInt(toUser.id, 10)` 後再比較 |
| `jsonwebtoken` 不指定 algorithms | 可能接受 `none` 演算法 token | `jwt.verify(token, secret, { algorithms: ['HS256'] })` |
| 忘記 `cors()` | 前端無法跨域請求 | `app.use(cors())` |
| express-validator 不檢查 `validationResult` | 無效資料進入 service | router 中加入 validate 中介層 |

---

## 部署與使用

### 環境需求

| 軟體 | 版本 | 用途 |
|------|------|------|
| Node.js | 20+ | 執行環境 |
| npm | 9+ | 套件管理 |
| PostgreSQL | 16 | 資料庫（本機 5433 port） |

### 1. 安裝與啟動

```bash
# 安裝依賴
npm install

# 確認 PostgreSQL 運行中（localhost:5433）
# .env 已預設連線資訊

# 啟動伺服器
npm start
# → Server running on port 3000
```

### 2. API 測試流程

```bash
# --- 1. 註冊 alice ---
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"123456"}'
# → 201 {"status":"SUCCESS","message":"User registered successfully"}

# --- 2. 註冊 bob ---
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"123456"}'

# --- 3. 登入 alice ---
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"123456"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# --- 4. 查詢錢包 ---
curl http://localhost:3000/api/wallets \
  -H "Authorization: Bearer $TOKEN"

# --- 5. 轉帳（需先充值 alice）---
curl -X POST http://localhost:3000/api/transactions/transfer \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"toUsername":"bob","amount":"50.0000"}'

# --- 6. 查詢交易歷史 ---
curl http://localhost:3000/api/transactions \
  -H "Authorization: Bearer $TOKEN"
```

### 3. 前端對接

修改 `digital_wallet_frontend/vite.config.ts` 的 proxy target：

```ts
proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } }
```

然後啟動前端：

```bash
cd digital_wallet_frontend
npm run dev
```

---

## 六版本程式碼量對比

| 關注點 | Spring Boot | Spring MVC | **Node.js** | FastAPI | Laravel | 純 PHP |
|------|------------|-----------|-------------|---------|---------|--------|
| 配置 | ~15 | ~120 | ~15 | ~10 | ~20 | — |
| JWT + 安全 | ~60 | ~65 | ~40 | ~50 | ~55 | ~45 |
| 密碼處理 | ~5 | ~5 | ~3 | ~4 | ~3 | ~3 |
| 樂觀鎖 + 轉賬 | ~60 | ~65 | ~70 | ~40 | ~45 | ~45 |
| 異常處理 | ~55 | ~45 | ~20 | ~35 | ~35 | ~35 |
| API 路由 + Controller | ~40 | ~55 | ~45 | ~30 | ~45 | ~45 |
| Model/DTO | ~120 | ~120 | ~50 | ~100 | ~50 | ~50 |
| **總計** | **~375** | **~475** | **~243** | **~286** | **~253** | **~263** |

Node.js 版最精簡，主要因為：無 ORM（SQL 直接寫）、無 DTO/Entity 分離（JS 物件即 DTO）、Express 路由語法簡潔、自訂錯誤類只需 ~10 行。
