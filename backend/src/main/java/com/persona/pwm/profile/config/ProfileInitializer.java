package com.persona.pwm.profile.config;

import com.persona.pwm.profile.dto.ProfileRequest;
import com.persona.pwm.profile.dto.ProfileRequest.EducationRecordRequest;
import com.persona.pwm.profile.dto.ProfileRequest.SkillRequest;
import com.persona.pwm.profile.dto.ProfileRequest.WorkExperienceRequest;
import com.persona.pwm.profile.service.ProfileService;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ProfileInitializer {

    @Bean
    CommandLineRunner profileSeeder(ProfileService profileService) {
        return args -> {
            if (profileService.hasAnyProfile()) {
                return;
            }
            profileService.upsert(new ProfileRequest(
                    "林夏梢",
                    "产品策略 / 品牌体验顾问",
                    "sx.lin@example.com",
                    "上海 · 浦东",
                    "https://persona.flow",
                    "热爱通过内容与体验连接人与品牌，关注跨领域信息架构。",
                    List.of(
                            new WorkExperienceRequest(
                                    "Bridge Labs",
                                    "产品策略负责人",
                                    "2023-01-01",
                                    null,
                                    "引导跨产品线的内容增长策略，年复合增长 38%。"
                            ),
                            new WorkExperienceRequest(
                                    "Compass Studio",
                                    "品牌体验顾问",
                                    "2020-03-01",
                                    "2022-12-31",
                                    "主导多场景体验设计项目，打造统一品牌叙事体系。"
                            )
                    ),
                    List.of(
                            new EducationRecordRequest(
                                    "复旦大学",
                                    "学士",
                                    "新闻传播学",
                                    "2014-09-01",
                                    "2018-07-01",
                                    "专注品牌叙事与用户研究方向。"
                            )
                    ),
                    List.of(
                            new SkillRequest("信息架构", "expert", "组织复杂信息结构，保障内容可达"),
                            new SkillRequest("服务设计", "advanced", "跨触点体验策略与落地"),
                            new SkillRequest("内容策略", "advanced", "构建一致的品牌表达体系")
                    )
            ));
        };
    }
}
