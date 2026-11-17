package cn.inkheap.module.digitallife.constant;

import java.util.List;
import java.util.Map;

/**
 * 数字生命默认值：provider 端点映射、向量维度、模型类型、默认人格。
 */
public class DigitalLifeDefaults {

    private DigitalLifeDefaults() {
    }

    /** embedding 维度（项目固定 1024） */
    public static final int EMBEDDING_DIMENSIONS = 1024;

    public static final List<String> MODEL_TYPES = List.of("general", "embedding");

    public static final Map<String, String> PROVIDER_BASE_URLS = Map.of(
            "zhipu", "https://open.bigmodel.cn/api/paas/v4",
            "openai", "https://api.openai.com/v1",
            "deepseek", "https://api.deepseek.com/v1",
            "qwen", "https://dashscope.aliyuncs.com/compatible-mode/v1",
            "anthropic", "https://api.anthropic.com/v1");

    public static String baseUrlOf(String provider) {
        return PROVIDER_BASE_URLS.getOrDefault(provider, PROVIDER_BASE_URLS.get("zhipu"));
    }

    /** 各数据源类型中文标签（训练页 tab 与 RAG 来源展示） */
    public static final Map<String, String> REF_TYPE_LABELS = Map.of(
            RefTypes.ARTICLE, "知识库文章",
            RefTypes.BLOG, "小记",
            RefTypes.RESUME, "简历",
            RefTypes.ABOUT_PROFILE, "关于我·个人简介",
            RefTypes.ABOUT_FOOTPRINT, "关于我·足迹",
            RefTypes.ABOUT_TRAVEL, "关于我·旅行",
            RefTypes.ABOUT_EVENT, "关于我·事件");

    public static String refTypeLabel(String refType) {
        return REF_TYPE_LABELS.getOrDefault(refType, refType);
    }

    /** 默认人格（无人格数据时的种子） */
    public static final String DEFAULT_PERSONA_NAME = "慕士塔格猫";

    public static final String DEFAULT_PERSONA_GREETING =
            "你好呀，我是慕士塔格猫——这座墨堆的主人。想聊登山、聊代码，还是随便说说话？我都接得住。";

    public static final String DEFAULT_PERSONA_BASIC_INFO = """
            称呼：慕士塔格猫
            身份：站主本人的数字分身，代表站主的技能面、兴趣面与做事方式
            MBTI：ENFJ
            技术栈：Vue 3（前端）、NestJS + Prisma（后端）、Docker / docker-compose（部署）
            常做的项目：个人网站 inkheap
            爱好：登山与户外（2025 年 10 月 1 日攀登那玛峰 5588m，抵达 5028m 后因高反下撤）""";

    public static final String DEFAULT_PERSONA_STYLE_HINT =
            "热忱而有画面感，喜欢用具体的场景和比喻表达；先照顾对方情绪再表达自己；"
                    + "信息不足时诚实说「这块我还没有告诉过你」，不编造细节；聊登山时带着那玛峰的亲历感，聊项目时以 inkheap 维护者的口吻。";
}
