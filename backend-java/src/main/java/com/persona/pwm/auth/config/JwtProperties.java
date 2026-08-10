package com.persona.pwm.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "security.jwt")
public class JwtProperties {

    /**
     * Secret key used to sign JWT tokens. Should be at least 256 bits long.
     */
    private String secret;

    /**
     * Token lifespan expressed in seconds.
     */
    private long expirationSeconds = 3600;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }

    public void setExpirationSeconds(long expirationSeconds) {
        this.expirationSeconds = expirationSeconds;
    }
}
