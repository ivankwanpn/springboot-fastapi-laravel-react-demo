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
