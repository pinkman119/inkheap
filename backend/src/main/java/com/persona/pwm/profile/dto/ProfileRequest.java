package com.persona.pwm.profile.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ProfileRequest(
        @NotBlank @Size(max = 128) String fullName,
        @Size(max = 160) String headline,
        @NotBlank @Email @Size(max = 160) String email,
        @Size(max = 160) String location,
        @Size(max = 256) String website,
        @Size(max = 2000) String bio,
        @Valid List<WorkExperienceRequest> workExperiences,
        @Valid List<EducationRecordRequest> educationRecords,
        @Valid List<SkillRequest> skills
) {

    private static final String ISO_DATE_PATTERN = "^\\d{4}-\\d{2}-\\d{2}$";
    private static final String OPTIONAL_ISO_DATE_PATTERN = "^$|" + ISO_DATE_PATTERN;

    public ProfileRequest {
        workExperiences = workExperiences != null ? List.copyOf(workExperiences) : List.of();
        educationRecords = educationRecords != null ? List.copyOf(educationRecords) : List.of();
        skills = skills != null ? List.copyOf(skills) : List.of();
    }

    public record WorkExperienceRequest(
            @NotBlank @Size(max = 160) String company,
            @NotBlank @Size(max = 160) String title,
            @NotBlank @Pattern(regexp = ISO_DATE_PATTERN, message = "Date must be in yyyy-MM-dd format") String startDate,
            @Pattern(regexp = OPTIONAL_ISO_DATE_PATTERN, message = "Date must be in yyyy-MM-dd format") String endDate,
            @Size(max = 2000) String description
    ) {}

    public record EducationRecordRequest(
            @NotBlank @Size(max = 160) String school,
            @Size(max = 160) String degree,
            @Size(max = 160) String fieldOfStudy,
            @NotBlank @Pattern(regexp = ISO_DATE_PATTERN, message = "Date must be in yyyy-MM-dd format") String startDate,
            @Pattern(regexp = OPTIONAL_ISO_DATE_PATTERN, message = "Date must be in yyyy-MM-dd format") String endDate,
            @Size(max = 2000) String description
    ) {}

    public record SkillRequest(
            @NotBlank @Size(max = 128) String name,
            @Size(max = 64) String proficiency,
            @Size(max = 256) String description
    ) {}
}
