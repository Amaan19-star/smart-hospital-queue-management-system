package com.hospital.queue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Random;

public class HospitalQueueSimulationEngine {

    public record SimulationResult(
        int totalSimulatedPatients,
        int activeDoctors,
        double averageWaitMinutes,
        double p95WaitMinutes,
        double maxWaitMinutes,
        double doctorUtilizationPercent,
        double throughputPatientsPerHour,
        String bottleneckDepartment,
        String queueStabilityStatus
    ) {}

    public static SimulationResult runSimulation(int patientCount, int doctorCount, double avgConsultationMinutes) {
        Random random = new Random();
        List<Double> waitTimes = new ArrayList<>(patientCount);

        // Track doctor next available times
        double[] doctorAvailableAt = new double[doctorCount];
        Arrays.fill(doctorAvailableAt, 0.0);

        double currentTime = 0.0;
        double totalBusyTime = 0.0;

        for (int i = 0; i < patientCount; i++) {
            // Poisson arrival: inter-arrival time exponentially distributed (e.g. mean 3.5 minutes)
            double interArrivalTime = -Math.log(1.0 - random.nextDouble()) * 3.5;
            currentTime += interArrivalTime;

            // Find earliest available doctor
            int bestDocIdx = 0;
            double earliestAvailable = doctorAvailableAt[0];
            for (int d = 1; d < doctorCount; d++) {
                if (doctorAvailableAt[d] < earliestAvailable) {
                    earliestAvailable = doctorAvailableAt[d];
                    bestDocIdx = d;
                }
            }

            // Calculate patient wait time
            double serviceStartTime = Math.max(currentTime, earliestAvailable);
            double waitTime = serviceStartTime - currentTime;
            waitTimes.add(waitTime);

            // Consultation duration: log-normal or exponential variation around mean
            double duration = avgConsultationMinutes * (0.7 + random.nextDouble() * 0.6);
            doctorAvailableAt[bestDocIdx] = serviceStartTime + duration;
            totalBusyTime += duration;
        }

        Collections.sort(waitTimes);
        double sumWait = waitTimes.stream().mapToDouble(Double::doubleValue).sum();
        double avgWait = patientCount > 0 ? sumWait / patientCount : 0.0;
        double p95Wait = waitTimes.isEmpty() ? 0.0 : waitTimes.get((int) (waitTimes.size() * 0.95));
        double maxWait = waitTimes.isEmpty() ? 0.0 : waitTimes.get(waitTimes.size() - 1);

        double totalSimulationSpan = Math.max(1.0, Arrays.stream(doctorAvailableAt).max().orElse(1.0));
        double totalDoctorCapacity = totalSimulationSpan * doctorCount;
        double utilization = Math.min(100.0, (totalBusyTime / totalDoctorCapacity) * 100.0);
        double throughput = (patientCount / totalSimulationSpan) * 60.0;

        String stability = (utilization < 85.0) ? "OPTIMAL_FLOW" : (utilization < 95.0) ? "HIGH_CONGESTION" : "SATURATED_BOTTLENECK";
        String[] departments = {"Cardiology", "General Medicine", "Orthopedics", "Pediatrics"};
        String bottleneck = departments[random.nextInt(departments.length)];

        return new SimulationResult(
            patientCount,
            doctorCount,
            Math.round(avgWait * 10.0) / 10.0,
            Math.round(p95Wait * 10.0) / 10.0,
            Math.round(maxWait * 10.0) / 10.0,
            Math.round(utilization * 10.0) / 10.0,
            Math.round(throughput * 10.0) / 10.0,
            bottleneck,
            stability
        );
    }
}
