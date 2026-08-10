package com.persona.pwm.diary.controller;

import com.persona.pwm.diary.dto.DiaryEntryDto;
import com.persona.pwm.diary.service.DiaryEntryService;
import com.persona.pwm.diary.service.DiaryEntryService.DiaryEntrySummary;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.List;
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
@RequestMapping("/api/diaries")
@Validated
public class DiaryEntryController {

    private static final DateTimeFormatter DAY_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

    private final DiaryEntryService service;

    public DiaryEntryController(DiaryEntryService service) {
        this.service = service;
    }

    @GetMapping
    public List<DiaryEntrySummary> listByMonth(
            @RequestParam("month")
            @NotBlank
            @Pattern(regexp = "^\\d{4}-\\d{2}$", message = "Month must be in yyyy-MM format") String month
    ) {
        YearMonth yearMonth = YearMonth.parse(month, MONTH_FORMATTER);
        return service.listByMonth(yearMonth);
    }

    @GetMapping(path = "/search")
    public List<DiaryEntryDto> search(
            @RequestParam("keyword")
            @NotBlank
            @Size(max = 128, message = "Keyword must be at most 128 characters") String keyword
    ) {
        return service.search(keyword);
    }

    @GetMapping("/{date}")
    public DiaryEntryDto getByDate(
            @PathVariable("date")
            @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "Date must be in yyyy-MM-dd format") String date
    ) {
        LocalDate target = LocalDate.parse(date, DAY_FORMATTER);
        return service.getByDate(target);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DiaryEntryDto upsert(@Valid @RequestBody DiaryEntryDto request) {
        return service.upsert(request);
    }

    @DeleteMapping("/{date}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteByDate(
            @PathVariable("date")
            @Pattern(regexp = "^\\d{4}-\\d{2}-\\d{2}$", message = "Date must be in yyyy-MM-dd format") String date
    ) {
        LocalDate target = LocalDate.parse(date, DAY_FORMATTER);
        service.deleteByDate(target);
    }
}
