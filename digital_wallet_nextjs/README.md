# Digital Wallet — Next.js 16 全端版 (Demo)

> 技術驗證／參考實作：用 Next.js 16 App Router + Prisma 7 實現全端數位錢包。API 合約與其他六個後端完全一致，同時內建前端頁面。

---

## 技術清單

| 類別 | 技術 | 版本 | 用途 |
|------|------|------|------|
| 語言 | TypeScript 5 | ^5 | 型別安全的全端語言 |
| 框架 | Next.js 16 (App Router) | 16.2.7 | Server Components、Route Handlers、middleware、streaming |
| ORM | Prisma 7 + @prisma/adapter-pg | ^7.8.0 | 型別安全 ORM，PrismaPg 直接連線 PostgreSQL |
| JWT | jose | ^6.2.3 | HS256 token 簽發與驗證（Web Crypto API 原生實作，零依賴） |
| 密碼雜湊 | bcrypt | ^6.0.0 | 密碼單向雜湊儲存與比對（BCrypt 12 rounds） |
| 資料庫驅動 | pg | ^8.21.0 | PostgreSQL 原生連線（PrismaPg adapter 底層） |
| 前端框架 | React 19 | 19.2.4 | Server Components + Client Components 分離渲染 |
| CSS | Tailwind CSS 4 | ^4 | utility-first CSS，@theme 自訂 navy/emerald 色系 |
| 驗證 | Zod 4 | ^4.4.3 | 型別安全驗證庫 |
| 測試 | Vitest | ^4.1.8 | 單元測試 |
| React Compiler | babel-plugin-react-compiler | 1.0.0 | React 19 自動記憶化 |

---

## 專案結構

```
digital_wallet_nextjs/
├── prisma/
│   └── schema.prisma                      # Prisma schema：3 個 model（User、Wallet、Transaction），@@map 對應既有資料表
├── prisma.config.ts                       # Prisma 7 設定檔：schema 路徑、migration 路徑、DATABASE_URL
├── src/
│   ├── middleware.ts                       # Next.js middleware：cookie guard（頁面路由）+ Bearer token guard（API 路由）+ admin 角色檢查
│   ├── lib/
│   │   ├── db.ts                           # Prisma Client 實例：PrismaPg adapter 直連 PostgreSQL，dev 環境 global cache 防 hot reload 重複建立
│   │   ├── auth.ts                         # JWT 工具：jose SignJWT／jwtVerify + bcrypt hashPassword／comparePassword
│   │   └── __tests__/
│   │       └── auth.test.ts               # Vitest 單元測試：signToken、verifyToken、hashPassword、comparePassword
│   ├── app/
│   │   ├── globals.css                     # Tailwind CSS 4 @import + @theme 自訂色系 + 全域 scrollbar 樣式
│   │   ├── layout.tsx                      # 根佈局：<html> + <body>，嵌入 metadata、字型、flex 容器
│   │   ├── page.tsx                        # 根路由：redirect('/dashboard')
│   │   ├── (auth)/                         # Route Group：公開認證頁面（無 sidebar）
│   │   │   ├── layout.tsx                  # Auth layout：置中卡片佈局，bg-navy-800 全屏
│   │   │   ├── login/
│   │   │   │   └── page.tsx                # 登入頁：Client Component，fetch /api/auth/login，cookie 儲存 token
│   │   │   └── register/
│   │   │       └── page.tsx                # 註冊頁：Client Component，fetch /api/auth/register，成功後跳轉登入
│   │   ├── (dashboard)/                    # Route Group：已認證使用者頁面（含 sidebar）
│   │   │   ├── layout.tsx                  # Dashboard layout：Server Component，cookie 驗證 JWT + DB 查詢使用者資訊 → Sidebar
│   │   │   └── dashboard/
│   │   │       ├── page.tsx                # Dashboard 首頁：Server Component，直接 Prisma 查詢錢包餘額 + 最近 5 筆交易
│   │   │       ├── transfer/
│   │   │       │   └── page.tsx            # 轉帳頁：Client Component，表單 + 確認 Modal + fetch POST /api/transactions/transfer
│   │   │       └── history/
│   │   │           ├── page.tsx            # 交易歷史頁：Server Component，Prisma 查詢所有交易 → 傳給 Client Component
│   │   │           └── TransactionList.tsx # 交易列表：Client Component，篩選器（All/Sent/Received）+ 表格 + useMemo
│   │   ├── (admin)/                        # Route Group：管理員頁面（含 sidebar + admin 角色檢查）
│   │   │   ├── layout.tsx                  # Admin layout：Server Component，cookie 驗證 + role 檢查 ROLE_ADMIN → Sidebar
│   │   │   └── admin/
│   │   │       ├── users/
│   │   │       │   ├── page.tsx            # 使用者管理頁：Server Component，Prisma 查詢使用者列表（分頁+搜尋）→ UserTable
│   │   │       │   └── UserTable.tsx       # 使用者表格：Client Component，搜尋框 + 表格 + 明細 Modal + Enable/Disable 動作
│   │   │       └── transactions/
│   │   │           ├── page.tsx            # 交易監控頁：Server Component，Prisma 查詢交易列表 + aggregate + groupBy → 統計 + 表格
│   │   │           ├── TransactionTable.tsx # 交易表格：Client Component，username/日期篩選 + 分頁表格
│   │   │           └── TransactionStats.tsx # 交易統計：Client Component，卡片 + 長條圖（daily volume count + amount）
│   │   └── api/                            # 11 個 Route Handler（Next.js API routes）
│   │       ├── auth/
│   │       │   ├── register/
│   │       │   │   └── route.ts            # POST /api/auth/register — 註冊 + Prisma.$transaction atomic user+wallet 建立
│   │       │   └── login/
│   │       │       └── route.ts            # POST /api/auth/login — 登入：BCrypt 驗證 + ROLE_DISABLED 檢查 + jose JWT 簽發
│   │       ├── wallets/
│   │       │   └── route.ts                # GET /api/wallets — 查詢錢包：Bearer token 驗證 → findUnique(userId)
│   │       ├── transactions/
│   │       │   ├── route.ts                # GET /api/transactions — 交易歷史：Bearer token 驗證 → findMany(OR from/to)
│   │       │   └── transfer/
│   │       │       └── route.ts            # POST /api/transactions/transfer — 轉帳：樂觀鎖 updateMany + $transaction
│   │       └── admin/
│   │           ├── users/
│   │           │   ├── route.ts            # GET /api/admin/users — 使用者列表：role 檢查 + 搜尋 + 分頁
│   │           │   └── [id]/
│   │           │       ├── route.ts        # GET /api/admin/users/{id} — 使用者明細：錢包 + 最近 5 筆交易
│   │           │       ├── disable/
│   │           │       │   └── route.ts    # PUT /api/admin/users/{id}/disable — 停用使用者（role → ROLE_DISABLED）
│   │           │       └── enable/
│   │           │           └── route.ts    # PUT /api/admin/users/{id}/enable — 啟用使用者（role → ROLE_USER）
│   │           └── transactions/
│   │               ├── route.ts            # GET /api/admin/transactions — 交易列表：username/日期篩選 + 分頁
│   │               └── stats/
│   │                   └── route.ts        # GET /api/admin/transactions/stats — 交易統計：aggregate + groupBy
│   ├── components/
│   │   ├── layout/
│   │   │   └── Sidebar.tsx                 # 側邊欄：Client Component，導航連結 + admin 區塊 + 使用者資訊 + 登出
│   │   └── ui/                             # 7 個共用的 UI 元件
│   │       ├── Button.tsx                  # 按鈕：4 種 variant（primary/secondary/danger/ghost）+ loading spinner
│   │       ├── Input.tsx                   # 輸入框：forwardRef + label + error message
│   │       ├── Card.tsx                    # 卡片容器：4 種 padding + backdrop-blur 邊框
│   │       ├── Modal.tsx                   # 模態對話框：overlay click 關閉 + ESC key + 確認/取消按鈕
│   │       ├── Badge.tsx                   # 狀態標籤：4 種色系（success/warning/info/danger）
│   │       ├── Spinner.tsx                 # 載入旋轉動畫：SVG animate-spin
│   │       └── EmptyState.tsx              # 空狀態提示：icon + title + description
│   └── generated/
│       └── prisma/                         # Prisma 自動生成：client.d.ts、index.js、runtime 等
├── tests/
│   └── api.test.sh                         # API 整合測試：curl 測試 11 個 endpoint + 狀態碼驗證
├── package.json                            # 依賴宣告：Next.js 16 + Prisma 7 + jose + bcrypt + Tailwind CSS 4
├── tsconfig.json                           # TypeScript 設定：strict、bundler module resolution、@/* path alias
├── next.config.ts                          # Next.js 設定：reactCompiler: true
├── .env                                    # 環境變數：DATABASE_URL、JWT_SECRET、JWT_EXPIRATION
└── README.md                               # 本文件
```

---

## API 端點

### 使用者端點（5 個）

| Method | Path | Auth | 說明 |
|--------|------|------|------|
| POST | `/api/auth/register` | 無 | 註冊並自動建立錢包，role 固定為 `ROLE_USER` |
| POST | `/api/auth/login` | 無 | 登入，回傳 JWT token 與使用者資訊 |
| GET | `/api/wallets` | Bearer JWT | 查詢當前登入使用者的錢包 |
| POST | `/api/transactions/transfer` | Bearer JWT | 轉帳給其他使用者（by username） |
| GET | `/api/transactions` | Bearer JWT | 查詢當前使用者的交易歷史 |

### 管理員端點（6 個，需 `ROLE_ADMIN`）

| Method | Path | Auth | 說明 |
|--------|------|------|------|
| GET | `/api/admin/users` | Bearer JWT + Admin | 使用者列表，支援 `?search=&page=1&size=20` |
| GET | `/api/admin/users/{id}` | Bearer JWT + Admin | 使用者詳細資料（含錢包與最近 5 筆交易） |
| PUT | `/api/admin/users/{id}/disable` | Bearer JWT + Admin | 停用使用者（role → `ROLE_DISABLED`） |
| PUT | `/api/admin/users/{id}/enable` | Bearer JWT + Admin | 啟用使用者（role → `ROLE_USER`） |
| GET | `/api/admin/transactions` | Bearer JWT + Admin | 交易列表，支援 `?username=&from=&to=&page=&size=` |
| GET | `/api/admin/transactions/stats` | Bearer JWT + Admin | 交易統計（totalTransactions、totalAmount、dailyVolume） |

**錯誤回應統一格式**：

```json
{"status":"ERROR","message":"錯誤描述訊息"}
```

---

## 核心實作模式

### 模式 1：Prisma Schema (`prisma/schema.prisma`)

Prisma schema 是整個專案的資料層基礎。三個 model 使用 `@@map` 對應到 PostgreSQL 中與其他六個後端共用的既有資料表。

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id           BigInt   @id @default(autoincrement())
  username     String   @unique @db.VarChar(50)
  passwordHash String   @map("password_hash") @db.VarChar(255)
  role         String   @default("ROLE_USER") @db.VarChar(20)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamp(0)
  wallet       Wallet?

  @@map("users")
}

model Wallet {
  id             BigInt        @id @default(autoincrement())
  userId         BigInt        @unique @map("user_id")
  currency       String        @default("USDT") @db.VarChar(10)
  balance        Decimal       @default(0) @db.Decimal(18, 4)
  version        Int           @default(0)
  updatedAt      DateTime      @default(now()) @updatedAt @map("updated_at") @db.Timestamp(0)
  user           User          @relation(fields: [userId], references: [id], onDelete: Cascade, map: "wallets_user_id_foreign")
  sentTx         Transaction[] @relation("FromWallet")
  receivedTx     Transaction[] @relation("ToWallet")

  @@map("wallets")
}

model Transaction {
  id           BigInt   @id @default(autoincrement())
  fromWalletId BigInt?  @map("from_wallet_id")
  toWalletId   BigInt?  @map("to_wallet_id")
  amount       Decimal  @db.Decimal(18, 4)
  txType       String   @map("tx_type") @db.VarChar(20)
  status       String   @default("SUCCESS") @db.VarChar(20)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamp(0)
  fromWallet   Wallet?  @relation("FromWallet", fields: [fromWalletId], references: [id], map: "transactions_from_wallet_id_foreign")
  toWallet     Wallet?  @relation("ToWallet", fields: [toWalletId], references: [id], map: "transactions_to_wallet_id_foreign")

  @@index([fromWalletId])
  @@index([toWalletId])
  @@map("transactions")
}
```

**為什麼這樣寫**：

- **`generator client` 的 `output` 指向 `../src/generated/prisma`**：將 Prisma Client 生成目錄放在 `src/generated/` 下而非預設的 `node_modules/.prisma/`，便於直接 import（`import { PrismaClient } from '../generated/prisma'`），IDE 可跳轉到實際型別定義。
- **`@@map` 映射既有資料表名稱**：PostgreSQL 中表格命名為 `users`、`wallets`、`transactions`（snake_case 複數）。Prisma model 名稱為 PascalCase 單數（`User`、`Wallet`、`Transaction`），`@@map` 負責將兩者對應起來。同理 `@map` 對應個別欄位（`password_hash` → `passwordHash`、`created_at` → `createdAt`）。
- **`@db.Decimal(18, 4)` 精確十進位**：金融系統必須使用定點數，對應 PostgreSQL `NUMERIC(18,4)`。Prisma Client 中 `Decimal` 型別在 JavaScript 中對應為 `Prisma.Decimal`。
- **`@relation` 命名關聯解決歧義**：`Transaction` 與 `Wallet` 之間有兩個關聯——`fromWallet` 和 `toWallet`，都指向 `Wallet`。Prisma 要求顯式命名區分（`"FromWallet"` 和 `"ToWallet"`），`map` 參數指定實際的 foreign key constraint 名稱。
- **`onDelete: Cascade` on Wallet→User**：刪除使用者時自動刪除其錢包。Transaction 的 `Wallet?`（optional）配合資料庫的 `ON DELETE SET NULL` 行為——錢包被刪除時交易記錄保留但 foreign key 設為 NULL。
- **雙欄位索引 `@@index([fromWalletId])` 和 `@@index([toWalletId])`**：加速交易歷史查詢 `WHERE from_wallet_id = ? OR to_wallet_id = ?`，兩個 foreign key 各建一個 B-tree index。

---

### 模式 2：Prisma Client 實例 (`src/lib/db.ts`)

```typescript
import { PrismaClient } from '../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const createPrismaClient = () => new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! })
})

export const prisma = globalForPrisma.prisma || createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**為什麼這樣寫**：

- **Prisma 7 的 `PrismaPg` adapter**：Prisma 7 預設不再使用傳統的 connection pool。`PrismaPg` 是基於 `pg`（`node-postgres`）的原生 adapter，直接管理 PostgreSQL 連線，不需要 `pgbouncer` 或 Prisma Accelerate。這與 Prisma 5/6 的 `@prisma/client` 預設 driver 行為有根本差異。
- **`globalThis` 開發環境 cache**：Next.js 的 Fast Refresh（hot module replacement）在 dev 模式每次修改檔案都會重新執行模組，導致建立新的 `PrismaClient`。透過 `globalThis.prisma` 快取，確保開發過程中只有一個 Prisma Client 實例，避免 `Too many connections` 錯誤。
- **`createPrismaClient()` 工廠函數**：不直接在模組頂層 `new PrismaClient()`，而是包在函數中。這樣生產環境（`NODE_ENV === 'production'`）不會被 `globalThis` cache（讓 Node.js garbage collector 可以回收）。
- **`process.env.DATABASE_URL!` 非空斷言**：TypeScript strict 模式下 `process.env.DATABASE_URL` 的型別是 `string | undefined`。`!` 斷言表示必定存在——若漏設環境變數，運行時會拋出錯誤，而非靜默使用 undefined 連線字串。

---

### 模式 3：JWT 工具 (`src/lib/auth.ts`)

```typescript
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcrypt'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-key-change-in-production')
const expiration = process.env.JWT_EXPIRATION || '86400000' // 24h in ms

export async function signToken(payload: { sub: string; username: string; role: string }) {
  return new SignJWT({ username: payload.username, role: payload.role })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${parseInt(expiration) / 1000}s`)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret)
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
  return {
    sub: payload.sub || '',
    username: payload.username as string,
    role: (payload.role as string) || 'ROLE_USER',
  }
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}
```

**為什麼這樣寫**：

- **選擇 `jose` 而非 `jsonwebtoken`**：`jose` 是純 JavaScript 實作，使用 Web Crypto API（Node.js 內建 `crypto.subtle`），無任何 native binding 依賴。這對 Next.js 的 Edge Runtime（middleware）部署至關重要——`jsonwebtoken` 依賴 Node.js `crypto` 模組的同步 API，無法在 Edge 環境執行；`jose` 的異步 `jwtVerify()` 可在 Node.js、Edge、Browser 三種 runtime 執行。
- **`SignJWT` builder pattern**：`new SignJWT(claims).setSubject().setIssuedAt().setExpirationTime().setProtectedHeader().sign()` 是典型的 fluent API。每個方法回傳 `this`，鏈式呼叫。與 Spring Boot 的 `Jwts.builder()` 和 Laravel 的 `JWT::encode()` 模式對齊。
- **`sub` claim 存放 userId（字串）**：遵循 JWT RFC 7519，將使用者識別碼放在標準 `sub` claim。值為字串（`String(user.id)` 或 `setSubject(payload.sub)`），與 Java 版 `String.valueOf(userId)` 和其他後端保持一致。
- **`role` 寫入 JWT payload**：`username` 和 `role` 作為自訂 claim 寫入 token。登入時已檢查 `ROLE_DISABLED`（已被停用的使用者無法取得新 token），後續每個請求從 token 直接讀取 role，省下一次 `SELECT role FROM users WHERE id = ?` 查詢。
- **`setExpirationTime` 毫秒轉秒**：`JWT_EXPIRATION` 環境變數以毫秒為單位（預設 86400000 = 24 小時），`parseInt(expiration) / 1000` 轉為秒，加上 `'s'` 後綴（jose 接受 `"86400s"` 字串格式）。
- **BCrypt 12 rounds**：`bcrypt.hash(password, 12)` 中的 12 是 salt rounds。12 是 Linux `mkpasswd` 和 `passlib` 的預設值，在安全性（抗暴力破解）與效能（登入延遲約 200-300ms）之間取得平衡。
- **`verifyToken` 回傳結構化物件**：不直接回傳 `payload`（型別不確定），而是顯式提取 `sub`、`username`、`role` 三個欄位，並提供預設值。呼叫方得到確定的型別，不需要每次都 `as string` 斷言。

---

### 模式 4：Middleware (`src/middleware.ts`)

Next.js middleware 是整個認證體系的閘道。它同時處理兩種場景：(a) 頁面路由的 cookie 驗證 + (b) API 路由的 Bearer token 驗證。

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-key-change-in-production')

const publicPaths = ['/login', '/register', '/api/auth/register', '/api/auth/login']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (publicPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Allow static assets and Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
    return NextResponse.next()
  }

  // Check for API routes — use Bearer token
  if (pathname.startsWith('/api/')) {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid username or password' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    try {
      const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })

      // Admin routes need ROLE_ADMIN
      if (pathname.startsWith('/api/admin/')) {
        if (payload.role !== 'ROLE_ADMIN') {
          return NextResponse.json(
            { status: 'ERROR', message: 'Access denied' },
            { status: 403 }
          )
        }
      }

      return NextResponse.next()
    } catch {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid username or password' },
        { status: 401 }
      )
    }
  }

  // Page routes — check cookie
  const token = request.cookies.get('token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })

    // Admin pages
    if (pathname.startsWith('/admin')) {
      if (payload.role !== 'ROLE_ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**為什麼這樣寫**：

- **雙通道認證——cookie 與 Bearer token**：這是最關鍵的設計決策。
  - **頁面路由**（`/dashboard`、`/admin/*` 等）使用 cookie 儲存 token。Server Component（如 `DashboardPage`）透過 `cookies().get('token')` 讀取 cookie，middleware 也用 `request.cookies.get('token')` 驗證。這讓頁面在初次 SSR 時就能取得使用者身份，不需要 client-side fetch。
  - **API 路由**（`/api/*`）使用 `Authorization: Bearer <token>` header。這與其他六個後端的 API 合約完全一致，保證 `digital_wallet_frontend` 和其他 HTTP client 可以無縫對接。
- **middleware 驗證但不注入 userId**：一般的 Express/Spring middleware 會在 `request` 上附加 `userId`。Next.js middleware 無法做到這件事——Next.js 的 middleware 與 Route Handler 執行在不同的 runtime context，middleware 無法修改傳入 Route Handler 的 request object。因此 Route Handler 內部需要自行再次解析 token 取 `userId`——這造成了表面上的「重複驗證」，但實際上是 Next.js 架構的必然結果。middleware 的角色是**快速攔截**（401/403/redirect），Route Handler 的角色是**深度解析**（取得 userId → 業務邏輯）。
- **三層路由決策**：
  1. **公開路徑**：`/login`、`/register`、`/api/auth/register`、`/api/auth/login` 直接放行，無需任何驗證。
  2. **API 路由**：Bearer token 強制驗證。`/api/admin/*` 額外檢查 `role === 'ROLE_ADMIN'`。
  3. **頁面路由**：cookie token 驗證。未登入 → redirect `/login`。非 admin 存取 `/admin/*` → redirect `/dashboard`。
- **`config.matcher` 排除靜態資源**：`'/((?!_next/static|_next/image|favicon.ico).*)'` 這個 regex 確保 middleware 不會對編譯後的 JS/CSS chunk 和圖片執行，避免不必要的效能開銷。
- **所有 JWT 驗證失敗統一回應**：token 過期、簽章不符、格式錯誤，全部統一為 `"Invalid username or password"` 或 redirect `/login`。不區分錯誤原因，防止攻擊者從錯誤訊息推斷 token 內部狀態。

---

### 模式 5：Route Handler — 使用者端點

#### 註冊 (`src/app/api/auth/register/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let username: string | undefined;

  try {
    const body = await request.json();
    username = body.username;
    const password = body.password;

    if (!username || username.length < 3) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username,
          passwordHash,
          role: 'ROLE_USER',
        },
      });

      await tx.wallet.create({
        data: {
          userId: user.id,
          currency: 'USDT',
          balance: 0,
          version: 0,
        },
      });
    });

    return NextResponse.json(
      { status: 'SUCCESS', message: 'User registered successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === 'P2002') {
      const target = (error.meta?.target as string[]) || [];
      if (target.includes('username')) {
        return NextResponse.json(
          { status: 'ERROR', message: `Username '${username || 'unknown'}' is already taken` },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { status: 'ERROR', message: 'Username is already taken' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { status: 'ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**設計要點**：

- **`prisma.$transaction()` 保證原子性**：`user.create()` 與 `wallet.create()` 必須同時成功或同時失敗。Prisma 的 interactive transaction（傳入 callback）自動管理 BEGIN/COMMIT/ROLLBACK。若 wallet 建立失敗，user 插入自動 rollback，不會留下「孤兒使用者」（沒有錢包的使用者）。
- **`error.code === 'P2002'` 捕獲唯一約束違反**：Prisma 的結構化錯誤碼 `P2002` 對應 PostgreSQL 的 `UNIQUE constraint violation`（`SQLSTATE 23505`）。`error.meta?.target` 是字串陣列，包含被違反的欄位名稱。檢查是否包含 `'username'` 來確認是 username 重複而非其他 unique constraint。
- **role 固定為 `ROLE_USER`**：註冊時不接受 role 參數（即使 request body 中傳入也會被忽略，因為程式碼從未讀取 `body.role`）。這是 mass assignment 防護——防止任何人透過註冊 API 建立管理員帳號。
- **手動輸入驗證**：`username.length < 3` 和 `password.length < 6` 是輕量級的 server-side 驗證。與其他後端的驗證邏輯一致。

#### 登入 (`src/app/api/auth/login/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    if (user.role === 'ROLE_DISABLED') {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const passwordValid = await comparePassword(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Invalid username or password' },
        { status: 401 }
      );
    }

    const token = await signToken({
      sub: String(user.id),
      username: user.username,
      role: user.role,
    });

    return NextResponse.json(
      {
        token,
        user: {
          id: Number(user.id),
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { status: 'ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**設計要點**：

- **三層模糊錯誤（使用者不存在、帳號停用、密碼錯誤）**：全部回傳相同的 `"Invalid username or password"` 和 401 status。這防止了使用者列舉攻擊（user enumeration）——攻擊者無法從錯誤訊息判斷某個 username 是否已註冊。
- **`ROLE_DISABLED` 檢查在密碼驗證之前，但錯誤訊息相同**：先查 `user.role`，再查密碼。順序無關緊要因為錯誤訊息相同。但將 role 檢查放在密碼驗證前可省去一次 bcrypt compare（效能最佳化：bcrypt compare 約 200ms，而 role 字串比較幾乎零成本）。
- **`BigInt` → `Number` 轉換**：Prisma 的 `BIGSERIAL` 欄位在 TypeScript 中型別為 `bigint`。JSON 序列化不支援 `bigint`（`JSON.stringify(1n)` 會拋出 `TypeError`），所以需要 `Number(user.id)` 轉換。`id` 值在小型應用中不會超過 `Number.MAX_SAFE_INTEGER`（2^53 - 1），此轉換安全。
- **回傳 `user` 物件**：`token` 之外也回傳使用者資訊，讓前端可以立即顯示使用者名稱和角色，無需再次請求 `/api/wallets`。

#### 錢包查詢 (`src/app/api/wallets/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const { sub: userId } = await verifyToken(token);

    const wallet = await prisma.wallet.findUnique({
      where: { userId: BigInt(userId) },
    });

    if (!wallet) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Wallet not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        id: Number(wallet.id),
        userId: Number(wallet.userId),
        currency: wallet.currency,
        balance: Number(wallet.balance),
        version: wallet.version,
        updatedAt: wallet.updatedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'JWSSignatureVerificationFailed') {
      return NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { status: 'ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**設計要點**：

- **userId 永遠來自 JWT，絕不從 URL 取得**：`where: { userId: BigInt(userId) }` 中的 `userId` 來自 `verifyToken(token).sub`。即使請求 URL 是 `/api/wallets?userId=999`，此 endpoint 也只查詢 JWT token 持有者的錢包。這是防止 IDOR（Insecure Direct Object Reference）的核心機制。
- **內建的 Bearer token 檢查**：雖然 middleware 已經檢查過 API 路由的 Bearer token，Route Handler 內仍然重複檢查。這是兩層防護——middleware 是快速攔截層（在請求到達 Route Handler 之前就拒絕），Route Handler 是防禦層（即使 middleware 配置錯誤被繞過，Route Handler 仍有自己的驗證邏輯）。
- **`Number(wallet.balance)` 型別轉換**：Prisma 的 `Decimal` 型別在 JavaScript 中可能是 `Prisma.Decimal` 物件。`Number()` 轉為 JavaScript number 讓 JSON 輸出為數字而非 `{"balance":"100.0000"}` 字串。

#### 轉帳 (`src/app/api/transactions/transfer/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const { sub: userId } = await verifyToken(token);

    const { toUsername, amount } = await request.json();

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    const transferAmount = Number(amount);

    try {
      const result = await prisma.$transaction(async (tx) => {
        const fromWallet = await tx.wallet.findUnique({
          where: { userId: BigInt(userId) },
        });

        if (!fromWallet) {
          throw { status: 404, message: 'Wallet not found' };
        }

        const recipientUser = await tx.user.findUnique({
          where: { username: toUsername },
          include: { wallet: true },
        });

        if (!recipientUser) {
          throw { status: 400, message: 'Recipient not found' };
        }

        if (Number(fromWallet.userId) === Number(recipientUser.id)) {
          throw { status: 400, message: 'Cannot transfer to yourself' };
        }

        if (Number(fromWallet.balance) < transferAmount) {
          throw { status: 400, message: 'Insufficient balance' };
        }

        // Optimistic lock: decrement sender balance
        const updateResult = await tx.wallet.updateMany({
          where: {
            userId: fromWallet.userId,
            version: fromWallet.version,
          },
          data: {
            balance: { decrement: transferAmount },
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw { status: 409, message: 'Concurrent modification detected. Please try again.' };
        }

        // Credit recipient
        await tx.wallet.update({
          where: { userId: recipientUser.id },
          data: {
            balance: { increment: transferAmount },
            version: { increment: 1 },
          },
        });

        // Create transaction record
        const transaction = await tx.transaction.create({
          data: {
            fromWalletId: fromWallet.id,
            toWalletId: recipientUser.wallet!.id,
            amount: transferAmount,
            txType: 'TRANSFER',
            status: 'SUCCESS',
          },
        });

        return transaction;
      });

      return NextResponse.json(
        {
          status: 'SUCCESS',
          message: 'Transfer completed successfully',
          transactionId: Number(result.id),
        },
        { status: 200 }
      );
    } catch (error: any) {
      if (error.status) {
        return NextResponse.json(
          { status: 'ERROR', message: error.message },
          { status: error.status }
        );
      }
      throw error;
    }
  } catch (error: any) {
    if (error instanceof Error && error.name === 'JWSSignatureVerificationFailed') {
      return NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { status: 'ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**設計要點**：

- **樂觀鎖 (Optimistic Locking) 完整實作**：
  1. 在 `$transaction` 內讀取 `fromWallet`，取得當前的 `version` 值。
  2. 使用 `tx.wallet.updateMany()` 而非 `tx.wallet.update()`。`updateMany` 支援 `where` 條件中的 `version` 過濾，而 `update` 只能透過 unique field（`id` 或 `userId`）定位記錄。
  3. `where: { userId: fromWallet.userId, version: fromWallet.version }` 確保只有 version 未被其他請求修改時，UPDATE 才會執行。
  4. `updateResult.count === 0` 代表 version 已變，其他請求搶先修改了此錢包。拋出 `{ status: 409, ... }` 自訂錯誤物件（不是 Error 實例），在內層 catch 中根據 `error.status` 判斷。
- **為什麼用 `updateMany` 而非 `update`**：Prisma 的 `update()` 方法不支援在 `where` 條件中過濾非 unique 欄位（除非使用 `@unique` 標記的 compound key）。`updateMany` 允許任意 `where` 條件組合，包括 `version`。雖然只會匹配一行（`userId` 是 unique 的），但方法名稱中的 `Many` 是 API 設計的語意取捨。
- **兩層 try-catch 結構**：
  - **內層 catch**：捕獲 `$transaction` 內的業務例外（`throw { status, message }`）。自訂錯誤物件有 `status` 屬性 → 直接回傳對應的 HTTP status。
  - **外層 catch**：捕獲未預期的錯誤（JWT 驗證失敗、Prisma 連線錯誤等）→ 回傳 401 或 500。
  - 內層 catch 中的 `throw error`（沒有 `status` 屬性）會穿透到外層 catch 處理。
- **`balance: { decrement: transferAmount }`**：Prisma 的 atomic number operations。生成的 SQL 是 `SET balance = balance - ?`，而非先讀取再寫入。這保證了在資料庫層級的原子性（單條 UPDATE 本身就是原子的）。加上 version 條件，形成雙重防護。
- **收款方不用樂觀鎖**：`tx.wallet.update()` 不檢查 version，直接 `balance: { increment: transferAmount }`。餘額增加不存在競爭條件——無論多少筆轉帳同時入帳，`SUM(balance + amount)` 在資料庫的 row-level locking 下都是正確的。
- **`recipientUser.wallet!` 非空斷言**：`include: { wallet: true }` 讓 `recipientUser.wallet` 的型別是 `Wallet | null`。但此系統保證每個使用者都有錢包（註冊時自動建立），所以使用 `!` 斷言是安全的。

#### 交易歷史 (`src/app/api/transactions/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const { sub: userId } = await verifyToken(token);

    const wallet = await prisma.wallet.findUnique({
      where: { userId: BigInt(userId) },
    });

    if (!wallet) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Wallet not found' },
        { status: 404 }
      );
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromWalletId: wallet.id },
          { toWalletId: wallet.id },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        fromWallet: {
          include: { user: true },
        },
        toWallet: {
          include: { user: true },
        },
      },
    });

    const data = transactions.map((tx) => ({
      id: Number(tx.id),
      fromWalletId: tx.fromWalletId ? Number(tx.fromWalletId) : null,
      toWalletId: tx.toWalletId ? Number(tx.toWalletId) : null,
      amount: Number(tx.amount),
      txType: tx.txType,
      status: tx.status,
      createdAt: tx.createdAt,
      fromUsername: tx.fromWallet?.user?.username || null,
      toUsername: tx.toWallet?.user?.username || null,
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.name === 'JWSSignatureVerificationFailed') {
      return NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { status: 'ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**設計要點**：

- **巢狀 eager loading**：`include: { fromWallet: { include: { user: true } } }` 使用 Prisma 的巢狀 include 語法，一次 query 載入 transaction → wallet → user 三層關聯。Prisma 自動生成 JOIN + JSON aggregation，只執行一條 SQL（或少量 SQL），而非 N+1 查詢。
- **`OR: [{ fromWalletId }, { toWalletId }]`**：查詢所有與此 wallet 相關的交易——無論是發送（`fromWalletId = wallet.id`）還是接收（`toWalletId = wallet.id`）。
- **`orderBy: { createdAt: 'desc' }`**：按時間降冪排序，最新的交易在前。
- **`fromUsername` / `toUsername` 萃取**：前端不需要知道 wallet ID 或複雜的巢狀結構。Route Handler 負責將關聯資料扁平化為 `fromUsername` 和 `toUsername` 兩個字串欄位。

---

### 模式 6：Route Handler — 管理員端點

#### 使用者列表 (`src/app/api/admin/users/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);
    const { role } = await verifyToken(token);

    if (role !== 'ROLE_ADMIN') {
      return NextResponse.json(
        { status: 'ERROR', message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const size = Math.min(100, Math.max(1, parseInt(searchParams.get('size') || '20')));
    const skip = (page - 1) * size;

    const where = search
      ? { username: { contains: search } }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
        },
        skip,
        take: size,
        orderBy: { id: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    const data = users.map((user) => ({
      id: Number(user.id),
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    }));

    return NextResponse.json(
      { data, page, size, total },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.name === 'JWSSignatureVerificationFailed') {
      return NextResponse.json(
        { status: 'ERROR', message: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { status: 'ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**設計要點**：

- **雙重角色檢查**：middleware 層級檢查 `ROLE_ADMIN`（在 `src/middleware.ts` 中），Route Handler 層級再次檢查 `ROLE_ADMIN`（在 handler 函數內）。雙層防護確保即使 middleware 配置有誤，Route Handler 自己的角色驗證仍然生效。
- **`select` 只選取所需欄位**：永遠不回傳 `passwordHash`。這是 Prisma 的欄位層級安全——`select` 只列出要回傳的欄位，其他欄位（包括 `passwordHash`）不會出現在查詢結果中。
- **`Promise.all` 並行查詢**：`findMany` 和 `count` 沒有依賴關係，可以並行執行。`Promise.all` 同時發出兩條 SQL，利用 PostgreSQL 的並行處理能力。
- **分頁參數邊界控制**：`Math.min(100, Math.max(1, parseInt(...)))` 將 `size` 限制在 1-100 之間，防止惡意請求 `size=999999` 導致記憶體耗盡。

#### 交易統計 (`src/app/api/admin/transactions/stats/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // ... auth + admin check ...

  const where: any = {};
  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = new Date(fromDate);
    if (toDate) where.createdAt.lte = new Date(toDate);
  }

  const [totalTransactions, amountResult] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  const totalAmount = amountResult._sum.amount ? Number(amountResult._sum.amount) : 0;

  // Get daily volume using groupBy
  const dailyVolumeRaw = await prisma.transaction.groupBy({
    by: ['createdAt'],
    where,
    _count: { id: true },
    _sum: { amount: true },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date (YYYY-MM-DD) since createdAt has time component
  const dailyMap = new Map<string, { count: number; amount: number }>();
  for (const row of dailyVolumeRaw as any[]) {
    const dateStr = new Date(row.createdAt).toISOString().slice(0, 10);
    const existing = dailyMap.get(dateStr);
    if (existing) {
      existing.count += row._count.id;
      existing.amount += Number(row._sum.amount || 0);
    } else {
      dailyMap.set(dateStr, {
        count: row._count.id,
        amount: Number(row._sum.amount || 0),
      });
    }
  }

  const dailyVolume = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, count: data.count, amount: data.amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json(
    { totalTransactions, totalAmount, dailyVolume },
    { status: 200 }
  );
}
```

**設計要點**：

- **`aggregate` 與 `groupBy` 的組合使用**：
  - `aggregate({ _sum: { amount: true } })` 對應 SQL `SELECT SUM(amount) FROM transactions WHERE ...`。
  - `groupBy({ by: ['createdAt'], _count: { id: true }, _sum: { amount: true } })` 對應 SQL `GROUP BY created_at`。
- **JavaScript 層級再分組**：Prisma 的 `groupBy` 只能按資料庫欄位分組，無法直接按 `DATE(created_at)` 分組（因為 `createdAt` 是 timestamp，包含時間部分）。解決方案是：在 Prisma 層按 `createdAt` 分組，然後在 JavaScript 層用 `Map` 將同一天的記錄合併。

---

### 模式 7：Server Components — Dashboard 頁面

Next.js Server Components 可以直接在組件內使用 Prisma 查詢，無需 API 層。

```typescript
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import Link from 'next/link';

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');

  if (!tokenCookie?.value) {
    redirect('/login');
  }

  const payload = await verifyToken(tokenCookie.value);

  // Fetch wallet directly via Prisma (server-side, no fetch API)
  const wallet = await prisma.wallet.findUnique({
    where: { userId: BigInt(payload.sub) },
    include: { user: true },
  });

  if (!wallet) {
    redirect('/login');
  }

  const balance = Number(wallet.balance);
  const currency = wallet.currency;

  // Fetch recent transactions (last 5)
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      OR: [
        { fromWalletId: wallet.id },
        { toWalletId: wallet.id },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      fromWallet: { include: { user: true } },
      toWallet: { include: { user: true } },
    },
  });

  return (
    <div className="px-6 py-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-navy-400">
          Welcome back, {payload.username}
        </p>
      </div>

      {/* Balance Card */}
      <Card padding="lg" className="mb-8 bg-gradient-to-br from-navy-750 to-navy-700 border-navy-500">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-navy-400">Total Balance</p>
            <p className="mt-2 text-4xl font-bold text-white tracking-tight">
              {balance.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}{' '}
              <span className="text-lg font-medium text-navy-400">{currency}</span>
            </p>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Link href="/dashboard/transfer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-white">
            Send Transfer
          </Link>
          <Link href="/dashboard/history"
            className="inline-flex items-center gap-2 rounded-xl bg-navy-600 px-5 py-2.5 text-sm font-medium text-white border border-navy-400">
            View History
          </Link>
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card padding="none">
        {recentTransactions.length === 0 ? (
          <EmptyState title="No transactions yet" description="..." />
        ) : (
          <div className="divide-y divide-navy-600">
            {recentTransactions.map((tx) => {
              const isOutgoing = tx.fromWalletId === wallet.id;
              const counterparty = isOutgoing
                ? tx.toWallet?.user?.username || 'Unknown'
                : tx.fromWallet?.user?.username || 'Unknown';
              return (
                <div key={Number(tx.id)} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {isOutgoing ? 'Sent to' : 'Received from'} {counterparty}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${isOutgoing ? 'text-red-400' : 'text-emerald-400'}`}>
                      {isOutgoing ? '-' : '+'}{Number(tx.amount).toLocaleString()} {currency}
                    </p>
                    <Badge variant={tx.status === 'SUCCESS' ? 'success' : 'danger'}>
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
```

**為什麼這樣寫**：

- **直接 Prisma 查詢 vs. fetch API**：Server Component 可以直接 `await prisma.wallet.findUnique()`，不需要發 HTTP 請求。這帶來三個好處：
  1. **零延遲**：資料在伺服器端取得，不需要 client-server round trip。
  2. **型別安全**：從 Prisma 查詢到 JSX 渲染，全程 TypeScript 型別檢查，沒有 JSON parse 後的 `any` 型別。
  3. **簡化架構**：不需要為「取得錢包餘額」這類簡單查詢額外建立 API endpoint。
- **`async` 組件**：`DashboardPage` 是 `async function`，可以在組件頂層 `await`。Next.js 在伺服器端等待所有 Promise 完成後才串流 HTML 給客戶端。
- **`cookies()` 和 `redirect()`**：`cookies()` 是 Next.js 的伺服器端動態函數，讀取請求的 cookie。`redirect()` 觸發 HTTP 307 重定向。
- **資料取得與 UI 共置 (colocation)**：查詢邏輯和渲染邏輯在同一個檔案中。React Server Components 主張「資料從何處取得，就在何處渲染」。

---

### 模式 8：Client Components — Transfer 頁面

需要互動性（表單輸入、Modal 確認、loading 狀態）的功能使用 Client Components。

```typescript
'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

function getCookie(name: string): string | undefined {
  const value = `; ${typeof document !== 'undefined' ? document.cookie : ''}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
}

export default function TransferPage() {
  const [toUsername, setToUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!toUsername.trim()) {
      setError('Recipient username is required');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    // Show confirmation modal before sending
    setShowConfirm(true);
  };

  const handleConfirmTransfer = async () => {
    setIsLoading(true);
    setError('');

    const token = getCookie('token');

    try {
      const res = await fetch('/api/transactions/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          toUsername: toUsername.trim(),
          amount: parseFloat(amount),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Transfer failed');
        setShowConfirm(false);
        return;
      }

      setSuccess(`Successfully sent ${parseFloat(amount).toLocaleString()} USDT to ${toUsername.trim()}!`);
      setShowConfirm(false);
      resetForm();
      setTimeout(() => setSuccess(''), 5000);
    } catch {
      setError('Network error. Please try again.');
      setShowConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-6 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Transfer Funds</h1>

      {success && (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Recipient Username" value={toUsername} onChange={(e) => setToUsername(e.target.value)} />
          <Input label="Amount (USDT)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Button type="submit" isLoading={isLoading} className="w-full">Review Transfer</Button>
        </form>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm Transfer"
        onConfirm={handleConfirmTransfer}
        confirmLabel="Send Transfer"
        isLoading={isLoading}
      >
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-navy-400">Recipient</span>
            <span className="font-medium text-white">{toUsername.trim()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-navy-400">Amount</span>
            <span className="font-medium text-white">
              {parseFloat(amount || '0').toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}{' '}
              USDT
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

**為什麼這樣寫**：

- **`'use client'` 指令**：這是 React Server Components 架構的關鍵——沒有這個指令的檔案預設是 Server Component。加上 `'use client'` 後，此組件可以使用 `useState`、`useEffect` 等 React hooks。
- **兩階段送出（確認對話框）**：使用者先填寫表單 → 點擊 "Review Transfer" → 顯示 Modal 確認 → 點擊 "Send Transfer" 才真正送出。避免誤觸送出按鈕。
- **`getCookie()` 從 document.cookie 讀取 token**：Client Component 無法使用 Next.js 的 `cookies()`（那是 Server Component 專用）。必須手動從 `document.cookie` 解析 cookie 字串取得 token。
- **`fetch` API 呼叫後端**：Client Component 透過 `fetch('/api/transactions/transfer', ...)` 呼叫同一個 Next.js 伺服器上的 Route Handler。Token 放在 `Authorization: Bearer` header（與 API 合約一致）。

---

### 模式 9：Admin 頁面 — Server Component + Client Component 組合

#### Server Component — Data Fetching (`src/app/(admin)/users/page.tsx`)

```typescript
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/db';
import UserTable from './UserTable';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get('token');
  if (!tokenCookie?.value) redirect('/login');

  const payload = await verifyToken(tokenCookie.value);
  if (payload.role !== 'ROLE_ADMIN') redirect('/dashboard');

  const params = await searchParams;
  const search = params.search || '';
  const page = Math.max(1, parseInt(params.page || '1'));
  const size = 20;
  const skip = (page - 1) * size;

  const where = search ? { username: { contains: search } } : {};
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: { id: true, username: true, role: true, createdAt: true },
      skip, take: size,
      orderBy: { id: 'asc' },
    }),
    prisma.user.count({ where }),
  ]);

  const userData = users.map((user) => ({
    id: Number(user.id),
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
  }));

  const totalPages = Math.ceil(total / size);

  return (
    <div className="px-6 py-8 max-w-6xl">
      <h1 className="text-2xl font-bold text-white">User Management</h1>
      <UserTable users={userData} search={search} page={page}
        totalPages={totalPages} total={total} />
    </div>
  );
}
```

**為什麼這樣寫**：

- **Server Component 負責資料取得，Client Component 負責互動**：這是 Next.js App Router 的核心設計模式。Server Component 在伺服器端執行（資料庫查詢），將資料以 props 傳遞給 Client Component（`UserTable`）。Client Component 在瀏覽器端處理搜尋、分頁、Enable/Disable 操作等互動。
- **`router.push()` 觸發重新渲染**：搜尋和分頁透過 `router.push('/admin/users?page=2&search=john')` 更新 URL query string，觸發 Server Component 重新執行。資料流是單向的：URL → Server Component → Client Component props。
- **`router.refresh()` 刷新頁面資料**：Enable/Disable 操作成功後，呼叫 `router.refresh()` 告訴 Next.js 重新執行 Server Component，取得最新的使用者列表。

---

### 模式 10：UI 元件 (`src/components/ui/`)

7 個共用的 UI 元件，使用 Tailwind CSS 4 的 navy/emerald 暗色主題。

#### Button — 四種 variant + loading 狀態

```typescript
'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const variantStyles: Record<Variant, string> = {
  primary:   'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20',
  secondary: 'bg-navy-600 hover:bg-navy-500 text-white border border-navy-400',
  danger:    'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30',
  ghost:     'bg-transparent hover:bg-navy-700 text-navy-300 hover:text-white',
};

export default function Button({
  variant = 'primary', isLoading, children, className = '', disabled, ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium 
        transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
        </svg>
      )}
      {children}
    </button>
  );
}
```

#### Input — forwardRef + error state

```typescript
'use client';

import { forwardRef } from 'react';

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label className="text-sm font-medium text-navy-300">{label}</label>}
        <input
          ref={ref}
          className={`w-full rounded-xl border bg-navy-700 px-4 py-2.5 text-sm text-white 
            placeholder:text-navy-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50
            ${error ? 'border-red-500/50' : 'border-navy-500 hover:border-navy-400'} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
```

#### Card — 四種 padding + 毛玻璃效果

```typescript
const paddingStyles = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div className={`rounded-2xl border border-navy-600 bg-navy-750 backdrop-blur-sm ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}
```

#### Modal — overlay click 關閉 + ESC key + body scroll lock

```typescript
'use client';

export default function Modal({ isOpen, onClose, title, children, onConfirm, confirmLabel, confirmVariant = 'primary', isLoading }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-navy-600 bg-navy-800 shadow-2xl">
        <div className="flex items-center justify-between border-b border-navy-600 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="...">X</button>
        </div>
        <div className="px-6 py-4">{children}</div>
        {(onConfirm || confirmLabel) && (
          <div className="flex items-center justify-end gap-3 border-t border-navy-600 px-6 py-4">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            {onConfirm && confirmLabel && (
              <Button variant={confirmVariant} onClick={onConfirm} isLoading={isLoading}>
                {confirmLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

**設計要點**：

- **overlay click to close**：`onClick` 處理器中比對 `e.target === overlayRef.current` —— 只有點擊黑色遮罩（overlay）時才關閉，點擊 Modal 內容本身不關閉。
- **`useEffect` cleanup**：ESC key listener 和 body scroll lock 在 `useEffect` 回傳的 cleanup 函數中解除，防止 memory leak。
- **Badge**：4 種 variant color 對應不同角色和狀態——`ROLE_USER` → success (green)，`ROLE_ADMIN` → warning (amber)，`ROLE_DISABLED` → danger (red)。
- **Spinner**：純 SVG 動畫，使用 Tailwind 的 `animate-spin` class，無 JavaScript 動畫邏輯。
- **EmptyState**：空白狀態提示，可選 icon + title + description，用於無交易記錄、無搜尋結果等場景。

---

## 資料庫表結構

DDL 與其他六個後端完全一致。Prisma schema 映射到以下 PostgreSQL 結構：

### `users`

| Column | Type | Constraint | 說明 |
|--------|------|------------|------|
| `id` | BIGSERIAL | PRIMARY KEY | 使用者 ID，自增 |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | 登入帳號 |
| `password_hash` | VARCHAR(255) | NOT NULL | BCrypt 雜湊密碼 |
| `role` | VARCHAR(20) | DEFAULT 'ROLE_USER' | ROLE_USER / ROLE_ADMIN / ROLE_DISABLED |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 註冊時間 |

**Prisma 對應**：`model User @@map("users")`，欄位 `passwordHash @map("password_hash")`、`createdAt @map("created_at")`。

### `wallets`

| Column | Type | Constraint | 說明 |
|--------|------|------------|------|
| `id` | BIGSERIAL | PRIMARY KEY | 錢包 ID，自增 |
| `user_id` | BIGINT | UNIQUE, FK → users(id) ON DELETE CASCADE | 1:1 關聯使用者 |
| `currency` | VARCHAR(10) | DEFAULT 'USDT' | 幣種 |
| `balance` | NUMERIC(18,4) | DEFAULT 0 | 餘額 |
| `version` | INTEGER | DEFAULT 0 | 樂觀鎖版本號 |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 最後異動時間 |

**Prisma 對應**：`model Wallet @@map("wallets")`，`userId @unique @map("user_id")`，`balance @db.Decimal(18,4)`，`version Int @default(0)`。

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

**Prisma 對應**：`model Transaction @@map("transactions")`，兩個 `@@index` 對應 from_wallet_id 和 to_wallet_id 的索引。

---

## 數據流圖

### 1. 註冊流程 (POST /api/auth/register)

```
Client (RegisterPage)   Middleware          Route Handler (register/route.ts)        Prisma              PostgreSQL
    │                        │                         │                              │                     │
    │──POST /api/auth/register                        │                              │                     │
    │  {username, password}   │                         │                              │                     │
    │                        │──public path────────────▶│                              │                     │
    │                        │                         │──validate username >= 3       │                     │
    │                        │                         │──validate password >= 6       │                     │
    │                        │                         │──hashPassword(password)        │                     │
    │                        │                         │──prisma.$transaction(cb)──────▶│                     │
    │                        │                         │                              │──BEGIN───────────▶│
    │                        │                         │                              │──INSERT INTO users──▶│
    │                        │                         │                              │──INSERT INTO wallets─▶│
    │                        │                         │                              │──COMMIT──────────▶│
    │                        │                         │◀──void────────────────────────│                     │
    │                        │                         │──201 {status:"SUCCESS"}──────▶│                     │
    │◀──201 {"status":"SUCCESS","message":"User registered successfully"}            │                     │
```

### 2. 登入流程 (POST /api/auth/login)

```
Client (LoginPage)      Middleware          Route Handler (login/route.ts)    Prisma          auth.ts (signToken)
    │                        │                         │                         │                    │
    │──POST /api/auth/login  │                         │                         │                    │
    │                        │──public path────────────▶│                         │                    │
    │                        │                         │──prisma.user.findUnique─▶│                    │
    │                        │                         │◀──user or null──────────│                    │
    │                        │                         │──(not found) → 401      │                    │
    │                        │                         │──(ROLE_DISABLED) → 401  │                    │
    │                        │                         │──comparePassword(pw,hash)                    │
    │                        │                         │──signToken(sub,user,role)────────────────────▶│
    │                        │                         │◀──JWT string───────────────────────────────│
    │                        │                         │──200 {token, user}─────▶│                    │
    │◀──200 {"token":"eyJ...","user":{"id":5,"username":"alice","role":"ROLE_USER",...}}
```

### 3. JWT 攔截流程（Middleware）

```
Page Request: GET /dashboard           API Request: GET /api/wallets

Client ──▶ Middleware                  Client ──▶ Middleware
  │              │                        │              │
  │              │──cookie token?         │              │──Bearer token?
  │              │   (request.cookies)    │              │   (Authorization header)
  │              │                        │              │
  │              │  NO → redirect /login  │              │  NO → 401 JSON
  │              │                        │              │
  │              │  YES → jwtVerify()     │              │  YES → jwtVerify()
  │              │   ├─ valid → next()    │              │   ├─ valid → check role
  │              │   └─ invalid → /login  │              │   │  ├─ admin path + non-admin → 403
  │              │                        │              │   │  └─ ok → next()
  │              │                        │              │   └─ invalid → 401 JSON
```

### 4. 查詢錢包流程 (GET /api/wallets)

```
Client                  Middleware           Route Handler (wallets/route.ts)        Prisma
  │                         │                         │                                │
  │──GET /api/wallets──────▶│                         │                                │
  │  Authorization: Bearer X│                         │                                │
  │                         │──jwtVerify─────────────▶│                                │
  │                         │──next()─────────────────▶│                                │
  │                         │                         │──verifyToken→userId="5"        │
  │                         │                         │──wallet.findUnique({userId:5})──▶│
  │                         │                         │◀──{id:1,balance:100,version:3}│
  │                         │                         │──200 {wallet}─────────────────▶│
  │◀──200 {"id":1,"userId":5,"currency":"USDT","balance":100,"version":3,...}
```

### 5. 轉帳流程 (POST /api/transactions/transfer) — 含樂觀鎖

```
Client      Middleware      Route Handler (transfer/route.ts)        Prisma $transaction         PostgreSQL
  │              │                       │                              │                          │
  │──POST /api/transactions/transfer     │                              │                          │
  │  {toUsername:"bob", amount:50}       │                              │                          │
  │              │──jwtVerify────────────▶│                              │                          │
  │              │──next()───────────────▶│                              │                          │
  │              │                       │──verifyToken→userId=5         │                          │
  │              │                       │──prisma.$transaction(cb)─────▶│                          │
  │              │                       │                              │──BEGIN────────────────▶│
  │              │                       │  tx.wallet.findUnique(5)────▶│──SELECT FROM wallets───▶│
  │              │                       │  ◀──{balance:100, version:3} │◀──{balance:100,version:3}│
  │              │                       │  tx.user.findUnique("bob")──▶│──SELECT FROM users─────▶│
  │              │                       │  ◀──{id:8, wallet:{id:2}}    │◀──{id:8, wallet:{...}}  │
  │              │                       │  check: 5≠8 ✓, 100≥50 ✓     │                          │
  │              │                       │                              │                          │
  │              │                       │  tx.wallet.updateMany({     │──UPDATE wallets         │
  │              │                       │    where:{userId:5,         │  SET balance=balance-50,│
  │              │                       │           version:3},       │      version=version+1  │
  │              │                       │    data:{balance:decrement, │  WHERE userId=5         │
  │              │                       │           version:increment │    AND version=3        │
  │              │                       │  })                          │◀──{count:1} (成功)──────│
  │              │                       │  (若 count:0 → 409 conflict) │                          │
  │              │                       │                              │                          │
  │              │                       │  tx.wallet.update(recipient)│──UPDATE wallets         │
  │              │                       │    balance:{increment:50}   │  SET balance=balance+50 │
  │              │                       │                              │◀──OK────────────────────│
  │              │                       │  tx.transaction.create(...) │──INSERT INTO transactions│
  │              │                       │                              │◀──{id:10}──────────────│
  │              │                       │                              │──COMMIT───────────────▶│
  │              │                       │◀──transaction{id:10}─────────│                          │
  │              │                       │──200 {status:"SUCCESS"}─────▶│                          │
  │◀──200 {"status":"SUCCESS","message":"Transfer completed successfully","transactionId":10}
```

### 6. 管理員使用者管理流程 (GET /api/admin/users + PUT disable/enable)

```
Client (UserTable)      Middleware           Route Handler (admin/users/route.ts)      Prisma
  │                         │                         │                                 │
  │──GET /api/admin/users?search=john&page=1           │                                 │
  │  Authorization: Bearer X│                         │                                 │
  │                         │──jwtVerify──────────────▶│                                 │
  │                         │──role === ROLE_ADMIN?    │                                 │
  │                         │──yes → next()───────────▶│                                 │
  │                         │                         │──verifyToken→role              │
  │                         │                         │──role !== ROLE_ADMIN? → 403     │
  │                         │                         │──Promise.all([                 │
  │                         │                         │    findMany({skip,take,where})─▶│──SELECT * FROM users
  │                         │                         │    count({where})──────────────▶│──SELECT COUNT(*)
  │                         │                         │  ])                             │
  │                         │                         │◀──{data:[...],page:1,total:42}─│
  │                         │                         │──200 {data,page,size,total}────▶│
  │◀──200 {"data":[...],"page":1,"size":20,"total":42}
  │
  │──PUT /api/admin/users/5/disable
  │                         │──jwtVerify + admin──────▶│                                 │
  │                         │                         │──findUnique(id=5)──────────────▶│──SELECT
  │                         │                         │──update({role:'ROLE_DISABLED'})─▶│──UPDATE
  │                         │                         │──200 {SUCCESS}────────────────▶│
  │◀──200 {"status":"SUCCESS","message":"User disabled successfully"}
```

### 7. 交易統計流程 (GET /api/admin/transactions/stats)

```
Client (TransactionStats)  Middleware       Route Handler (stats/route.ts)             Prisma
  │                            │                         │                                │
  │──GET /api/admin/transactions/stats                  │                                │
  │  Authorization: Bearer X   │                         │                                │
  │                            │──jwtVerify + admin──────▶│                                │
  │                            │                         │──Promise.all([                │
  │                            │                         │    transaction.count({})──────▶│──SELECT COUNT(*)
  │                            │                         │    transaction.aggregate({    │──SELECT SUM(amount)
  │                            │                         │      _sum:{amount:true}       │
  │                            │                         │    })                         │
  │                            │                         │  ])                            │
  │                            │                         │◀──{totalTransactions, totalAmount}
  │                            │                         │                                │
  │                            │                         │──transaction.groupBy({        │──SELECT created_at,
  │                            │                         │    by:['createdAt'],          │  COUNT(id),
  │                            │                         │    _count:{id:true},          │  SUM(amount)
  │                            │                         │    _sum:{amount:true}         │  GROUP BY created_at
  │                            │                         │  })                            │
  │                            │                         │◀──daily raw data               │
  │                            │                         │                                │
  │                            │                         │──JavaScript Map group-by-date  │
  │                            │                         │──sorted dailyVolume array      │
  │                            │                         │                                │
  │                            │                         │──200 {totalTransactions,       │
  │                            │                         │       totalAmount,             │
  │                            │                         │       dailyVolume}────────────▶│
  │◀──200 {"totalTransactions":1523,"totalAmount":250000.5000,
  │        "dailyVolume":[{"date":"2025-06-03","count":45,"amount":7500.0000},...]}
```

---

## 啟動方式

### 前置需求

- Node.js 18+（推薦 20+）
- npm
- PostgreSQL（`localhost:5433`，資料庫 `digital_wallet`）

### 步驟

```bash
# 1. 進入專案目錄
cd digital_wallet_nextjs

# 2. 安裝依賴
npm install

# 3. 設定環境變數（.env）
# DATABASE_URL="postgresql://postgres:postgres@localhost:5433/digital_wallet"
# JWT_SECRET="your-256-bit-secret-minimum-32-chars"
# JWT_EXPIRATION="86400000"

# 4. 產生 Prisma Client
npx prisma generate

# 5. 建立資料表（若尚未建立）
npx prisma db push
# 或使用 Spring Boot 專案的 db.sql:
# psql -h localhost -p 5433 -U postgres -d digital_wallet -f ../digital_wallet/src/main/resources/static/db.sql

# 6. 啟動開發伺服器（預設 http://localhost:3000）
npm run dev
```

### 啟動後可用的 URL

| URL | 說明 |
|-----|------|
| `http://localhost:3000/` | 首頁（自動 redirect → /dashboard） |
| `http://localhost:3000/login` | 登入頁面 |
| `http://localhost:3000/register` | 註冊頁面 |
| `http://localhost:3000/dashboard` | Dashboard 首頁（錢包餘額 + 最近交易） |
| `http://localhost:3000/dashboard/transfer` | 轉帳頁面 |
| `http://localhost:3000/dashboard/history` | 交易歷史頁面 |
| `http://localhost:3000/admin/users` | 管理員：使用者管理 |
| `http://localhost:3000/admin/transactions` | 管理員：交易監控 |
| `http://localhost:3000/api/auth/register` | API: 註冊 |
| `http://localhost:3000/api/auth/login` | API: 登入 |
| `http://localhost:3000/api/wallets` | API: 查詢錢包 |
| `http://localhost:3000/api/transactions` | API: 交易歷史 |
| `http://localhost:3000/api/transactions/transfer` | API: 轉帳 |
| `http://localhost:3000/api/admin/users` | API: 管理者使用者列表 |
| `http://localhost:3000/api/admin/transactions` | API: 管理者交易列表 |
| `http://localhost:3000/api/admin/transactions/stats` | API: 管理者交易統計 |

### 執行測試

```bash
# 單元測試（Vitest）
npx vitest run

# API 整合測試（需要先啟動 npm run dev）
bash tests/api.test.sh
```

---

## 設計決策問答

### Q1: 為什麼選擇 Next.js 全端架構，而非 React 前端 + 獨立後端？

Next.js App Router 的全端架構讓同一份 TypeScript 程式碼同時處理前端頁面和後端 API：

1. **統一的型別系統**：Prisma schema 定義一次，前後端共享型別（`Prisma.User`、`Prisma.Wallet` 等）。不需要像 `digital_wallet_frontend` 那樣手寫 `interface Wallet { id: number; ... }`。
2. **Server Components 直接查詢資料庫**：Dashboard 頁面可以直接 `await prisma.wallet.findUnique()`，不需要建立額外的 API endpoint 或使用 fetch。減少 client-server round trip。
3. **單一部署單元**：`next build` 產出一個可部署的 Node.js 應用，同時服務前端靜態資源和後端 API。

### Q2: 為什麼用 Prisma 而非 raw SQL（如 Node.js 版的 pg）？

Prisma 提供三項關鍵價值：

1. **型別安全**：`prisma.user.findUnique({ where: { username: 'alice' } })` 的回傳型別是 `User | null`，TypeScript 強制檢查 nullable。raw SQL 回傳 `any`。
2. **關聯 eager loading**：`include: { fromWallet: { include: { user: true } } }` 一行宣告巢狀關聯載入。raw SQL 需要手寫 JOIN + 手動 nested mapping。
3. **Migration 管理**：Prisma Migrate 自動產生 DDL 並追蹤 schema 變更歷史。

但在樂觀鎖 UPDATE 場景，使用 `updateMany` 而非單純 `update`——因為 Prisma 的 `update()` 不支援在 `where` 中過濾 `version` 這樣的非 unique 欄位。

### Q3: 為什麼用 jose 而非 jsonwebtoken？

`jose` 是專門為現代 JavaScript runtime 設計的 JWT library：

1. **Edge Runtime 相容**：Next.js middleware 在 Edge Runtime 執行。`jsonwebtoken` 使用 `require('crypto')`，在 Edge 環境直接報錯。`jose` 使用 Web Crypto API（`crypto.subtle`），可在 Node.js、Edge、Browser 三種環境無縫執行。
2. **零 native dependency**：純 JavaScript 實作，npm install 從不失敗。
3. **現代 API 設計**：builder pattern（`new SignJWT().setSubject().setIssuedAt().sign()`）符合 async/await 的程式風格。

### Q4: 為什麼用 cookie + middleware 做頁面認證，而非 client-side fetch？

這是 Server Components 架構的必然選擇：

1. **Server Components 無法使用 `useState` / `useEffect`**：它們在伺服器端執行。要取得使用者身份，只能從 request 中讀取（cookie 或 header）。
2. **middleware 是第一道防線**：請求到達 Server Component 之前，middleware 已經執行。無效的 cookie 直接被 redirect，Server Component 甚至不會執行。
3. **Cookie 自動附帶**：瀏覽器自動在每個同源請求中附帶 cookie。API 請求則用 Bearer header（不依賴 cookie），與其他後端 API 合約一致。

### Q5: 為什麼 Server Components 用於資料頁面，Client Components 用於互動頁面？

這是 React 18+ Server Components 的核心設計原則：

- **Server Components**（預設，無 `'use client'`）：在伺服器端執行，可以直接存取資料庫。輸出的 JS bundle 為零。適合資料展示頁面。限制：不能使用 `useState`、`useEffect`、`onClick`。
- **Client Components**（`'use client'`）：在瀏覽器端執行，可以使用所有 React hooks。適合表單、搜尋框、按鈕互動、Modal。

關鍵模式是：**Server Component 做資料取得 → 傳遞給 Client Component 做互動**。例如 `AdminUsersPage`（Server Component）查詢資料庫 → 傳遞給 `UserTable`（Client Component）處理搜尋、分頁、Enable/Disable 操作。

### Q6: 為什麼 middleware 驗證 JWT 之後，Route Handler 還要再驗證一次？

Next.js middleware 和 Route Handler 執行在不同的 runtime context。middleware 無法將 `userId` 直接注入到 Route Handler 的 request object。

因此 Route Handler 必須自行解析 `Authorization` header 取得 token，再呼叫 `verifyToken()` 取得 `userId`。這是兩層不同的防護：

1. **Middleware 層**：快速攔截——無 token → 立即 401，不會進入 Route Handler。
2. **Route Handler 層**：深度解析——取得 `userId` 用於業務邏輯，並再次檢查 token 有效性。

---

## 安全紅線

### Do / Don't 總結

| Do | Don't |
|-----|-------|
| userId 從 JWT `sub` claim 取得 | 從 URL path 或 query string 取得 userId |
| `prisma.$transaction()` 包裹多步驟寫入 | 分別執行 `create` 後再手動補償 |
| `select` 明確列出回傳欄位 | `findMany()` 不帶 `select`（可能洩漏 `passwordHash`） |
| `updateMany` + version WHERE 條件 | `update` 不檢查 version |
| `Math.min(100, Math.max(1, size))` 限制分頁 | 信任使用者傳入的 `size` 參數 |
| middleware 雙通道驗證（cookie + Bearer） | 只在 middleware 驗證，Route Handler 不驗證 |
| `error.code === 'P2002'` 處理唯一約束違反 | `catch (e) { // 假設一定是 username 重複 }` |
| register 固定 role='ROLE_USER' | 從 request body 讀取 role 參數 |
| token 過期/簽章錯誤 → 統一 401 訊息 | 回傳具體錯誤原因（防止使用者列舉） |
| `params` 作為 Promise `await` | 直接 `params.id`（Next.js 15+ breaking change） |
| `globalThis` cache PrismaClient（dev） | 每次 hot reload 新建 PrismaClient |

---

## 常見錯誤

### 1. BigInt 無法 JSON 序列化

**錯誤寫法**：

```typescript
// BAD：BigInt 無法被 JSON.stringify
const user = await prisma.user.findUnique({ where: { id: 1n } });
return NextResponse.json(user);  // TypeError: Do not know how to serialize a BigInt
```

**正確寫法**：

```typescript
// GOOD：顯式轉 BigInt → Number
return NextResponse.json({
  id: Number(user.id),
  username: user.username,
});
```

### 2. Prisma Client 在 Next.js Fast Refresh 中重複建立

**錯誤寫法**：

```typescript
// BAD：每次 hot reload 都建立新 PrismaClient
export const prisma = new PrismaClient({ adapter: new PrismaPg({ ... }) });
```

**正確寫法**：

```typescript
// GOOD：globalThis cache 確保 dev 環境只有一個實例
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || createPrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 3. `update()` 無法用 version 做樂觀鎖

**錯誤寫法**：

```typescript
// BAD：update() 的 where 只支援 unique field
await tx.wallet.update({
  where: { userId: fromWallet.userId, version: fromWallet.version },
  // version 不是 unique field → Prisma type error
  data: { ... },
});
```

**正確寫法**：

```typescript
// GOOD：updateMany() 支援任意 where 條件組合
const result = await tx.wallet.updateMany({
  where: { userId: fromWallet.userId, version: fromWallet.version },
  data: { balance: { decrement: amount }, version: { increment: 1 } },
});
if (result.count === 0) throw { status: 409, message: 'Concurrent modification detected' };
```

### 4. Server Component 中使用 client-only hooks

**錯誤寫法**：

```typescript
// BAD：Server Component 不能使用 useState
export default function DashboardPage() {
  const [count, setCount] = useState(0);  // Error
}
```

**正確寫法**：

```typescript
// GOOD：Server Component 不使用 hooks，直接 async/await
export default async function DashboardPage() {
  const wallet = await prisma.wallet.findUnique(...);
  return <div>Balance: {Number(wallet.balance)}</div>;
}
```

### 5. Route Handler 中 `await request.json()` 重複呼叫

**錯誤寫法**：

```typescript
// BAD：request body stream 只能讀取一次
const body1 = await request.json();  // OK
const body2 = await request.json();  // Error: body stream already consumed
```

**正確寫法**：

```typescript
// GOOD：一次解析，儲存變數
const body = await request.json();
const username = body.username;
const password = body.password;
```

### 6. Next.js 15+ `params` 作為 Promise 忘記 await

**錯誤寫法**：

```typescript
// BAD：params 是 Promise，不是同步物件
const userId = BigInt(params.id);  // TypeScript error
```

**正確寫法**：

```typescript
// GOOD：await params
const { id } = await params;
const userId = BigInt(id);
```

---

> 此專案為技術驗證／教育用途示範實作。API 合約與 Spring Boot、Spring MVC、Node.js、FastAPI、Laravel、Plain PHP 版本完全互通。前端 `digital_wallet_frontend` 可透過 Bearer token 連接此 Next.js 後端 API，無需修改任何程式碼。同時，此 Next.js 專案內建 React 前端頁面（Server Components + Client Components），可獨立作為全端應用執行。
