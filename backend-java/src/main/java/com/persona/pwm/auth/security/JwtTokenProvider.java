package com.persona.pwm.auth.security;

import com.persona.pwm.auth.config.JwtProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Collection;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
public class JwtTokenProvider {

    private final JwtProperties properties;

    private SecretKey secretKey;

    public JwtTokenProvider(JwtProperties properties) {
        this.properties = properties;
    }

    @PostConstruct
    void init() {
        String secret = properties.getSecret();
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("security.jwt.secret must be provided and at least 32 characters long");
        }
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(UserDetails principal) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(properties.getExpirationSeconds());

        return Jwts.builder()
                .setSubject(principal.getUsername())
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(expiry))
                .claim("roles", principal.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList())
                .signWith(secretKey, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validate(String token) {
        try {
            Jwts.parserBuilder()
                    .setSigningKey(secretKey)
                    .build()
                    .parseClaimsJws(token);
            return true;
        } catch (Exception ex) {
            return false;
        }
    }

    public String extractUsername(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.getSubject();
    }

    public long getExpirationSeconds() {
        return properties.getExpirationSeconds();
    }

    public Collection<?> extractRoles(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(secretKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
        return claims.get("roles", Collection.class);
    }
}
