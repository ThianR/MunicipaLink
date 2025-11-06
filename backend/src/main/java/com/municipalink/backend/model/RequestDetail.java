package com.municipalink.backend.model;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record RequestDetail(
        long id,
        String municipalityId,
        String type,
        String typeName,
        String description,
        String status,
        LocalDate createdAt,
        OffsetDateTime lastUpdated,
        String location,
        List<String> images,
        String response
) {
}
