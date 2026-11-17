package cn.inkheap.module.footerlink.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.inkheap.module.footerlink.entity.FooterConfig;
import cn.inkheap.module.footerlink.mapper.FooterConfigMapper;
import cn.inkheap.module.footerlink.model.dto.UpdateFooterConfigRequest;
import cn.inkheap.module.footerlink.service.FooterConfigService;
import com.mybatisflex.spring.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class FooterConfigServiceImpl extends ServiceImpl<FooterConfigMapper, FooterConfig>
        implements FooterConfigService {

    private static final String FOOTER_ID = "footer";

    /** 工信部备案查询系统：备案地址留空时的跳转目标 */
    private static final String DEFAULT_ICP_URL = "https://beian.miit.gov.cn";

    /** 默认备案号：与改造前前端硬编码值保持一致 */
    private static final String DEFAULT_ICP_NO = "苏ICP备2024125779号";

    @Override
    public FooterConfig findOne() {
        // 1、查询单例记录
        FooterConfig record = this.getById(FOOTER_ID);

        // 2、无记录返回兜底值，保证前台不报错
        if (record == null) {
            return FooterConfig.builder()
                    .id(FOOTER_ID)
                    .icpNo(DEFAULT_ICP_NO)
                    .icpUrl(DEFAULT_ICP_URL)
                    .build();
        }

        // 3、备案地址留空时回退工信部
        if (StrUtil.isBlank(record.getIcpUrl())) {
            record.setIcpUrl(DEFAULT_ICP_URL);
        }
        return record;
    }

    @Override
    public FooterConfig update(UpdateFooterConfigRequest request) {
        // 1、读取现有记录，不存在则创建
        FooterConfig existing = this.getById(FOOTER_ID);
        if (existing == null) {
            FooterConfig created = FooterConfig.builder()
                    .id(FOOTER_ID)
                    .icpNo(request.getIcpNo() == null ? "" : request.getIcpNo().trim())
                    .icpUrl(request.getIcpUrl() == null ? "" : request.getIcpUrl().trim())
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            this.save(created);
            return findOne();
        }

        // 2、仅更新传入字段
        FooterConfig update = FooterConfig.builder()
                .id(FOOTER_ID)
                .icpNo(request.getIcpNo() == null ? null : request.getIcpNo().trim())
                .icpUrl(request.getIcpUrl() == null ? null : request.getIcpUrl().trim())
                .updatedAt(Instant.now())
                .build();
        this.updateById(update);

        return findOne();
    }
}
