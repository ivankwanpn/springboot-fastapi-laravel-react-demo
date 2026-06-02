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
│   │   └── errorHandler.js              # 全域錯誤處理（AppError → JSON）
│   │
│   ├── routes/
│   │   ├── auth.js                       # POST /api/auth/register, /login
│   │   ├── wallets.js                    # GET /api/wallets
│   │   └── transactions.js              # POST /api/transactions/transfer, GET /api/transactions
│   │
│   ├── services/
│   │   ├── authService.js               # register（bcrypt + 查重 + 創建錢包）, login
│   │   ├── walletService.js             # findByUserId → camelCase DTO
│   │   └── transactionService.js        # transfer（樂觀鎖 + pg transaction）, getHistory
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
