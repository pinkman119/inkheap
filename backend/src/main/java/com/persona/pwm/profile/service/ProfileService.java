package com.persona.pwm.profile.service;

import com.persona.pwm.profile.dto.ProfileRequest;
import com.persona.pwm.profile.dto.ProfileResponse;
import com.persona.pwm.profile.model.EducationRecord;
import com.persona.pwm.profile.model.Profile;
import com.persona.pwm.profile.model.Skill;
import com.persona.pwm.profile.model.WorkExperience;
import com.persona.pwm.profile.repository.ProfileRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ProfileService {

    private final ProfileRepository profileRepository;

    public ProfileService(ProfileRepository profileRepository) {
        this.profileRepository = profileRepository;
    }

    public ProfileResponse upsert(ProfileRequest request) {
        Profile profile = profileRepository.findByEmail(request.email())
                .orElseGet(Profile::new);

        profile.setFullName(request.fullName());
        profile.setHeadline(request.headline());
        profile.setEmail(request.email());
        profile.setLocation(request.location());
        profile.setWebsite(request.website());
        profile.setBio(request.bio());

        rebuildExperiences(profile, request.workExperiences());
        rebuildEducation(profile, request.educationRecords());
        rebuildSkills(profile, request.skills());

        Profile saved = profileRepository.save(profile);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ProfileResponse getByEmail(String email) {
        Profile profile = profileRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Profile not found for email " + email));
        return toResponse(profile);
    }

    @Transactional(readOnly = true)
    public ProfileResponse getDefaultProfile() {
        Profile profile = profileRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> new EntityNotFoundException("Profile not found"));
        return toResponse(profile);
    }

    public void deleteByEmail(String email) {
        Profile profile = profileRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Profile not found for email " + email));
        profileRepository.delete(profile);
    }

    @Transactional(readOnly = true)
    public boolean existsByEmail(String email) {
        return profileRepository.existsByEmail(email);
    }

    @Transactional(readOnly = true)
    public boolean hasAnyProfile() {
        return profileRepository.count() > 0;
    }

    private void rebuildExperiences(Profile profile, List<ProfileRequest.WorkExperienceRequest> requests) {
        profile.getWorkExperiences().clear();
        if (requests == null || requests.isEmpty()) {
            return;
        }
        requests.forEach(item -> {
            WorkExperience experience = new WorkExperience();
            experience.setProfile(profile);
            experience.setCompany(item.company());
            experience.setTitle(item.title());
            experience.setStartDate(LocalDate.parse(item.startDate()));
            experience.setEndDate(item.endDate() != null && !item.endDate().isBlank() ? LocalDate.parse(item.endDate()) : null);
            experience.setDescription(item.description());
            profile.getWorkExperiences().add(experience);
        });
    }

    private void rebuildEducation(Profile profile, List<ProfileRequest.EducationRecordRequest> requests) {
        profile.getEducationRecords().clear();
        if (requests == null || requests.isEmpty()) {
            return;
        }
        requests.forEach(item -> {
            EducationRecord record = new EducationRecord();
            record.setProfile(profile);
            record.setSchool(item.school());
            record.setDegree(item.degree());
            record.setFieldOfStudy(item.fieldOfStudy());
            record.setStartDate(LocalDate.parse(item.startDate()));
            record.setEndDate(item.endDate() != null && !item.endDate().isBlank() ? LocalDate.parse(item.endDate()) : null);
            record.setDescription(item.description());
            profile.getEducationRecords().add(record);
        });
    }

    private void rebuildSkills(Profile profile, List<ProfileRequest.SkillRequest> requests) {
        profile.getSkills().clear();
        if (requests == null || requests.isEmpty()) {
            return;
        }
        requests.forEach(item -> {
            Skill skill = new Skill();
            skill.setProfile(profile);
            skill.setName(item.name());
            skill.setProficiency(item.proficiency());
            skill.setDescription(item.description());
            profile.getSkills().add(skill);
        });
    }

    private ProfileResponse toResponse(Profile profile) {
        return new ProfileResponse(
                profile.getId(),
                profile.getFullName(),
                profile.getHeadline(),
                profile.getEmail(),
                profile.getLocation(),
                profile.getWebsite(),
                profile.getBio(),
                profile.getWorkExperiences().stream()
                        .map(item -> new ProfileResponse.WorkExperienceItem(
                                item.getId(),
                                item.getCompany(),
                                item.getTitle(),
                                item.getStartDate() != null ? item.getStartDate().toString() : null,
                                item.getEndDate() != null ? item.getEndDate().toString() : null,
                                item.getDescription()))
                        .toList(),
                profile.getEducationRecords().stream()
                        .map(item -> new ProfileResponse.EducationRecordItem(
                                item.getId(),
                                item.getSchool(),
                                item.getDegree(),
                                item.getFieldOfStudy(),
                                item.getStartDate() != null ? item.getStartDate().toString() : null,
                                item.getEndDate() != null ? item.getEndDate().toString() : null,
                                item.getDescription()))
                        .toList(),
                profile.getSkills().stream()
                        .map(item -> new ProfileResponse.SkillItem(
                                item.getId(),
                                item.getName(),
                                item.getProficiency(),
                                item.getDescription()))
                        .toList()
        );
    }
}
