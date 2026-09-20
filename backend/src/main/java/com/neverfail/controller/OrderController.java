package com.neverfail.controller;

import com.neverfail.auth.ResponseException;
import com.neverfail.engine.DurableEngine;
import com.neverfail.engine.OrderSaga;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api")
public class OrderController {
    private final JdbcClient db;
    private final DurableEngine engine;
    private final OrderSaga saga;

    public OrderController(JdbcClient db, DurableEngine engine, OrderSaga saga) {
        this.db = db;
        this.engine = engine;
        this.saga = saga;
    }

    // JwtAuthFilter already rejected the request if this is missing/invalid, so by the
    // time we're here it's always a valid authenticated user.
    private Long currentUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("userId");
    }

    // Shared ownership check: every workflow-scoped action below uses this so a user
    // can't crash/resume/view someone else's transfer, even by guessing an ID.
    private void assertOwnership(String workflowId, HttpServletRequest request) {
        Optional<Long> owner = db.sql("SELECT user_id FROM workflows WHERE workflow_id = :id")
                .param("id", workflowId).query(Long.class).optional();
        if (owner.isEmpty() || !owner.get().equals(currentUserId(request))) {
            throw new ResponseException(404, "Workflow not found");
        }
    }

    // CREATE
    @PostMapping("/orders/checkout")
    public Map<String, String> checkout(HttpServletRequest request) {
        String workflowId = "wf_" + UUID.randomUUID().toString().substring(0, 8);
        db.sql("INSERT INTO workflows (workflow_id, status, current_step, user_id) VALUES (:wId, 'RUNNING', 'INIT', :uid)")
          .param("wId", workflowId).param("uid", currentUserId(request)).update();
        saga.run(workflowId);
        return Map.of("workflowId", workflowId);
    }

    // READ (list) - CRUD screen: only the logged-in user's own orders.
    @GetMapping("/orders/my")
    public List<Map<String, Object>> myOrders(HttpServletRequest request) {
        return db.sql("SELECT workflow_id, status, current_step FROM workflows WHERE user_id = :uid ORDER BY workflow_id DESC")
                 .param("uid", currentUserId(request)).query().listOfRows();
    }

    // DELETE - cancel your own order, only while it's still pending.
    @DeleteMapping("/orders/{id}")
    public Map<String, String> cancel(@PathVariable String id, HttpServletRequest request) {
        int updated = db.sql("""
                UPDATE workflows SET status = 'CANCELLED'
                WHERE workflow_id = :id AND user_id = :uid AND status NOT IN ('COMPLETED','CANCELLED')
                """).param("id", id).param("uid", currentUserId(request)).update();
        if (updated == 0) {
            throw new ResponseException(404, "Order not found, not yours, or already finished");
        }
        return Map.of("status", "CANCELLED");
    }

    @GetMapping("/workflows/latest")
    public Map<String, String> getLatest(HttpServletRequest request) {
        // FIX: Only return workflows that are actively stuck and need UI recovery,
        // rather than blindly returning the most recent transaction regardless of status.
        return db.sql("SELECT workflow_id FROM workflows WHERE user_id = :uid AND status IN ('RUNNING', 'COMPENSATING') ORDER BY workflow_id DESC LIMIT 1")
                 .param("uid", currentUserId(request))
                 .query((rs, rowNum) -> Map.of("workflowId", rs.getString("workflow_id")))
                 .optional().orElse(Map.of());
    }

    // Ownership check added - previously any authenticated user could read another
    // user's event log by guessing their workflow ID.
    @GetMapping("/workflows/{id}/events")
    public List<Map<String, Object>> getEvents(@PathVariable String id, HttpServletRequest request) {
        assertOwnership(id, request);
        return db.sql("SELECT step_name, status, payload, created_at FROM workflow_events WHERE workflow_id = :id ORDER BY id ASC")
                 .param("id", id).query().listOfRows();
    }

    // Simulated in-process interrupt: throws inside the next step, leaves workflow status RUNNING.
    @PostMapping("/workflows/{id}/crash")
    public void injectCrash(@PathVariable String id, HttpServletRequest request) {
        assertOwnership(id, request);
        engine.armCrash(id);
    }

    // Fixed: previously called saga.run(id) unconditionally, so clicking Resume while the
    // workflow was still actively running (or double-clicking) started a second execution
    // racing the first - the actual bug behind "resume acts weird." Now it's rejected with
    // a clear 409 instead of silently corrupting state.
    @PostMapping("/workflows/{id}/resume")
    public Map<String, String> resume(@PathVariable String id, HttpServletRequest request) {
        assertOwnership(id, request);
        if (saga.isActive(id)) {
            throw new ResponseException(409, "This transfer is still actively running - nothing to resume yet");
        }
        String status = db.sql("SELECT status FROM workflows WHERE workflow_id = :id")
                .param("id", id).query(String.class).single();
        if (!"RUNNING".equals(status)) {
            throw new ResponseException(409, "Transfer is " + status + " - nothing to resume");
        }
        engine.clearCrash(id);
        saga.run(id);
        return Map.of("status", "resuming");
    }

    @PostMapping("/workflows/{id}/fail-payment")
    public void injectFailure(@PathVariable String id, HttpServletRequest request) {
        assertOwnership(id, request);
        engine.armFailure(id);
    }

    // Real process death. Combine with a restart loop (run-demo.sh / systemd / Docker
    // restart:always) so RecoveryRunner fires on the way back up. Intentionally has no
    // per-workflow ownership check - it kills the whole server, not a single transfer -
    // but still requires a valid logged-in session, same as every other /api/** route.
    @PostMapping("/admin/kill")
    public void hardKill() {
        Thread.ofVirtual().start(() -> {
            try { Thread.sleep(200); System.exit(1); } catch (InterruptedException ignored) {}
        });
    }
}
