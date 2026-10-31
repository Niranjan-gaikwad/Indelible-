package com.neverfail.auth;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

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
    public record GoogleTokenRequest(String token) {}

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
        Optional> row = db.sql(
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

    @PostMapping("/google")
    public Map<String, Object> googleLogin(@RequestBody GoogleTokenRequest req) {
        if (req.token() == null || req.token().isBlank()) {
            throw new ResponseException(400, "Google token is required");
        }

        try {
            // 1. Verify the token with Google
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(req.token());
            HttpEntity<String> entity = new HttpEntity<>("", headers);

            ResponseEntity googleResponse = restTemplate.exchange(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    HttpMethod.GET,
                    entity,
                    Map.class
            );

            // Corrected typing for the generic map
            @SuppressWarnings("unchecked")
            Map<String, Object> payload = (Map<String, Object>) googleResponse.getBody();
            
            if (payload == null || !payload.containsKey("email")) {
                throw new ResponseException(401, "Invalid Google token payload");
            }

            String email = (String) payload.get("email");
            String defaultUsername = email.split("@")[0];

            // 2. Lookup the user by email in the database
            Optional> userRow = db.sql(
                    "SELECT id, username FROM users WHERE email = :e")
                    .param("e", email).query().listOfRows().stream().findFirst();

            Long userId;
            String finalUsername;

            if (userRow.isPresent()) {
                // User exists, extract their details
                userId = ((Number) userRow.get().get("id")).longValue();
                finalUsername = (String) userRow.get().get("username");
            } else {
                // 3. New user: Register them automatically
                String randomHash = encoder.encode(UUID.randomUUID().toString());
                
                try {
                    userId = db.sql("""
                        INSERT INTO users (username, email, password_hash) VALUES (:u, :e, :p) RETURNING id
                        """).param("u", defaultUsername).param("e", email).param("p", randomHash)
                        .query(Long.class).single();
                    finalUsername = defaultUsername;
                } catch (DataIntegrityViolationException e) {
                    finalUsername = defaultUsername + "_" + (System.currentTimeMillis() % 10000);
                    userId = db.sql("""
                        INSERT INTO users (username, email, password_hash) VALUES (:u, :e, :p) RETURNING id
                        """).param("u", finalUsername).param("e", email).param("p", randomHash)
                        .query(Long.class).single();
                }
            }

            // 4. Issue the internal JWT
            String token = jwtUtil.generateToken(userId, finalUsername);
            return Map.of("token", token, "userId", userId, "username", finalUsername);

        } catch (Exception e) {
            throw new ResponseException(401, "Google authentication failed: " + e.getMessage());
        }
    }
