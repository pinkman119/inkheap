package com.persona.pwm.auth.service;

import com.persona.pwm.auth.dto.LoginRequest;
import com.persona.pwm.auth.dto.LoginResponse;
import com.persona.pwm.auth.security.JwtTokenProvider;
import java.util.Set;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    public AuthService(AuthenticationManager authenticationManager, JwtTokenProvider tokenProvider) {
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
    }

    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        UserDetails principal = (UserDetails) authentication.getPrincipal();
        String token = tokenProvider.generateToken(principal);
        Set<String> roles = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));
        return new LoginResponse(
                "Bearer",
                token,
                tokenProvider.getExpirationSeconds(),
                principal.getUsername(),
                roles);
    }
}
