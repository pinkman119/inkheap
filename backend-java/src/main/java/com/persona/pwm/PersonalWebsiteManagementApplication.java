package com.persona.pwm;

import com.persona.pwm.auth.config.AdminAccountProperties;
import com.persona.pwm.auth.config.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({JwtProperties.class, AdminAccountProperties.class})
public class PersonalWebsiteManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(PersonalWebsiteManagementApplication.class, args);
    }
}
