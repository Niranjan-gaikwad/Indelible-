package com.neverfail.recovery;

import com.neverfail.engine.OrderSaga;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RecoveryRunner implements ApplicationRunner {
    private final JdbcClient db;
    private final OrderSaga saga;

    public RecoveryRunner(JdbcClient db, OrderSaga saga) {
        this.db = db;
        this.saga = saga;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<String> stuck = db.sql("SELECT workflow_id FROM workflows WHERE status = 'RUNNING'")
                .query(String.class).list();
        if (stuck.isEmpty()) {
            System.out.println("[Recovery] Nothing to resume.");
            return;
        }
        System.out.println("[Recovery] Resuming " + stuck.size() + " workflow(s): " + stuck);
        stuck.forEach(saga::run);
    }
}
