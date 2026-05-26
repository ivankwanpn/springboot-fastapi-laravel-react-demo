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
