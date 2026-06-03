package com.persona.pwm.auth.dto;

import java.util.Set;

public record LoginResponse(
        String tokenType,
        String accessToken,
        long expiresIn,
        String username,
        Set<String> roles
) {
}
