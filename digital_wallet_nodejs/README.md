# Digital Wallet Backend — Node.js + Express 版 (Demo)

> 技術驗證／參考實作：用 Node.js + Express 生態複現數位錢包的所有功能。API 合約與其他五個後端完全一致。

---

## 技術清單

| 技術 | 版本 | 用途 |
|------|------|------|
| Node.js | (LTS) | JavaScript runtime |
| Express | ^5.2.1 | HTTP framework（routing、middleware pipeline） |
| pg | ^8.21.0 | PostgreSQL native driver（連線池） |
| jsonwebtoken | ^9.0.3 | JWT 簽署（HS256）與驗證 |
| bcrypt | ^6.0.0 | 密碼雜湊（salt rounds = 12） |
| express-validator | ^7.3.2 | Request body 驗證鏈 |
| cors | ^2.8.6 | 跨來源資源共享 |
| dotenv | ^17.4.2 | 載入 `.env` 至 `process.env` |

> 專案使用 CommonJS（`"type": "commonjs"`），所有匯入匯出皆為 `require` / `module.exports`。

---

### 與其他版本的技術對照

| 功能 | Spring Boot | Spring MVC | Node.js | FastAPI | Laravel | 純 PHP | Next.js |
|------|------------|-----------|---------|---------|---------|--------|---------|
| 語言 | Java | Java | JavaScript | Python | PHP | PHP | TypeScript |
| Web框架 | Spring Boot 3.5 | Spring MVC 6 | Express 5 | FastAPI | Laravel 11 | 無框架 | Next.js 16 |
| ORM/DB | MyBatis | MyBatis | pg (raw SQL) | SQLAlchemy 2.0 async | Eloquent | PDO (raw SQL) | Prisma 7 |
| 配置方式 | application.yaml + @Value | XML + @Value | dotenv + .env | pydantic-settings + .env | .env + config/app.php | .env + parse_ini_file | .env + next.config |
| JWT套件 | jjwt | jjwt | jsonwebtoken | PyJWT | firebase/php-jwt | firebase/php-jwt | jose |
| DI方式 | @Autowired | @Autowired | 手動 require (無 DI) | Depends() | Service Container | 無 DI | 無 DI (React hooks) |
| 事務管理 | @Transactional | @Transactional | pool.connect() + BEGIN/COMMIT/ROLLBACK | async with session.begin() | DB::transaction() | PDO::beginTransaction() | Prisma $transaction |
| 樂觀鎖實作 | UPDATE ... WHERE version = #{version} | UPDATE ... WHERE version = #{version} | UPDATE ... WHERE version = $3 + rowCount | update().where(version=).rowcount | updateOrFail() + version | UPDATE ... WHERE version = :version + rowCount() | Prisma update with version |
| 分頁方式 | RowBounds | RowBounds | LIMIT/OFFSET 手動SQL | limit()/offset() | paginate() | LIMIT/OFFSET 手動SQL | Prisma skip/take |
| 密碼雜湊 | BCryptPasswordEncoder | BCryptPasswordEncoder | bcrypt (rounds=12) | passlib[bcrypt] | Hash::make() (bcrypt) | password_hash() (bcrypt) | bcryptjs |
| 伺服器 | Embedded Tomcat | External Tomcat 10.1 | Node.js HTTP (Express) | Uvicorn (ASGI) | php artisan serve | PHP built-in server | Vite dev / Node.js |
| Admin授權機制 | @PreAuthorize("hasRole('ADMIN')") | @PreAuthorize("hasRole('ADMIN')") | middleware admin.js (check req.userRole) | Depends(require_admin) | middleware + Gate | 手動 check $decoded['role'] | middleware + role check |

---

## 專案結構

```
digital_wallet_nodejs/
├── .env                         # 環境變數（DB_HOST, JWT_SECRET…）
├── .gitignore                   # 忽略 node_modules
├── package.json                 # 依賴與 npm start 腳本
├── package-lock.json            # 鎖定版號
└── src/
    ├── index.js                 # 應用程式入口：Express app 組裝與啟動
    ├── config/
    │   └── db.js                # 資料庫連線池（pg Pool）
    ├── utils/
    │   ├── jwt.js               # JWT 工具：generateToken / verifyToken / extractUserId
    │   └── AppError.js          # 自訂錯誤類別（statusCode + message）
    ├── middleware/
    │   ├── auth.js              # JWT 認證中介層（解碼 token → req.userId + req.userRole）
    │   ├── admin.js             # ROLE_ADMIN 授權中介層
    │   └── errorHandler.js      # 全域錯誤處理中介層（4 參數簽章）
    ├── validators/
    │   ├── authValidator.js     # 註冊／登入輸入驗證規則（express-validator）
    │   └── transferValidator.js # 轉帳輸入驗證規則（express-validator）
    ├── routes/
    │   ├── auth.js              # POST /register, POST /login
    │   ├── wallets.js           # GET /（查詢錢包）
    │   ├── transactions.js      # POST /transfer, GET /（交易歷史）
    │   └── admin.js             # 管理員端點（router.use(auth, admin)）
    └── services/
        ├── authService.js       # 註冊（tx + 建 wallet）、登入（驗證 + 產生 JWT）
        ├── walletService.js     # 依 userId 查詢錢包
        ├── transactionService.js# 轉帳（樂觀鎖 + tx）、交易歷史查詢
        └── adminService.js      # 用戶管理、交易監控、統計（JOIN、分頁、日期篩選）
```

共 **18 個原始檔**（不含 `.env` 與 `node_modules`），採分層架構：**Route → Validator → Middleware → Service → DB Pool**。

---

## API 端點

### 用戶端點（5 個）

| Method | Path | Auth | Purpose | Status Codes |
|--------|------|------|---------|--------------|
| POST | `/api/auth/register` | No | 註冊（自動建立 USDT 錢包） | 201, 400, 409 |
| POST | `/api/auth/login` | No | 登入，回傳 JWT token | 200, 401 |
| GET | `/api/wallets` | JWT | 查詢當前使用者的錢包餘額 | 200, 401, 404 |
| POST | `/api/transactions/transfer` | JWT | 轉帳給另一位使用者 | 200, 400, 401, 404, 409 |
| GET | `/api/transactions` | JWT | 查詢當前使用者的交易歷史 | 200, 401, 404 |

### 管理端點（6 個，需 `ROLE_ADMIN`）

| Method | Path | Auth | Purpose | Query Params |
|--------|------|------|---------|-------------|
| GET | `/api/admin/users` | Admin JWT | 用戶清單（搜尋 + 分頁） | `search`, `page`, `size` |
| GET | `/api/admin/users/:id` | Admin JWT | 用戶詳情（含錢包 + 最近 5 筆交易） | — |
| PUT | `/api/admin/users/:id/disable` | Admin JWT | 停用用戶（role 改為 ROLE_DISABLED） | — |
| PUT | `/api/admin/users/:id/enable` | Admin JWT | 啟用用戶（role 改回 ROLE_USER） | — |
| GET | `/api/admin/transactions` | Admin JWT | 全域交易清單（JOIN username + 日期篩選 + 分頁） | `username`, `from`, `to`, `page`, `size` |
| GET | `/api/admin/transactions/stats` | Admin JWT | 交易統計（總筆數／總金額／每日明細） | `from`, `to` |

> 錯誤回應格式：`{"status":"ERROR","message":"..."}`  
> 成功回應格式：`{"status":"SUCCESS","message":"..."}` 或直接回傳資料物件。

---

## 如何快速找到要抄的部分

| 你想學/抄什麼 | 直接看這個檔案 |
|-------------|-------------|
| 專案依賴宣告與啟動腳本 | `package.json` |
| 環境變數設定 (DB、JWT、PORT) | `.env` |
| Express 入口、middleware 註冊順序、路由掛載 | `src/index.js` |
| 資料庫連線池設定 (pg Pool, max/idle) | `src/config/db.js` |
| JWT 簽署 (HS256)、驗證、userId 提取 | `src/utils/jwt.js` |
| 自訂錯誤類別 (statusCode + message) | `src/utils/AppError.js` |
| JWT 認證中介層 (Bearer token 攔截、IDOR 防禦) | `src/middleware/auth.js` |
| Admin 授權中介層 (ROLE_ADMIN 檢查 → 403) | `src/middleware/admin.js` |
| 全域錯誤處理中介層 (Express 4 參數簽章) | `src/middleware/errorHandler.js` |
| 轉帳輸入驗證 (amount NUMERIC(18,4) 正則) | `src/validators/transferValidator.js` |
| 註冊 (transaction + BCrypt + unique violation 23505) 與登入 (ROLE_DISABLED 檢查) | `src/services/authService.js` |
| 轉帳與樂觀鎖 (version + rowCount + ROLLBACK) | `src/services/transactionService.js` |
| Admin 用戶管理、交易 JOIN 查詢、動態 SQL 分頁、統計 (GROUP BY) | `src/services/adminService.js` |
| Admin 路由 (6 個端點、router.use(auth, admin)) | `src/routes/admin.js` |

---

## 核心實作模式

以下逐檔展示完整原始碼，並解釋 **為什麼這樣寫**。

---

### 模式 1：專案初始化

#### `package.json`

```json
{
  "name": "digital_wallet_nodejs",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "bcrypt": "^6.0.0",
    "cors": "^2.8.6",
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "express-validator": "^7.3.2",
    "jsonwebtoken": "^9.0.3",
    "pg": "^8.21.0"
  }
}
```

**為什麼這樣寫：**
- `"type": "commonjs"` — 明確宣告使用 CommonJS 模組系統，避免 Node.js 誤判 ESM。Express 5 生態仍有許多套件以 CJS 為主流，選 CJS 可減少 `import` / `require` 混用帶來的坑。
- 只裝 6 個 dependency — 刻意不引入 ORM（Sequelize / Prisma）、CLI 框架（NestJS）、驗證庫（Zod / Joi 二重導入）。每個依賴都有無可取代的理由。
- `npm start` 直接 `node src/index.js`，不走 `nodemon` 或 `ts-node`，因為這是 demo 專案而非開發迭代環境。

#### `src/index.js`

```js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallets');
const transactionRoutes = require('./routes/transactions');
const adminRoutes = require('./routes/admin');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

**為什麼這樣寫：**
- `dotenv.config()` 放在**最頂端** — 確保之後 require 的任何模組，在其 module scope 頂層讀取 `process.env` 時，變數已經載入完畢。這是 Node.js 社群慣例。
- Middleware 註冊順序有講究：`cors()` → `express.json()` → 路由 → `errorHandler`。Express 5 的 middleware 執行順序就是註冊順序，錯誤處理中介層必須放在路由之後（Express 靠 4 參數函數簽章辨識 error handler）。
- 每個路由模組掛在獨立 prefix 下（`/api/auth`、`/api/wallets`…），`Router` 內部只寫相對路徑（`/register`、`/`），職責清晰。

---

### 模式 2：JWT 工具

#### `src/utils/jwt.js`

```js
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRATION = parseInt(process.env.JWT_EXPIRATION || '86400000', 10);

function generateToken(userId, username, role) {
  return jwt.sign(
    { sub: String(userId), username, role },
    SECRET,
    { algorithm: 'HS256', expiresIn: EXPIRATION / 1000 }
  );
}

function verifyToken(token) {
  return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
}

function extractUserId(token) {
  const payload = verifyToken(token);
  return parseInt(payload.sub, 10);
}

module.exports = { generateToken, verifyToken, extractUserId };
```

**為什麼這樣寫：**
- `SECRET` 從 `process.env.JWT_SECRET` 讀取，**不做 fallback** — 若未設定則 `jwt.sign` 傳入 `undefined`，會在執行期拋錯。這是刻意設計：讓部署錯誤盡早暴露，而非靜默使用弱 secret。
- `EXPIRATION` 預設 `86400000`（24 小時，毫秒），除以 1000 轉為秒餵給 `expiresIn`，因為 `jsonwebtoken` 接受秒數（整數）的語意。
- `algorithms: ['HS256']` **白名單限制** — 防止攻擊者偽造 header 中的 `alg: 'none'` 繞過驗證（CVE-2015-9235 類攻擊，雖然新版 jsonwebtoken 已有防禦，但顯式指定是最佳實踐）。
- `sub` 存 `String(userId)` 遵循 RFC 7519 建議（subject 為字串）；`extractUserId` 再 `parseInt` 回來供 SQL 查詢使用。
- 只匯出三個函數而非整個 jwt 物件 — 封裝細節，呼叫方只需知道「怎麼產 token、怎麼驗、怎麼拿 userId」。

---

### 模式 3：認證中介層

#### `src/middleware/auth.js`

```js
const { extractUserId, verifyToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'Invalid username or password'));
  }

  const token = header.substring(7);

  try {
    req.userId = extractUserId(token);
    const payload = verifyToken(token);
    req.userRole = payload.role || 'ROLE_USER';
    next();
  } catch (err) {
    next(new AppError(401, 'Invalid username or password'));
  }
}

module.exports = authMiddleware;
```

**為什麼這樣寫：**
- 401 的 message 寫死 `'Invalid username or password'` 而非 `'Missing token'` — **刻意混淆錯誤訊息**。若區分「token 不存在」與「token 無效」，攻擊者可據此探測 API 行為。統一訊息符合安全最佳實踐。
- `header.substring(7)` 而非 regex 解析 — `Bearer ` 長度固定 7，效能更好且不會出錯。若 header 格式不合（無空格），substring 頂多拿到空字串交給 jwt 驗證拋錯。
- `verifyToken` 被呼叫**兩次**（一次在 `extractUserId` 內部，一次顯式呼叫取 `payload.role`）— 這是一個可優化點（見「常見錯誤」一節）。但不影響正確性，因為兩次驗證之間 token payload 不會改變。
- `req.userRole = payload.role || 'ROLE_USER'` — 向後兼容沒有 role 欄位的舊 token。
- 拋錯時用 `next(err)` 而非 `res.status(401).json(...)` — 統一交給 `errorHandler` 處理，避免在各 middleware 中重複寫回應邏輯。

---

### 模式 4：Admin 授權中介層

#### `src/middleware/admin.js`

```js
const AppError = require('../utils/AppError');

function adminMiddleware(req, res, next) {
  if (req.userRole !== 'ROLE_ADMIN') {
    return next(new AppError(403, 'Access denied'));
  }
  next();
}

module.exports = adminMiddleware;
```

**為什麼這樣寫：**
- 僅 7 行，極簡。單一職責：檢查 `req.userRole`。所有 admin 路由共用 `router.use(auth, admin)` 一次註冊，新人加路由不會忘記掛 middleware。
- 403（Forbidden）而非 401（Unauthorized）— HTTP 語意：401 =「我不知道你是誰」，403 =「我知道你是誰，但你沒權限」。`auth.js` 已處理 401，這裡只需處理 RBAC。
- 不查資料庫 — 角色資訊已在 JWT payload 中，驗證簽章後即可信任。這樣設計的前提是 JWT 有效期短（或搭配黑名單），避免角色變更後舊 token 仍有權限。Demo 專案中 JWT 24 小時過期，風險可控。

---

### 模式 5：錯誤處理

#### `src/utils/AppError.js`

```js
class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = AppError;
```

**為什麼這樣寫：**
- 繼承原生 `Error` 以保留 stack trace（`captureStackTrace` 自動生效）。
- 只有兩個屬性：`statusCode` 和 `message`。足夠服務層表達任何業務錯誤（409 重複、404 找不到、400 參數非法、401 認證失敗、403 無權限）。不引入 `isOperational` 等布林屬性以保持簡單。
- 命名為 `AppError` 而非 `HttpError` — 強調這是應用層錯誤，與 http-errors 等第三方庫區隔。

#### `src/middleware/errorHandler.js`

```js
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    status: 'ERROR',
    message,
  });
}

module.exports = errorHandler;
```

**為什麼這樣寫：**
- 4 參數簽章 `(err, req, res, next)` — Express 辨識 error handler 的唯一方式。若只寫 3 個參數則 Express 當一般 middleware，不會傳遞錯誤過來。
- 500 時**不回傳原始錯誤訊息**給客戶端 — 只回傳 `'Internal server error'`，避免洩漏 SQL 語句、stack trace 等敏感資訊。同時 `console.error(err)` 在伺服器端留下完整 trace。
- 無 `statusCode` 的錯誤（例如非 `AppError` 的 throw）被歸為 500 — 防禦性程式設計。
- 回應格式 `{"status":"ERROR","message":"..."}` 與其他 5 個後端一致。

---

### 模式 6：驗證器

#### `src/validators/authValidator.js`

```js
const { body } = require('express-validator');

const registerRules = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').trim().notEmpty().withMessage('Password is required'),
];

const loginRules = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').trim().notEmpty().withMessage('Password is required'),
];

module.exports = { registerRules, loginRules };
```

**為什麼這樣寫：**
- `express-validator` 的 `body()` 回傳 validation chain，`.trim()` + `.notEmpty()` 防止空白字串。
- 規則以陣列匯出，路由層用 spread 傳入：`router.post('/register', registerRules, validate, handler)`。每個 middleware 在 chain 中執行，`validationResult` 在下一個 middleware 中檢查。
- 刻意**不檢查** password 長度或複雜度 — demo 專案聚焦錢包邏輯，不模擬真實密碼政策。生產環境應加上 `isLength({min:8})` 等規則。
- `registerRules` 和 `loginRules` 目前相同，但仍分開定義 — 未來可能對兩者有不同規則（例如註冊需 email），提前分開避免重構。

#### `src/validators/transferValidator.js`

```js
const { body } = require('express-validator');

const transferRules = [
  body('toUsername').trim().notEmpty().withMessage('Recipient username is required'),
  body('amount')
    .trim()
    .notEmpty().withMessage('Amount is required')
    .matches(/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/).withMessage('Invalid amount format'),
];

module.exports = { transferRules };
```

**為什麼這樣寫：**
- `toUsername` 只驗證非空 — 收件者是否存在由 service 層在交易中查詢，keeper 層負責格式、service 層負責業務。
- amount 正則 `^(?:0|[1-9]\d*)(?:\.\d{1,4})?$`：
  - `(?:0|[1-9]\d*)` — 整數部分：`0` 或非零開頭，拒絕 `007` 這類 leading zeros
  - `(?:\.\d{1,4})?` — 小數部分：最多 4 位，對應 `NUMERIC(18,4)` 精度
  - 拒絕負數、科學記號、非數字字串
- 驗證層攔截格式錯誤（400），service 層攔截業務錯誤（餘額不足 → 400、樂觀鎖衝突 → 409）。

---

### 模式 7：路由層

#### `src/routes/auth.js`

```js
const { Router } = require('express');
const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { registerRules, loginRules } = require('../validators/authValidator');
const AppError = require('../utils/AppError');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(400, errors.array()[0].msg));
  }
  next();
}

router.post('/register', registerRules, validate, async (req, res, next) => {
  try {
    await authService.register(req.body.username, req.body.password);
    res.status(201).json({ status: 'SUCCESS', message: 'User registered successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/login', loginRules, validate, async (req, res, next) => {
  try {
    const result = await authService.login(req.body.username, req.body.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

**為什麼這樣寫：**
- `validate` 是本地 helper — 每個路由檔都有自己的一份，因為不同路由可能需要自訂義錯誤處理（例如取多個 validation error 合併訊息）。這裡只取 `errors.array()[0].msg`，回傳第一個錯誤。
- Route handler 使用 `async (req, res, next)` — Express 5 原生支援 async handler。但注意：async function 內部若 throw，Express 5 會自動 `next(err)`，但對於手動 `catch` 中呼叫 `next(err)` 的行為，兩種寫法皆可。此處顯式 try/catch + next(err) 可讀性更高。
- 註冊回傳 201（Created），登入回傳 200（OK）；均包裝 `status: 'SUCCESS'`。
- 路由層不處理業務邏輯 — `authService.register()` / `authService.login()` 所有 SQL 與 bcrypt 操作都在 service 層。

#### `src/routes/wallets.js`

```js
const { Router } = require('express');
const walletService = require('../services/walletService');
const auth = require('../middleware/auth');

const router = Router();

router.get('/', auth, async (req, res, next) => {
  try {
    const wallet = await walletService.getByUserId(req.userId);
    res.json(wallet);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

**為什麼這樣寫：**
- 只有一個 GET `/`，但有 `auth` middleware — 確保只有登入用戶能查自己的錢包。`req.userId` 來自 JWT 而非 URL param，防止 IDOR。
- 回傳整個 wallet JSON 物件（id, userId, currency, balance, version, updatedAt）而不包裝 `{status: 'SUCCESS', data: wallet}` — 與其他後端合約一致。

#### `src/routes/transactions.js`

```js
const { Router } = require('express');
const { validationResult } = require('express-validator');
const transactionService = require('../services/transactionService');
const { transferRules } = require('../validators/transferValidator');
const auth = require('../middleware/auth');
const AppError = require('../utils/AppError');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(400, errors.array()[0].msg));
  }
  next();
}

router.post('/transfer', auth, transferRules, validate, async (req, res, next) => {
  try {
    await transactionService.transfer(req.userId, req.body.toUsername, req.body.amount);
    res.json({ status: 'SUCCESS', message: 'Transfer completed successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/', auth, async (req, res, next) => {
  try {
    const history = await transactionService.getHistory(req.userId);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

**為什麼這樣寫：**
- `transfer` 所需的 `fromUserId` 來自 `req.userId`（JWT 解出的），而非 request body — 防止攻擊者偽造匯款方身份（IDOR 防禦）。
- `getHistory` 不接受 query params — 直接回傳該用戶所有交易。Admin 端的交易查詢才支援篩選與分頁，用戶端保持簡單。
- Middleware 鏈順序：`auth` → `transferRules` → `validate` → handler。`auth` 最先執行，若未通過則不浪費資源做驗證。

#### `src/routes/admin.js`

```js
const { Router } = require('express');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const adminService = require('../services/adminService');
const router = Router();

router.use(auth, admin);

router.get('/users', async (req, res, next) => {
  try {
    const { search = '', page = 1, size = 20 } = req.query;
    const result = await adminService.listUsers(search, parseInt(page), parseInt(size));
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const detail = await adminService.getUserDetail(parseInt(req.params.id));
    res.json(detail);
  } catch (err) { next(err); }
});

router.put('/users/:id/disable', async (req, res, next) => {
  try {
    await adminService.disableUser(parseInt(req.params.id));
    res.json({ status: 'SUCCESS', message: 'User disabled successfully' });
  } catch (err) { next(err); }
});

router.put('/users/:id/enable', async (req, res, next) => {
  try {
    await adminService.enableUser(parseInt(req.params.id));
    res.json({ status: 'SUCCESS', message: 'User enabled successfully' });
  } catch (err) { next(err); }
});

router.get('/transactions', async (req, res, next) => {
  try {
    const { username, from, to, page = 1, size = 20 } = req.query;
    const result = await adminService.listTransactions(username || '', from || '', to || '', parseInt(page), parseInt(size));
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/transactions/stats', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const result = await adminService.getTransactionStats(from || '', to || '');
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
```

**為什麼這樣寫：**
- `router.use(auth, admin)` — 最關鍵的一行。所有在這個 router 上的路由都會先經過 JWT 認證再經過 role 檢查。不會發生「忘記在某個 route 加 admin middleware」的問題。
- 全部使用 `async` handler，但 handler 內 `catch (err) { next(err); }` — 簡潔的一行寫法（單行 try/catch），Express 5 其實可以用 async 自動拋錯，但顯式 catch 確保即使 callback 內有非同步錯誤也能傳遞。
- `parseInt` 用於 `:id` 參數 — Express 的 `req.params.id` 永遠是字串，必須轉換後才能提供給 SQL（pg 對 `$1` 型別推斷依賴 JS 型別）。
- Query params 提供預設值：`search = ''`, `page = 1`, `size = 20` — 確保初次載入時有合理資料。

---

### 模式 8：服務層

#### `src/services/authService.js`

```js
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { generateToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

async function register(username, password) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, 12);

    let user;
    try {
      const result = await client.query(
        'INSERT INTO users(username, password_hash, role) VALUES($1, $2, $3) RETURNING id, username, role, created_at AS "createdAt"',
        [username, passwordHash, 'ROLE_USER']
      );
      user = result.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        throw new AppError(409, `Username '${username}' is already taken`);
      }
      throw err;
    }

    await client.query(
      'INSERT INTO wallets(user_id, currency, balance, version) VALUES($1, $2, $3, $4)',
      [user.id, 'USDT', '0', 0]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function login(username, password) {
  const result = await pool.query(
    'SELECT id, username, password_hash AS "passwordHash", role, created_at AS "createdAt" FROM users WHERE username = $1',
    [username]
  );
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'Invalid username or password');
  }

  if (user.role === 'ROLE_DISABLED') {
    throw new AppError(401, 'Invalid username or password');
  }

  const userId = parseInt(user.id, 10);
  const token = generateToken(userId, user.username, user.role);

  return {
    token,
    user: {
      id: userId,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
}

module.exports = { register, login };
```

**為什麼這樣寫：**
- **註冊**使用 `pool.connect()` 取得專屬 client 進行 transaction（`BEGIN → INSERT user → INSERT wallet → COMMIT`）。若用 `pool.query()`，兩個 INSERT 會在不同連線中執行，無法 rollback。
  - PostgreSQL error code `23505` = `unique_violation` — 捕捉此錯誤碼比事前 `SELECT` 檢查更快，且避免了 race condition（兩個請求同時註冊同 username 時，SELECT 都回傳空 → 兩個都 INSERT，後者失敗）。利用 DB constraint 是公認最佳實踐。
  - `finally { client.release() }` — 確保連線歸還池中，即使發生例外。不歸還連線會耗盡 pool（預設 max = 10），導致應用 hang。
- **登入**使用 `pool.query()`（非 transaction）— 只讀操作，無需 tx。
  - `ROLE_DISABLED` 的訊息與帳密錯誤完全相同（`'Invalid username or password'`）— 不透露帳號是否被停用。
  - 回傳物件包含 `token`（頂層）與 `user` 物件（不含 `passwordHash`）— 前端可儲存 user profile 與 token。

#### `src/services/walletService.js`

```js
const pool = require('../config/db');
const AppError = require('../utils/AppError');

async function getByUserId(userId) {
  const result = await pool.query(
    'SELECT id, user_id AS "userId", currency, balance, version, updated_at AS "updatedAt" FROM wallets WHERE user_id = $1',
    [userId]
  );
  const wallet = result.rows[0];

  if (!wallet) {
    throw new AppError(404, `Wallet not found for userId: ${userId}`);
  }

  return {
    id: parseInt(wallet.id, 10),
    userId: parseInt(wallet.userId, 10),
    currency: wallet.currency,
    balance: parseFloat(wallet.balance),
    version: parseInt(wallet.version, 10),
    updatedAt: wallet.updatedAt,
  };
}

module.exports = { getByUserId };
```

**為什麼這樣寫：**
- SQL 使用 AS alias（`user_id AS "userId"`）— pg 回傳欄位名為 snake_case（PostgreSQL 慣例），但 JS 端轉為 camelCase 符合前端/Node.js 慣例。雙引號保留 camelCase 大小寫。
- `parseInt` / `parseFloat` 型別正規化 — pg 的 `BIGINT` 回傳 JS string（超出 Number.MAX_SAFE_INTEGER 時），`NUMERIC` 也回傳 string。此處欄位值不大，但顯式轉型確保下游程式拿到數字型別。
- 只匯出 `{ getByUserId }` 而非整個物件 — 未來擴充方法（如 `updateBalance`）只需在此檔案加，不用改呼叫方。

#### `src/services/transactionService.js`

```js
const pool = require('../config/db');
const AppError = require('../utils/AppError');

async function transfer(fromUserId, toUsername, amount) {
  const amountDecimal = parseFloat(amount);
  if (isNaN(amountDecimal) || amountDecimal <= 0) {
    throw new AppError(400, 'Transfer amount must be greater than zero');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // lookup recipient
    const toUserResult = await client.query(
      'SELECT id FROM users WHERE username = $1', [toUsername]
    );
    const toUser = toUserResult.rows[0];
    if (!toUser) {
      throw new AppError(404, `Recipient not found: ${toUsername}`);
    }
    const toUserId = parseInt(toUser.id, 10);

    if (fromUserId === toUserId) {
      throw new AppError(400, 'Cannot transfer to yourself');
    }

    // read wallets
    const fromWalletResult = await client.query(
      'SELECT id, balance, version FROM wallets WHERE user_id = $1', [fromUserId]
    );
    const fromWallet = fromWalletResult.rows[0];
    if (!fromWallet) {
      throw new AppError(404, `Wallet not found for userId: ${fromUserId}`);
    }

    const toWalletResult = await client.query(
      'SELECT id FROM wallets WHERE user_id = $1', [toUserId]
    );
    const toWallet = toWalletResult.rows[0];
    if (!toWallet) {
      throw new AppError(404, `Wallet not found for userId: ${toUserId}`);
    }

    const balance = parseFloat(fromWallet.balance);
    if (balance < amountDecimal) {
      throw new AppError(400, `Insufficient balance: ${fromWallet.balance} < ${amount}`);
    }

    // optimistic lock deduct
    const deductResult = await client.query(
      `UPDATE wallets
       SET balance = balance - $1, version = version + 1, updated_at = NOW()
       WHERE user_id = $2 AND version = $3`,
      [amount, fromUserId, fromWallet.version]
    );
    if (deductResult.rowCount === 0) {
      throw new AppError(409, `Concurrent modification detected for userId: ${fromUserId}`);
    }

    // add balance
    await client.query(
      `UPDATE wallets
       SET balance = balance + $1, version = version + 1, updated_at = NOW()
       WHERE user_id = $2`,
      [amount, toUserId]
    );

    // record transaction
    await client.query(
      `INSERT INTO transactions(from_wallet_id, to_wallet_id, amount, tx_type, status)
       VALUES($1, $2, $3, $4, $5)`,
      [fromWallet.id, toWallet.id, amount, 'TRANSFER', 'SUCCESS']
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getHistory(userId) {
  const walletResult = await pool.query(
    'SELECT id FROM wallets WHERE user_id = $1', [userId]
  );
  const wallet = walletResult.rows[0];
  if (!wallet) {
    throw new AppError(404, `Wallet not found for userId: ${userId}`);
  }

  const result = await pool.query(
    `SELECT id, from_wallet_id AS "fromWalletId", to_wallet_id AS "toWalletId",
            amount, tx_type AS "txType", status, created_at AS "createdAt"
     FROM transactions
     WHERE from_wallet_id = $1 OR to_wallet_id = $1
     ORDER BY created_at DESC`,
    [wallet.id]
  );

  return result.rows.map(tx => ({
    id: parseInt(tx.id, 10),
    fromWalletId: tx.fromWalletId ? parseInt(tx.fromWalletId, 10) : null,
    toWalletId: tx.toWalletId ? parseInt(tx.toWalletId, 10) : null,
    amount: parseFloat(tx.amount),
    txType: tx.txType,
    status: tx.status,
    createdAt: tx.createdAt,
  }));
}

module.exports = { transfer, getHistory };
```

**為什麼這樣寫：**
- **Transaction（資料庫交易）包裹整個轉帳流程**：查收件者 → 查兩個錢包 → 檢查餘額 → 樂觀鎖扣款 → 加款 → 寫交易紀錄 → COMMIT。任一環節失敗則 ROLLBACK，保證原子性。
- **樂觀鎖（Optimistic Locking）**是核心：`UPDATE wallets SET balance = balance - $1, version = version + 1 WHERE user_id = $2 AND version = $3`。`WHERE version = $3` 確保讀取 version 後到寫入前，沒有其他 transaction 改過這行。若 `rowCount === 0`，代表並發衝突，拋 409 Conflict。這在 PostgreSQL 的 REPEATABLE READ 或 READ COMMITTED 隔離層級下均正確工作，因為 UPDATE 的 WHERE 子句在 row lock 獲取後才評估。
- **加款端故意不加樂觀鎖** — 收款方理論上不會有並發衝突（只有一個 payer 在付錢給這個 payee）。這簡化了設計，但在極端並發下（多筆轉帳同時入同一個錢包）version 會被覆寫。如需更強保證，收款端也應加樂觀鎖且在一個 tx 中處理。
- `getHistory` 使用 `pool.query()`（非 transaction），`WHERE from_wallet_id = $1 OR to_wallet_id = $1` 查詢該錢包的所有進出交易，`ORDER BY created_at DESC` 最新在前。
- 所有 `BIGINT` / `NUMERIC` 欄位顯式 `parseInt` / `parseFloat`。

---

### 模式 9：Admin 服務層

#### `src/services/adminService.js`

```js
const pool = require('../config/db');
const AppError = require('../utils/AppError');

async function listUsers(search, page, size) {
  const clampedSize = Math.min(100, Math.max(1, size || 20));
  const offset = (Math.max(1, page || 1) - 1) * clampedSize;
  const searchPattern = `%${search || ''}%`;

  const countResult = await pool.query(
    'SELECT COUNT(*)::int AS total FROM users WHERE username ILIKE $1',
    [searchPattern]
  );

  const result = await pool.query(
    'SELECT id, username, role, created_at AS "createdAt" FROM users WHERE username ILIKE $1 ORDER BY id LIMIT $2 OFFSET $3',
    [searchPattern, clampedSize, offset]
  );

  return {
    data: result.rows.map(u => ({
      id: parseInt(u.id, 10),
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
    })),
    total: countResult.rows[0].total,
    page: Math.max(1, page || 1),
    size: clampedSize,
  };
}

async function getUserDetail(userId) {
  const userResult = await pool.query(
    'SELECT id, username, role, created_at AS "createdAt" FROM users WHERE id = $1',
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) {
    throw new AppError(404, 'User not found: ' + userId);
  }

  const walletResult = await pool.query(
    'SELECT id, user_id AS "userId", currency, balance, version, updated_at AS "updatedAt" FROM wallets WHERE user_id = $1',
    [userId]
  );

  let transactions = [];
  if (walletResult.rows[0]) {
    const txResult = await pool.query(
      'SELECT id, from_wallet_id AS "fromWalletId", to_wallet_id AS "toWalletId", amount, tx_type AS "txType", status, created_at AS "createdAt" FROM transactions WHERE from_wallet_id = $1 OR to_wallet_id = $1 ORDER BY created_at DESC LIMIT 5',
      [walletResult.rows[0].id]
    );
    transactions = txResult.rows.map(tx => ({
      id: parseInt(tx.id, 10),
      fromWalletId: tx.fromWalletId ? parseInt(tx.fromWalletId, 10) : null,
      toWalletId: tx.toWalletId ? parseInt(tx.toWalletId, 10) : null,
      amount: parseFloat(tx.amount),
      txType: tx.txType,
      status: tx.status,
      createdAt: tx.createdAt,
    }));
  }

  return {
    id: parseInt(user.id, 10),
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    wallet: walletResult.rows[0] ? {
      id: parseInt(walletResult.rows[0].id, 10),
      userId: parseInt(walletResult.rows[0].userId, 10),
      currency: walletResult.rows[0].currency,
      balance: parseFloat(walletResult.rows[0].balance),
      version: parseInt(walletResult.rows[0].version, 10),
      updatedAt: walletResult.rows[0].updatedAt,
    } : null,
    recentTransactions: transactions,
  };
}

async function disableUser(userId) {
  const check = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  if (check.rows.length === 0) {
    throw new AppError(404, 'User not found: ' + userId);
  }
  await pool.query("UPDATE users SET role = 'ROLE_DISABLED' WHERE id = $1", [userId]);
}

async function enableUser(userId) {
  const check = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  if (check.rows.length === 0) {
    throw new AppError(404, 'User not found: ' + userId);
  }
  await pool.query("UPDATE users SET role = 'ROLE_USER' WHERE id = $1", [userId]);
}

async function listTransactions(username, fromDate, toDate, page, size) {
  const clampedSize = Math.min(100, Math.max(1, size || 20));
  const offset = (Math.max(1, page || 1) - 1) * clampedSize;

  let conditions = [];
  let params = [];
  let paramIndex = 1;

  if (username) {
    conditions.push('(fu.username ILIKE $' + paramIndex + ' OR tu.username ILIKE $' + paramIndex + ')');
    params.push('%' + username + '%');
    paramIndex++;
  }

  if (fromDate) {
    conditions.push('t.created_at >= $' + paramIndex);
    params.push(fromDate);
    paramIndex++;
  }

  if (toDate) {
    conditions.push("t.created_at < $" + paramIndex + "::date + INTERVAL '1 day'");
    params.push(toDate);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await pool.query(
    'SELECT COUNT(*)::int AS total FROM transactions t LEFT JOIN wallets fw ON t.from_wallet_id = fw.id LEFT JOIN users fu ON fw.user_id = fu.id LEFT JOIN wallets tw ON t.to_wallet_id = tw.id LEFT JOIN users tu ON tw.user_id = tu.id ' + whereClause,
    params
  );

  const result = await pool.query(
    'SELECT t.id, t.from_wallet_id AS "fromWalletId", t.to_wallet_id AS "toWalletId", t.amount, t.tx_type AS "txType", t.status, t.created_at AS "createdAt", fu.username AS "fromUsername", tu.username AS "toUsername" FROM transactions t LEFT JOIN wallets fw ON t.from_wallet_id = fw.id LEFT JOIN users fu ON fw.user_id = fu.id LEFT JOIN wallets tw ON t.to_wallet_id = tw.id LEFT JOIN users tu ON tw.user_id = tu.id ' + whereClause + ' ORDER BY t.created_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1),
    [...params, clampedSize, offset]
  );

  return {
    data: result.rows.map(tx => ({
      id: parseInt(tx.id, 10),
      fromWalletId: tx.fromWalletId ? parseInt(tx.fromWalletId, 10) : null,
      toWalletId: tx.toWalletId ? parseInt(tx.toWalletId, 10) : null,
      fromUsername: tx.fromUsername || null,
      toUsername: tx.toUsername || null,
      amount: parseFloat(tx.amount),
      txType: tx.txType,
      status: tx.status,
      createdAt: tx.createdAt,
    })),
    total: countResult.rows[0].total,
    page: Math.max(1, page || 1),
    size: clampedSize,
  };
}

async function getTransactionStats(fromDate, toDate) {
  let conditions = [];
  let params = [];

  if (fromDate) {
    conditions.push('created_at >= $' + (params.length + 1));
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push("created_at < $" + (params.length + 1) + "::date + INTERVAL '1 day'");
    params.push(toDate);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const summaryResult = await pool.query(
    'SELECT COUNT(*)::bigint AS total, COALESCE(SUM(amount), 0) AS amount FROM transactions ' + whereClause,
    params
  );

  const detailResult = await pool.query(
    'SELECT DATE(created_at) as date, COUNT(*)::bigint as count, COALESCE(SUM(amount), 0) as amount FROM transactions ' + whereClause + ' GROUP BY DATE(created_at) ORDER BY date',
    params
  );

  return {
    totalTransactions: parseInt(summaryResult.rows[0].total, 10),
    totalAmount: parseFloat(summaryResult.rows[0].amount),
    dailyVolume: detailResult.rows.map(d => ({
      date: d.date,
      count: parseInt(d.count, 10),
      amount: parseFloat(d.amount),
    })),
  };
}

module.exports = { listUsers, getUserDetail, disableUser, enableUser, listTransactions, getTransactionStats };
```

**為什麼這樣寫：**

- **動態 SQL 建構** — `listTransactions` 和 `getTransactionStats` 使用字串拼接建立 WHERE 子句。這比用 ORM query builder 更透明，但需注意 SQL injection（此處參數使用 `$1, $2...` 參數化，字串拼接僅針對條件結構，而非使用者輸入直接串入）。
- **手動管理 `paramIndex`** — 因為條件是動態的，必須追蹤每個 `$N` placeholder 對應的正確索引。`listTransactions` 用 `paramIndex` 逐步遞增；`getTransactionStats` 用 `params.length + 1` 動態推算，兩種寫法展示不同慣例。
- `listTransactions` 使用 **4 個 LEFT JOIN**（transactions → from wallets → from users、transactions → to wallets → to users），讓 transaction 帶著 `fromUsername` / `toUsername` 回傳。SQL 直接寫 JOIN 比 ORM 的 eager loading 更可控。
- `getTransactionStats` 將 `created_at` 轉為 `DATE`（截斷時間部分）以進行每日彙總（`GROUP BY DATE(created_at)`）。回傳 `totalTransactions`、`totalAmount`、`dailyVolume[]`。
- `size` 上限設為 100 — 防止單一請求拉取過多資料拖垮 DB。`clampedSize = Math.min(100, Math.max(1, size))`。
- `disableUser` / `enableUser` 先做 existence check 再 UPDATE — 這造成兩次 round-trip，但 README 中 404 vs 200 的語意更清晰。在更高並發場景，可改用 `UPDATE ... RETURNING id` 並檢查回傳列數。

---

### 模式 10：資料庫連線池

#### `src/config/db.js`

```js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  database: process.env.DB_DATABASE || 'digital_wallet',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'root',
  max: 10,
  idleTimeoutMillis: 30000,
});

module.exports = pool;
```

**為什麼這樣寫：**
- 使用 `pg.Pool` 而非 `pg.Client` — Pool 管理多條連線，自動分配與回收。`max: 10` 表示最多同時 10 條連線；`idleTimeoutMillis: 30000` 表示閒置 30 秒後關閉連線，釋放 PostgreSQL 伺服器資源。
- 所有連線參數都有環境變數 fallback 值 — 方便 local 開發（不需設任何 `.env` 變數即可啟動，只要 PostgreSQL 在 localhost:5433 且有 `digital_wallet` database）。
- `module.exports = pool` — 匯出單例。Node.js 的 `require` 快取確保整個 process 只有一個 pool 實例，所有 service 共用。
- `parseInt` 用於 `DB_PORT` — `process.env` 的所有值都是字串，`Pool` constructor 的 `port` 需要數字。

---

## 資料庫表結構

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

> `NUMERIC(18,4)` 精確保 18 位有效數字、小數點後 4 位。絕對不可用 `FLOAT` 或 `DOUBLE` 存金額 — 浮點數會產生精度誤差（例如 `0.1 + 0.2 !== 0.3`）。`pg` 驅動程式會將 `NUMERIC` 回傳為 JavaScript string（避免 IEEE 754 精度損失），service 層需 `parseFloat` 轉型。

---

## 數據流圖

### 1. 註冊流程

```
  Client                     Express Router                  authService                  PostgreSQL
    |                             |                               |                           |
    |  POST /api/auth/register    |                               |                           |
    |  {username, password}       |                               |                           |
    |---------------------------->|                               |                           |
    |                             |  registerRules → validate     |                           |
    |                             |  → register(username, pass)   |                           |
    |                             |------------------------------>|                           |
    |                             |                               |  pool.connect()           |
    |                             |                               |-------------------------->|
    |                             |                               |  BEGIN                    |
    |                             |                               |-------------------------->|
    |                             |                               |  bcrypt.hash(pass, 12)    |
    |                             |                               |  INSERT INTO users        |
    |                             |                               |  (UNIQUE constraint       |
    |                             |                               |   防重複 username，       |
    |                             |                               |   error code 23505        |
    |                             |                               |   → AppError 409)         |
    |                             |                               |-------------------------->|
    |                             |                               |  INSERT INTO wallets      |
    |                             |                               |  (user_id, USDT, 0, 0)    |
    |                             |                               |-------------------------->|
    |                             |                               |  COMMIT / ROLLBACK        |
    |                             |                               |  client.release()         |
    |                             |                               |-------------------------->|
    |                             |                               |                           |
    |  201 {status:"SUCCESS"}     |                               |                           |
    |<----------------------------|                               |                           |
```

### 2. 登入流程

```
  Client                     Express Router                  authService                  PostgreSQL
    |                             |                               |                           |
    |  POST /api/auth/login       |                               |                           |
    |  {username, password}       |                               |                           |
    |---------------------------->|                               |                           |
    |                             |  loginRules → validate        |                           |
    |                             |  → login(username, pass)      |                           |
    |                             |------------------------------>|                           |
    |                             |                               |  SELECT * FROM users      |
    |                             |                               |  WHERE username = $1      |
    |                             |                               |-------------------------->|
    |                             |                               |  user row (or undefined)  |
    |                             |                               |<--------------------------|
    |                             |                               |                           |
    |                             |                               |  bcrypt.compare()         |
    |                             |                               |  (hash vs plaintext)      |
    |                             |                               |                           |
    |                             |                               |  檢查 role ===            |
    |                             |                               |  ROLE_DISABLED            |
    |                             |                               |  (若停用 → 401)           |
    |                             |                               |                           |
    |                             |                               |  generateToken(           |
    |                             |                               |    userId, username, role)|
    |                             |                               |  → jwt.sign(HS256)        |
    |                             |                               |                           |
    |  200 {token, user}          |                               |                           |
    |<----------------------------|                               |                           |
```

### 3. JWT 攔截流程（auth middleware）

```
  Client                     auth middleware                 verifyToken / extractUserId
    |                             |                                    |
    |  Authorization:             |                                    |
    |  Bearer <token>             |                                    |
    |---------------------------->|                                    |
    |                             |  header.startsWith('Bearer ') ?    |
    |                             |  No → AppError 401                 |
    |                             |                                    |
    |                             |  token = header.substring(7)       |
    |                             |  extractUserId(token)              |
    |                             |----------------------------------->|
    |                             |          jwt.verify(token, SECRET, |
    |                             |            {algorithms:['HS256']}) |
    |                             |          → payload.sub             |
    |                             |          → parseInt(sub)           |
    |                             |<-----------------------------------|
    |                             |  req.userId = <id>                 |
    |                             |  verifyToken(token) again          |
    |                             |  req.userRole = payload.role       |
    |                             |  next()                            |
    |                             |                                    |
    |  (proceeds to route handler)|                                    |
```

### 4. 查詢錢包

```
  Client          auth middleware      wallet route       walletService          PostgreSQL
    |                    |                   |                   |                     |
    |  GET /api/wallets  |                   |                   |                     |
    |  Authorization:    |                   |                   |                     |
    |  Bearer <token>    |                   |                   |                     |
    |------------------->|                   |                   |                     |
    |                    | req.userId = 5    |                   |                     |
    |                    |------------------>|                   |                     |
    |                    |                   | getByUserId(5)    |                     |
    |                    |                   |------------------>|                     |
    |                    |                   |                   | SELECT * FROM       |
    |                    |                   |                   | wallets WHERE       |
    |                    |                   |                   | user_id = $1        |
    |                    |                   |                   |-------------------->|
    |                    |                   |                   | wallet row          |
    |                    |                   |                   |<--------------------|
    |                    |                   |                   | parse int/float     |
    |                    |                   | wallet JSON       |                     |
    |                    |                   |<------------------|                     |
    |  200 {...wallet}   |                   |                   |                     |
    |<-------------------|                   |                   |                     |
```

### 5. 轉帳流程（含樂觀鎖 `rowCount === 0`）

```
  Client       auth    validator    transactionService              PostgreSQL
    |            |         |              |                              |
    | POST       |         |              |                              |
    | /api/trans-|         |              |                              |
    | actions/   |         |              |                              |
    | transfer   |         |              |                              |
    |------------>|         |              |                              |
    |            | JWT驗證  |              |                              |
    |            | req.user-|              |                              |
    |            | Id = 5   |              |                              |
    |            |--------->|              |                              |
    |            |          | transferRules|                              |
    |            |          | → validate   |                              |
    |            |          |------------->|                              |
    |            |          |              | pool.connect()               |
    |            |          |              |----------------------------->|
    |            |          |              | BEGIN                        |
    |            |          |              |----------------------------->|
    |            |          |              |                              |
    |            |          |              | SELECT id FROM users         |
    |            |          |              | WHERE username = $1          |
    |            |          |              | (收件者存在？否 → 404)       |
    |            |          |              |----------------------------->|
    |            |          |              |                              |
    |            |          |              | fromUserId === toUserId？    |
    |            |          |              | 是 → 400                     |
    |            |          |              |                              |
    |            |          |              | SELECT id, balance, version  |
    |            |          |              | FROM wallets WHERE user_id   |
    |            |          |              | = fromUserId (5)             |
    |            |          |              | → version = 3, balance = 100|
    |            |          |              |----------------------------->|
    |            |          |              |                              |
    |            |          |              | SELECT id, balance, version  |
    |            |          |              | FROM wallets WHERE user_id   |
    |            |          |              | = toUserId                   |
    |            |          |              |----------------------------->|
    |            |          |              |                              |
    |            |          |              | balance < amount？           |
    |            |          |              | 是 → 400                     |
    |            |          |              |                              |
    |            |          |              | UPDATE wallets               |
    |            |          |              | SET balance = balance - 50,  |
    |            |          |              |     version = version + 1    |
    |            |          |              | WHERE user_id = 5            |
    |            |          |              |   AND version = 3            |  ← ★ 樂觀鎖
    |            |          |              |----------------------------->|
    |            |          |              |                              |
    |            |          |              | rowCount === 0？             |
    |            |          |              | YES → AppError 409           |  ← ★ 並發衝突！
    |            |          |              | "Concurrent modification     |
    |            |          |              |  detected" → ROLLBACK        |
    |            |          |              |                              |
    |            |          |              | UPDATE wallets               |
    |            |          |              | SET balance = balance + 50,  |
    |            |          |              |     version = version + 1    |
    |            |          |              | WHERE user_id = toUserId     |
    |            |          |              |----------------------------->|
    |            |          |              |                              |
    |            |          |              | INSERT INTO transactions     |
    |            |          |              | (from, to, amount,           |
    |            |          |              |  tx_type, status)            |
    |            |          |              |----------------------------->|
    |            |          |              |                              |
    |            |          |              | COMMIT                       |
    |            |          |              | client.release()             |
    |            |          |              |----------------------------->|
    |            |          |              |                              |
    |  200 {status:"SUCCESS"}  |              |                              |
    |<-----------|          |              |                              |
```

### 6. 交易歷史

```
  Client       auth       transaction route   transactionService         PostgreSQL
    |            |               |                      |                     |
    | GET        |               |                      |                     |
    | /api/trans-|               |                      |                     |
    | actions    |               |                      |                     |
    |----------->|               |                      |                     |
    |            | req.userId=5  |                      |                     |
    |            |-------------->|                      |                     |
    |            |               | getHistory(5)        |                     |
    |            |               |--------------------->|                     |
    |            |               |                      | SELECT id FROM      |
    |            |               |                      | wallets WHERE       |
    |            |               |                      | user_id = 5 → id=3  |
    |            |               |                      |-------------------->|
    |            |               |                      |                     |
    |            |               |                      | SELECT * FROM       |
    |            |               |                      | transactions WHERE  |
    |            |               |                      | from_wallet_id = 3  |
    |            |               |                      | OR to_wallet_id = 3 |
    |            |               |                      | ORDER BY created_at |
    |            |               |                      | DESC                |
    |            |               |                      |-------------------->|
    |            |               |                      | tx rows[]           |
    |            |               |                      |<--------------------|
    |            |               |                      | map → camelCase     |
    |            |               | 200 [...]            |                     |
    |            |<--------------|                      |                     |
    |<-----------|               |                      |                     |
```

### 7. Admin 用戶管理

```
  Client     auth middleware  admin middleware      admin route       adminService        PostgreSQL
    |              |                |                    |                  |                   |
    | GET          |                |                    |                  |                   |
    | /api/admin/  |                |                    |                  |                   |
    | users?search=|                |                    |                  |                   |
    | john&page=1  |                |                    |                  |                   |
    |------------->|                |                    |                  |                   |
    |              | JWT驗證         |                    |                  |                   |
    |              | req.userId...  |                    |                  |                   |
    |              | req.userRole   |                    |                  |                   |
    |              |--------------->|                    |                  |                   |
    |              |                | req.userRole ===   |                  |                   |
    |              |                | 'ROLE_ADMIN'?      |                  |                   |
    |              |                | NO → 403           |                  |                   |
    |              |                | YES → next()       |                  |                   |
    |              |                |------------------->|                  |                   |
    |              |                |                    | listUsers(        |                   |
    |              |                |                    |   'john', 1, 20)  |                   |
    |              |                |                    |----------------->|                   |
    |              |                |                    |                  | SELECT COUNT(*)   |
    |              |                |                    |                  | FROM users WHERE  |
    |              |                |                    |                  | username ILIKE    |
    |              |                |                    |                  | '%john%'          |
    |              |                |                    |                  |------------------>|
    |              |                |                    |                  |                   |
    |              |                |                    |                  | SELECT id,...     |
    |              |                |                    |                  | FROM users WHERE  |
    |              |                |                    |                  | username ILIKE    |
    |              |                |                    |                  | '%john%'          |
    |              |                |                    |                  | LIMIT 20 OFFSET 0 |
    |              |                |                    |                  |------------------>|
    |              |                |                    |                  |                   |
    |              |                |                    | {data:[...],      |                   |
    |              |                |                    |  total,page,size} |                   |
    |              |                |                    |<-----------------|                   |
    |  200 {data, total, page, size}|                    |                  |                   |
    |<-------------|                |                    |                  |                   |
```

### 8. Admin 交易監控（含 JOIN）

```
  Client      auth+admin    admin route        adminService                   PostgreSQL
    |              |              |                  |                              |
    | GET /api/   |              |                  |                              |
    | admin/      |              |                  |                              |
    | transactions|              |                  |                              |
    | ?username=  |              |                  |                              |
    | alice&from= |              |                  |                              |
    | 2025-01-01  |              |                  |                              |
    | &to=2025-06 |              |                  |                              |
    | ----------->|              |                  |                              |
    |              | JWT+ADMIN   |                  |                              |
    |              |------------>|                  |                              |
    |              |              | listTransactions(|                              |
    |              |              | 'alice',         |                              |
    |              |              | '2025-01-01',    |                              |
    |              |              | '2025-06-01',    |                              |
    |              |              | 1, 20)           |                              |
    |              |              |----------------->|                              |
    |              |              |                  | SELECT COUNT(*)...           |
    |              |              |                  | FROM transactions t          |
    |              |              |                  | LEFT JOIN wallets fw         |
    |              |              |                  |   ON t.from_wallet_id=fw.id  |
    |              |              |                  | LEFT JOIN users fu           |
    |              |              |                  |   ON fw.user_id=fu.id        |
    |              |              |                  | LEFT JOIN wallets tw         |
    |              |              |                  |   ON t.to_wallet_id=tw.id    |
    |              |              |                  | LEFT JOIN users tu           |
    |              |              |                  |   ON tw.user_id=tu.id        |
    |              |              |                  | WHERE                        |
    |              |              |                  |  (fu.username ILIKE          |
    |              |              |                  |   '%alice%' OR               |
    |              |              |                  |   tu.username ILIKE          |
    |              |              |                  |   '%alice%')                 |
    |              |              |                  |  AND t.created_at >=         |
    |              |              |                  |   '2025-01-01'               |
    |              |              |                  |  AND t.created_at <          |
    |              |              |                  |   '2025-06-02'               |
    |              |              |                  | ORDER BY t.created_at DESC   |
    |              |              |                  | LIMIT 20 OFFSET 0            |
    |              |              |                  |----------------------------->|
    |              |              |                  |                              |
    |              |              |                  | {data:[{...fromUsername,     |
    |              |              |                  |   ...toUsername}],           |
    |              |              |                  |  total, page, size}          |
    |              |              |                  |<-----------------------------|
    |              |              | 200 {...}        |                              |
    |<-------------|              |                  |                              |
```

---

## 啟動方式

### 前置條件

- Node.js 18+（建議 LTS）
- PostgreSQL 執行在 `localhost:5433`，database `digital_wallet` 已建立，table 已初始化（執行 `digital_wallet/src/main/resources/static/db.sql`）
- npm 9+

### 啟動步驟

```bash
cd digital_wallet_nodejs
npm install
npm start
```

伺服器預設監聽 port `3000`（可透過 `PORT` 環境變數修改）。

### 環境變數（`.env`）

```env
DB_HOST=localhost
DB_PORT=5433
DB_DATABASE=digital_wallet
DB_USER=postgres
DB_PASSWORD=root
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRATION=86400000
PORT=3000
```

> `JWT_EXPIRATION` 單位為毫秒，預設 86400000（24 小時）。`JWT_SECRET` **必須在部署環境中變更**，不可使用預設值或弱金鑰。

---

## 設計決策問答

### Q1: 為什麼選 Express 而不是 Fastify、Koa、NestJS？

A: Express 是 Node.js 生態中最成熟、社群最大的 HTTP framework。對於一個 demo/教學專案，Express 的 middleware pipeline 模型（`(req, res, next)`）最直覺、文件最多、新人學習成本最低。Fastify 更快但 plugin 生態與 middleware 慣例不同；Koa 的 async/await 設計雖然現代，但 middleware 生態不如 Express 豐富；NestJS 引入 decorator、dependency injection、module system，對比 Spring Boot 才有意義，但本專案的目標是展示「薄框架 + raw SQL」的 Node.js 慣用寫法，NestJS 過重。

### Q2: 為什麼用 raw SQL（pg）而不是 ORM（Sequelize / Prisma / Knex）？

A: 兩個理由。第一，**教學目的** — 這個 repo 有 6 個後端，用戶需要對比各語言的 SQL 寫法。raw SQL 讓讀者清楚看到每一條 query 的結構，沒有 ORM 的魔法（auto-migration、eager/lazy loading、hydration）。第二，**控制力** — 樂觀鎖的 `WHERE version = $3`、transaction 中手動 `BEGIN/COMMIT/ROLLBACK`、`RETURNING` 子句，這些在 ORM 中通常需要查文件才知道如何繞過抽象層。raw SQL 直接展示 PostgreSQL 的核心能力。

### Q3: 為什麼用 `pg.Pool` 而不是單一 `Client`？

A: Node.js 是 single-threaded event loop，但 PostgreSQL 連線是 blocking resource。若使用單一 `Client`，所有請求共用一條連線，當前一請求正在等待 DB 回應時，下一個請求無法發送 SQL（pg 的 protocol 在同一連線上不支援 multiplexing）。`Pool` 提供連線池（max: 10），每個請求 `pool.connect()` 取得專屬連線，用完 `release()` 歸還，實現 concurrency。對於 transaction 場景，`pool.connect()` 確保同一 tx 內的所有 query 在同一條連線上執行 — 這是 `pool.query()` 做不到的。

### Q4: 為什麼選 express-validator 而不是 Zod 或 Joi？

A: express-validator 是 Express 生態的原生選擇 — 它直接產出 validation chain middleware，能無縫嵌入 `router.post('/transfer', auth, transferRules, validate, handler)` 的 middleware 鏈。Zod 和 Joi 是通用 schema 驗證庫，需要手動在 route handler 內呼叫 `schema.parse()`，多一層包裝。對於只有 2 組驗證規則的輕量專案，express-validator 足夠且慣用。

### Q5: 為什麼全用 `async/await` 而不是 callback 或 Promise chain？

A: Node.js 從 v8 起完整支援 async/await，Express 5 原生支援 async route handler（自動 catch rejected promise 並傳給 `next(err)`）。async/await 讓 transaction 邏輯（`BEGIN → query → query → COMMIT → catch ROLLBACK`）讀起來像同步程式碼，大幅降低 callback hell 風險。Promise chain (`.then().catch()`) 在需要條件分支的業務邏輯中可讀性較差。

---

## 安全紅線

| 項目 | 狀態 | 實作方式 |
|------|------|----------|
| 密碼雜湊 | ✅ | bcrypt，salt rounds = 12，`bcrypt.hash(password, 12)` |
| 密碼明碼儲存 | ❌ | 絕對不會。`password_hash` 欄位只存 hash。 |
| JWT 演算法白名單 | ✅ | `{ algorithms: ['HS256'] }` 顯式指定 |
| JWT secret 從環境變數 | ✅ | `process.env.JWT_SECRET`，無 hardcode fallback |
| SQL injection | ✅ | 所有 SQL 使用參數化查詢（`$1`, `$2`...），從不拼接使用者輸入 |
| IDOR 防禦（錢包） | ✅ | `userId` 提取自 JWT (`req.userId`)，不從 URL 參數或 body 取得 |
| IDOR 防禦（轉帳） | ✅ | `fromUserId` 來自 JWT，`toUsername` 由 body 指定但需登入方能查詢 |
| 樂觀鎖 | ✅ | `UPDATE ... WHERE version = $3`，`rowCount === 0` 偵測並發衝突 |
| 錯誤訊息不洩漏內部狀態 | ✅ | 401 不分「無 token / token 無效 / 帳號停用」；500 不回傳 stack trace |
| Admin 權限控制 | ✅ | auth + admin 雙 middleware，`req.userRole !== 'ROLE_ADMIN'` → 403 |
| CORS | ✅ | `cors()` 全部啟用（demo 用途；生產環境需限定 origin） |
| 停用用戶無法登入 | ✅ | login 時檢查 `user.role === 'ROLE_DISABLED'` |
| 連線池耗盡防護 | ✅ | `finally { client.release() }` 確保連線歸還；`max: 10` 有上限 |

---

## 常見錯誤

### 1. `pool.query()` 包 transaction → 資料不一致

```js
// ✗ 錯誤：兩個 query 在不同連線，無法 rollback
await pool.query('INSERT INTO users ...');
await pool.query('INSERT INTO wallets ...');
// 若第二個 INSERT 失敗，user 已經寫入無法撤回

// ✓ 正確：用 client 包裹 transaction
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO users ...');
  await client.query('INSERT INTO wallets ...');
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
} finally {
  client.release();
}
```

### 2. `client.release()` 沒放在 `finally` → 連線洩漏

```js
// ✗ 錯誤：若中間拋錯，release() 不會被呼叫
const client = await pool.connect();
await client.query('BEGIN');
// ... 如果這裡拋錯 ...
await client.query('COMMIT');
client.release();  // 永遠不會執行！連線數慢慢耗盡

// ✓ 正確：finally 保證歸還
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // ...
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();  // 一定會執行
}
```

### 3. `NUMERIC` / `BIGINT` 隱式當數字用 → `typeof` 意外

```js
// ✗ 錯誤：pg 回傳的 NUMERIC 和 BIGINT 可能是 string
const balance = wallet.balance;     // "100.0000" (string!)
const doubleBalance = balance * 2;  // 200 (JS 會隱式轉型，但這不可靠)
const id = wallet.id;               // "5" (BIGSERIAL → string when > 2^53-1)

// ✓ 正確：顯式轉型
const balance = parseFloat(wallet.balance);
const id = parseInt(wallet.id, 10);
```

### 4. JWT `expiresIn` 單位搞混

```js
// ✗ 錯誤：jwt.sign 的 expiresIn 接受秒，傳入毫秒會變成天文數字
jwt.sign(payload, secret, { expiresIn: 86400000 });  // 86400000 秒 = 1000 天！

// ✓ 正確：轉為秒
const EXPIRATION_MS = parseInt(process.env.JWT_EXPIRATION || '86400000', 10);
jwt.sign(payload, secret, { expiresIn: EXPIRATION_MS / 1000 });  // 86400 秒 = 24 小時
```

### 5. `bcrypt.hash` rounds 過低或過高

```js
// ✗ 太弱：rounds = 4，攻擊者秒破
await bcrypt.hash(password, 4);

// ✗ 太慢：rounds = 15，每次 hash 超過 1 秒，DDoS 風險
await bcrypt.hash(password, 15);

// ✓ 適中：rounds = 10~12，100-300ms per hash，合理的安全/效能平衡
await bcrypt.hash(password, 12);
```

### 6. Express 5 async handler 未處理 rejected promise

```js
// ✗ 風險：Express 5 會自動 catch rejected promise 並傳給 next(err)，
//    但 Express 4 不會！若降版或被誤判為 Express 4，未 catch 的 reject 會
//    變成 unhandled promise rejection，Node.js 可能 crash

// ✓ 安全：顯式 try/catch + next(err)，無論 Express 版本都能正確處理
router.get('/', async (req, res, next) => {
  try {
    const data = await service.getData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});
```

### 7. 動態 SQL 字串拼接使用者輸入（SQL injection）

```js
// ✗ 危險：直接拼接使用者輸入到 SQL 字串
await pool.query(`SELECT * FROM users WHERE username = '${username}'`);
// username = "alice' OR '1'='1" → WHERE username = 'alice' OR '1'='1'

// ✓ 正確：使用參數化查詢（parameterized query）
await pool.query('SELECT * FROM users WHERE username = $1', [username]);
// pg 會將 username 安全轉義，不可能被注入
```
