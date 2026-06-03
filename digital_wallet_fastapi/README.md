# Digital Wallet Backend — FastAPI 版 (Demo)

> 技術驗證／參考實作：用 Python FastAPI 生態複現數位錢包的所有功能。API 合約與其他五個後端完全一致。

## 技術清單

| 技術 | 版本 | 用途 |
|------|------|------|
| Python | 3.12+ | 核心語言 |
| FastAPI | >=0.115.0 | 非同步 Web 框架，自動生成 OpenAPI 文件 |
| SQLAlchemy | >=2.0.30 (async) | ORM + 連線池 + 型別提示 DeclarativeBase |
| asyncpg | >=0.29.0 | PostgreSQL 非同步驅動 |
| Pydantic | >=2.7.0 | 資料驗證與請求/響應序列化 |
| passlib[bcrypt] | >=1.7.4 | BCrypt 密碼雜湊 (auto-salt) |
| PyJWT | >=2.8.0 | JWT HS256 簽名與驗證 |
| pydantic-settings | >=2.3.0 | 型別安全環境變數配置 |
| Uvicorn | >=0.30.0 | ASGI 伺服器 |
| python-dotenv | >=1.0.0 | .env 檔案載入 |
| Docker | — | 多階段構建，容器化部署 |

## 專案結構

```
digital_wallet_fastapi/
├── requirements.txt                # Python 依賴 (10 個套件)
├── Dockerfile                      # 多階段 Docker 構建 (build → slim)
├── docker-compose.yml              # PostgreSQL 16 + FastAPI App (port 8000)
├── .env                            # 環境變數 (DATABASE_URL, JWT_SECRET, JWT_EXPIRATION)
├── db.sql                          # 資料庫初始化 DDL (同 Spring Boot 版)
│
├── app/
│   ├── __init__.py                 # (空)
│   ├── main.py                     # FastAPI 入口：路由註冊 + 3 層全域 exception handler
│   ├── config.py                   # pydantic-settings：DATABASE_URL, JWT_SECRET, JWT_EXPIRATION
│   ├── database.py                 # SQLAlchemy async engine + async_sessionmaker + get_db()
│   │
│   ├── models/
│   │   ├── __init__.py             # 集中匯出 User, Wallet, Transaction
│   │   ├── user.py                 # users 表 ORM (username UNIQUE, role=ROLE_USER)
│   │   ├── wallet.py               # wallets 表 ORM (version 樂觀鎖, onupdate=func.now())
│   │   └── transaction.py          # transactions 表 ORM (from_wallet_id, to_wallet_id nullable)
│   │
│   ├── schemas/
│   │   ├── __init__.py             # (空)
│   │   ├── common.py               # ApiResponse (status + message, static factory methods)
│   │   ├── auth.py                 # UserCreate, UserResponse, LoginRequest, LoginResponse
│   │   ├── wallet.py               # WalletResponse (camelCase alias)
│   │   ├── transaction.py          # TransferRequest, TransactionResponse (camelCase alias)
│   │   └── admin.py               # PaginatedResponse[T], UserDetailResponse, AdminTransactionResponse,
│   │                                #   DailyVolumeItem, TransactionStatsResponse
│   │
│   ├── api/
│   │   ├── __init__.py             # (空)
│   │   ├── auth.py                 # POST /api/auth/register (201), POST /api/auth/login
│   │   ├── wallets.py              # GET /api/wallets (需 JWT)
│   │   ├── transactions.py         # POST /api/transactions/transfer, GET /api/transactions (需 JWT)
│   │   └── admin.py               # 6 個管理端點 (需 ROLE_ADMIN)
│   │
│   ├── services/
│   │   ├── __init__.py             # (空)
│   │   ├── auth_service.py         # register(): flush + IntegrityError catch,
│   │   │                            #   login(): ROLE_DISABLED check
│   │   ├── wallet_service.py       # get_wallet_by_user_id(): SELECT + Entity → WalletResponse
│   │   ├── transaction_service.py  # transfer(): 樂觀鎖 deduct + add + 記錄 transaction,
│   │   │                            #   get_transaction_history(): OR WHERE 查詢
│   │   └── admin_service.py       # list_users(): pagination + search,
│   │                                #   get_user_detail(): JOIN user/wallet/transactions,
│   │                                #   disable_user()/enable_user(): role swap,
│   │                                #   list_transactions(): aliased JOIN 4 tables,
│   │                                #   get_transaction_stats(): text() raw SQL GROUP BY
│   │
│   ├── core/
│   │   ├── __init__.py             # (空)
│   │   ├── security.py             # hash_password(), verify_password(),
│   │   │                            #   create_access_token(id, username, role), decode_token()
│   │   └── deps.py                 # get_current_user_id() + require_admin()
│   │                                #   OAuth2PasswordBearer + manual header fallback
│   │
│   └── exceptions/
│       ├── __init__.py             # (空)
│       └── handlers.py             # AppException + 5 子類:
│                                    #   AuthenticationException(401),
│                                    #   InsufficientBalanceException(400),
│                                    #   WalletNotFoundException(404),
│                                    #   ConcurrentModificationException(409),
│                                    #   DuplicateUsernameException(409)
│
└── README.md
```

### 各模組職責說明

| 模組 | 檔案 | 職責 | 對應 Spring Boot 概念 |
|------|------|------|----------------------|
| **main.py** | `app/main.py` | FastAPI instance, include_router x4, 3 層 @exception_handler | `DigitalWalletApplication` + `@RestControllerAdvice` |
| **config.py** | `app/config.py` | pydantic-settings 讀 `.env`，型別安全 | `application.yaml` + `@Value` |
| **database.py** | `app/database.py` | async engine, session factory, `get_db()` generator | MyBatis `SqlSessionFactory` |
| **models/** | 3 個檔案 | SQLAlchemy 2.0 DeclarativeBase ORM (Mapped + mapped_column) | Entity class |
| **schemas/** | 5 個檔案 | Pydantic v2: 請求/響應驗證、camelCase alias、`populate_by_name` | DTO + `@JsonProperty` |
| **api/** | 4 個檔案 | APIRouter 路由，`Depends(get_db)` + `Depends(get_current_user_id)` | `@RestController` |
| **services/** | 4 個檔案 | 無狀態 async function，接受 `AsyncSession` 參數 | `@Service` class |
| **core/security.py** | 1 個檔案 | BCrypt + JWT HS256 | `JwtUtil.java` + `SecurityConfig` |
| **core/deps.py** | 1 個檔案 | FastAPI Depends：JWT 攔截 + userId 提取 + admin 檢查 | `JwtAuthenticationFilter` |
| **exceptions/** | 1 個檔案 | AppException 繼承層級 (6 個 class) | 5 個自訂 Exception class |

---

## API 端點

### 用戶端點 (5 個)

| 方法 | 路徑 | JWT | 請求體 | 響應 | HTTP |
|------|------|-----|--------|------|------|
| POST | `/api/auth/register` | 否 | `{"username":"alice","password":"123456"}` | `{"status":"SUCCESS","message":"User registered successfully"}` | 201 |
| POST | `/api/auth/login` | 否 | `{"username":"alice","password":"123456"}` | `{"token":"eyJ...","user":{"id":1,"username":"alice","role":"ROLE_USER","createdAt":"..."}}` | 200 |
| GET | `/api/wallets` | 是 | — | `{"id":1,"userId":1,"currency":"USDT","balance":100.5000,"version":3,"updatedAt":"..."}` | 200 |
| POST | `/api/transactions/transfer` | 是 | `{"toUsername":"bob","amount":50.0}` | `{"status":"SUCCESS","message":"Transfer completed successfully"}` | 200 |
| GET | `/api/transactions` | 是 | — | `[{"id":1,"fromWalletId":1,"toWalletId":2,"amount":50.0000,"txType":"TRANSFER","status":"SUCCESS","createdAt":"..."}, ...]` | 200 |

### 管理後台端點 (6 個，需 ROLE_ADMIN)

| 方法 | 路徑 | Query 參數 | 響應模型 | 說明 |
|------|------|-----------|---------|------|
| GET | `/api/admin/users` | `search`, `page`, `size` | `PaginatedResponse` | 列表所有用戶，支援 username 模糊搜尋 + 分頁 |
| GET | `/api/admin/users/{user_id}` | — | `UserDetailResponse` | 用戶詳情：含 wallet dict + recentTransactions (最近 5 筆) |
| PUT | `/api/admin/users/{user_id}/disable` | — | `ApiResponse` | 禁用用戶：role → `ROLE_DISABLED` |
| PUT | `/api/admin/users/{user_id}/enable` | — | `ApiResponse` | 啟用用戶：role → `ROLE_USER` |
| GET | `/api/admin/transactions` | `username`, `from_date`, `to_date`, `page`, `size` | `PaginatedResponse[AdminTransactionResponse]` | 所有交易記錄：含 fromUsername/toUsername |
| GET | `/api/admin/transactions/stats` | `from_date`, `to_date` | `TransactionStatsResponse` | 交易統計：totalTransactions + totalAmount + dailyVolume[] |

**Admin 認證機制：**
- `create_access_token()` 將 `role` 寫入 JWT payload
- `require_admin` dependency 從 JWT 提取 role，非 `ROLE_ADMIN` 返回 403
- `ROLE_DISABLED` 用戶登入時 `login()` 返回 401 "Invalid username or password"

---

## 核心實作模式

### 模式 1：專案初始化 (main.py + config.py + database.py)

#### 1.1 `app/main.py` — FastAPI 入口 + 全域異常處理

```python
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api import auth, wallets, transactions, admin
from app.exceptions.handlers import AppException
from app.schemas.common import ApiResponse

app = FastAPI(
    title="Digital Wallet API",
    version="1.0",
    description="數位錢包 REST API 文件 (FastAPI 版)",
)

# register routers
app.include_router(auth.router)
app.include_router(wallets.router)
app.include_router(transactions.router)
app.include_router(admin.router)


# global exception handler
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse.error(exc.message).model_dump(),
    )


# Pydantic validation errors → 400
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content=ApiResponse.error(str(exc.errors()[0]["msg"])).model_dump(),
    )


# catch-all for unexpected errors
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    print(f"ERROR: {exc}", flush=True)
    return JSONResponse(
        status_code=500,
        content=ApiResponse.error("Internal server error").model_dump(),
    )
```

**為什麼這樣寫：**
- `@app.exception_handler(AppException)`：捕獲所有業務異常（含 5 個子類），對應 Spring Boot `@RestControllerAdvice`
- `@app.exception_handler(RequestValidationError)`：Pydantic 驗證失敗自動捕獲，取第一條錯誤訊息轉為 400
- `@app.exception_handler(Exception)`：兜底 catch-all，印出 `ERROR:` 到 console，對外只回 `"Internal server error"` 避免洩漏內部細節
- `model_dump()`：Pydantic v2 的序列化方法（取代 v1 的 `.dict()`）
- 四個 router 均以 `app.include_router()` 註冊，FastAPI 自動生成 Swagger UI 在 `/docs`

#### 1.2 `app/config.py` — pydantic-settings 環境變數

```python
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:root@localhost:5433/digital_wallet"
    JWT_SECRET: str = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"
    JWT_EXPIRATION: int = 86400000  # 24 小時（毫秒）

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
```

**為什麼用 pydantic-settings：**
- 自動從 `.env` 載入，環境變數可覆蓋（Docker 部署用 `DATABASE_URL=...` 覆蓋）
- 型別安全：`JWT_EXPIRATION: int` 自動將 `.env` 中的字串 `"86400000"` 轉為 Python int
- 提供預設值方便本地開發，不需 `.env` 檔案也能啟動
- 對應 Spring Boot：`@Value("${jwt.secret}")` + `application.yaml`

#### 1.3 `app/database.py` — SQLAlchemy async engine

```python
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session
```

**關鍵設計：**
- `echo=False`：生產環境關閉 SQL log，開發時可改為 `True`
- `expire_on_commit=False`：commit 後 ORM 屬性不會過期，避免 async 環境 lazy loading 問題
- `get_db()` 用 generator `yield`：FastAPI `Depends(get_db)` 在請求開始時創建 session，結束時自動 `await session.close()`
- `async with async_session() as session`：確保 session 在離開 context manager 時正確關閉
- 對應 Spring Boot：MyBatis `SqlSessionFactory` + `@Mapper` 自動注入

#### 1.4 `requirements.txt`

```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
sqlalchemy[asyncio]>=2.0.30
asyncpg>=0.29.0
passlib[bcrypt]>=1.7.4
pyjwt>=2.8.0
pydantic>=2.7.0
pydantic-settings>=2.3.0
python-dotenv>=1.0.0
```

**版本策略：** 全部使用 `>=` 相容範圍，`uvicorn[standard]` extra 包含 `uvloop` + `httptools` (Linux) 或等效 (Windows)，`sqlalchemy[asyncio]` extra 包含 `greenlet`。

---

### 模式 2：JWT 與密碼 (core/security.py)

```python
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: int, username: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(milliseconds=settings.JWT_EXPIRATION)
    payload = {
        "sub": str(user_id),
        "username": username,
        "role": role,
        "iat": datetime.now(timezone.utc),
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
```

**關鍵設計：**
- `create_access_token` 接受 `role` 參數：admin dashboard 需要從 JWT 提取 role 做授權檢查 (`require_admin`)
- `sub` 存字串：JWT 標準 (RFC 7519) 中 `sub` 是字串類型，與 Java 版 `String.valueOf(userId)` 一致
- `timezone.utc`：JWT 的 `iat`/`exp` 為 Unix timestamp，必須用 UTC；`datetime.utcnow()` 已棄用
- `passlib` BCrypt：`deprecated="auto"` 自動升級過時 hash；每次 `hash_password()` 自動生成隨機 22 字元 salt
- `PyJWT HS256`：對稱加密，與 Java `jjwt` 的 `SignatureAlgorithm.HS256` 完全相容

**與 Java 版逐行對照：**

| FastAPI | Spring Boot |
|---------|-------------|
| `hash_password(p)` | `passwordEncoder.encode(p)` |
| `verify_password(p, h)` | `passwordEncoder.matches(p, h)` |
| `create_access_token(id, name, role)` | `jwtUtil.generateToken(id, name, role)` |
| `decode_token(token)` | `jwtUtil.extractAllClaims(token)` |
| `settings.JWT_SECRET` | `@Value("${jwt.secret}")` |
| `settings.JWT_EXPIRATION` | `@Value("${jwt.expiration}")` |

---

### 模式 3：依賴注入 (core/deps.py)

```python
from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_token
from app.exceptions.handlers import AppException, AuthenticationException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user_id(request: Request, token: str | None = Depends(oauth2_scheme)) -> int:
    if token is None:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
        else:
            raise AuthenticationException("Invalid username or password")

    try:
        payload = decode_token(token)
        return int(payload["sub"])
    except Exception:
        raise AuthenticationException("Invalid username or password")


async def require_admin(request: Request, token: str | None = Depends(oauth2_scheme)) -> None:
    if token is None:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]
        else:
            raise AuthenticationException("Invalid username or password")

    try:
        payload = decode_token(token)
        role = payload.get("role", "ROLE_USER")
        if role != "ROLE_ADMIN":
            raise AppException(403, "Access denied")
    except AppException:
        raise
    except Exception:
        raise AuthenticationException("Invalid username or password")
```

**為什麼雙重提取 Token：**
- `OAuth2PasswordBearer`：從 Swagger UI Authorize 按鈕發送的 Token（標準 OAuth2 流程）
- 手動從 `Authorization` header 提取：作為 fallback，支援非標準客戶端
- `auto_error=False`：Token 不存在時不自動報錯，讓公開端點 (register/login) 可以無 Token 存取

**為什麼解碼失敗返回 "Invalid username or password" 而不是 "Token expired"：**
- 安全考量：不洩漏 Token 為何無效（過期 / 簽名錯誤 / 格式錯誤）
- 與 Java 版行為一致

**`require_admin` 的設計：**
- 獨立的依賴函數，不與 `get_current_user_id` 耦合
- 從 JWT payload 中讀取 `role`，預設值 `"ROLE_USER"` 防止 role 欄位缺失
- `except AppException: raise`：讓 403 的 `AppException` 穿透，不被下面 `except Exception` 捕獲
- 返回 `None`：僅做授權檢查，不返回資料（路由中使用 `_: None = Depends(require_admin)`）

**對應 Spring Boot：** `JwtAuthenticationFilter.doFilterInternal()` + `@PreAuthorize("hasRole('ADMIN')")`

---

### 模式 4：SQLAlchemy 2.0 ORM 模型

#### 4.1 `app/models/user.py`

```python
from datetime import datetime

from sqlalchemy import BigInteger, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="ROLE_USER")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now())
```

**為什麼用 `Mapped[T]` + `mapped_column()` 而不是舊式 `Column()`：**
- SQLAlchemy 2.0 的宣告式型別語法，提供完整 IDE autocomplete 和 mypy 型別檢查
- `BigInteger` 對應 PostgreSQL `BIGINT`（等同 `BIGSERIAL`）
- `server_default=func.now()` 在資料庫端生成 `DEFAULT CURRENT_TIMESTAMP`，不依賴應用層

#### 4.2 `app/models/wallet.py`

```python
from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, String, Numeric, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Wallet(Base):
    __tablename__ = "wallets"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="USDT")
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=0)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now(), onupdate=func.now())
```

**為什麼 `balance` 用 `Numeric(18,4)` → `Decimal`：**
- 金錢**絕對不能**用 `float`：`0.1 + 0.2 = 0.30000000000000004` (IEEE 754 浮點誤差)
- Python `Decimal` 保證精確十進位計算，對應 Java `BigDecimal` 和 PostgreSQL `NUMERIC`
- `(18,4)` 表示最多 18 位有效數字，其中 4 位小數（最大約 9 兆 USDT，綽綽有餘）

**為什麼 `updated_at` 有 `onupdate=func.now()`：**
- `server_default` 只在 INSERT 時生效（資料庫端 DEFAULT）
- `onupdate` 在每次 ORM 物件被 `session.flush()` 時自動更新時間戳
- `transaction_service.py` 的 bulk `update()` 語句中也有手動設置 `updated_at=func.now()`——雙重保障

#### 4.3 `app/models/transaction.py`

```python
from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, Numeric, String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    from_wallet_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    to_wallet_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    tx_type: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="SUCCESS")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now())
```

**為什麼 `from_wallet_id` / `to_wallet_id` 設為 nullable：**
- 允許未來擴充交易類型（如系統存提款只有一方錢包）
- PostgreSQL 欄位定義為 `BIGINT NULL`，與 ORM `nullable=True` 一致
- `int | None` 型別提示讓 IDE 強制處理 null 情況

#### 4.4 `app/models/__init__.py` — 集中匯出

```python
from app.models.user import User
from app.models.wallet import Wallet
from app.models.transaction import Transaction

__all__ = ["User", "Wallet", "Transaction"]
```

**為什麼要在 `__init__.py` 集中匯出：**
- 其他模組可寫 `from app.models import User` 而不是 `from app.models.user import User`
- Alembic (遷移工具) 需要從 `Base` 匯入所有模型才能偵測 schema 變化
- `__all__` 明確宣告公開介面

---

### 模式 5：Pydantic Schemas (camelCase alias 對前端)

#### 5.1 `app/schemas/common.py`

```python
from pydantic import BaseModel


class ApiResponse(BaseModel):
    status: str
    message: str

    @staticmethod
    def success(message: str) -> "ApiResponse":
        return ApiResponse(status="SUCCESS", message=message)

    @staticmethod
    def error(message: str) -> "ApiResponse":
        return ApiResponse(status="ERROR", message=message)
```

**為什麼用靜態工廠方法而不是建構子：**
- `ApiResponse.success("...")` 比 `ApiResponse(status="SUCCESS", message="...")` 更語義化
- 與 Java 版 `ApiResponse.success()` 靜態方法完全對應

#### 5.2 `app/schemas/auth.py`

```python
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class UserCreate(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    username: str
    role: str
    created_at: datetime = Field(alias="createdAt")


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: UserResponse
```

#### 5.3 `app/schemas/wallet.py`

```python
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, ConfigDict


class WalletResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    user_id: int = Field(alias="userId")
    currency: str
    balance: Decimal
    version: int
    updated_at: datetime = Field(alias="updatedAt")
```

#### 5.4 `app/schemas/transaction.py`

```python
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, ConfigDict


class TransferRequest(BaseModel):
    to_username: str = Field(alias="toUsername")
    amount: Decimal

    model_config = ConfigDict(populate_by_name=True)


class TransactionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int
    from_wallet_id: int | None = Field(alias="fromWalletId", default=None)
    to_wallet_id: int | None = Field(alias="toWalletId", default=None)
    amount: Decimal
    tx_type: str = Field(alias="txType")
    status: str
    created_at: datetime = Field(alias="createdAt")
```

#### 5.5 `app/schemas/admin.py`

```python
from datetime import datetime
from typing import TypeVar, Generic

from pydantic import BaseModel, Field, ConfigDict

T = TypeVar('T')


class PaginatedResponse(BaseModel, Generic[T]):
    model_config = ConfigDict(populate_by_name=True)
    data: list[T]
    page: int
    size: int
    total: int


class UserDetailResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: int
    username: str
    role: str
    created_at: datetime = Field(alias="createdAt")
    wallet: dict | None = None
    recent_transactions: list[dict] = Field(alias="recentTransactions", default_factory=list)


class AdminTransactionResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: int
    from_wallet_id: int | None = Field(alias="fromWalletId", default=None)
    to_wallet_id: int | None = Field(alias="toWalletId", default=None)
    amount: float
    tx_type: str = Field(alias="txType")
    status: str
    created_at: datetime = Field(alias="createdAt")
    from_username: str | None = Field(alias="fromUsername", default=None)
    to_username: str | None = Field(alias="toUsername", default=None)


class DailyVolumeItem(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    date: str
    count: int
    amount: float


class TransactionStatsResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    total_transactions: int = Field(alias="totalTransactions")
    total_amount: float = Field(alias="totalAmount")
    daily_volume: list[DailyVolumeItem] = Field(alias="dailyVolume")
```

**為什麼每個 Response 都要 `model_config = ConfigDict(populate_by_name=True)`：**

這是最容易被忽略但最重要的 Pydantic v2 配置。

- `Field(alias="userId")`：JSON 輸出時 snake_case `user_id` 自動變成 camelCase `userId`
- `populate_by_name=True`：**同時允許** `user_id` 和 `userId` 兩種 key 賦值
- 沒有這個配置，在 Service 層 `WalletResponse(userId=wallet.user_id)` 會失敗（只用 alias 賦值）

**Admin Schemas 設計重點：**
- `PaginatedResponse` 使用 `Generic[T]`，可復用於 `PaginatedResponse[dict]` (users) 和 `PaginatedResponse[AdminTransactionResponse]` (transactions)
- `AdminTransactionResponse` 比 `TransactionResponse` 多 `fromUsername` / `toUsername`：來自 JOIN 查詢結果
- `TransactionStatsResponse` 含 `dailyVolume: list[DailyVolumeItem]`：來自 `GROUP BY DATE(created_at)` 原始 SQL

**為什麼 `TransferRequest.amount` 是 `Decimal` 而不是 `float`：**
- Pydantic v2 可以自動將 JSON 的 `50.0` (float) 或 `50` (int) 轉為 `Decimal`
- 不能直接宣告為 `float`：`0.1 + 0.2 = 0.30000000000000004`

---

### 模式 6：API 路由

#### 6.1 `app/api/auth.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.auth import UserCreate, LoginRequest, LoginResponse
from app.schemas.common import ApiResponse
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", status_code=201, response_model=ApiResponse)
async def register(data: UserCreate, session: AsyncSession = Depends(get_db)):
    async with session.begin():
        await auth_service.register(session, data.username, data.password)
    return ApiResponse.success("User registered successfully")


@router.post("/login", response_model=LoginResponse)
async def login(data: LoginRequest, session: AsyncSession = Depends(get_db)):
    return await auth_service.login(session, data.username, data.password)
```

**為什麼 `register` 用 `async with session.begin()` 但 `login` 不用：**
- `register` 需要確保 `INSERT user` + `INSERT wallet` 在同一事務中（全部成功或全部回滾）
- `login` 只有 `SELECT` 查詢，不需要事務邊界

#### 6.2 `app/api/wallets.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.schemas.wallet import WalletResponse
from app.services import wallet_service

router = APIRouter(prefix="/api/wallets", tags=["Wallets"])


@router.get("", response_model=WalletResponse)
async def get_wallet(
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    return await wallet_service.get_wallet_by_user_id(session, user_id)
```

**IDOR 防護已在架構層完成：**
- `user_id` 來自 `Depends(get_current_user_id)`——從 JWT 提取，不是從 URL 參數
- 沒有 `GET /api/wallets/{userId}` 端點，用戶只能看自己的錢包
- 對比 Spring Boot：`SecurityContextHolder.getContext().getAuthentication().getPrincipal()`

#### 6.3 `app/api/transactions.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user_id
from app.database import get_db
from app.schemas.common import ApiResponse
from app.schemas.transaction import TransferRequest, TransactionResponse
from app.services import transaction_service

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


@router.post("/transfer", response_model=ApiResponse)
async def transfer(
    data: TransferRequest,
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    async with session.begin():
        await transaction_service.transfer(
            session, user_id, data.to_username, data.amount
        )
    return ApiResponse.success("Transfer completed successfully")


@router.get("", response_model=list[TransactionResponse])
async def get_transaction_history(
    user_id: int = Depends(get_current_user_id),
    session: AsyncSession = Depends(get_db),
):
    return await transaction_service.get_transaction_history(session, user_id)
```

**為什麼事務邊界在 API 層而不是 Service 層：**
- Service 層保持純業務邏輯，不耦合事務管理
- API 層用 `async with session.begin()` 包裹，成功自動 COMMIT，異常自動 ROLLBACK
- 不同端點可能需要不同事務策略（有的只讀，有的讀寫）

**為什麼 `response_model=list[TransactionResponse]`：**
- Python 3.10+ `list[X]` 語法，告訴 FastAPI 返回 JSON 陣列
- FastAPI 會用 `TransactionResponse` model 序列化每個元素，自動 camelCase 轉換
- Swagger UI 自動顯示正確的響應結構

#### 6.4 `app/api/admin.py`

```python
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import require_admin
from app.database import get_db
from app.schemas.admin import PaginatedResponse, UserDetailResponse, AdminTransactionResponse, TransactionStatsResponse
from app.schemas.common import ApiResponse
from app.services import admin_service

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/users", response_model=PaginatedResponse)
async def list_users(
    search: str = Query(default=""),
    page: int = Query(default=1),
    size: int = Query(default=20),
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    return await admin_service.list_users(session, search, page, size)


@router.get("/users/{user_id}", response_model=UserDetailResponse)
async def get_user_detail(
    user_id: int,
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    result = await admin_service.get_user_detail(session, user_id)
    return UserDetailResponse(**result)


@router.put("/users/{user_id}/disable", response_model=ApiResponse)
async def disable_user(
    user_id: int,
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    async with session.begin():
        await admin_service.disable_user(session, user_id)
    return ApiResponse.success("User disabled successfully")


@router.put("/users/{user_id}/enable", response_model=ApiResponse)
async def enable_user(
    user_id: int,
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    async with session.begin():
        await admin_service.enable_user(session, user_id)
    return ApiResponse.success("User enabled successfully")


@router.get("/transactions", response_model=PaginatedResponse[AdminTransactionResponse])
async def list_transactions(
    username: str | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    page: int = Query(default=1),
    size: int = Query(default=20),
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    return await admin_service.list_transactions(session, username, from_date, to_date, page, size)


@router.get("/transactions/stats", response_model=TransactionStatsResponse)
async def get_transaction_stats(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    _: None = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    result = await admin_service.get_transaction_stats(session, from_date, to_date)
    return TransactionStatsResponse(**result)
```

**Admin 路由設計重點：**
- `_: None = Depends(require_admin)`：每個端點都注入 admin 檢查，不符合即拋 403
- 變數名 `_` 表示未使用（僅做授權檢查，不取回傳值）
- `from_date` / `to_date` 使用 Python `date` 型別：FastAPI 自動將查詢字串 `"2025-01-01"` 解析為 `date` 物件
- `response_model=PaginatedResponse[AdminTransactionResponse]`：Generic 型別參數讓 Swagger UI 正確顯示巢狀結構
- disable/enable 用 `async with session.begin()`：UPDATE 需要事務

---

### 模式 7：服務層

#### 7.1 `app/services/auth_service.py`

```python
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password, create_access_token
from app.exceptions.handlers import AuthenticationException, DuplicateUsernameException
from app.models.user import User
from app.models.wallet import Wallet
from app.schemas.auth import LoginResponse, UserResponse


async def register(session: AsyncSession, username: str, password: str) -> User:
    # role is always ROLE_USER, ignored from client input
    user = User(username=username, password_hash=hash_password(password), role="ROLE_USER")
    session.add(user)
    try:
        await session.flush()
    except IntegrityError:
        raise DuplicateUsernameException(f"Username '{username}' is already taken")

    # create wallet
    wallet = Wallet(user_id=user.id, currency="USDT", balance=0, version=0)
    session.add(wallet)

    return user


async def login(session: AsyncSession, username: str, password: str) -> LoginResponse:
    stmt = select(User).where(User.username == username)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise AuthenticationException("Invalid username or password")

    if not verify_password(password, user.password_hash):
        raise AuthenticationException("Invalid username or password")

    if user.role == "ROLE_DISABLED":
        raise AuthenticationException("Invalid username or password")

    token = create_access_token(user.id, user.username, user.role)

    user_response = UserResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        createdAt=user.created_at,
    )

    return LoginResponse(token=token, user=user_response)
```

**關鍵設計決策：**

1. **`session.flush()` vs `session.commit()`：**
   - `flush()`：發送 SQL 到 DB（觸發 unique constraint 檢查 + 取得 `SERIAL` 自增 ID），但**不 commit**
   - 呼叫端 `api/auth.py` 用 `async with session.begin()` 統一 commit
   - 如果 `register()` 內部 commit，後面 `wallet` insert 失敗就無法回滾 user

2. **為什麼捕獲 `IntegrityError` 而不是更寬泛的 `Exception`：**
   - `IntegrityError` 是 SQLAlchemy 中所有約束違反的基類（unique、foreign key、check 等）
   - PostgreSQL 的 `username UNIQUE` 違反對應 `IntegrityError`
   - 捕獲 `Exception` 會連連線中斷、逾時等錯誤也誤報為「用戶名已存在」

3. **登入失敗不區分錯誤原因：**
   - 「用戶不存在」、「密碼錯誤」、「已禁用」返回相同的 401 "Invalid username or password"
   - 防止攻擊者列舉有效用戶名
   - `ROLE_DISABLED` 檢查置於驗證成功後最末：不透露用戶是否存在

4. **`create_access_token` 傳入 `user.role`：**
   - JWT payload 包含 `role` claim，供 `require_admin` 提取
   - `ROLE_DISABLED` 用戶在 login 階段就被攔下，永遠拿不到 token

**對應 Spring Boot：** `AuthServiceImpl.register()` + `AuthServiceImpl.login()`

#### 7.2 `app/services/wallet_service.py`

```python
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.handlers import WalletNotFoundException
from app.models.wallet import Wallet
from app.schemas.wallet import WalletResponse


async def get_wallet_by_user_id(session: AsyncSession, user_id: int) -> WalletResponse:
    stmt = select(Wallet).where(Wallet.user_id == user_id)
    result = await session.execute(stmt)
    wallet = result.scalar_one_or_none()

    if wallet is None:
        raise WalletNotFoundException(f"Wallet not found for userId: {user_id}")

    return WalletResponse(
        id=wallet.id,
        userId=wallet.user_id,
        currency=wallet.currency,
        balance=wallet.balance,
        version=wallet.version,
        updatedAt=wallet.updated_at,
    )
```

**為什麼手動 Entity → DTO 轉換而不是用 `from_attributes`：**
- Pydantic v2 的 `model_validate(wallet, from_attributes=True)` 需要欄位名完全對應 `alias`
- 由於 ORM 用 snake_case (`user_id`)、DTO 用 camelCase alias (`userId`)，手動建構更直觀
- 只有 6 個欄位，手動建構不會造成維護負擔

**對應 Spring Boot：** `WalletServiceImpl.getWalletByUserId()`

#### 7.3 `app/services/transaction_service.py` — 核心轉賬（樂觀鎖）

```python
from decimal import Decimal

from sqlalchemy import select, update, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.handlers import (
    AppException,
    WalletNotFoundException,
    InsufficientBalanceException,
    ConcurrentModificationException,
)
from app.models.user import User
from app.models.wallet import Wallet
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionResponse


async def transfer(
    session: AsyncSession,
    from_user_id: int,
    to_username: str,
    amount: Decimal,
) -> None:
    if amount <= 0:
        raise AppException(400, "Transfer amount must be greater than zero")

    # lookup recipient by username
    stmt = select(User).where(User.username == to_username)
    result = await session.execute(stmt)
    to_user = result.scalar_one_or_none()
    if to_user is None:
        raise AppException(400, f"Recipient not found: {to_username}")
    to_user_id = to_user.id
    if from_user_id == to_user_id:
        raise AppException(400, "Cannot transfer to yourself")

    # read wallets
    stmt = select(Wallet).where(Wallet.user_id == from_user_id)
    result = await session.execute(stmt)
    from_wallet = result.scalar_one_or_none()
    if from_wallet is None:
        raise WalletNotFoundException(f"Wallet not found for userId: {from_user_id}")

    stmt = select(Wallet).where(Wallet.user_id == to_user_id)
    result = await session.execute(stmt)
    to_wallet = result.scalar_one_or_none()
    if to_wallet is None:
        raise WalletNotFoundException(f"Wallet not found for userId: {to_user_id}")

    # balance check (fail-fast)
    if from_wallet.balance < amount:
        raise InsufficientBalanceException(
            f"Insufficient balance: {from_wallet.balance} < {amount}"
        )

    # optimistic lock deduct
    deduct_stmt = (
        update(Wallet)
        .where(Wallet.user_id == from_user_id, Wallet.version == from_wallet.version)
        .values(
            balance=Wallet.balance - amount,
            version=Wallet.version + 1,
            updated_at=func.now(),
        )
    )
    result = await session.execute(deduct_stmt)
    if result.rowcount == 0:
        raise ConcurrentModificationException(
            f"Concurrent modification detected for userId: {from_user_id}"
        )

    # add balance
    add_stmt = (
        update(Wallet)
        .where(Wallet.user_id == to_user_id)
        .values(
            balance=Wallet.balance + amount,
            version=Wallet.version + 1,
            updated_at=func.now(),
        )
    )
    await session.execute(add_stmt)

    # record transaction
    tx = Transaction(
        from_wallet_id=from_wallet.id,
        to_wallet_id=to_wallet.id,
        amount=amount,
        tx_type="TRANSFER",
        status="SUCCESS",
    )
    session.add(tx)


async def get_transaction_history(
    session: AsyncSession, user_id: int
) -> list[TransactionResponse]:
    # get wallet id
    stmt = select(Wallet).where(Wallet.user_id == user_id)
    result = await session.execute(stmt)
    wallet = result.scalar_one_or_none()
    if wallet is None:
        raise WalletNotFoundException(f"Wallet not found for userId: {user_id}")

    # query transactions
    stmt = (
        select(Transaction)
        .where(
            or_(
                Transaction.from_wallet_id == wallet.id,
                Transaction.to_wallet_id == wallet.id,
            )
        )
        .order_by(Transaction.created_at.desc())
    )
    result = await session.execute(stmt)
    transactions = result.scalars().all()

    return [
        TransactionResponse(
            id=tx.id,
            fromWalletId=tx.from_wallet_id,
            toWalletId=tx.to_wallet_id,
            amount=tx.amount,
            txType=tx.tx_type,
            status=tx.status,
            createdAt=tx.created_at,
        )
        for tx in transactions
    ]
```

**樂觀鎖原理（與 Java 版完全一致）：**

```
時間線：
T1: SELECT wallet WHERE user_id=1  → version=5, balance=100
T2: SELECT wallet WHERE user_id=1  → version=5, balance=100  (T1 尚未 commit)

T1: UPDATE wallets SET balance=balance-50, version=version+1=6
    WHERE user_id=1 AND version=5   → rowcount=1 ✓ (成功)

T2: UPDATE wallets SET balance=balance-50, version=version+1=6
    WHERE user_id=1 AND version=5   → rowcount=0 ✗ (version 已變成 6)

T2: → ConcurrentModificationException → 409 → 前端提示用戶重試
```

**為什麼 UPDATE 要手動設置 `updated_at=func.now()`：**
- SQLAlchemy 的 bulk `update()` 語句**不會觸發** ORM 層的 `onupdate` callback
- 必須手動設置，否則 `updated_at` 永遠停留在 INSERT 時的值
- 這與 Java 版 MyBatis XML 中的 `updated_at = CURRENT_TIMESTAMP` 對應

**為什麼驗證錯誤用 `AppException(400)` 而不是更具體的異常類：**
- `amount <= 0` 和「自己轉給自己」是輸入驗證錯誤，不是餘額問題
- HTTP 400 是正確的狀態碼

**為什麼查詢歷史用 `or_()` 而不是兩個獨立查詢：**
- 一個 SQL 查詢即可找到用戶參與的所有交易（發出 + 收到）
- `or_(from_wallet_id == ?, to_wallet_id == ?)` 對應 PostgreSQL 的兩個索引掃描

**對應 Spring Boot：** `TransactionServiceImpl.transfer()` + `WalletMapper.xml`

#### 7.4 `app/services/admin_service.py`

```python
from datetime import date
from decimal import Decimal

from sqlalchemy import select, func, text, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.exceptions.handlers import AppException
from app.models.user import User
from app.models.wallet import Wallet
from app.models.transaction import Transaction


async def list_users(session: AsyncSession, search: str, page: int, size: int) -> dict:
    page = max(page, 1)
    size = max(min(size, 100), 1)
    offset = (page - 1) * size

    if search:
        stmt = select(User).where(User.username.ilike(f"%{search}%"))
        count_stmt = select(func.count()).select_from(User).where(User.username.ilike(f"%{search}%"))
    else:
        stmt = select(User)
        count_stmt = select(func.count()).select_from(User)

    stmt = stmt.order_by(User.id).offset(offset).limit(size)
    result = await session.execute(stmt)
    users = result.scalars().all()

    count_result = await session.execute(count_stmt)
    total = count_result.scalar()

    return {
        "data": [{"id": u.id, "username": u.username, "role": u.role, "createdAt": u.created_at} for u in users],
        "page": page,
        "size": size,
        "total": total,
    }


async def get_user_detail(session: AsyncSession, user_id: int) -> dict:
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        raise AppException(404, f"User not found: {user_id}")

    stmt = select(Wallet).where(Wallet.user_id == user_id)
    result = await session.execute(stmt)
    wallet = result.scalar_one_or_none()

    wallet_dict = None
    recent_tx_list = []

    if wallet is not None:
        wallet_dict = {
            "id": wallet.id, "userId": wallet.user_id, "currency": wallet.currency,
            "balance": float(wallet.balance), "version": wallet.version,
            "updatedAt": wallet.updated_at.isoformat() if wallet.updated_at else None,
        }

        stmt = (
            select(Transaction)
            .where((Transaction.from_wallet_id == wallet.id) | (Transaction.to_wallet_id == wallet.id))
            .order_by(Transaction.created_at.desc())
            .limit(5)
        )
        result = await session.execute(stmt)
        txs = result.scalars().all()
        recent_tx_list = [{
            "id": tx.id, "fromWalletId": tx.from_wallet_id, "toWalletId": tx.to_wallet_id,
            "amount": float(tx.amount), "txType": tx.tx_type, "status": tx.status,
            "createdAt": tx.created_at.isoformat() if tx.created_at else None,
        } for tx in txs]

    return {
        "id": user.id, "username": user.username, "role": user.role,
        "createdAt": user.created_at,
        "wallet": wallet_dict, "recentTransactions": recent_tx_list,
    }


async def disable_user(session: AsyncSession, user_id: int) -> None:
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        raise AppException(404, f"User not found: {user_id}")
    user.role = "ROLE_DISABLED"
    await session.flush()


async def enable_user(session: AsyncSession, user_id: int) -> None:
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        raise AppException(404, f"User not found: {user_id}")
    user.role = "ROLE_USER"
    await session.flush()


async def list_transactions(session: AsyncSession, username: str | None, from_date: date | None, to_date: date | None, page: int, size: int) -> dict:
    page = max(page, 1)
    size = max(min(size, 100), 1)
    offset = (page - 1) * size

    FromWallet = aliased(Wallet)
    ToWallet = aliased(Wallet)
    FromUser = aliased(User)
    ToUser = aliased(User)

    cols = (
        Transaction.id, Transaction.from_wallet_id, Transaction.to_wallet_id,
        Transaction.amount, Transaction.tx_type, Transaction.status, Transaction.created_at,
        FromUser.username.label("from_username"), ToUser.username.label("to_username"),
    )

    stmt = (
        select(*cols).select_from(Transaction)
        .outerjoin(FromWallet, Transaction.from_wallet_id == FromWallet.id)
        .outerjoin(ToWallet, Transaction.to_wallet_id == ToWallet.id)
        .outerjoin(FromUser, FromWallet.user_id == FromUser.id)
        .outerjoin(ToUser, ToWallet.user_id == ToUser.id)
    )

    conditions = []
    if username:
        conditions.append(or_(FromUser.username == username, ToUser.username == username))
    if from_date:
        conditions.append(Transaction.created_at >= from_date)
    if to_date:
        conditions.append(Transaction.created_at < to_date)

    if conditions:
        combined = and_(*conditions)
        stmt = stmt.where(combined)

    stmt = stmt.order_by(Transaction.created_at.desc()).offset(offset).limit(size)
    result = await session.execute(stmt)
    rows = result.all()

    # count
    count_stmt = (
        select(func.count()).select_from(Transaction)
        .outerjoin(FromWallet, Transaction.from_wallet_id == FromWallet.id)
        .outerjoin(ToWallet, Transaction.to_wallet_id == ToWallet.id)
        .outerjoin(FromUser, FromWallet.user_id == FromUser.id)
        .outerjoin(ToUser, ToWallet.user_id == ToUser.id)
    )
    if conditions:
        count_stmt = count_stmt.where(and_(*conditions))

    count_result = await session.execute(count_stmt)
    total = count_result.scalar()

    data = [{
        "id": row.id, "fromWalletId": row.from_wallet_id, "toWalletId": row.to_wallet_id,
        "amount": row.amount, "txType": row.tx_type, "status": row.status,
        "createdAt": row.created_at,
        "fromUsername": row.from_username, "toUsername": row.to_username,
    } for row in rows]

    return {"data": data, "page": page, "size": size, "total": total}


async def get_transaction_stats(session: AsyncSession, from_date: date | None, to_date: date | None) -> dict:
    conditions = []
    params = {}

    if from_date:
        conditions.append("created_at >= :from_date")
        params["from_date"] = from_date
    if to_date:
        conditions.append("created_at < :to_date")
        params["to_date"] = to_date

    where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

    count_sql = f"SELECT COUNT(*)::bigint FROM transactions {where_clause}"
    amount_sql = f"SELECT COALESCE(SUM(amount), 0) FROM transactions {where_clause}"
    daily_sql = f"SELECT DATE(created_at) AS date, COUNT(*)::bigint AS count, COALESCE(SUM(amount), 0) AS amount FROM transactions {where_clause} GROUP BY DATE(created_at) ORDER BY date"

    total_tx = (await session.execute(text(count_sql), params)).scalar()
    total_amt = (await session.execute(text(amount_sql), params)).scalar()
    daily_result = await session.execute(text(daily_sql), params)
    daily_rows = daily_result.all()

    return {
        "totalTransactions": total_tx,
        "totalAmount": total_amt,
        "dailyVolume": [{"date": str(r.date), "count": r.count, "amount": float(r.amount)} for r in daily_rows],
    }
```

**Admin Service 設計重點：**

1. **`list_transactions` 使用 `aliased` JOIN 4 張表：**
   - `Transaction` ← `Wallet` (as FromWallet/ToWallet) ← `User` (as FromUser/ToUser)
   - `aliased()` 允許同一張表在同一個查詢中以不同別名出現兩次
   - `outerjoin` 而非 `join`：避免 `from_wallet_id`/`to_wallet_id` 為 NULL 時遺漏記錄

2. **分頁安全邊界：**
   - `page = max(page, 1)`：防止負數 page 或 page=0
   - `size = max(min(size, 100), 1)`：限制 size 在 [1, 100]，防止惡意請求一次拉取百萬記錄

3. **為什麼 `get_transaction_stats` 使用 `text()` raw SQL：**
   - `GROUP BY DATE(created_at)` 是 PostgreSQL 特有的日期截斷，SQLAlchemy ORM 表達力不足
   - `COALESCE(SUM(amount), 0)` 處理空結果集（無交易時返回 0 而非 NULL）
   - `COUNT(*)::bigint` 強制轉型：SQLAlchemy 的 `text()` 返回 `Decimal`，需要明確轉型
   - 使用參數化查詢 `:from_date` / `:to_date`，防止 SQL injection

4. **`disable_user` / `enable_user` 使用 `session.flush()`：**
   - 直接修改 ORM 物件的 `role` 屬性（dirty check），然後 `flush()`
   - 比 `update()` bulk 語句更簡潔，且觸發 `onupdate` callback（雖然 User 沒有 onupdate）
   - 呼叫端 `api/admin.py` 用 `async with session.begin()` 管理事務

5. **`get_user_detail` 返回 dict 而非 Pydantic model：**
   - API 層再用 `UserDetailResponse(**result)` 轉換
   - Service 層不依賴 Pydantic model（解耦），可復用於其他呼叫端

---

### 模式 8：異常處理 (exceptions/handlers.py)

```python
from app.schemas.common import ApiResponse


class AppException(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message


class AuthenticationException(AppException):
    def __init__(self, message: str = "Invalid username or password"):
        super().__init__(401, message)


class InsufficientBalanceException(AppException):
    def __init__(self, message: str):
        super().__init__(400, message)


class WalletNotFoundException(AppException):
    def __init__(self, message: str):
        super().__init__(404, message)


class ConcurrentModificationException(AppException):
    def __init__(self, message: str):
        super().__init__(409, message)


class DuplicateUsernameException(AppException):
    def __init__(self, message: str):
        super().__init__(409, message)
```

**為什麼用繼承層級：**
- `AppException` 自帶 `status_code` 屬性，`main.py` 的全域 handler 直接讀取
- 子類只定義 HTTP 狀態碼，不用重複寫 handler
- 與 Java 版 5 個 Exception 類完全對應，狀態碼也完全一致

**為什麼全部繼承 `Exception` 而不是 FastAPI 的 `HTTPException`：**
- `HTTPException` 是 FastAPI 專用類，耦合框架
- 自定義 Exception 可以在 FastAPI 以外的場景使用（如 CLI script、background task）
- 透過 `@app.exception_handler` 統一轉換為 JSON 響應

**錯誤狀態碼對照：**

| HTTP | 異常類 | 場景 |
|------|--------|------|
| 400 | `InsufficientBalanceException` | 餘額不足 |
| 400 | `AppException(400, ...)` | amount <= 0、自己轉自己、recipient 不存在 |
| 401 | `AuthenticationException` | 登入失敗、Token 無效/過期、用戶已禁用 |
| 403 | `AppException(403, ...)` | 非 ROLE_ADMIN 存取 admin 端點 |
| 404 | `WalletNotFoundException` | 錢包不存在 |
| 404 | `AppException(404, ...)` | 用戶不存在 (admin) |
| 409 | `ConcurrentModificationException` | 樂觀鎖版本衝突（提示用戶重試） |
| 409 | `DuplicateUsernameException` | 用戶名重複 |
| 500 | `Exception` (fallback) | 未預期錯誤 |

---

### 模式 9：Docker 容器化

#### `Dockerfile`

```dockerfile
FROM python:3.12-slim AS build
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim
WORKDIR /app
COPY --from=build /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY app/ ./app/
EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

**為什麼兩階段構建：**
1. **build 階段**：安裝所有依賴（含 `gcc` 等編譯工具，`asyncpg` 需要編譯 C extension）
2. **執行階段**：只複製已安裝的 `site-packages`，不含編譯工具、pip cache、requirements.txt
3. 最終 Image 體積更小，攻擊面更少

**為什麼用 `python:3.12-slim` 而不是 `alpine`：**
- `slim` 基於 Debian (glibc)，與 `asyncpg` 的二進位 wheel 相容性最好
- `alpine` 使用 musl libc，`asyncpg` 有時會有相容性問題（需從 source 編譯）
- `slim` 犧牲約 50MB 體積，換取零配置相容性

#### `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: digital_wallet_fastapi_db
    environment:
      POSTGRES_DB: digital_wallet
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: root
    ports:
      - "5434:5432"
    volumes:
      - pgdata_fastapi:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d digital_wallet"]
      interval: 5s
      timeout: 5s
      retries: 10

  app:
    build: .
    container_name: digital_wallet_fastapi_app
    ports:
      - "8000:8080"
    environment:
      DATABASE_URL: postgresql+asyncpg://postgres:root@postgres:5432/digital_wallet
      JWT_SECRET: "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970"
      JWT_EXPIRATION: "86400000"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  pgdata_fastapi:
```

**關鍵細節：**
- 埠映射 `5434:5432`：主機用 5434，容器內部用 5432（避免與其他後端的 PostgreSQL 衝突）
- Docker 內部通訊用 `postgres:5432`：app 和 postgres 在同一個 compose network 中，用服務名互連
- `depends_on` + `condition: service_healthy`：確保 PostgreSQL `pg_isready` 成功後才啟動 app，避免 race condition
- `JWT_EXPIRATION: "86400000"`：必須是字串（環境變數只能是字串），`pydantic-settings` `int` 型別自動轉換
- volume 名 `pgdata_fastapi`：與 Spring Boot 版的 `pgdata` 區分，避免同時啟動時資料衝突

---

## 資料庫表結構

來自 `digital_wallet/src/main/resources/static/db.sql`（所有後端共用同一份 DDL）：

```sql
CREATE DATABASE digital_wallet;
\c digital_wallet


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

**DDL 與 ORM 模型對照：**

| SQL 欄位 | SQL 型別 | Python 型別 | SQLAlchemy 型別 |
|----------|---------|------------|----------------|
| `id` | `BIGSERIAL` | `int` | `BigInteger(autoincrement=True)` |
| `username` | `VARCHAR(50)` | `str` | `String(50)` |
| `password_hash` | `VARCHAR(255)` | `str` | `String(255)` |
| `role` | `VARCHAR(20)` | `str` | `String(20)` |
| `balance` | `NUMERIC(18,4)` | `Decimal` | `Numeric(18, 4)` |
| `version` | `INT` | `int` | `Integer` |
| `created_at` / `updated_at` | `TIMESTAMP` | `datetime` | `DateTime(timezone=False)` |

---

## 數據流圖

### 1. 用戶註冊流程

```
POST /api/auth/register  { "username": "alice", "password": "123456" }
  → api/auth.py: register(UserCreate)
  → async with session.begin():
    ├── auth_service.register(session, "alice", "123456")
    │     ├── hash_password("123456")                    → $2b$12$... (passlib bcrypt, auto-salt)
    │     ├── user = User(username="alice", password_hash="...", role="ROLE_USER")
    │     ├── session.add(user)
    │     ├── session.flush()                            → INSERT INTO users ... SERIAL → user.id=1
    │     │     └── IntegrityError                       → DuplicateUsernameException → 409
    │     ├── wallet = Wallet(user_id=1, currency="USDT", balance=0, version=0)
    │     └── session.add(wallet)
    └── COMMIT                                           → user + wallet 同時生效
  → 201 { "status": "SUCCESS", "message": "User registered successfully" }
```

### 2. 用戶登入流程

```
POST /api/auth/login  { "username": "alice", "password": "123456" }
  → api/auth.py: login(LoginRequest)
  → auth_service.login(session, "alice", "123456")
    ├── SELECT * FROM users WHERE username='alice'
    │     └── NULL                                     → AuthenticationException → 401
    ├── verify_password("123456", password_hash)        → passlib verify (自動解析 salt)
    │     └── False                                    → AuthenticationException → 401
    ├── if user.role == "ROLE_DISABLED"                  → AuthenticationException → 401
    ├── token = create_access_token(1, "alice", "ROLE_USER")
    │     └── PyJWT HS256 encode: { sub:"1", username:"alice", role:"ROLE_USER", iat:..., exp:...+24h }
    ├── user_response = UserResponse(id=1, username="alice", role="ROLE_USER", createdAt=...)
    └── return LoginResponse(token, user_response)
  → 200 { "token": "eyJ...", "user": { ... } }
```

### 3. JWT 請求攔截 (get_current_user_id)

```
Request: Authorization: Bearer eyJ...
  → Depends(get_current_user_id)
    ├── OAuth2PasswordBearer 提取 token
    │     └── NULL → fallback: request.headers.get("Authorization")
    │           ├── starts with "Bearer " → token = header[7:]
    │           └── NULL                    → AuthenticationException → 401
    ├── decode_token(token)
    │     ├── PyJWT decode: 驗證 HS256 簽名 + exp 時效
    │     └── Exception                   → AuthenticationException → 401
    ├── int(payload["sub"]) → userId=1
    └── return 1
  → 路由函數取得 user_id=1
```

### 4. Admin 授權檢查 (require_admin)

```
Request: Authorization: Bearer eyJ... (包含 role: ROLE_ADMIN)
  → Depends(require_admin)
    ├── 同上 Token 提取邏輯
    ├── decode_token(token) → payload
    ├── role = payload.get("role", "ROLE_USER")
    ├── if role != "ROLE_ADMIN":
    │     └── raise AppException(403, "Access denied")  → JSONResponse 403
    └── return None                                     → 授權通過，繼續
```

### 5. 查詢錢包 (IDOR 防護)

```
GET /api/wallets  [JWT: userId=1]
  → Depends(get_current_user_id) → user_id=1
  → wallet_service.get_wallet_by_user_id(session, 1)
    ├── SELECT * FROM wallets WHERE user_id=1
    │     └── NULL                                   → WalletNotFoundException → 404
    ├── Entity → WalletResponse
    │     └── user_id → "userId" (Field alias)
    └── return WalletResponse(id=1, userId=1, currency="USDT", balance=100.5000, version=3, updatedAt=...)
  → 200 { "id": 1, "userId": 1, "currency": "USDT", "balance": 100.5000, "version": 3, "updatedAt": "..." }
```

### 6. 轉賬 (樂觀鎖 + 事務)

```
POST /api/transactions/transfer  { "toUsername": "bob", "amount": 50.00 }  [JWT: userId=1]
  → Depends(get_current_user_id) → from_user_id=1
  → async with session.begin():                                   ← 整個流程一個事務邊界
    ├── transaction_service.transfer(session, 1, "bob", 50.00)
    │   ├── 1. if amount <= 0                                    → AppException(400)
    │   ├── 2. SELECT * FROM users WHERE username='bob'
    │   │      └── NULL                                          → AppException(400, "Recipient not found")
    │   ├── 3. if from_user_id == to_user.id                      → AppException(400, "Cannot transfer to yourself")
    │   ├── 4. SELECT * FROM wallets WHERE user_id=1  (取得 from_wallet.version=3)
    │   ├── 5. SELECT * FROM wallets WHERE user_id=<bob.id>  (取得 to_wallet)
    │   │      └── NULL                                          → WalletNotFoundException → 404
    │   ├── 6. if from_wallet.balance (100) < amount (50)        → InsufficientBalanceException → 400
    │   ├── 7. UPDATE wallets SET balance=100-50, version=3+1, updated_at=NOW()
    │   │      WHERE user_id=1 AND version=3
    │   │      ├── rowcount=1                                    → ✓ 扣款成功
    │   │      └── rowcount=0                                    → ConcurrentModificationException → 409
    │   ├── 8. UPDATE wallets SET balance=balance+50, version=version+1, updated_at=NOW()
    │   │      WHERE user_id=<bob.id>
    │   └── 9. INSERT INTO transactions(from_wallet_id, to_wallet_id, amount, tx_type, status)
    │          VALUES(1, <bob.wallet.id>, 50.00, 'TRANSFER', 'SUCCESS')
    └── COMMIT                                                    ← 全部成功 → 一次性寫入
       └── 任何 exception → ROLLBACK                              ← 全部撤銷
  → 200 { "status": "SUCCESS", "message": "Transfer completed successfully" }
```

### 7. 交易歷史查詢

```
GET /api/transactions  [JWT: userId=1]
  → Depends(get_current_user_id) → user_id=1
  → transaction_service.get_transaction_history(session, 1)
    ├── SELECT * FROM wallets WHERE user_id=1               → wallet.id=1
    │     └── NULL                                         → WalletNotFoundException → 404
    ├── SELECT * FROM transactions
    │     WHERE from_wallet_id=1 OR to_wallet_id=1
    │     ORDER BY created_at DESC
    ├── [Entity, ...] → [TransactionResponse, ...]
    │     └── 每個 Entity 手動轉 DTO (camelCase alias)
    └── return [TransactionResponse, ...]
  → 200 [{ "id": 3, "fromWalletId": 1, "toWalletId": 2, "amount": 50.0000, ... }, ...]
```

### 8. Admin 交易列表 (4 表 JOIN)

```
GET /api/admin/transactions?username=bob&from_date=2025-01-01&page=1&size=20  [JWT: ROLE_ADMIN]
  → Depends(require_admin) → 通過
  → admin_service.list_transactions(session, "bob", 2025-01-01, None, 1, 20)
    ├── aliased JOIN: Transaction
    │     ← outerjoin Wallet(FromWallet) ← outerjoin User(FromUser)
    │     ← outerjoin Wallet(ToWallet)   ← outerjoin User(ToUser)
    ├── WHERE conditions:
    │     ├── (FromUser.username == 'bob' OR ToUser.username == 'bob')
    │     └── Transaction.created_at >= '2025-01-01'
    ├── ORDER BY created_at DESC, OFFSET 0, LIMIT 20
    ├── 同時執行 count_stmt (相同 JOIN + conditions)
    └── return { data: [AdminTransactionResponse, ...], page: 1, size: 20, total: N }
  → 200 { "data": [...], "page": 1, "size": 20, "total": 42 }
```

### 9. Admin 交易統計 (raw SQL GROUP BY)

```
GET /api/admin/transactions/stats?from_date=2025-01-01&to_date=2025-12-31  [JWT: ROLE_ADMIN]
  → Depends(require_admin) → 通過
  → admin_service.get_transaction_stats(session, 2025-01-01, 2025-12-31)
    ├── text("SELECT COUNT(*)::bigint FROM transactions WHERE created_at >= :from_date AND created_at < :to_date")
    │     → totalTransactions
    ├── text("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE ...")
    │     → totalAmount
    ├── text("SELECT DATE(created_at) AS date, COUNT(*)::bigint AS count, COALESCE(SUM(amount), 0) AS amount
    │          FROM transactions WHERE ... GROUP BY DATE(created_at) ORDER BY date")
    │     → dailyVolume: [DailyVolumeItem, ...]
    └── return { totalTransactions, totalAmount, dailyVolume }
  → 200 { "totalTransactions": 1250, "totalAmount": 50000.5000, "dailyVolume": [{ "date": "2025-01-01", "count": 5, "amount": 200.0000 }, ...] }
```

---

## 啟動方式

### 本機開發 (uvicorn)

```bash
# 1. 安裝依賴
pip install -r requirements.txt

# 2. 確保 PostgreSQL 運行在 localhost:5433，資料庫 digital_wallet 已建立
#    可使用 digital_wallet/src/main/resources/static/db.sql 初始化表格

# 3. 啟動 FastAPI (hot reload)
uvicorn app.main:app --reload --port 8000
```

啟動後：
- API 服務：`http://localhost:8000`
- Swagger UI：`http://localhost:8000/docs` (自動生成 OpenAPI 文件)
- ReDoc：`http://localhost:8000/redoc`

### Docker 一鍵啟動

```bash
# 建構並啟動 (PostgreSQL 16 + FastAPI App)
docker-compose up -d

# 查看日誌
docker-compose logs -f app

# 停止
docker-compose down
```

Docker 啟動後：
- API 服務：`http://localhost:8000`
- PostgreSQL：`localhost:5434` (主機埠)
- 資料庫 `digital_wallet` 自動建立 (POSTGRES_DB)
- 需手動執行 `db.sql` 建立表格（或使用容器內 psql）

### Swagger UI 測試流程

1. 打開 `http://localhost:8000/docs`
2. `POST /api/auth/register` → 註冊 alice (password: 123456)
3. `POST /api/auth/register` → 註冊 bob (password: 123456)
4. `POST /api/auth/login` → 登入 alice → 複製返回的 `token`
5. 點右上角 **Authorize** 按鈕 → 貼上 token → 點 Authorize
6. `GET /api/wallets` → 查看 alice 錢包 (餘額 0.0000)
7. `GET /api/transactions` → 查看交易歷史 (空陣列)
8. 手動在 DB 中充值 alice 錢包後測試 `POST /api/transactions/transfer`
9. Admin 端點需手動將用戶 role 改為 `ROLE_ADMIN` 後重新登入

### 前端對接

修改 `digital_wallet_frontend/vite.config.ts` 的 proxy target：

```typescript
// 將 proxy target 指向 FastAPI 服務
proxy: {
  '/api': {
    target: 'http://localhost:8000',  // FastAPI 預設埠
    changeOrigin: true,
  },
}
```

---

## 設計決策問答

### 1. 為什麼選 FastAPI 而不是 Django REST Framework (DRF) 或 Flask？

| 特性 | FastAPI | Django REST Framework | Flask |
|------|---------|----------------------|-------|
| 非同步原生支援 | ✅ `async def` 一等公民 | ⚠️ Django 3.1+ 部分支援 | ❌ 需擴充套件 |
| 自動 API 文件 | ✅ OpenAPI + Swagger UI 內建 | ⚠️ 需 drf-spectacular | ❌ 需擴充套件 |
| 型別安全 | ✅ Pydantic 自動驗證 | ❌ Serializer 手動驗證 | ❌ 無 |
| 效能 (req/s) | ✅ ~15,000 | ⚠️ ~6,000 | ⚠️ ~8,000 |
| 學習曲線 | ✅ 極簡（route decorator） | ⚠️ 概念多 (ViewSet/Serializer/Model) | ✅ 極簡 |
| 生態成熟度 | ⚠️ 2018 年發布 | ✅ 最成熟 | ✅ 最成熟 |

**選 FastAPI 的原因：** 原生 async 與 SQLAlchemy 2.0 async 完美搭配，Pydantic 自動生成 OpenAPI 文件，Depends 依賴注入簡潔，效能遠超同步框架。

### 2. 為什麼 SQLAlchemy 2.0 async 而不是 Django ORM 或 raw SQL？

| 特性 | SQLAlchemy 2.0 async | Django ORM | 原生 asyncpg |
|------|---------------------|------------|-------------|
| 非同步 | ✅ 原生 `AsyncSession` | ⚠️ `sync_to_async` 包裝 | ✅ 純 async |
| 型別提示 | ✅ `Mapped[T]` + mypy | ❌ | ❌ |
| 查詢表達力 | ✅ ORM + `text()` raw SQL 混用 | ✅ ORM | ❌ 全手寫 SQL |
| FastAPI 整合 | ✅ `Depends(get_db)` | ❌ 需 Django 生態 | ✅ |
| Migration | Alembic (手動) | Django Migration (自動) | N/A |

**選 SQLAlchemy 2.0 async：** Python 生態最成熟的 async ORM，支援 `text()` 退路逃脫到 raw SQL，`aliased()` 解決複雜 JOIN，與 FastAPI 的 `Depends` 依賴注入整合最好。

### 3. 為什麼 Pydantic v2 用 `Field(alias=...)` 而不是直接寫 camelCase 欄位名？

- Python PEP 8 慣例 snake_case (`user_id`)，前端 JavaScript/TypeScript 慣例 camelCase (`userId`)
- `Field(alias="userId")` 讓 **Python 程式碼保持 snake_case**，**JSON 輸出自動轉 camelCase**
- `ConfigDict(populate_by_name=True)` 允許賦值時兩種命名都能用：`WalletResponse(userId=wallet.user_id)` 和 `WalletResponse(user_id=wallet.user_id)` 都合法
- 沒有這個配置，Service 層賦值只能用 alias 名稱，容易出錯

### 4. 為什麼事務管理用 `async with session.begin()` 而不是 decorator？

- Python 沒有像 Java AOP (`@Transactional`) 的自動代理機制
- `async with session.begin()` 是 Python 的慣用模式（context manager），類似 Java `try-with-resources`
- 明確的事務邊界比隱式代理更容易除錯：一眼看出哪些端點有事務、哪些只讀
- 事務邊界定義在 API 層：Service 層保持純業務邏輯，不耦合事務管理

### 5. 為什麼樂觀鎖 (optimistic locking) 比悲觀鎖 (pessimistic locking) 好？

| 維度 | 悲觀鎖 `SELECT ... FOR UPDATE` | 樂觀鎖 `version` 欄位 |
|------|-------------------------------|---------------------|
| 實作 | 鎖住行，其他請求排隊等待 | 不鎖，提交時檢查 version |
| 高併發效能 | ⚠️ 排隊瓶頸 | ✅ 無鎖競爭 |
| Deadlock 風險 | ⚠️ 可能發生 | ✅ 不會發生 |
| 適用場景 | 寫多讀少 | **讀多寫少** |
| 失敗處理 | 等待 | 前端重試 (409) |

錢包大部分時間在查詢（GET /api/wallets），偶爾轉賬（POST /api/transactions/transfer），適合樂觀鎖。

### 6. 為什麼密碼用 BCrypt 而不是 SHA-256 或 Argon2？

- **BCrypt 內建隨機 salt**：`passlib` 每次 `hash_password()` 自動生成 22 字元隨機 salt，相同密碼每次產生不同 hash
- **BCrypt 故意慢**：work factor (default 12) 讓每次 hash 耗時 ~250ms，抗暴力破解
- **SHA-256 太快**：GPU 可每秒計算數十億次，適合彩虹表攻擊
- **不選 Argon2**：雖是 2015 年密碼雜湊競賽冠軍，但 `passlib` 支援成熟度不如 BCrypt，且數位錢包場景 BCrypt 已足夠

### 7. 為什麼登入失敗不區分錯誤原因？

- 返回相同 401 "Invalid username or password"，無論用戶不存在、密碼錯誤、或已禁用
- **防止攻擊者列舉有效用戶名**：如果「用戶不存在」和「密碼錯誤」返回不同訊息，攻擊者可以試出哪些用戶名已註冊
- 與 Java 版行為一致

### 8. 為什麼用 `Model = aliased(Table)` 而不是 subquery？

Admin 交易列表需要從錢包查出對應用戶名，且一筆交易涉及兩個錢包 (from/to)：

- `aliased(Wallet)` 讓同一張 `wallets` 表在同一個查詢中以不同別名出現兩次
- 如果用 subquery：需要兩個獨立子查詢，SQL 更冗長，效能更差（兩個 subquery vs 兩個 outer join）
- `outerjoin` 而非 `join`：避免 `from_wallet_id`/`to_wallet_id` 為 NULL 時整行被過濾掉

---

## 安全紅線

| 要做的 | 不要做的 |
|--------|---------|
| passlib bcrypt 雜湊密碼（auto-salt, work factor 12） | 明文或 SHA-256 存密碼 |
| 從 JWT payload `sub` 提取用戶身份 (`get_current_user_id`) | 從 URL 路徑參數獲取用戶 ID |
| 從 JWT payload `role` 檢查管理員權限 (`require_admin`) | 從請求體中接受 role 欄位 |
| 註冊時強制 `role="ROLE_USER"`，忽略客戶端輸入 | 允許客戶端指定 role |
| 登入失敗統一返回 401 "Invalid username or password" | 區分「用戶不存在」vs「密碼錯誤」vs「已禁用」 |
| DTO (`UserResponse`) 過濾掉 `password_hash` | ORM Model 直接序列化返回前端 |
| `except IntegrityError` 精準捕獲約束違反 | `except Exception` 捕獲所有錯誤 |
| `async with session.begin()` 管理事務邊界 | 手動 `rollback()` 在 `session.begin()` 內部 |
| `@app.exception_handler(Exception)` 對外隱藏內部錯誤 | 將 `str(exc)` 直接返回給客戶端 |
| `JWT_EXPIRATION` 限制 24 小時內過期 | 永不過期的 token |
| `size = max(min(size, 100), 1)` 限制分頁上限 | 允許 `size=999999` 一次拉取所有記錄 |

---

## 常見錯誤

| 錯誤 | 後果 | 正確做法 |
|------|------|---------|
| `balance: float` 宣告 | `0.1 + 0.2 = 0.30000000000000004` 浮點誤差 | `balance: Decimal` + `Numeric(18, 4)` |
| `except Exception` 捕獲 `session.flush()` | 連線中斷、逾時誤報為「用戶名已存在」 | `except IntegrityError` |
| Service 層內部呼叫 `session.rollback()` | 與 `session.begin()` 雙重 rollback 警告 | 讓 API 層的 `session.begin()` 統一管理 |
| bulk `update()` 沒設 `updated_at=func.now()` | 時間戳永遠停在 INSERT 時的值 | `.values(updated_at=func.now())` |
| 只設 `server_default` 忘記 `onupdate=func.now()` | ORM dirty check update 時時間戳不更新 | 兩個都設（雙重保障） |
| 忘記 `ConfigDict(populate_by_name=True)` | `WalletResponse(userId=wallet.user_id)` 賦值失敗 | 每個 Response Schema 都加 |
| 忘記 `auto_error=False` | 公開端點 (register/login) 也要求 Token | `OAuth2PasswordBearer(auto_error=False)` |
| `OAuth2PasswordBearer` 提取失敗不檢查 header | Swagger 以外的客戶端無法使用 | 手動 `request.headers.get("Authorization")` fallback |
| `require_admin` 中 `except Exception` 吞掉 `AppException` | 403 被轉成 401 | `except AppException: raise` 讓 403 穿透 |
| `aliased` JOIN 忘了 outerjoin | `from_wallet_id` NULL 的交易整行遺漏 | `outerjoin` 保留 NULL 關聯 |
| `text()` raw SQL 用 f-string 拼接參數 | SQL injection | 使用 `:param` 具名參數 + `params` dict |
| camelCase alias 與前端不一致 | 前端 `response.fromWalletId` 為 undefined | 對照前端 `types/index.ts` 確認每個 alias |
