package com.hospital.queue;

public class TriagePatient implements Comparable<TriagePatient> {
    private final String tokenNumber;
    private final String patientName;
    private final int esiLevel; // 1: Resuscitation (highest), 2: Emergent, 3: Urgent, 4: Less Urgent, 5: Non-Urgent
    private final long arrivalTimestamp;
    private final int estimatedDurationMinutes;
    private final String department;

    public TriagePatient(String tokenNumber, String patientName, int esiLevel, String department, int estimatedDurationMinutes) {
        this.tokenNumber = tokenNumber;
        this.patientName = patientName;
        this.esiLevel = esiLevel;
        this.department = department;
        this.estimatedDurationMinutes = estimatedDurationMinutes;
        this.arrivalTimestamp = System.currentTimeMillis();
    }

    public String getTokenNumber() { return tokenNumber; }
    public String getPatientName() { return patientName; }
    public int getEsiLevel() { return esiLevel; }
    public long getArrivalTimestamp() { return arrivalTimestamp; }
    public int getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
    public String getDepartment() { return department; }

    @Override
    public int compareTo(TriagePatient other) {
        // Lower ESI level means higher medical urgency
        if (this.esiLevel != other.esiLevel) {
            return Integer.compare(this.esiLevel, other.esiLevel);
        }
        // First come, first served for same triage level
        return Long.compare(this.arrivalTimestamp, other.arrivalTimestamp);
    }
}
