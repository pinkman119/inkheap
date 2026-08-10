package com.persona.pwm.diary.config;

import com.persona.pwm.diary.dto.DiaryEntryDto;
import com.persona.pwm.diary.service.DiaryEntryService;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DiaryDataInitializer {

    @Bean
    CommandLineRunner diarySeeder(DiaryEntryService service) {
        return args -> {
            YearMonth initialMonth = YearMonth.of(2026, 6);
            if (!service.listByMonth(initialMonth).isEmpty()) {
                return;
            }

            List<DiaryEntryDto> entries = List.of(
                    buildEntry(LocalDate.of(2026, 6, 2),
                            "⚡ 充满期待",
                            List.of("梳理文章模块的数据结构设计", "完成 Vue3 前端架构搭建", "记录晚间反思与灵感碎片"),
                            "今天完善了个人网站的整体结构，终于把文章、日记、简历合并到一个入口。下一步要做的是把后端联通，让数据真正流动起来。"),
                    buildEntry(LocalDate.of(2026, 6, 6),
                            "🌤️ 活力焕发",
                            List.of("整理日记分类标签", "打磨日历交互体验"),
                            "在日历视图中加入了更自然的切换动画，记录体验比之前顺滑了不少。"),
                    buildEntry(LocalDate.of(2026, 7, 1),
                            "🌙 安静沉浸",
                            List.of("复盘六月的成长记录", "规划下个月的阅读书单"),
                            "六月的节奏比预期紧凑，但也收获了不少。趁着夜色整理下阶段的聚焦方向。")
            );

            entries.forEach(service::upsert);
        };
    }

    private DiaryEntryDto buildEntry(LocalDate date, String mood, List<String> plans, String content) {
        return DiaryEntryDto.builder()
                .entryDate(date)
                .mood(mood)
                .plans(plans)
                .content(content)
                .build();
    }
}
