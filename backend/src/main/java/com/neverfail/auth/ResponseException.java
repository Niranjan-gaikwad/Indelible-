package com.neverfail.auth;

public class ResponseException extends RuntimeException {
    public final int status;
    public ResponseException(int status, String message) {
        super(message);
        this.status = status;
    }
}
