package com.persona.pwm.profile.dto;

import java.util.List;

public record ProfileResponse(
        Long id,
        String fullName,
        String headline,
        String email,
        String location,
        String website,
        String bio,
        List<WorkExperienceItem> workExperiences,
        List<EducationRecordItem> educationRecords,
        List<SkillItem> skills
) {

    public record WorkExperienceItem(
            Long id,
            String company,
            String title,
            String startDate,
            String endDate,
            String description
    ) {}

    public record EducationRecordItem(
            Long id,
            String school,
            String degree,
            String fieldOfStudy,
            String startDate,
            String endDate,
            String description
    ) {}

    public record SkillItem(
            Long id,
            String name,
            String proficiency,
            String description
    ) {}
}
