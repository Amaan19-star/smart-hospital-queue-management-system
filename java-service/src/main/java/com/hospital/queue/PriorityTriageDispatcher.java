package com.hospital.queue;

import java.util.concurrent.PriorityBlockingQueue;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.List;
import java.util.ArrayList;

public class PriorityTriageDispatcher {
    private final PriorityBlockingQueue<TriagePatient> emergencyQueue = new PriorityBlockingQueue<>();
    private final AtomicInteger sequenceCounter = new AtomicInteger(100);

    public TriagePatient dispatchEmergencyToken(String patientName, int esiLevel, String department) {
        int seq = sequenceCounter.incrementAndGet();
        String prefix = (esiLevel <= 2) ? "EMERG" : "TRIAGE";
        String tokenNumber = prefix + "-" + seq;

        int duration = switch (esiLevel) {
            case 1 -> 30; // Resuscitation
            case 2 -> 20; // Emergent
            case 3 -> 15; // Urgent
            default -> 10;
        };

        TriagePatient patient = new TriagePatient(tokenNumber, patientName, esiLevel, department, duration);
        emergencyQueue.offer(patient);
        return patient;
    }

    public TriagePatient pollNext() {
        return emergencyQueue.poll();
    }

    public List<TriagePatient> getActiveQueue() {
        return new ArrayList<>(emergencyQueue);
    }

    public int getWaitingCount() {
        return emergencyQueue.size();
    }
}
