# Digital Wallet Backend — FastAPI 版 (Demo)

> **技術驗證 / 抄作業項目**：用 Python FastAPI 生態複現數位錢包的所有功能。**API 合約與其他四個後端完全一致**，前端 `digital_wallet_frontend` 無需任何改動即可對接。

## 五版本技術對照

| 功能 | Spring Boot | Spring MVC | FastAPI | Laravel | 純 PHP |
|------|------------|-----------|---------|---------|--------|
| 語言 | Java 21 | Java 21 | Python 3.12+ | PHP 8.3+ | PHP 8.3+ |
| Web 框架 | Spring Boot 3.5 | Spring MVC 6（無 Boot） | FastAPI 0.115+ | Laravel 11 | 無 |
| 配置方式 | `application.yaml` | `web.xml` + XML | Pydantic Settings | `.env` | 無 |
| ORM / DB | MyBatis (XML SQL) | MyBatis + 手動 SqlSessionFactory | SQLAlchemy 2.0 async | Eloquent | 原生 PDO |
| DB 驅動 | JDBC PostgreSQL | JDBC PostgreSQL | asyncpg | PDO pgsql | PDO pgsql |
| 密碼雜湊 | BCrypt | BCrypt | passlib[bcrypt] | `Hash::make()` | `password_hash()` |
| JWT | jjwt 0.11.5 | jjwt 0.11.5 | PyJWT 2.x | firebase/php-jwt | firebase/php-jwt |
| 序列化 | Jackson | Jackson | Pydantic v2 | 手動 array | 手動 array |
| 伺服器 | 內建 Tomcat | 外部 Tomcat（WAR） | Uvicorn | PHP-FPM | `php -S` |
| 依賴注入 | Spring DI | XML `<bean>` | FastAPI Depends | Laravel Container | 無 |
| 事務管理 | `@Transactional` | `<tx:annotation-driven>` | `session.begin()` | `DB::transaction()` | 手動 |
| 樂觀鎖 | MyBatis UPDATE + rowcount | MyBatis UPDATE + rowcount | SQLAlchemy UPDATE + rowcount | Eloquent `update()` | PDO + `rowCount()` |
| 全域異常 | `@RestControllerAdvice` | `@RestControllerAdvice` | `@app.exception_handler` | `Exceptions::render()` | try/catch |
| 打包 | Fat JAR | WAR | — | — | — |

## 技術清單

| 技術 | 版本 | 用途 |
|------|------|------|
| Python | 3.12+ | 核心語言 |
| FastAPI | 0.115+ | 非同步 Web 框架 |
| SQLAlchemy | 2.0+ (async) | ORM + 連線池 |
| asyncpg | 0.29+ | PostgreSQL 非同步驅動 |
| Pydantic | 2.7+ | 資料驗證與序列化 |
| passlib[bcrypt] | 1.7+ | BCrypt 密碼雜湊 |
| PyJWT | 2.8+ | JWT Token (HS256) |
| pydantic-settings | 2.3+ | 環境變數配置 |
| Uvicorn | 0.30+ | ASGI 伺服器 |
| Docker | — | 容器化部署 |

---

## 完整專案結構

```
digital_wallet_fastapi/
├── requirements.txt              # Python 依賴
├── Dockerfile                    # 多階段 Docker 構建
├── docker-compose.yml            # PostgreSQL 16 + FastAPI App
├── .env                          # 配置（JWT secret、DB URL）
├── db.sql                        # 資料庫初始化 DDL（與 Spring Boot 版共用）
│
├── app/
│   ├── __init__.py
│   ├── main.py                   # FastAPI 入口 + 路由註冊 + 全域異常處理
│   │
│   ├── config.py                 # pydantic-settings 配置
│   ├── database.py               # SQLAlchemy async engine + session factory
│   │
│   ├── models/                   # SQLAlchemy ORM 模型
│   │   ├── __init__.py           #   集中匯出 User, Wallet, Transaction
│   │   ├── user.py               #   users 表
│   │   ├── wallet.py             #   wallets 表（version 樂觀鎖）
│   │   └── transaction.py        #   transactions 表
│   │
│   ├── schemas/                  # Pydantic 模型（請求/響應）
│   │   ├── __init__.py
│   │   ├── common.py             #   ApiResponse (通用響應)
│   │   ├── auth.py               #   UserCreate, UserResponse, LoginRequest, LoginResponse
│   │   ├── wallet.py             #   WalletResponse
│   │   └── transaction.py        #   TransferRequest, TransactionResponse
│   │
│   ├── api/                      # API 路由
│   │   ├── __init__.py
│   │   ├── auth.py               #   POST /api/auth/register, /login
│   │   ├── wallets.py            #   GET /api/wallets
│   │   └── transactions.py       #   POST /api/transactions/transfer, GET /api/transactions
│   │
│   ├── services/                 # 業務邏輯
│   │   ├── __init__.py
│   │   ├── auth_service.py       #   register(), login()
│   │   ├── wallet_service.py     #   get_wallet_by_user_id()
│   │   └── transaction_service.py #  transfer() + 樂觀鎖, get_transaction_history()
│   │
│   ├── core/                     # 基礎設施
│   │   ├── __init__.py
│   │   ├── security.py           #   JWT 生成/驗證 + BCrypt
│   │   └── deps.py               #   FastAPI Depends (get_current_user_id)
│   │
│   └── exceptions/               # 自定義異常
│       ├── __init__.py
│       └── handlers.py           #   AppException + 5 個子類
│
└── README.md
```

---

## 如何快速找到要抄的部分

| 你想學/抄什麼 | 直接看這個檔案 | 對應 Spring Boot 版 |
|-------------|-------------|-------------------|
| FastAPI 專案初始化 + 路由 | [main.py](app/main.py) | DigitalWalletApplication + SecurityConfig |
| pydantic-settings 讀 .env | [config.py](app/config.py) | application.yaml + @Value |
| SQLAlchemy async engine + session | [database.py](app/database.py) | MyBatis SqlSessionFactory |
| ORM 模型定義 | [models/](app/models/) | Entity 類 |
| Pydantic camelCase alias | [schemas/](app/schemas/) | DTO + @JsonProperty |
| JWT 生成/驗證 | [core/security.py](app/core/security.py) | JwtUtil.java |
| FastAPI Depends (JWT 攔截) | [core/deps.py](app/core/deps.py) | JwtAuthenticationFilter |
| passlib BCrypt 密碼處理 | [core/security.py](app/core/security.py) | BCryptPasswordEncoder |
| 樂觀鎖 + updated_at | [services/transaction_service.py](app/services/transaction_service.py) | TransactionServiceImpl + WalletMapper.xml |
| 全域異常處理 | [exceptions/handlers.py](app/exceptions/handlers.py) + [main.py](app/main.py) | GlobalExceptionHandler |
| FastAPI APIRouter | [api/](app/api/) | @RestController |
| Docker 容器化 | [Dockerfile](Dockerfile) + [docker-compose.yml](docker-compose.yml) | (同結構) |
| DB schema | [db.sql](db.sql) | db.sql |

---

## API 端點（五版本完全一致）

| 方法 | 路徑 | JWT | 請求體 | 響應 | HTTP |
|------|------|-----|--------|------|------|
| POST | `/api/auth/register` | 否 | `{"username":"alice","password":"123456"}` | `{"status":"SUCCESS","message":"User registered successfully"}` | 201 |
| POST | `/api/auth/login` | 否 | `{"username":"alice","password":"123456"}` | `{"token":"eyJ...","user":{"id":1,"username":"alice","role":"ROLE_USER","createdAt":"..."}}` | 200 |
| GET | `/api/wallets` | 是 | — | `{"id":1,"userId":1,"currency":"USDT","balance":100.5000,"version":3,"updatedAt":"..."}` | 200 |
| POST | `/api/transactions/transfer` | 是 | `{"toUsername":"bob","amount":50.0}` | `{"status":"SUCCESS","message":"Transfer completed successfully"}` | 200 |
| GET | `/api/transactions` | 是 | — | `[{...TransactionDTO}, ...]` | 200 |

---

## 錯誤響應格式

所有錯誤返回統一的 JSON 格式：

```json
{"status": "ERROR", "message": "..."}
```

| HTTP | 異常類 | 場景 |
|------|------|------|
| 400 | `InsufficientBalanceException` | 餘額不足 |
| 400 | `AppException` | amount <= 0、自己轉給自己 |
| 401 | `AuthenticationException` | 登入失敗、Token 無效/過期 |
| 404 | `WalletNotFoundException` | 錢包不存在 |
| 409 | `ConcurrentModificationException` | 樂觀鎖版本衝突（提示用戶重試） |
| 409 | `DuplicateUsernameException` | 用戶名重複 |
| 500 | `Exception` (fallback) | 未預期錯誤 |

---

## 資料庫表結構 (db.sql)

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

---

## 核心實作模式（每個檔案 == 完整可複製程式碼 + 解釋）

### 模式 1：專案入口與配置（4 個檔案）

#### 1.1 main.py — FastAPI 入口

```python
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api import auth, wallets, transactions
from app.exceptions.handlers import AppException
from app.schemas.common import ApiResponse

app = FastAPI(
    title="Digital Wallet API",
    version="1.0",
    description="數位錢包 REST API 文件 (FastAPI 版)",
)

# 註冊路由
app.include_router(auth.router)
app.include_router(wallets.router)
app.include_router(transactions.router)


@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content=ApiResponse.error(exc.message).model_dump(),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content=ApiResponse.error(str(exc.errors()[0]["msg"])).model_dump(),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content=ApiResponse.error(f"An unexpected error occurred: {str(exc)}").model_dump(),
    )
```

**為什麼這樣寫：**
- `@app.exception_handler(AppException)`：捕獲所有業務異常，對應 Spring Boot 的 `@RestControllerAdvice`
- `@app.exception_handler(Exception)`：兜底捕獲未預期錯誤，返回 500
- `model_dump()`：Pydantic v2 的序列化方法（等同 v1 的 `.dict()`）
- FastAPI 自動生成 Swagger UI 在 `/docs`（無需像 Spring Boot 加 SpringDoc）

#### 1.2 config.py — 環境變數配置

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
- 自動從 `.env` 讀取，環境變數可覆蓋（Docker 部署用 `DATABASE_URL=...` 覆蓋）
- 型別安全：`JWT_EXPIRATION: int` 自動將字串 `"86400000"` 轉為 int
- 提供預設值方便本地開發

**對應 Spring Boot：** `@Value("${jwt.secret}")` + `application.yaml`

#### 1.3 database.py — 非同步資料庫

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

**為什麼 `get_db` 用 generator yield：**
- FastAPI `Depends(get_db)` 在請求開始時創建 session，結束時自動關閉
- `expire_on_commit=False`：commit 後屬性不會過期，避免 async lazy loading 問題
- `echo=False`：生產環境關閉 SQL 日誌，開發時可改為 True

**對應 Spring Boot：** MyBatis `SqlSessionFactory` + `@Mapper` 自動注入

#### 1.4 requirements.txt

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

---

### 模式 2：ORM 模型（對應 DB 表）

#### 2.1 models/user.py

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

#### 2.2 models/wallet.py

```python
from datetime import datetime
from decimal import Decimal

from sqlalchemy import BigInteger, String, Numeric, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Wallet(Base):
    __tablename__ = "wallets"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="USDT")
    balance: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=0)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), onupdate=func.now())
```

**為什麼 `balance` 用 `Numeric(18,4)` → `Decimal`：**
- 金額**絕對不能**用 `float`（`0.1 + 0.2 = 0.30000000000000004`）
- Python `Decimal` 保證精確計算，對應 Java `BigDecimal`

**為什麼 `updated_at` 有 `onupdate=func.now()`：**
- `server_default` 只在 INSERT 時生效
- `onupdate` 在每次 UPDATE 時自動更新時間戳
- 在 `transaction_service.py` 的 UPDATE 語句中也有手動設置
- **雙重保障**：即使有人用 SQLAlchemy ORM 直接 update 物件，時間戳也會自動更新

#### 2.3 models/transaction.py

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

#### 2.4 models/__init__.py — 集中匯出

```python
from app.models.user import User
from app.models.wallet import Wallet
from app.models.transaction import Transaction

__all__ = ["User", "Wallet", "Transaction"]
```

**為什麼要在 `__init__.py` 集中匯出：** 其他模組可以寫 `from app.models import User` 而不是 `from app.models.user import User`。另外，Alembic（遷移工具）需要從 `Base` 匯入所有模型才能偵測 schema 變化。

---

### 模式 3：Pydantic Schemas — camelCase 對前端

#### 3.1 schemas/common.py

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
- 與 Java 版 `ApiResponse.success()` 一致

#### 3.2 schemas/auth.py

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

#### 3.3 schemas/wallet.py

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

#### 3.4 schemas/transaction.py

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

**為什麼每個 Response 都要 `model_config = ConfigDict(populate_by_name=True)`：**

這是最容易被忽略但最重要的 Pydantic v2 配置。

- `Field(alias="userId")`：JSON 輸出時 snake_case `user_id` 自動變成 camelCase `userId`
- `populate_by_name=True`：**同時允許** `user_id` 和 `userId` 兩種 key 賦值
- 沒有這個配置，在 Service 層 `WalletResponse(userId=wallet.user_id)` 會失敗（只能用 alias 賦值）

**為什麼 `TransferRequest.amount` 是 `Decimal` 而不是 `float`：**
- Pydantic v2 可以自動將 JSON 的 `50.0`（float）或 `50`（int）轉為 `Decimal`
- **不能用 `float`**：`0.1 + 0.2 = 0.30000000000000004`

---

### 模式 4：安全層（JWT + BCrypt + Depends）

#### 4.1 core/security.py

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


def create_access_token(user_id: int, username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(milliseconds=settings.JWT_EXPIRATION)
    payload = {
        "sub": str(user_id),
        "username": username,
        "iat": datetime.now(timezone.utc),
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
```

**與 Java 版逐行對照：**

| FastAPI | Spring Boot |
|------|------|
| `hash_password(p)` | `passwordEncoder.encode(p)` |
| `verify_password(p, h)` | `passwordEncoder.matches(p, h)` |
| `create_access_token(id, name)` | `jwtUtil.generateToken(id, name)` |
| `decode_token(token)` | `jwtUtil.extractAllClaims(token)` |
| `settings.JWT_SECRET` | `@Value("${jwt.secret}")` |
| `settings.JWT_EXPIRATION` | `@Value("${jwt.expiration}")` |

**為什麼 `sub` 存字串而不是 int：**
- JWT 標準中 `sub` 是字串類型（RFC 7519）
- Java 版用 `String.valueOf(userId)`，Python 版用 `str(user_id)`

**為什麼用 `timezone.utc`：**
- JWT 的 `exp` 和 `iat` 是 Unix timestamp，應該用 UTC 時間
- `datetime.utcnow()` 已棄用，改用 `datetime.now(timezone.utc)`

#### 4.2 core/deps.py — FastAPI 版 JwtAuthenticationFilter

```python
from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_token
from app.exceptions.handlers import AuthenticationException

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user_id(request: Request, token: str | None = Depends(oauth2_scheme)) -> int:
    if token is None:
        # fallback: 從 Authorization Header 手動提取
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
```

**為什麼雙重提取 Token：**
- `OAuth2PasswordBearer`：標準 OAuth2 流程（從 Swagger UI Authorize 按鈕發送的 Token）
- 手動 Header 提取：作為 fallback，支援非標準客戶端
- `auto_error=False`：Token 不存在時不自動報錯（讓公開端點可以無 Token 存取）

**為什麼解碼失敗返回 "Invalid username or password" 而不是 "Token expired"：**
- 安全考量：不洩漏 Token 為何無效（過期/篡改/格式錯誤）
- 與 Java 版行為一致

**對應 Spring Boot：** 整個 `JwtAuthenticationFilter.doFilterInternal()` 方法

---

### 模式 5：異常處理

#### 5.1 exceptions/handlers.py

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
- `AppException` 自帶 `status_code` 屬性，全域 handler 直接讀取
- 子類只定義 status_code，不用重複寫 handler
- 與 Java 版 5 個 Exception 類完全對應（含 `DuplicateUsernameException`）

**為什麼全部繼承 `Exception` 而不是 `HTTPException`：**
- FastAPI 的 `HTTPException` 是 FastAPI 專用的
- 自定義異常可以脫離 FastAPI 使用（例如在 CLI script 中）
- 透過 `@app.exception_handler` 轉換為 HTTP 響應

---

### 模式 6：Service 層

#### 6.1 services/auth_service.py — 註冊與登入

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
    # role is always ROLE_USER
    user = User(username=username, password_hash=hash_password(password), role="ROLE_USER")
    session.add(user)
    try:
        await session.flush()
    except IntegrityError:
        raise DuplicateUsernameException(f"Username '{username}' is already taken")

    # auto-create wallet
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

    token = create_access_token(user.id, user.username)

    user_response = UserResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        createdAt=user.created_at,
    )

    return LoginResponse(token=token, user=user_response)
```

**關鍵設計：**

1. **`session.flush()` vs `session.commit()`：**
   - `flush()`：發送 SQL 到 DB（觸發 unique constraint 檢查 + 取得自增 ID），但**不 commit**
   - 呼叫端 `api/auth.py` 用 `async with session.begin()` 統一 commit
   - 如果 `register()` 內部 commit，後面 `wallet` insert 失敗就無法回滾 user

2. **為什麼捕獲 `IntegrityError` 而不是 `Exception`：**
   - `IntegrityError` 是 SQLAlchemy 中所有約束違反的基類（unique、foreign key、check 等）
   - PostgreSQL 的 `username UNIQUE` 違反對應 `IntegrityError`
   - 捕獲 `Exception` 太寬泛：連線中斷、逾時等會被誤報為「用戶名已存在」

3. **為什麼不內部呼叫 `session.rollback()`：**
   - 呼叫端 `async with session.begin()` 會在例外拋出時自動 rollback
   - 手動 rollback 會導致重複 rollback（第二次是 no-op 但有警告）

4. **登入失敗不區分錯誤原因：**
   - 「用戶不存在」和「密碼錯誤」返回相同的 401 "Invalid username or password"
   - 防止攻擊者列舉有效用戶名
   - 與 Java 版行為一致

**對應 Spring Boot：** `AuthServiceImpl.register()` + `AuthServiceImpl.login()`

#### 6.2 services/wallet_service.py

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

**為什麼手動 Entity → DTO 轉換而不是用 `from_orm`：**
- Pydantic v2 的 `from_attributes` 可以直接從 ORM 物件建立，但欄位名必須一致
- 由於 ORM 用 snake_case、DTO 用 camelCase alias，手動建構更直觀
- 欄位多了可以改用 `model_validate(wallet, from_attributes=True)`

**對應 Spring Boot：** `WalletServiceImpl.getWalletByUserId()`

#### 6.3 services/transaction_service.py — 核心轉賬（樂觀鎖）

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
    # 1. 驗證
    if amount <= 0:
        raise AppException(400, "Transfer amount must be greater than zero")

    # 2. 根據用戶名查找收款用戶
    stmt = select(User).where(User.username == to_username)
    result = await session.execute(stmt)
    to_user = result.scalar_one_or_none()
    if to_user is None:
        raise WalletNotFoundException(f"User not found: {to_username}")
    to_user_id = to_user.id

    # 3. 快速失敗：自己轉給自己
    if from_user_id == to_user_id:
        raise AppException(400, "Cannot transfer to yourself")

    # 4. 讀取雙方錢包（含 version）
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

    # 5. 快速失敗：餘額不足
    if from_wallet.balance < amount:
        raise InsufficientBalanceException(
            f"Insufficient balance: {from_wallet.balance} < {amount}"
        )

    # 6. 樂觀鎖扣款
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

    # 7. 加款
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

    # 8. 記錄交易
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
    stmt = select(Wallet).where(Wallet.user_id == user_id)
    result = await session.execute(stmt)
    wallet = result.scalar_one_or_none()
    if wallet is None:
        raise WalletNotFoundException(f"Wallet not found for userId: {user_id}")

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

**為什麼驗證錯誤用 `AppException(400)` 而不是 `InsufficientBalanceException`：**
- `amount <= 0` 和 `自己轉給自己` 是輸入驗證錯誤，不是餘額問題
- HTTP 400 是正確的，但異常名稱更語義化

**為什麼 UPDATE 要手動設置 `updated_at=func.now()`：**
- SQLAlchemy 的 bulk `update()` 語句**不會觸發** ORM 的 `onupdate`
- 必須手動設置，否則 `updated_at` 永遠停留在 INSERT 時的值
- 這與 Java 版 MyBatis SQL 中的 `updated_at = CURRENT_TIMESTAMP` 對應

**事務管理：** 呼叫端 `api/transactions.py` 用 `async with session.begin()` 包裹整個 `transfer()`：
- **成功** → 自動 COMMIT（扣款 + 加款 + 記錄交易全部生效）
- **任一環節失敗** → 自動 ROLLBACK（全部撤銷）

**對應 Spring Boot：** `TransactionServiceImpl.transfer()` + `WalletMapper.xml`

---

### 模式 7：API 路由層

#### 7.1 api/auth.py

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

#### 7.2 api/wallets.py

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

#### 7.3 api/transactions.py

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

**為什麼用 `Depends(get_current_user_id)` 而不是路徑參數：**

對比 Spring Boot 版的 `SecurityContextHolder.getContext().getAuthentication().getPrincipal()` — FastAPI 版更簡潔，一行 `Depends` 即可完成 JWT 驗證和用戶身份提取。

**為什麼用 `response_model=`：**
- FastAPI 自動用 Pydantic model 序列化響應
- `Field(alias="createdAt")` 自動將 `created_at` 轉為 `createdAt`
- 若返回欄位與 response_model 不符，FastAPI **在響應時**會報錯（型別安全）

**為什麼 `register` 用 `async with session.begin()`：**
- 需要確保 `INSERT user` + `INSERT wallet` 在同一事務中
- 如果 wallet 創建失敗，user 也會回滾

**為什麼 `transfer` 用 `async with session.begin()`：**
- 扣款/加款/記錄交易三個操作要麼全成功、要麼全回滾
- 事務邊界在 API 層定義（不在 Service 層）

---

### 模式 8：Docker 容器化

#### Dockerfile

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
1. **build 階段**：安裝依賴（含 gcc 等編譯工具）
2. **執行階段**：只複製已安裝的 site-packages，不含編譯工具
3. 最終 Image 不含 pip cache、requirements.txt、build 工具

**為什麼用 `python:3.12-slim` 而不是 `alpine`：**
- `slim` 基於 Debian，與 `asyncpg` 相容性好
- `alpine` 用 musl libc，`asyncpg` 有時會有相容性問題

#### docker-compose.yml

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
- 埠映射 `5434:5432`：主機用 5434，容器內部用 5432
- Docker 內部通訊 `postgres:5432`：app 和 postgres 在同一個 network 中，用容器埠
- `depends_on` + `condition: service_healthy`：確保 PostgreSQL 完全就緒後才啟動 app
- `JWT_EXPIRATION: "86400000"`：必須是字串（環境變數只能是字串），pydantic-settings 會自動轉為 int
- volume 名 `pgdata_fastapi`：與 Spring Boot 版的 `pgdata` 區分，避免衝突

---

## 數據流圖

### 1. 用戶註冊

```
POST /api/auth/register  { username, password }
  → AuthController.register(UserCreate)
  → async with session.begin():
    ├── hash_password("123456")                    // passlib bcrypt（自動加鹽）
    ├── INSERT INTO users(username, password_hash, role)
    │     → session.flush() → 取得 user.id
    │     └── catch IntegrityError → DuplicateUsernameException → 409
    ├── INSERT INTO wallets(user_id, currency='USDT', balance=0, version=0)
    └── COMMIT
  → 201 { "status": "SUCCESS", "message": "User registered successfully" }
```

### 2. 用戶登錄

```
POST /api/auth/login  { username, password }
  → AuthController.login(LoginRequest)
  → auth_service.login(session, username, password)
    ├── SELECT * FROM users WHERE username=?
    │     └── null → AuthenticationException → 401 "Invalid username or password"
    ├── verify_password(password, hash)            // passlib verify（自動解析鹽值）
    │     └── false → AuthenticationException → 401 "Invalid username or password"
    ├── create_access_token(user_id, username)     // PyJWT HS256, 24h
    └── return LoginResponse(token, UserResponse)
  → 200 { "token": "eyJ...", "user": { "id": 1, "username": "alice", "role": "ROLE_USER", "createdAt": "..." } }
```

### 3. JWT 請求攔截

```
Request: Authorization: Bearer eyJ...
  → get_current_user_id() [FastAPI Depends]
    ├── OAuth2PasswordBearer 提取 token
    │     └── null → fallback: request.headers["Authorization"]
    │           └── null → AuthenticationException → 401
    ├── decode_token(token)                        // PyJWT 驗證簽名 + 過期
    │     └── exception → AuthenticationException → 401
    ├── int(payload["sub"]) → userId
    └── return userId
  → Controller 取得 userId
```

### 4. 查詢錢包（IDOR 防護後）

```
GET /api/wallets  [JWT: userId=1]
  → get_current_user_id() → userId=1
  → wallet_service.get_wallet_by_user_id(session, 1)
    ├── SELECT * FROM wallets WHERE user_id=1
    ├── null → WalletNotFoundException → 404
    └── Entity → WalletResponse (camelCase alias)
  → 200 { "id": 1, "userId": 1, "currency": "USDT", "balance": 100.5000, "version": 3, "updatedAt": "..." }
```

### 5. 轉賬（核心流程，session.begin() 事務）

```
POST /api/transactions/transfer  { toUsername: "bob", amount: 50.00 }  [JWT: userId=1]
  → get_current_user_id() → fromUserId=1
  → transaction_service.transfer(session, 1, "bob", 50.00)
    async with session.begin():                    ← 整個流程一個事務
      ├── 1. 驗證 amount > 0
      │       失敗 → AppException(400)
      ├── 2. SELECT * FROM users WHERE username='bob'  // 根據用戶名查找
      │       不存在 → WalletNotFoundException → 404
      ├── 3. 驗證 from_user_id != to_user.id
      │       失敗 → AppException(400)
      ├── 4. SELECT * FROM wallets WHERE user_id=1  // 取得 version
      ├── 5. SELECT * FROM wallets WHERE user_id=<to_user.id>
      │       不存在 → WalletNotFoundException → 404
      ├── 6. balance (100) >= amount (50)? → YES（快速失敗）
      ├── 7. UPDATE wallets SET balance=balance-50, version=version+1, updated_at=NOW()
      │        WHERE user_id=1 AND version=3
      │        → rowcount=1 (成功)
      │        → rowcount=0 → ConcurrentModificationException → 409
      ├── 8. UPDATE wallets SET balance=balance+50, version=version+1, updated_at=NOW()
      │        WHERE user_id=<to_user.id>
      ├── 9. INSERT INTO transactions(from_wallet_id, to_wallet_id, amount, tx_type, status)
      │        VALUES(1, <to_wallet.id>, 50.00, 'TRANSFER', 'SUCCESS')
      └── COMMIT（全部成功）│ 異常 → ROLLBACK（全部撤銷）
  → 200 { "status": "SUCCESS", "message": "Transfer completed successfully" }
```

### 6. 交易歷史

```
GET /api/transactions  [JWT: userId=1]
  → get_current_user_id() → userId=1
  → transaction_service.get_transaction_history(session, 1)
    ├── SELECT * FROM wallets WHERE user_id=1       // 取得 wallet.id
    │     └── null → WalletNotFoundException → 404
    ├── SELECT * FROM transactions
    │     WHERE from_wallet_id=? OR to_wallet_id=?
    │     ORDER BY created_at DESC
    ├── [Entity] → [TransactionResponse] (camelCase)
    └── return
  → 200 [TransactionResponse, ...]
```

### 7. 異常處理流程

```
Controller → Service → DB 任一層拋出異常
  → @app.exception_handler(AppException)
    ├── AuthenticationException         → 401 { "status": "ERROR", "message": "Invalid username or password" }
    ├── InsufficientBalanceException    → 400 { "status": "ERROR", "message": "Insufficient balance: ..." }
    ├── ConcurrentModificationException → 409 { "status": "ERROR", "message": "Concurrent modification detected" }
    ├── WalletNotFoundException         → 404 { "status": "ERROR", "message": "Wallet not found" }
    ├── DuplicateUsernameException      → 409 { "status": "ERROR", "message": "Username is already taken" }
    └── AppException(400)               → 400 { "status": "ERROR", "message": "..." }
  → @app.exception_handler(Exception)
    └── Exception (fallback)            → 500 { "status": "ERROR", "message": "An unexpected error occurred: ..." }
```

---

## 設計決策問答

### 1. 為什麼選 SQLAlchemy 2.0 async 而不是 Django ORM / raw SQL？

| SQLAlchemy async | Django ORM | raw SQL |
|------|------|------|
| ✅ FastAPI 原生搭配 | ❌ Django 限定 | ✅ 最大控制 |
| ✅ 完整型別提示 (Mapped) | ✅ 自動管理 | ❌ 手動序列化 |
| ✅ async 原生支援 | ⚠️ 部分 async | ✅ 純 async |

**選 SQLAlchemy：** Python 生態最成熟的 async ORM，與 FastAPI `Depends` 整合最好。

### 2. 為什麼 Pydantic 用 alias 而不是直接寫 camelCase？

- Python PEP 8 要求 snake_case（`user_id`）
- 前端 TypeScript 慣例 camelCase（`userId`）
- `Field(alias="userId")` 讓 Python 保持 snake_case，JSON 用 camelCase
- `populate_by_name=True` 允許賦值時兩種命名都能用

### 3. 為什麼事務用 `async with session.begin()` 而不是裝飾器？

- Python 沒有像 Java AOP 的自動代理機制
- `async with` 是 Python 的慣用模式，類似 Java 的 try-with-resources
- 明確的事務邊界比隱式代理更容易除錯和維護

### 4. 為什麼樂觀鎖比悲觀鎖好？

| 悲觀鎖 `SELECT ... FOR UPDATE` | 樂觀鎖 `version` 欄位 |
|------|------|
| 鎖住行，其他請求排隊 | 不鎖，提交時檢查版本 |
| 高併發時差 | 適合讀多寫少 |
| 可能 deadlock | 不會 deadlock |

錢包大部分時間在查詢（讀），偶爾轉賬（寫），適合樂觀鎖。

### 5. 為什麼密碼用 BCrypt 而不是 SHA-256？

- BCrypt 內建隨機鹽值，相同密碼每次產生不同雜湊
- BCrypt 故意慢（work factor），抗暴力破解
- SHA-256 計算太快，適合彩虹表攻擊

### 6. 為什麼登入失敗不區分「用戶不存在」vs「密碼錯誤」？

- 防止攻擊者列舉有效用戶名
- 與 Java 版行為一致

---

## 安全紅線

| ✅ 要做的 | ❌ 不要做的 |
|------|------|
| BCrypt 存密碼（passlib） | 明文或 SHA-256 存密碼 |
| 從 JWT 提取用戶身份（Depends） | 從 URL 路徑參數獲取用戶 ID |
| 登入失敗統一訊息 | 區分「用戶不存在」vs「密碼錯誤」 |
| DTO 過濾敏感欄位 | ORM Model 直接返回前端 |
| `IntegrityError` 捕獲約束違反 | `except Exception` 捕獲所有錯誤 |
| session.begin() 管理事務 | 手動 rollback 在 session.begin() 內部 |

---

## 常見錯誤

| 錯誤 | 後果 | 正確做法 |
|------|------|------|
| `float` 存金額 | 精度問題 | `Decimal` + `Numeric(18,4)` |
| `except Exception` | 連線失敗誤報為重複用戶名 | `except IntegrityError` |
| 內部 `session.rollback()` | 重複 rollback 警告 | 讓 `session.begin()` 管理 |
| UPDATE 沒設 `updated_at` | 時間戳永遠不變 | `.values(updated_at=func.now())` |
| 忘設 `onupdate` | ORM update 時時間不變 | `onupdate=func.now()` |
| 忘設 `populate_by_name` | `WalletResponse(userId=...)` 賦值失敗 | `ConfigDict(populate_by_name=True)` |
| 忘設 `auto_error=False` | 公開端點也要求 Token | `OAuth2PasswordBearer(auto_error=False)` |
| `camelCase` 欄位名不一致 | 前端解析失敗 | 對照 `types/index.ts` 確認每個 alias |

---

## 與 Java 版程式碼量對比

| 關注點 | Java (行數) | Python (行數) |
|------|------|------|
| JWT 配置 | ~60 (3 files) | ~50 (2 files) |
| BCrypt 密碼 | ~5 (inline) | ~4 (2 functions) |
| 樂觀鎖 + 轉賬 | ~45 (Java) + ~15 (XML) | ~40 |
| 異常處理 | ~55 (6 files) | ~35 (1 file) |
| API 路由 | ~40 (3 files) | ~30 (3 files) |
| Entity/DTO 模型 | ~120 (12 files) | ~100 (9 files) |
| Docker | ~20 (2 files) | ~17 (2 files) |
| **總計** | **~350** | **~280** |

Python 版約少 20% 程式碼，主要減少在：無需 XML SQL、無需 interface/impl 分離、Pydantic 比 Java DTO 更簡潔。

---

## 啟動方式

```bash
# 安裝依賴
pip install -r requirements.txt

# 啟動（需 PostgreSQL 先啟動在 :5433，可建表 db.sql）
uvicorn app.main:app --reload --port 8000

# 或 Docker 一鍵啟動
docker-compose up -d

# Swagger UI
# http://localhost:8000/docs
```

**Swagger UI 測試流程：**
1. 打開 `http://localhost:8000/docs`
2. `POST /api/auth/register` → 註冊 alice (password: 123456, role: ROLE_USER)
3. `POST /api/auth/register` → 註冊 bob
4. `POST /api/auth/login` → 登入 alice → 複製返回的 token
5. 點右上角 **Authorize** → 貼上 token → 點 Authorize
6. `GET /api/wallets` → 查看 alice 的錢包（餘額 0）
7. `POST /api/transactions/transfer` → alice 轉給 bob（會失敗，餘額不足）
8. 自行在 DB 充值後再試

**前端對接：** 修改 `digital_wallet_frontend/vite.config.ts` 的 proxy target 為 `http://localhost:8000`。
