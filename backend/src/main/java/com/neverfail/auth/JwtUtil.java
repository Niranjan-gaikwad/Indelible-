package com.neverfail.auth;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtUtil {
    // Demo-appropriate: a fixed key baked in at startup. For anything beyond a capstone
    // demo, this should come from an env var and be rotated, not hardcoded.
    private final SecretKey key = Keys.hmacShaKeyFor(
        "neverfail-capstone-demo-secret-key-32-bytes-min!".getBytes());
    private final long EXPIRY_MS = 1000L * 60 * 60 * 24; // 24 hours

    public String generateToken(long userId, String username) {
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("username", username)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + EXPIRY_MS))
                .signWith(key)
                .compact();
    }

    public Long validateAndGetUserId(String token) {
        try {
            String subject = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token).getPayload().getSubject();
            return Long.parseLong(subject);
        } catch (Exception e) {
            return null; // invalid, expired, or tampered token
        }
    }
}
