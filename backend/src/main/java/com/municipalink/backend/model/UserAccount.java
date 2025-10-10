package com.municipalink.backend.model;

public record UserAccount(
        long id,
        String name,
        String email,
        String role,
        String municipalityId
) {
}
