package com.persona.pwm.diary.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public record DiaryEntryDto(
        @NotNull LocalDate entryDate,
        @Size(max = 64) String mood,
        List<@NotEmpty @Size(max = 128) String> plans,
        @NotNull @Size(min = 1) String content
) {
    public DiaryEntryDto {
        plans = plans != null ? List.copyOf(plans) : List.of();
    }

    public DiaryEntryDto withPlans(List<String> newPlans) {
        return new DiaryEntryDto(entryDate, mood, newPlans != null ? List.copyOf(newPlans) : List.of(), content);
    }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private LocalDate entryDate;
        private String mood;
        private List<String> plans = new ArrayList<>();
        private String content;

        public Builder entryDate(LocalDate entryDate) {
            this.entryDate = entryDate;
            return this;
        }

        public Builder mood(String mood) {
            this.mood = mood;
            return this;
        }

        public Builder plans(List<String> plans) {
            this.plans = plans != null ? new ArrayList<>(plans) : new ArrayList<>();
            return this;
        }

        public Builder content(String content) {
            this.content = content;
            return this;
        }

        public DiaryEntryDto build() {
            return new DiaryEntryDto(entryDate, mood, plans, content);
        }
    }
}
