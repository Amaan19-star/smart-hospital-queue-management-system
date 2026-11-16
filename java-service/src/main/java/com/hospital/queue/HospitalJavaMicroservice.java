package com.hospital.queue;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class HospitalJavaMicroservice {
    private static final int PORT = 8085;
    private static final PriorityTriageDispatcher dispatcher = new PriorityTriageDispatcher();

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", PORT), 0);

        // 1. Health & JVM Diagnostics
        server.createContext("/api/java/health", exchange -> {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            Runtime runtime = Runtime.getRuntime();
            long totalMem = runtime.totalMemory() / (1024 * 1024);
            long freeMem = runtime.freeMemory() / (1024 * 1024);
            long usedMem = totalMem - freeMem;
            int activeThreads = Thread.activeCount();
            int cores = runtime.availableProcessors();
            String javaVersion = System.getProperty("java.version");

            String json = String.format("""
                    {
                        "status": "healthy",
                        "service": "hospital-queue-java-engine",
                        "java_version": "%s",
                        "available_cores": %d,
                        "active_threads": %d,
                        "memory_used_mb": %d,
                        "memory_total_mb": %d,
                        "emergency_queue_size": %d
                    }
                    """, javaVersion, cores, activeThreads, usedMem, totalMem, dispatcher.getWaitingCount());

            sendJsonResponse(exchange, 200, json);
        });

        // 2. Queue Simulation Engine
        server.createContext("/api/java/simulation", exchange -> {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            int patients = 50;
            int doctors = 5;
            double avgTime = 15.0;

            String query = exchange.getRequestURI().getQuery();
            if (query != null) {
                for (String param : query.split("&")) {
                    String[] pair = param.split("=");
                    if (pair.length == 2) {
                        if ("patients".equalsIgnoreCase(pair[0])) {
                            try {
                                patients = Math.max(1, Integer.parseInt(pair[1]));
                            } catch (Exception ignored) {
                            }
                        } else if ("doctors".equalsIgnoreCase(pair[0])) {
                            try {
                                doctors = Math.max(1, Integer.parseInt(pair[1]));
                            } catch (Exception ignored) {
                            }
                        }
                    }
                }
            }

            var result = HospitalQueueSimulationEngine.runSimulation(patients, doctors, avgTime);

            String json = String.format(java.util.Locale.US, """
                    {
                        "simulated_patients": %d,
                        "active_doctors": %d,
                        "avg_wait_minutes": %.1f,
                        "p95_wait_minutes": %.1f,
                        "max_wait_minutes": %.1f,
                        "doctor_utilization_pct": %.1f,
                        "throughput_per_hour": %.1f,
                        "bottleneck_department": "%s",
                        "queue_stability": "%s",
                        "engine": "Java 26 Virtual Concurrency Engine"
                    }
                    """,
                    result.totalSimulatedPatients(),
                    result.activeDoctors(),
                    result.averageWaitMinutes(),
                    result.p95WaitMinutes(),
                    result.maxWaitMinutes(),
                    result.doctorUtilizationPercent(),
                    result.throughputPatientsPerHour(),
                    result.bottleneckDepartment(),
                    result.queueStabilityStatus());

            sendJsonResponse(exchange, 200, json);
        });

        // 3. Emergency Triage Token Dispatcher
        server.createContext("/api/java/triage-dispatch", exchange -> {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
            String patientName = "Emergency Patient";
            int esiLevel = 2; // Emergent
            String department = "Emergency Care";

            if (body.contains("\"patient_name\":")) {
                patientName = extractJsonField(body, "patient_name", patientName);
            }
            if (body.contains("\"esi_level\":")) {
                try {
                    String rawLevel = extractJsonField(body, "esi_level", "2");
                    esiLevel = Integer.parseInt(rawLevel.replaceAll("[^0-9]", ""));
                } catch (Exception ignored) {
                }
            }
            if (body.contains("\"department\":")) {
                department = extractJsonField(body, "department", department);
            }

            TriagePatient patient = dispatcher.dispatchEmergencyToken(patientName, esiLevel, department);

            String json = String.format("""
                    {
                        "token_number": "%s",
                        "patient_name": "%s",
                        "esi_level": %d,
                        "triage_category": "%s",
                        "department": "%s",
                        "estimated_duration_minutes": %d,
                        "emergency_queue_position": %d,
                        "dispatched_by": "Java PriorityBlockingQueue Dispatcher"
                    }
                    """,
                    patient.getTokenNumber(),
                    patient.getPatientName(),
                    patient.getEsiLevel(),
                    getEsiLabel(patient.getEsiLevel()),
                    patient.getDepartment(),
                    patient.getEstimatedDurationMinutes(),
                    dispatcher.getWaitingCount());

            sendJsonResponse(exchange, 201, json);
        });

        server.setExecutor(java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor());
        server.start();
        System.out.println("Java Hospital Queue Microservice listening on http://127.0.0.1:" + PORT);
    }

    private static String getEsiLabel(int level) {
        return switch (level) {
            case 1 -> "ESI-1: Resuscitation (Immediate Life Threat)";
            case 2 -> "ESI-2: Emergent (High Risk / Severe Pain)";
            case 3 -> "ESI-3: Urgent (Multiple Resources Required)";
            case 4 -> "ESI-4: Less Urgent (One Resource)";
            default -> "ESI-5: Non-Urgent";
        };
    }

    private static String extractJsonField(String json, String field, String defaultValue) {
        try {
            int idx = json.indexOf("\"" + field + "\"");
            if (idx == -1)
                return defaultValue;
            int colon = json.indexOf(":", idx);
            if (colon == -1)
                return defaultValue;
            int start = json.indexOf("\"", colon);
            if (start != -1 && start < colon + 5) {
                int end = json.indexOf("\"", start + 1);
                return json.substring(start + 1, end);
            } else {
                int end = json.indexOf(",", colon);
                if (end == -1)
                    end = json.indexOf("}", colon);
                return json.substring(colon + 1, end).trim();
            }
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private static void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    private static void sendJsonResponse(HttpExchange exchange, int statusCode, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
