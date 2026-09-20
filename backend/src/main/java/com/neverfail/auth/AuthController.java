package com.neverfail.auth;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final JdbcClient db;
    private final JwtUtil jwtUtil;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthController(JdbcClient db, JwtUtil jwtUtil) {
        this.db = db;
        this.jwtUtil = jwtUtil;
    }

    public record RegisterRequest(String username, String email, String password) {}
    public record LoginRequest(String username, String password) {}

    @PostMapping("/register")
    public Map<String, Object> register(@RequestBody RegisterRequest req) {
        if (req.username() == null || req.password() == null || req.password().length() < 6) {
            throw new ResponseException(400, "Username and a password of 6+ characters are required");
        }
        String hash = encoder.encode(req.password());
        try {
            Long userId = db.sql("""
                    INSERT INTO users (username, email, password_hash) VALUES (:u, :e, :p) RETURNING id
                    """).param("u", req.username()).param("e", req.email()).param("p", hash)
                    .query(Long.class).single();
            String token = jwtUtil.generateToken(userId, req.username());
            return Map.of("token", token, "userId", userId, "username", req.username());
        } catch (DataIntegrityViolationException e) {
            throw new ResponseException(409, "Username or email already taken");
        }
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody LoginRequest req) {
        Optional<Map<String, Object>> row = db.sql(
                "SELECT id, password_hash FROM users WHERE username = :u")
                .param("u", req.username()).query().listOfRows()
                .stream().findFirst();

        if (row.isEmpty() || !encoder.matches(req.password(), (String) row.get().get("password_hash"))) {
            throw new ResponseException(401, "Invalid username or password");
        }
        Long userId = ((Number) row.get().get("id")).longValue();
        String token = jwtUtil.generateToken(userId, req.username());
        return Map.of("token", token, "userId", userId, "username", req.username());
    }
}
