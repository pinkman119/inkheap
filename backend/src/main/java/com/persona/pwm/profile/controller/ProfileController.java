package com.persona.pwm.profile.controller;

import com.persona.pwm.profile.dto.ProfileRequest;
import com.persona.pwm.profile.dto.ProfileResponse;
import com.persona.pwm.profile.service.ProfileService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
@Validated
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProfileResponse upsert(@Valid @RequestBody ProfileRequest request) {
        return profileService.upsert(request);
    }

    @GetMapping
    public ProfileResponse getDefault(@RequestParam(value = "email", required = false) String email) {
        if (email != null && !email.isBlank()) {
            return profileService.getByEmail(email);
        }
        return profileService.getDefaultProfile();
    }

    @GetMapping("/{email}")
    public ProfileResponse getByEmail(
            @PathVariable("email")
            @Email
            @NotBlank
            String email
    ) {
        return profileService.getByEmail(email);
    }

    @DeleteMapping("/{email}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteByEmail(
            @PathVariable("email")
            @Email
            @NotBlank
            String email
    ) {
        profileService.deleteByEmail(email);
    }
}
