package com.digitalwallet.exception;

public class WalletNotFoundException extends AppException {
    public WalletNotFoundException(String message) {
        super(404, message);
    }
}
