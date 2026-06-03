package com.persona.pwm.auth.service;

import com.persona.pwm.auth.config.AdminAccountProperties;
import com.persona.pwm.auth.model.UserAccount;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminAccountInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminAccountInitializer.class);

    private final AdminAccountProperties properties;
    private final UserAccountService userAccountService;
    private final PasswordEncoder passwordEncoder;

    public AdminAccountInitializer(
            AdminAccountProperties properties,
            UserAccountService userAccountService,
            PasswordEncoder passwordEncoder) {
        this.properties = properties;
        this.userAccountService = userAccountService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (properties.getUsername() == null || properties.getPassword() == null) {
            log.warn("security.admin.username/password not configured; skipping default admin provisioning");
            return;
        }
        if (userAccountService.existsByUsername(properties.getUsername())) {
            return;
        }
        String encoded = passwordEncoder.encode(properties.getPassword());
        UserAccount account = userAccountService.createUser(
                properties.getUsername(),
                encoded,
                properties.getDisplayName(),
                properties.getRoles());
        log.info("Default admin user '{}' created with roles {}", account.getUsername(), account.getRoles());
    }
}
