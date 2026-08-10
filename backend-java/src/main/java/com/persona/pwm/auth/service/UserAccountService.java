package com.persona.pwm.auth.service;

import com.persona.pwm.auth.model.UserAccount;
import com.persona.pwm.auth.repository.UserAccountRepository;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserAccountService {

    private final UserAccountRepository repository;

    public UserAccountService(UserAccountRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Optional<UserAccount> findByUsername(String username) {
        return repository.findByUsername(username);
    }

    public UserAccount createUser(String username, String passwordHash, String displayName, Set<String> roles) {
        UserAccount account = new UserAccount();
        account.setUsername(username);
        account.setPasswordHash(passwordHash);
        account.setDisplayName(displayName);
        account.setRoles(roles);
        return repository.save(account);
    }

    public boolean existsByUsername(String username) {
        return repository.existsByUsername(username);
    }
}
