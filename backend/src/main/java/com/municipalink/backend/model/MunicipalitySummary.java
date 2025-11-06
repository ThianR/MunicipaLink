package com.municipalink.backend.model;

public record MunicipalitySummary(
        String id,
        String name,
        int activeRequests,
        int resolvedThisMonth,
        MunicipalityBreakdown breakdown
) {
    public record MunicipalityBreakdown(int pending, int inProgress, int completed) {
    }
}
