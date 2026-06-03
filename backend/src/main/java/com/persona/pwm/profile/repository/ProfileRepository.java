package com.persona.pwm.profile.repository;

import com.persona.pwm.profile.model.Profile;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProfileRepository extends JpaRepository<Profile, Long> {

    Optional<Profile> findByEmail(String email);

    Optional<Profile> findFirstByOrderByIdAsc();

    boolean existsByEmail(String email);
}
