package com.persona.pwm.diary.service;

import com.persona.pwm.diary.dto.DiaryEntryDto;
import com.persona.pwm.diary.model.DiaryEntry;
import com.persona.pwm.diary.repository.DiaryEntryRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class DiaryEntryService {

    private final DiaryEntryRepository repository;

    public DiaryEntryService(DiaryEntryRepository repository) {
        this.repository = repository;
    }

    public DiaryEntryDto upsert(DiaryEntryDto request) {
        DiaryEntry entry = repository.findByEntryDate(request.entryDate()).orElseGet(DiaryEntry::new);
        entry.setEntryDate(request.entryDate());
        entry.setMood(request.mood());
        entry.setPlans(request.plans());
        entry.setContent(request.content());
        DiaryEntry saved = repository.save(entry);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public DiaryEntryDto getByDate(LocalDate date) {
        return repository.findByEntryDate(date)
                .map(this::toDto)
                .orElseThrow(() -> new EntityNotFoundException("Diary entry not found for date " + date));
    }

    @Transactional(readOnly = true)
    public List<DiaryEntrySummary> listByMonth(YearMonth month) {
        return repository.findByYearMonth(month)
                .stream()
                .map(entry -> new DiaryEntrySummary(
                        entry.getEntryDate(),
                        entry.getMood(),
                        entry.getContent() != null && !entry.getContent().isBlank(),
                        entry.getPlans() != null && !entry.getPlans().isEmpty()))
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteByDate(LocalDate date) {
        repository.findByEntryDate(date).ifPresent(repository::delete);
    }

    @Transactional(readOnly = true)
    public List<DiaryEntryDto> search(String keyword) {
        if (keyword == null || keyword.isBlank()) {
            return List.of();
        }

        String normalized = keyword.strip();
        return repository.searchByKeyword(normalized)
                .stream()
                .filter(Objects::nonNull)
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private DiaryEntryDto toDto(DiaryEntry entry) {
        return DiaryEntryDto.builder()
                .entryDate(entry.getEntryDate())
                .mood(entry.getMood())
                .plans(entry.getPlans())
                .content(entry.getContent())
                .build();
    }

    public record DiaryEntrySummary(LocalDate entryDate, String mood, boolean hasContent, boolean hasPlans) {
    }
}
