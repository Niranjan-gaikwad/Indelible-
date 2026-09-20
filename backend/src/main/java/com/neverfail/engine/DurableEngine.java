package com.neverfail.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

@Service
public class DurableEngine {
    private final JdbcClient db;
    private final ObjectMapper mapper = new ObjectMapper();

    // Demo-only in-memory flags for simulating a mid-step interrupt without killing the JVM.
    // These are separate from a real process crash (see /admin/kill in OrderController).
    private final ConcurrentHashMap<String, Boolean> crashFlags = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Boolean> failureFlags = new ConcurrentHashMap<>();

    public DurableEngine(JdbcClient db) { this.db = db; }

    public void armCrash(String workflowId) { crashFlags.put(workflowId, true); }
    public void clearCrash(String workflowId) { crashFlags.remove(workflowId); }

    public void armFailure(String workflowId) { failureFlags.put(workflowId, true); }
    // one-shot: consuming it clears it, so a retry after compensation doesn't loop forever
    public boolean isFailureArmed(String workflowId) { return failureFlags.remove(workflowId) != null; }

    public <T> T step(String workflowId, String stepName, Class<T> returnType, Supplier<T> task) {
        Optional<String> cached = db.sql("""
                SELECT payload FROM workflow_events
                WHERE workflow_id = :wId AND step_name = :sName AND status = 'COMPLETED'
                ORDER BY id DESC LIMIT 1
                """).param("wId", workflowId).param("sName", stepName).query(String.class).optional();

        if (cached.isPresent()) {
            logEvent(workflowId, stepName, "SKIPPED", cached.get());
            try {
                return mapper.readValue(cached.get(), returnType);
            } catch (Exception e) {
                throw new RuntimeException("Deserialization failed", e);
            }
        }

        if (Boolean.TRUE.equals(crashFlags.get(workflowId))) {
            logEvent(workflowId, stepName, "CRASHED", "{\"error\":\"THREAD_KILLED\"}");
            throw new RuntimeException("SIMULATED_CRASH");
        }

        logEvent(workflowId, stepName, "STARTED", "{}");
        T result = task.get();

        try {
            String json = mapper.writeValueAsString(result);
            logEvent(workflowId, stepName, "COMPLETED", json);
            db.sql("UPDATE workflows SET current_step = :sName WHERE workflow_id = :wId")
              .param("sName", stepName).param("wId", workflowId).update();
            return result;
        } catch (Exception e) {
            throw new RuntimeException("Failed to commit checkpoint", e);
        }
    }

    public void compensate(String workflowId, String stepName, Runnable action) {
        logEvent(workflowId, stepName, "COMPENSATING", "{}");
        action.run();
        logEvent(workflowId, stepName, "COMPENSATED", "{}");
    }

    public void updateWorkflowStatus(String workflowId, String status) {
        db.sql("UPDATE workflows SET status = :status WHERE workflow_id = :id")
          .param("status", status).param("id", workflowId).update();
    }

    private void logEvent(String wId, String sName, String status, String p) {
        db.sql("INSERT INTO workflow_events (workflow_id, step_name, status, payload) VALUES (:wId, :sName, :status, :p)")
          .param("wId", wId).param("sName", sName).param("status", status).param("p", p).update();
    }
}
