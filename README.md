# 數位錢包全棧 Demo

> 同一個 API 規格，六種技術棧實現後端 + 一個 React 前端。**每個子專案都有獨立的 README**，這裡只做導航。

## 專案地圖

```
handonprogramming/
├── digital_wallet/               ← Spring Boot 3.5 + MyBatis
├── digital_wallet_springmvc/     ← Spring MVC 6（無 Boot，傳統 XML 配置）
├── digital_wallet_nodejs/        ← Node.js + Express + pg
├── digital_wallet_fastapi/       ← Python + FastAPI + SQLAlchemy
├── digital_wallet_laravel/       ← PHP + Laravel 11 + Eloquent
├── digital_wallet_php/           ← PHP 純手寫（無框架，只依賴一個 JWT 庫）
└── digital_wallet_frontend/      ← React + TypeScript + Tailwind
```

## 我該看哪一個？

| 我想… | 看這個 | 特點 |
|-------|--------|------|
| 學 Java 企業級後端 | [digital_wallet](digital_wallet/) | Spring Boot 全家桶，自動配置，業界標準 |
| 理解 Spring Boot 之前的 Java Web | [digital_wallet_springmvc](digital_wallet_springmvc/) | web.xml + XML bean + WAR 部署，展示 Boot 幫你省了多少事 |
| 用 Node.js 寫後端 | [digital_wallet_nodejs](digital_wallet_nodejs/) | Express 中介層模式，手寫 SQL，無 ORM |
| 用 Python 寫非同步後端 | [digital_wallet_fastapi](digital_wallet_fastapi/) | async/await，自動 Swagger 文檔，Pydantic 驗證 |
| 用 PHP 框架開發 | [digital_wallet_laravel](digital_wallet_laravel/) | Eloquent ORM，優雅語法，豐富生態 |
| 理解框架底層原理 | [digital_wallet_php](digital_wallet_php/) | 零框架，只依賴一個 JWT 庫，暴露所有底層細節 |
| 學 React 前端 | [digital_wallet_frontend](digital_wallet_frontend/) | TypeScript + Tailwind CSS，JWT 登入，錢包 UI |

## 各版本特點

### Spring Boot — 企業標準
檔案最少、配置最簡。`@Transactional` 一行搞定事務，`@Valid` 一行搞定驗證，`application.yaml` 一行配置 DataSource。適合直接拿去當生產專案骨架。

### Spring MVC — 傳統配置
刻意展示 Boot 出現前的開發方式。`web.xml` 手寫 Servlet 生命週期，XML `<bean>` 手動裝配依賴，`<tx:annotation-driven>` 手動配置事務管理。對比 Spring Boot 版，直觀感受自動配置省了多少工作。

### Node.js — 最精簡
全部 ~243 行程式碼，六版本中最短。Express 中介層鏈清晰直觀，`pg` 驅動手寫 SQL 無 ORM，`async/await` 讓非同步像同步。單執行緒事件迴圈 vs 多執行緒的對比也很有啟發性。

### FastAPI — 現代 Python
`async/await` 非同步原生支援，Pydantic v2 一行 `Field(alias="toUsername")` 搞定 camelCase 對應，內建 Swagger UI 零配置。適合對比 Spring Boot 的同步模式。

### Laravel — PHP 框架代表
Eloquent ORM 讓 `User::where('username', $name)->first()` 像寫英文，`DB::transaction(fn)` 讓事務閉包化，FormRequest 讓驗證規則集中在一個檔案。適合對比純 PHP 版，理解框架的好處。

### 純 PHP — 回歸本質
只依賴一個 Composer 套件（`firebase/php-jwt`），其他全部 PHP 內建函數。無 ORM、無 DI 容器、無路由器、無模板引擎。適合理解框架底層原理，也適合維護老舊 PHP 專案的參考。

### React 前端 — 統一客戶端
六個後端接同一個前端，Axios 攔截器統一處理 JWT 和 401，Tailwind CSS 暗色主題，`TransferPage` 客戶端先驗證再 Modal 確認。

## 共通規格

- **API 端點**：`POST /api/auth/register`、`POST /api/auth/login`、`GET /api/wallets`、`POST /api/transactions/transfer`、`GET /api/transactions`
- **錯誤格式**：`{"status":"ERROR","message":"..."}`
- **資料庫**：PostgreSQL `localhost:5433`，資料庫 `digital_wallet`
- **核心業務**：註冊 / 登入 / 查錢包 / 樂觀鎖轉賬 / 交易歷史
