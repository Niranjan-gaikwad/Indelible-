package com.neverfail.engine;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class OrderSaga {
    private final DurableEngine engine;

    // Guards against the actual bug behind "resume acts weird": nothing previously stopped
    // two executions of the same workflow racing each other (a double-click, or resume called
    // while the original saga thread hadn't actually crashed yet). Both would pass the
    // "is this step done?" check simultaneously and duplicate side effects.
    private final Set<String> activeWorkflows = ConcurrentHashMap.newKeySet();

    public OrderSaga(DurableEngine engine) { this.engine = engine; }

    public boolean isActive(String workflowId) { return activeWorkflows.contains(workflowId); }

    public void run(String workflowId) {
        if (!activeWorkflows.add(workflowId)) {
            System.err.println("[Saga] " + workflowId + " already executing - refusing duplicate run.");
            return;
        }
        Thread.ofVirtual().name("saga-" + workflowId).start(() -> {
            try {
                execute(workflowId);
            } finally {
                activeWorkflows.remove(workflowId);
            }
        });
    }

    private void execute(String workflowId) {
        List<String> done = new ArrayList<>();
        try {
            // Timings deliberately slower than a "real" service would use: a live demo needs
            // enough wall-clock time between steps to actually hover the admin panel and click
            // Interrupt/Kill before the workflow finishes on its own. ~11s total end to end.
            engine.step(workflowId, "reserve_stock", Map.class, () -> {
                sleep(2000);
                return Map.of("item", "BAG-30L", "status", "RESERVED");
            });
            done.add("reserve_stock");

            engine.step(workflowId, "charge_card", Map.class, () -> {
                sleep(3500);
                if (engine.isFailureArmed(workflowId)) throw new RuntimeException("PAYMENT_DECLINED");
                return Map.of("charge_id", "ch_" + UUID.randomUUID(), "amount", 89.99);
            });
            done.add("charge_card");

            engine.step(workflowId, "create_invoice", Map.class, () -> {
                sleep(2500);
                return Map.of("invoice", "INV-" + System.currentTimeMillis(), "format", "PDF");
            });
            done.add("create_invoice");

            engine.step(workflowId, "send_notification", Map.class, () -> {
                sleep(1500);
                return Map.of("sms", "SENT");
            });
            done.add("send_notification");

            engine.updateWorkflowStatus(workflowId, "COMPLETED");

        } catch (Exception ex) {
            if ("SIMULATED_CRASH".equals(ex.getMessage())) {
                // Status is left as RUNNING on purpose. RecoveryRunner (on restart) or a manual
                // /resume call replays this workflow; already-completed steps are skipped via
                // the event log, so execution picks up exactly where it stopped.
                System.err.println("[Saga] " + workflowId + " interrupted, awaiting resume.");
                return;
            }
            // Real business failure (e.g. payment declined) -> roll back what already succeeded.
            engine.updateWorkflowStatus(workflowId, "COMPENSATING");
            if (done.contains("charge_card")) {
                engine.compensate(workflowId, "charge_card",
                    () -> System.out.println("[Compensate] Refunding charge for " + workflowId));
            }
            if (done.contains("reserve_stock")) {
                engine.compensate(workflowId, "reserve_stock",
                    () -> System.out.println("[Compensate] Releasing stock for " + workflowId));
            }
            engine.updateWorkflowStatus(workflowId, "FAILED");
        }
    }

    private void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException ignored) {}
    }
}
