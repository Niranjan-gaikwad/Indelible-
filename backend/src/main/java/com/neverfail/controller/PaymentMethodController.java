package com.neverfail.controller;

import com.neverfail.auth.ResponseException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// Full CRUD on a real resource, scoped to the logged-in user via the JwtAuthFilter-set
// request attribute. Deliberately separate from OrderController's workflow logic -
// this doesn't touch the durable engine at all, so it can't destabilize it.
@RestController
@RequestMapping("/api/payment-methods")
public class PaymentMethodController {
    private final JdbcClient db;
    public PaymentMethodController(JdbcClient db) { this.db = db; }

    private Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("userId");
    }

    public record NewCard(String nickname, String cardNumber, String expiry) {}

    // CREATE — only the last 4 digits are ever persisted. The full number never
    // touches the database, matching how real payment forms handle card capture.
    @PostMapping
    public Map<String, Object> add(@RequestBody NewCard req, HttpServletRequest request) {
        if (req.cardNumber() == null || req.cardNumber().replaceAll("\\s", "").length() < 4) {
            throw new ResponseException(400, "Card number is required");
        }
        String digits = req.cardNumber().replaceAll("\\s", "");
        String last4 = digits.substring(digits.length() - 4);
        try {
            Long id = db.sql("""
                    INSERT INTO payment_methods (user_id, nickname, card_last4, expiry)
                    VALUES (:uid, :nick, :last4, :exp) RETURNING id
                    """).param("uid", currentUserId(request))
                    .param("nick", req.nickname() == null || req.nickname().isBlank() ? "My Card" : req.nickname())
                    .param("last4", last4)
                    .param("exp", req.expiry())
                    .query(Long.class).single();
            return Map.of("id", id, "last4", last4);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseException(400, "Could not save card");
        }
    }

    // READ (list) — only this user's own saved cards, never another user's.
    @GetMapping
    public List<Map<String, Object>> list(HttpServletRequest request) {
        return db.sql("""
                SELECT id, nickname, card_last4, expiry, created_at
                FROM payment_methods WHERE user_id = :uid ORDER BY created_at DESC
                """).param("uid", currentUserId(request)).query().listOfRows();
    }

    // DELETE — ownership-checked the same way OrderController.cancel() is: the WHERE
    // clause includes user_id, so a 0-row update means "not found or not yours",
    // and we don't leak which one it was.
    @DeleteMapping("/{id}")
    public Map<String, String> delete(@PathVariable Long id, HttpServletRequest request) {
        int deleted = db.sql("DELETE FROM payment_methods WHERE id = :id AND user_id = :uid")
                .param("id", id).param("uid", currentUserId(request)).update();
        if (deleted == 0) throw new ResponseException(404, "Card not found or not yours");
        return Map.of("status", "deleted");
    }
}
