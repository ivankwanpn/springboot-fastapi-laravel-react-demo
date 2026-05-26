package com.digital_wallet.model.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ApiResponse {
    private String status;
    private String message;

    public static ApiResponse success(String message) {
        return new ApiResponse("SUCCESS", message);
    }

    public static ApiResponse error(String message) {
        return new ApiResponse("ERROR", message);
    }
}
