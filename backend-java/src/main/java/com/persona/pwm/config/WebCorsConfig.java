package com.persona.pwm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebCorsConfig {

    private static final String DEV_FRONTEND_ORIGIN = "http://localhost:5173";

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                configurePath(registry, "/api/**");
                configurePath(registry, "/login");
                configurePath(registry, "/logout");
            }

            private void configurePath(CorsRegistry registry, String pathPattern) {
                registry.addMapping(pathPattern)
                        .allowedOrigins(DEV_FRONTEND_ORIGIN)
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD")
                        .allowedHeaders("*")
                        .allowCredentials(false)
                        .maxAge(3600);
            }
        };
    }
}
