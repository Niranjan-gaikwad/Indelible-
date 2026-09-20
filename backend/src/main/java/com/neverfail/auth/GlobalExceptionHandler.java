// backend/src/main/java/com/neverfail/auth/GlobalExceptionHandler.java
package com.neverfail.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    
    // Syllabus Requirement: Structured responses with HTTP status codes and timestamps
    @ExceptionHandler(ResponseException.class)
    public ResponseEntity<Map<String, Object>> handle(ResponseException e) {
        return ResponseEntity.status(e.status).body(Map.of(
            "timestamp", LocalDateTime.now(),
            "status", e.status,
            "error", e.getMessage()
        ));
    }

    // FIX: Catch unexpected database or server errors so they never return HTML
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
            "timestamp", LocalDateTime.now(),
            "status", 500,
            "error", "Internal Server Error: " + e.getMessage()
        ));
    }
}