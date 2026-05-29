package com.digitalwallet.exception;

public class DuplicateUsernameException extends AppException {
    public DuplicateUsernameException(String message) {
        super(409, message);
    }
}
