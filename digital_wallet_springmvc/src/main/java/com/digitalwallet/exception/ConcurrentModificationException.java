package com.digitalwallet.exception;

public class ConcurrentModificationException extends AppException {
    public ConcurrentModificationException(String message) {
        super(409, message);
    }
}
