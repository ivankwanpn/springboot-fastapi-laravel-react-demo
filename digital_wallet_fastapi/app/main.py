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

# register routers
app.include_router(auth.router)
app.include_router(wallets.router)
app.include_router(transactions.router)


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
