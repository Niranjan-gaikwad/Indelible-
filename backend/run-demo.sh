#!/bin/bash
# Run the backend under this instead of `mvn spring-boot:run` for your live demo.
# When the "Hardware Kill" button calls /admin/kill, the JVM exits and this loop
# restarts it — RecoveryRunner fires on the way back up and resumes any workflow
# still stuck at status RUNNING.

cd "$(dirname "$0")"
mvn -q package -DskipTests

while true; do
  java -jar target/backend-0.0.1-SNAPSHOT.jar
  echo "[Supervisor] Process exited, restarting in 2s..."
  sleep 2
done
