package com.digitalwallet.exception;

public class InsufficientBalanceException extends AppException {
    public InsufficientBalanceException(String message) {
        super(400, message);
    }
}
