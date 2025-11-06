package com.municipalink.backend.model;

public record AdminSummary(
        int totalRequests,
        int activeMunicipalities,
        double resolutionRate,
        double averageResolutionTimeDays
) {
}
