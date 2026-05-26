# Digital Wallet Frontend (Demo)

> **技術驗證 / 抄作業項目**：展示 React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4 的全棧前端開發模式。**每一個檔案**、**每一行程式碼**都有解釋，方便後續項目直接複用。

## 技術清單

| 技術 | 版本 | 用途 |
|------|------|------|
| React | 19.2.6 | UI 框架 |
| TypeScript | 6.0.2 | 型別安全 |
| Vite | 8.0.12 | 建構工具 + 開發伺服器 |
| Tailwind CSS | 4.3.0 | Utility-first CSS（暗色主題） |
| React Router | 7.15.1 | 客戶端路由 |
| Axios | 1.16.1 | HTTP 請求 + 攔截器 |

---

## 完整專案結構

```
digital_wallet_frontend/
├── vite.config.ts                 # Vite + React + Tailwind 插件 + /api 代理
├── tsconfig.json                  # TypeScript 配置入口
├── tsconfig.app.json              # 應用程式 TS 配置
├── eslint.config.js               # ESLint
├── package.json                   # 依賴與腳本
│
└── src/
    ├── main.tsx                    # React 入口：createRoot + StrictMode
    ├── App.tsx                     # 路由 + AuthEventListener（401 攔截 + 客戶端導航）
    ├── index.css                   # Tailwind v4 @theme 暗色主題
    │
    ├── types/
    │   └── index.ts                # 所有 TS 介面（User, Wallet, Transaction, DTOs...）
    │
    ├── contexts/
    │   └── AuthContext.tsx          # 全局認證：token/user localStorage 持久化 + login/logout
    │
    ├── hooks/
    │   └── useForm.ts              # 泛型表單 Hook：驗證 + 提交 + 錯誤管理
    │
    ├── services/                   # API 呼叫層
    │   ├── api.ts                  #   Axios 實例 + JWT 攔截器 + 401 CustomEvent
    │   ├── authService.ts          #   login()、register()
    │   ├── walletService.ts        #   getWallet()
    │   └── transactionService.ts   #   transfer()、getTransactionHistory()
    │
    ├── components/
    │   ├── ui/                     # 通用 UI 元件庫
    │   │   ├── Button.tsx          #   variant 枚舉 + isLoading
    │   │   ├── Input.tsx           #   forwardRef + label + error
    │   │   ├── Card.tsx            #   padding 枚舉 + className 合併
    │   │   ├── Modal.tsx           #   Portal + ESC + backdrop 點擊關閉
    │   │   ├── Badge.tsx           #   success/warning/info/danger
    │   │   ├── Spinner.tsx         #   SVG 旋轉動畫
    │   │   ├── EmptyState.tsx      #   空狀態（多種圖示）
    │   │   └── ProtectedRoute.tsx  #   路由守衛
    │   │
    │   └── layout/
    │       ├── AppLayout.tsx       #   已登入佈局（Sidebar + Outlet）
    │       ├── AuthLayout.tsx      #   未登入佈局（居中卡片）
    │       └── Sidebar.tsx         #   側邊欄（導航 + 頭像 + 登出）
    │
    └── pages/
        ├── LoginPage.tsx           #   /login — 登錄表單
        ├── RegisterPage.tsx        #   /register — 註冊表單
        ├── DashboardPage.tsx       #   /dashboard — 餘額 + 操作 + 最近 5 筆
        ├── TransferPage.tsx        #   /transfer — 轉賬 + Modal 確認
        └── TransactionHistoryPage.tsx # /transactions — 歷史 + 過濾 + 統計
```

---

## 如何快速找到要抄的部分

| 你想學/抄什麼 | 直接看這個檔案 |
|-------------|-------------|
| 專案初始化 (vite + tailwind 4 + ts) | [vite.config.ts](vite.config.ts) + [package.json](package.json) |
| Tailwind 4 暗色主題設定 | [index.css](src/index.css) |
| 全部型別定義 (對應後端 DTO) | [types/index.ts](src/types/index.ts) |
| React 入口 (createRoot) | [main.tsx](src/main.tsx) |
| React Router 嵌套路由 + Layout | [App.tsx](src/App.tsx) |
| JWT localStorage 持久化 + AuthContext | [contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) |
| Axios 攔截器 (Token + 401) | [services/api.ts](src/services/api.ts) |
| 通用表單 Hook (useForm) | [hooks/useForm.ts](src/hooks/useForm.ts) |
| 登錄/註冊頁面完整實作 | [pages/LoginPage.tsx](src/pages/LoginPage.tsx) + [pages/RegisterPage.tsx](src/pages/RegisterPage.tsx) |
| 交易方向判斷 (Sent/Received) | [pages/DashboardPage.tsx:28-30](src/pages/DashboardPage.tsx) + [pages/TransactionHistoryPage.tsx:50-63](src/pages/TransactionHistoryPage.tsx) |
| Modal 二次確認模式 | [pages/TransferPage.tsx](src/pages/TransferPage.tsx) + [components/ui/Modal.tsx](src/components/ui/Modal.tsx) |
| Button/Input/Card 元件 | [components/ui/](src/components/ui/) |
| Sidebar 導航 + 登出 | [components/layout/Sidebar.tsx](src/components/layout/Sidebar.tsx) |
| 路由守衛 | [components/ui/ProtectedRoute.tsx](src/components/ui/ProtectedRoute.tsx) |
| Vite proxy (前後端分離) | [vite.config.ts](vite.config.ts) |

---

## 路由架構

```
<BrowserRouter>
  <AuthProvider>              ← 全局認證狀態
    <AuthEventListener />     ← 純邏輯元件（監聽 401 事件，無 UI）
    <Routes>
      <AuthLayout>            ← 未登入佈局
        /login    → LoginPage
        /register → RegisterPage
      </AuthLayout>
      <ProtectedRoute>        ← 路由守衛
        <AppLayout>           ← 已登入佈局
          /dashboard     → DashboardPage
          /transfer      → TransferPage
          /transactions  → TransactionHistoryPage
        </AppLayout>
      </ProtectedRoute>
      /* → Navigate to /dashboard
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

---

## 核心實作模式（每個檔案都有完整程式碼 + 解釋）

### 模式 1：專案入口與配置

#### main.tsx — React 掛載點

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

**為什麼用 `createRoot` 而不是 `ReactDOM.render`：** React 18+ 的 Concurrent Mode 需要 `createRoot`。`!` 是 TypeScript 非空斷言（我們知道 `#root` 一定存在）。

**`StrictMode` 的作用：** 開發時會雙次執行 render/effect 來檢測副作用問題，生產環境無影響。

#### package.json

```json
{
  "name": "digital_wallet_frontend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "@tailwindcss/vite": "^4.3.0",
    "axios": "^1.16.1",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-router-dom": "^7.15.1",
    "tailwindcss": "^4.3.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "typescript": "~6.0.2",
    "vite": "^8.0.12"
    // ... eslint 相關
  }
}
```

**`"type": "module"`：** 啟用 ESM 模組系統（`import`/`export` 語法）。

#### vite.config.ts — Vite 配置

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
```

**為什麼用 proxy 而不是後端開 CORS：** 開發時前端 `localhost:5173`，後端 `localhost:8080`，proxy 將 `/api/*` 轉發到後端，瀏覽器看到的是同源請求。生產環境用 Nginx 反向代理達到同樣效果。

#### tsconfig.app.json — TypeScript 嚴格模式

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

**`noUnusedLocals` / `noUnusedParameters`：** 未使用的變數/參數會報錯，確保程式碼乾淨。

---

### 模式 2：暗色主題 (Tailwind CSS 4)

#### index.css

```css
@import "tailwindcss";

@theme {
  --color-navy-950: #060b18;
  --color-navy-900: #0a0f1e;
  --color-navy-800: #0f1729;
  --color-navy-750: #111c32;
  --color-navy-700: #152034;
  --color-navy-600: #1a2744;
  --color-navy-500: #253656;
  --color-navy-400: #3b4f74;
  --color-navy-300: #5f7499;
  --color-emerald-500: #10b981;
  --color-emerald-400: #34d399;
  --color-emerald-300: #6ee7b7;
  --color-emerald-600: #059669;
  --color-emerald-900: #064e3b;
  --color-amber-500: #f59e0b;
  --color-amber-400: #fbbf24;
  --font-sans: "DM Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}

@layer base {
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    @apply bg-navy-800 text-white font-sans antialiased;
    min-height: 100vh;
  }
  #root { min-height: 100vh; }
}
```

**Tailwind CSS 4 的變化：** 用 CSS-first 配置（`@theme`），不再需要 `tailwind.config.js`。自定義色階讓顏色有語義（emerald=收入、amber=支出、navy=背景）。

---

### 模式 3：型別定義

#### types/index.ts

```typescript
export interface User {
  id: number;
  username: string;
  role: string;
  createdAt: string;
}

export interface Wallet {
  id: number;
  userId: number;
  currency: string;
  balance: number;
  version: number;       // 樂觀鎖版本號
  updatedAt: string;
}

export interface Transaction {
  id: number;
  fromWalletId: number | null;  // null = 系統充值
  toWalletId: number | null;
  amount: number;
  txType: string;               // 'TRANSFER'
  status: string;               // 'SUCCESS'
  createdAt: string;
}

export interface ApiResponse {
  status: string;               // 'SUCCESS' | 'ERROR' (字串，非數字)
  message: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface UserCreateRequest {
  username: string;
  password: string;             // 明文密碼（後端 Service 層做 BCrypt）
  role: string;
}

export interface TransferRequest {
  toUsername: string;
  amount: string;
}
```

**`fromWalletId: number | null`：** `null` 表示系統充值（沒有發送方錢包）。前端用這欄位比對當前用戶的 wallet ID 來判斷方向。

---

### 模式 4：AuthContext — 全局認證狀態

#### contexts/AuthContext.tsx

```tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

// 初始化時從 localStorage 恢復狀態（F5 刷新不丟失登入）
function getStoredAuth() {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  if (token && userStr) {
    try {
      return { token, user: JSON.parse(userStr) as User };
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const stored = getStoredAuth();
  const [token, setToken] = useState<string | null>(stored?.token ?? null);
  const [user, setUser] = useState<User | null>(stored?.user ?? null);

  const login = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, user, isAuthenticated: !!token, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

**關鍵設計：**
- `useState` 初始值從 `localStorage` 讀取 → F5 不丟失登入
- `useCallback` 包 `login`/`logout` → Context value 不因 re-render 而變（減少子元件重渲染）
- `JSON.parse` 用 try-catch → 防止手動篡改 localStorage 導致崩潰
- `useAuth()` 內建 null check → 忘記包 Provider 會立刻報錯

---

### 模式 5：Axios 攔截器 + 401 處理

#### services/api.ts

```tsx
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// 請求攔截器：自動從 localStorage 帶 JWT Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 響應攔截器：401 → CustomEvent（不整頁刷新）
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  },
);

export default api;
```

**為什麼用 `CustomEvent` 而不是 `window.location.href`：**
- ❌ `window.location.href = '/login'` → **整頁刷新**，丟失所有 React 狀態
- ✅ `CustomEvent('auth:unauthorized')` → `AuthEventListener` 監聽 → `logout()` + `navigate('/login')` → SPA 體驗

#### 三個 Service 檔案

```typescript
// authService.ts
import api from './api';
import type { LoginRequest, LoginResponse, UserCreateRequest } from '../types';

export function login(data: LoginRequest): Promise<LoginResponse> {
  return api.post('/auth/login', data).then((res) => res.data);
}

export function register(data: UserCreateRequest): Promise<void> {
  return api.post('/auth/register', data).then((res) => res.data);
}

// walletService.ts
import api from './api';
import type { Wallet } from '../types';

export function getWallet(): Promise<Wallet> {
  return api.get('/wallets').then((res) => res.data);
}

// transactionService.ts
import api from './api';
import type { Transaction, TransferRequest } from '../types';

export function transfer(data: TransferRequest): Promise<void> {
  return api.post('/transactions/transfer', data).then((res) => res.data);
}

export function getTransactionHistory(): Promise<Transaction[]> {
  return api.get('/transactions').then((res) => res.data);
}
```

**為什麼 API 路徑不帶 `/{userId}`：** 後端從 JWT 自動提取用戶身份，無需前端傳遞。這是 IDOR 防護的一部分。

---

### 模式 6：App.tsx — 路由 + AuthEventListener

```tsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ui/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import AuthLayout from './components/layout/AuthLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransferPage from './pages/TransferPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';

// 監聽 auth:unauthorized 事件，執行客戶端導航（無整頁刷新）
function AuthEventListener() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const handler = () => {
      logout();
      navigate('/login', { replace: true });
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, [navigate, logout]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthEventListener />
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/transfer" element={<TransferPage />} />
              <Route path="/transactions" element={<TransactionHistoryPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

**`AuthEventListener` 位置要求：** 必須在 `<BrowserRouter>` 和 `<AuthProvider>` 內部（因為使用 `useNavigate` 和 `useAuth`）。

**`return null`：** 純邏輯元件，不參與 DOM 渲染。

---

### 模式 7：佈局元件

#### AuthLayout.tsx — 未登入頁面佈局

```tsx
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M12 9v6M9 12h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-white">Digital Wallet</h1>
          <p className="mt-1 text-sm text-navy-300">Secure USDT wallet management</p>
        </div>
        <Outlet />   {/* 子路由（LoginPage/RegisterPage）渲染在這裡 */}
      </div>
    </div>
  );
}
```

#### AppLayout.tsx — 已登入頁面佈局

```tsx
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />   {/* 子路由（Dashboard/Transfer/History）渲染在這裡 */}
      </main>
    </div>
  );
}
```

#### Sidebar.tsx — 側邊欄（導航 + 頭像 + 登出）

```tsx
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </svg>
    ),
  },
  {
    to: '/transfer',
    label: 'Transfer',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 014-4h14" />
        <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 01-4 4H3" />
      </svg>
    ),
  },
  {
    to: '/transactions',
    label: 'History',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20a8 8 0 100-16 8 8 0 000 16z" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="flex w-64 flex-col border-r border-navy-600 bg-navy-900">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-navy-600 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M12 9v6M9 12h6" />
          </svg>
        </div>
        <span className="text-base font-semibold tracking-tight text-white">Digital Wallet</span>
      </div>

      {/* 導航 */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-navy-300 hover:bg-navy-700 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* 用戶區 + 登出 */}
      <div className="border-t border-navy-600 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-500 text-sm font-medium text-navy-200">
            {user?.username?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username ?? 'User'}</p>
            <p className="text-xs text-navy-400">{user?.role ?? ''}</p>
          </div>
          <button onClick={logout} className="flex h-8 w-8 items-center justify-center rounded-lg text-navy-400 hover:bg-navy-700 hover:text-white transition-colors" title="Logout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
```

**為什麼用 `useLocation` 而不是 `NavLink` 的 `className` callback：** `NavLink` 本身支援 `className={({ isActive }) => ...}`，但這個專案選擇用 `useLocation` 手動比對，兩種都可以。

---

### 模式 8：UI 元件庫

#### Button.tsx

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  isLoading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary:   'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20',
  secondary: 'bg-navy-600 hover:bg-navy-500 text-white border border-navy-400',
  danger:    'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30',
  ghost:     'bg-transparent hover:bg-navy-700 text-navy-300 hover:text-white',
};

export default function Button({
  variant = 'primary',
  isLoading,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${className}`}
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

**為什麼 variant 用 `Record<Variant, string>`：** TypeScript 會檢查所有 variant 都有對應樣式。新增 variant 只需加一行。

#### Input.tsx

```tsx
import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && <label className="block text-sm font-medium text-navy-200">{label}</label>}
        <input
          ref={ref}
          className={`w-full rounded-xl border bg-navy-700 px-4 py-2.5 text-sm text-white placeholder-navy-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
            error ? 'border-red-500/50' : 'border-navy-500 hover:border-navy-400'
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';
export default Input;
```

**為什麼用 `forwardRef`：** 允許父元件用 `ref` 直接存取原生 `<input>`。`displayName` 讓 React DevTools 顯示正確名稱。

#### Card.tsx

```tsx
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div className={`rounded-2xl border border-navy-600 bg-navy-750 backdrop-blur-sm ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}
```

#### Modal.tsx

```tsx
import { useEffect, type ReactNode } from 'react';
import Button from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  isLoading?: boolean;
}

export default function Modal({
  open, onClose, onConfirm, title, children,
  confirmLabel = 'Confirm', confirmVariant = 'primary', isLoading,
}: ModalProps) {
  // ESC 關閉
  useEffect(() => {
    if (open) {
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop：點擊關閉 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-navy-500 bg-navy-750 p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <div className="text-sm text-navy-200 mb-6">{children}</div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={confirmVariant} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**為什麼 ESC 監聽放 `useEffect`：**
- `open` 為 false 時不需要監聽
- cleanup 函數 `removeEventListener` 防止記憶體洩漏

#### Badge.tsx

```tsx
type Variant = 'success' | 'warning' | 'info' | 'danger';

interface BadgeProps { children: string; variant?: Variant; }

const variantStyles: Record<Variant, string> = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  info:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  danger:  'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function Badge({ children, variant = 'info' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-xs font-medium ${variantStyles[variant]}`}>
      {children}
    </span>
  );
}
```

#### Spinner.tsx

```tsx
interface SpinnerProps { className?: string; }

export default function Spinner({ className = 'h-8 w-8' }: SpinnerProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <svg className={`animate-spin text-emerald-400 ${className}`} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-80" />
      </svg>
    </div>
  );
}
```

#### EmptyState.tsx

```tsx
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: 'wallet' | 'transfer' | 'history' | 'empty';
}

const icons: Record<string, ReactNode> = {
  wallet: (/* SVG */),
  transfer: (/* SVG */),
  history: (/* SVG */),
  empty: (/* SVG */),
};

export default function EmptyState({ title, description, icon = 'empty' }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4">{icons[icon]}</div>
      <h3 className="text-lg font-medium text-white mb-1">{title}</h3>
      <p className="text-sm text-navy-300 max-w-sm">{description}</p>
    </div>
  );
}
```

#### ProtectedRoute.tsx

```tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
```

**為什麼用 `<Navigate>` 而不是 `useEffect` + `navigate`：** `<Navigate>` 是宣告式，React Router 可在 render 階段就決定路由，不會多一次 render 閃爍。

---

### 模式 9：通用表單 Hook (useForm)

#### hooks/useForm.ts

```tsx
import { useState, useCallback, type ChangeEvent, type FormEvent } from 'react';

interface UseFormOptions<T> {
  initialState: T;
  onSubmit: (values: T) => Promise<void>;
  validate?: (values: T) => Partial<Record<string, string>>;
}

export function useForm<T>({
  initialState,
  onSubmit,
  validate,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setValues((prev) => ({ ...prev, [name]: value }));
      // 修改欄位時清除該欄位的錯誤
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      if (serverError) setServerError(null);
    },
    [serverError],
  );

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      setServerError(null);

      if (validate) {
        const validationErrors = validate(values);
        if (Object.keys(validationErrors).length > 0) {
          setErrors(validationErrors as Record<string, string>);
          return;  // 驗證失敗，不發請求
        }
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
        setServerError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate, onSubmit],
  );

  return { values, errors, isSubmitting, serverError, handleChange, handleSubmit, setValues };
}
```

**為什麼這樣設計：**
- 泛型 `<T>`：每個表單有自己型別安全的 values
- `handleChange` 靠 `input` 的 `name` 屬性動態更新對應欄位（`[name]: value`）
- `validate` 和 `onSubmit` 解耦：驗證失敗 → 不發請求；提交失敗 → 顯示 serverError
- `isSubmitting`：控制按鈕 loading、防止重複提交
- 清除策略：修改欄位 → 清除該欄位錯誤；任何修改 → 清除 serverError

---

### 模式 10：頁面元件

#### LoginPage.tsx

```tsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { login as loginService } from '../services/authService';
import { useForm } from '../hooks/useForm';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import type { AxiosError } from 'axios';

interface LoginForm {
  username: string;
  password: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const { values, errors, isSubmitting, serverError, handleChange, handleSubmit } =
    useForm<LoginForm>({
      initialState: { username: '', password: '' },
      validate: (v) => {
        const errs: Record<string, string> = {};
        if (!v.username.trim()) errs.username = 'Username is required';
        if (!v.password) errs.password = 'Password is required';
        return errs;
      },
      onSubmit: async (v) => {
        const res = await loginService({ username: v.username.trim(), password: v.password });
        login(res.token, res.user);
        navigate('/dashboard', { replace: true });
      },
    });

  return (
    <Card>
      <h2 className="text-lg font-semibold text-white mb-5">Sign in</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {serverError}
          </div>
        )}
        <Input label="Username" name="username" value={values.username}
          onChange={handleChange} error={errors.username}
          placeholder="Enter your username" autoComplete="username" />
        <Input label="Password" name="password" type="password"
          value={values.password} onChange={handleChange} error={errors.password}
          placeholder="Enter your password" autoComplete="current-password" />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-navy-300">
        Don't have an account?{' '}
        <Link to="/register" className="text-emerald-400 hover:text-emerald-300">
          Create one
        </Link>
      </p>
    </Card>
  );
}
```

**為什麼用 `v.username.trim()`：** 用戶可能不小心輸入前後空白。

#### RegisterPage.tsx

```tsx
import { Link, useNavigate } from 'react-router-dom';
import { register as registerService } from '../services/authService';
import { useForm } from '../hooks/useForm';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import type { AxiosError } from 'axios';

interface RegisterForm {
  username: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();

  const { values, errors, isSubmitting, serverError, handleChange, handleSubmit } =
    useForm<RegisterForm>({
      initialState: { username: '', password: '', confirmPassword: '' },
      validate: (v) => {
        const errs: Record<string, string> = {};
        if (!v.username.trim()) errs.username = 'Username is required';
        else if (v.username.trim().length < 3) errs.username = 'Username must be at least 3 characters';
        if (!v.password) errs.password = 'Password is required';
        else if (v.password.length < 6) errs.password = 'Password must be at least 6 characters';
        if (!v.confirmPassword) errs.confirmPassword = 'Please confirm your password';
        else if (v.password !== v.confirmPassword) errs.confirmPassword = 'Passwords do not match';
        return errs;
      },
      onSubmit: async (v) => {
        await registerService({
          username: v.username.trim(),
          password: v.password,
        });
        navigate('/login', { replace: true });
      },
    });

  return (
    <Card>
      <h2 className="text-lg font-semibold text-white mb-5">Create account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {serverError}
          </div>
        )}
        <Input label="Username" name="username" value={values.username}
          onChange={handleChange} error={errors.username}
          placeholder="Choose a username" autoComplete="username" />
        <Input label="Password" name="password" type="password"
          value={values.password} onChange={handleChange} error={errors.password}
          placeholder="Create a password" autoComplete="new-password" />
        <Input label="Confirm Password" name="confirmPassword" type="password"
          value={values.confirmPassword} onChange={handleChange} error={errors.confirmPassword}
          placeholder="Confirm your password" autoComplete="new-password" />
        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-navy-300">
        Already have an account?{' '}
        <Link to="/login" className="text-emerald-400 hover:text-emerald-300">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
```

**為什麼密碼確認 (`confirmPassword`) 在 `validate` 中做而不是後端：** 純前端驗證，如果兩個密碼不一致後端永遠不會知道 — 前端提前攔截，減少無效請求。

#### DashboardPage.tsx

```tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getWallet } from '../services/walletService';
import { getTransactionHistory } from '../services/transactionService';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import type { Wallet, Transaction } from '../types';

function formatBalance(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 4,
  }).format(amount) + ` ${currency}`;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

// 交易行元件：用 wallet.id 比對判斷方向
function TransactionRow({ tx, walletId }: { tx: Transaction; walletId: number }) {
  const isIncoming = tx.toWalletId === walletId;  // 關鍵：比對錢包 ID，非檢查 null

  return (
    <div className="flex items-center justify-between py-3 border-b border-navy-600 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-full ${
          isIncoming ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
        }`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isIncoming
              ? <path d="M7 17l9.2-9.2M17 17V7H7" />
              : <path d="M17 7l-9.2 9.2M7 7v10h10" />}
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-white">{isIncoming ? 'Received' : 'Sent'} USDT</p>
          <p className="text-xs text-navy-300">{formatDate(tx.createdAt)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-mono font-medium ${isIncoming ? 'text-emerald-400' : 'text-amber-400'}`}>
          {isIncoming ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)} USDT
        </p>
        <Badge variant={tx.status === 'SUCCESS' ? 'success' : 'warning'}>{tx.status}</Badge>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    // 並行請求錢包 + 交易
    Promise.all([getWallet(), getTransactionHistory()])
      .then(([w, txs]) => { setWallet(w); setTransactions(txs.slice(0, 5)); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load data'))
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <Spinner className="h-10 w-10" />;

  if (error) {
    return (
      <div className="p-8"><Card><div className="text-center py-12">
        <p className="text-red-400 text-sm">{error}</p>
      </div></Card></div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-6">
        Welcome back{user?.username ? `, ${user.username}` : ''}
      </h1>

      {/* 餘額卡片 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-750 via-navy-750 to-emerald-900/30 border border-navy-600 p-6 mb-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-navy-200">Total Balance</p>
            <div className="flex items-center gap-1.5 rounded-lg bg-navy-800/50 px-2.5 py-1 text-xs text-emerald-400 font-medium border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />Live
            </div>
          </div>
          <p className="text-4xl font-mono font-bold text-white tracking-tight">
            {wallet ? formatBalance(wallet.balance, wallet.currency) : '0.00 USDT'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-navy-300">Wallet #{wallet?.id ?? '—'}</span>
            <span className="text-navy-500">•</span>
            <span className="text-xs text-navy-300">v{wallet?.version ?? 0}</span>
          </div>
        </div>
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Link to="/transfer" className="flex items-center gap-3 rounded-xl bg-navy-750 border border-navy-600 p-4 hover:border-emerald-500/30 hover:bg-navy-700 transition-all group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            {/* SVG icon */}
          </div>
          <div><p className="text-sm font-medium text-white">Send USDT</p>
            <p className="text-xs text-navy-300">Transfer to others</p></div>
        </Link>
        <Link to="/transactions" className="flex items-center gap-3 rounded-xl bg-navy-750 border border-navy-600 p-4 hover:border-emerald-500/30 hover:bg-navy-700 transition-all group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            {/* SVG icon */}
          </div>
          <div><p className="text-sm font-medium text-white">History</p>
            <p className="text-xs text-navy-300">View all transactions</p></div>
        </Link>
        <div className="flex items-center gap-3 rounded-xl bg-navy-750 border border-navy-600 p-4 opacity-50 cursor-not-allowed">
          <div><p className="text-sm font-medium text-white">Analytics</p>
            <p className="text-xs text-navy-300">Coming soon</p></div>
        </div>
      </div>

      {/* 最近交易 */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-white">Recent Transactions</h2>
          <Link to="/transactions" className="text-xs text-emerald-400 hover:text-emerald-300">View all</Link>
        </div>
        {transactions.length === 0 ? (
          <EmptyState icon="history" title="No transactions yet"
            description="Your transaction history will appear here once you start sending or receiving USDT." />
        ) : (
          <div className="mt-2">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} walletId={wallet!.id} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
```

#### TransferPage.tsx

```tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getWallet } from '../services/walletService';
import { transfer as transferService } from '../services/transactionService';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import type { Wallet } from '../types';
import type { AxiosError } from 'axios';

export default function TransferPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ toUsername: '', amount: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;
    getWallet().then(setWallet)
      .catch((err) => setServerError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [user]);

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    const toUsername = form.toUsername.trim();
    const amount = form.amount.trim();

    if (!toUsername) errs.toUsername = 'Recipient username is required';
    else if (toUsername.toLowerCase() === user?.username?.toLowerCase()) errs.toUsername = 'Cannot transfer to yourself';

    if (!amount) errs.amount = 'Amount is required';
    else if (!/^\d+(\.\d{1,4})?$/.test(amount)) errs.amount = 'Invalid amount format';
    else if (parseFloat(amount) <= 0) errs.amount = 'Amount must be greater than 0';
    else if (wallet && parseFloat(amount) > wallet.balance) errs.amount = 'Insufficient balance';

    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setShowConfirm(true);  // ← 先顯示確認 Modal
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      await transferService({
        toUsername: form.toUsername.trim(),
        amount: form.amount.trim(),
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setServerError(axiosErr.response?.data?.message || 'Transfer failed');
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  }

  if (loading) return <Spinner className="h-10 w-10" />;

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-1">Send USDT</h1>
      <p className="text-sm text-navy-300 mb-6">Transfer USDT to another wallet</p>

      {wallet && (
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-navy-750 border border-navy-600 px-4 py-3">
          <span className="text-sm text-navy-300">Available:</span>
          <span className="text-sm font-mono font-semibold text-white">
            {wallet.balance.toFixed(4)} {wallet.currency}
          </span>
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {serverError}
            </div>
          )}
          <Input label="Recipient Username" name="toUsername" value={form.toUsername}
            onChange={(e) => { setForm(prev => ({ ...prev, toUsername: e.target.value })); setErrors(prev => { const n = {...prev}; delete n.toUsername; return n; }); }}
            error={errors.toUsername} placeholder="Enter recipient's username" />
          <Input label="Amount (USDT)" name="amount" type="text" inputMode="decimal"
            value={form.amount}
            onChange={(e) => { setForm(prev => ({ ...prev, amount: e.target.value })); setErrors(prev => { const n = {...prev}; delete n.amount; return n; }); }}
            error={errors.amount} placeholder="0.00" />
          <Button type="submit" className="w-full">Review Transfer</Button>
        </form>
      </Card>

      <Modal open={showConfirm} onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm} title="Confirm Transfer"
        confirmLabel="Send USDT" isLoading={isSubmitting}>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-navy-300">To Username</span>
            <span className="text-white font-medium">{form.toUsername.trim()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-navy-300">Amount</span>
            <span className="text-white font-mono font-semibold">
              {parseFloat(form.amount || '0').toFixed(4)} USDT
            </span>
          </div>
          <div className="border-t border-navy-600 pt-3 flex justify-between text-sm">
            <span className="text-navy-300">Remaining Balance</span>
            <span className="text-amber-400 font-mono font-medium">
              {wallet ? (wallet.balance - parseFloat(form.amount || '0')).toFixed(4) : '0.0000'} USDT
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

**為什麼 TransferPage 不用 useForm Hook：** 因為它需要額外邏輯（餘額即時檢查、Modal 確認），useForm 的泛型模式不適合這種非標準表單流程。權衡後選擇手寫。

#### TransactionHistoryPage.tsx

```tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getWallet } from '../services/walletService';
import { getTransactionHistory } from '../services/transactionService';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import type { Transaction, Wallet } from '../types';

type Filter = 'all' | 'sent' | 'received';

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(new Date(dateStr));
}

export default function TransactionHistoryPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    // 並行請求：需要 wallet.id 來判斷方向
    Promise.all([getWallet(), getTransactionHistory()])
      .then(([w, txs]) => { setWallet(w); setTransactions(txs); })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [user]);

  // 過濾：用 wallet.id 比對
  const filtered = transactions.filter((tx) => {
    if (!wallet) return true;
    if (filter === 'sent')    return tx.fromWalletId === wallet.id;
    if (filter === 'received') return tx.toWalletId === wallet.id;
    return true;
  });

  const totalSent = transactions
    .filter((tx) => wallet && tx.fromWalletId === wallet.id)
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  const totalReceived = transactions
    .filter((tx) => wallet && tx.toWalletId === wallet.id)
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  if (loading) return <Spinner className="h-10 w-10" />;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-1">Transaction History</h1>
      <p className="text-sm text-navy-300 mb-6">A complete record of all your transfers</p>

      {/* 統計卡片 */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <p className="text-xs font-medium text-navy-300 uppercase tracking-wide mb-1">Total Sent</p>
            <p className="text-lg font-mono font-semibold text-amber-400">-{totalSent.toFixed(2)} USDT</p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-navy-300 uppercase tracking-wide mb-1">Total Received</p>
            <p className="text-lg font-mono font-semibold text-emerald-400">+{totalReceived.toFixed(2)} USDT</p>
          </Card>
        </div>
      )}

      {/* 過濾按鈕 */}
      <div className="flex gap-2 mb-4">
        {(['all', 'sent', 'received'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-navy-750 text-navy-300 border border-navy-600 hover:text-white'
            }`}>
            {f === 'all' ? 'All' : f === 'sent' ? 'Sent' : 'Received'}
          </button>
        ))}
      </div>

      {/* 錯誤 */}
      {error && (<Card><div className="text-center py-12"><p className="text-red-400 text-sm">{error}</p></div></Card>)}

      {/* 空狀態 */}
      {!error && filtered.length === 0 && (
        <Card><EmptyState icon="history"
          title={transactions.length === 0 ? 'No transactions yet' : 'No matching transactions'}
          description={transactions.length === 0
            ? 'Your transaction history will appear here once you start sending or receiving USDT.'
            : 'Try changing the filter to see more transactions.'} />
        </Card>
      )}

      {/* 交易表格 */}
      {filtered.length > 0 && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-600">
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase">TX ID</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => {
                  const isIncoming = wallet ? tx.toWalletId === wallet.id : false;
                  return (
                    <tr key={tx.id} className="border-b border-navy-600 last:border-0 hover:bg-navy-700/50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                            isIncoming ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                          }`}>
                            {/* SVG icon */}
                          </div>
                          <span className="text-sm text-white font-medium">{isIncoming ? 'Received' : 'Sent'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`font-mono text-sm font-medium ${isIncoming ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {isIncoming ? '+' : '-'}{parseFloat(tx.amount).toFixed(4)} USDT
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={tx.status === 'SUCCESS' ? 'success' : 'warning'}>{tx.status}</Badge>
                      </td>
                      <td className="px-5 py-4"><span className="text-sm text-navy-200">{formatDate(tx.createdAt)}</span></td>
                      <td className="px-5 py-4"><span className="text-xs text-navy-400 font-mono">#{tx.id}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-navy-600 px-5 py-3">
            <p className="text-xs text-navy-300">
              Showing {filtered.length} of {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
```

---

## 交易方向判斷 — 常見錯誤對比

這是整個前後端聯動中最容易出錯的部分：

```tsx
// ❌ 錯誤寫法：fromWalletId !== null 永遠為 true
const isSender = tx.fromWalletId !== null;
const isIncoming = !isSender;            // 永遠 false
if (filter === 'received') return tx.fromWalletId === null;  // 永遠 false

// ✅ 正確寫法：比對當前用戶的錢包 ID
const isIncoming = tx.toWalletId === walletId;   // 我是接收方 → 收入
const isSender = tx.fromWalletId === walletId;    // 我是發送方 → 支出
if (filter === 'received') return tx.toWalletId === walletId;
```

**為什麼需要 wallet ID：** 後端 `Transaction` 儲存的是 `fromWalletId` / `toWalletId`（錢包 ID，非用戶 ID）。要判斷交易對「當前用戶」是收入還是支出，必須比對當前用戶的錢包 ID。

---

## 數據流摘要

### 登錄流程
```
LoginPage → authService.login() → POST /api/auth/login
  → { token, user }
  → AuthContext.login(token, user) → localStorage + state
  → navigate('/dashboard')
```

### Dashboard 加載
```
useEffect → Promise.all([getWallet(), getTransactionHistory()])
  → GET /api/wallets（Axios 自動帶 Token）
  → GET /api/transactions（Axios 自動帶 Token）
  → 渲染餘額卡片 + 最近 5 筆交易
```

### 轉賬
```
填表 → validate() → 點擊 "Review Transfer"
  → Modal 確認（顯示收款人用戶名、金額、剩餘餘額）
  → 點擊 "Send USDT" → transferService.transfer({ toUsername, amount })
  → POST /api/transactions/transfer  { toUsername, amount }
  → 成功 → navigate('/dashboard')
  → 失敗 → 顯示 serverError
```

### Token 過期 (401)
```
任一 API 返回 401
  → Axios 攔截器 → dispatchEvent('auth:unauthorized')
  → AuthEventListener: logout() + navigate('/login')
  → 無整頁刷新
```

---

## 設計決策問答

### 為什麼 Token 存 localStorage 而不是 HttpOnly Cookie？

| localStorage | HttpOnly Cookie |
|------|------|
| ✅ JavaScript 可讀寫 | ❌ JS 無法讀取 |
| ❌ XSS 可竊取 | ✅ XSS 無法讀取 |
| ✅ 手動附加 Header | ❌ 自動發送（CSRF 風險） |

**選 localStorage**：實作簡單。生產環境安全要求高可改用 HttpOnly Cookie。

### 為什麼前端 + 後端都要驗證？

- **前端驗證**：UX（即時回饋，省請求）
- **後端驗證**：Security（不可信任客戶端）
- ⚠️ 絕不能只在前端驗證

### 為什麼 Dashboard 用 Promise.all？

```tsx
// ✅ 並行：總耗時 = max(請求1, 請求2)
Promise.all([getWallet(), getTransactionHistory()])

// ❌ 串列：總耗時 = 請求1 + 請求2
const w = await getWallet()
const txs = await getTransactionHistory()
```

### 為什麼 ProtectedRoute 用 `<Navigate>` 而不是 `useEffect` + `navigate`？

`<Navigate>` 是宣告式，React Router 在 render 階段就決定路由，不會有閃爍。

### 為什麼 AuthLayout 和 AppLayout 分開？

- `AuthLayout`：未登入（居中卡片、品牌展示）
- `AppLayout`：已登入（側邊欄 + 主內容區）
- 嵌套路由讓切換乾淨，不需每個頁面判斷「是否登入」

---

## 常見錯誤

| 錯誤 | 後果 | 正確做法 |
|------|------|------|
| `tx.fromWalletId !== null` 判斷方向 | 所有交易顯示為 Sent | `tx.fromWalletId === wallet.id` |
| `window.location.href` 處理 401 | 整頁刷新 | CustomEvent + AuthEventListener |
| `input type="number"` 用於金額 | 行動端鍵盤不友好 | `type="text" inputMode="decimal"` |
| 不處理 API 錯誤 | 白畫面 | loading / error / success 三態 |
| useEffect 沒依賴陣列 | 每次 render 都發 API | 加 `[]` 或正確依賴 |
| Token 過期仍留 localStorage | 舊 UI | 攔截 401 → logout + 導航 |
| `useEffect` 中 setState 但沒 cleanup | Memory leak | AbortController 或 cleanup |

---

## 啟動方式

```bash
npm install
npm run dev        # http://localhost:5173（需後端先啟動在 :8080）
npm run build      # TypeScript 型別檢查 + Vite 打包
npm run preview    # 預覽生產構建
```

---

## API 端點對照（前端 ↔ 後端）

| 前端 Service 函數 | HTTP | 路徑 | 請求體 | 響應 |
|------|------|------|------|------|
| `authService.login()` | POST | `/api/auth/login` | `LoginRequest` | `LoginResponse` |
| `authService.register()` | POST | `/api/auth/register` | `UserCreateRequest` | `ApiResponse` |
| `walletService.getWallet()` | GET | `/api/wallets` | — | `Wallet` |
| `transactionService.transfer()` | POST | `/api/transactions/transfer` | `TransferRequest` | `ApiResponse` |
| `transactionService.getTransactionHistory()` | GET | `/api/transactions` | — | `Transaction[]` |
