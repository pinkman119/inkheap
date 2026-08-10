export type DiaryEntrySummary = {
  entryDate: string;
  mood: string | null;
  hasContent: boolean;
  hasPlans: boolean;
  scores?: Record<string, number>;
};

export type DiaryEntryDetail = {
  entryDate: string;
  mood: string | null;
  plans: string[];
  content: string;
  scores?: Record<string, number>;
};

export type DiarySearchResult = DiaryEntryDetail;

export type UpsertDiaryPayload = {
  entryDate: string;
  mood?: string | null;
  plans?: string[];
  content: string;
  scores?: Record<string, number>;
};

// 本地内存数据库（假数据）
const DB: Record<string, DiaryEntryDetail> = {
  '2026-06-01': {
    entryDate: '2026-06-01',
    mood: '🌤️ 轻松',
    plans: ['阅读一小时', '整理书桌'],
    content: '今天天气格外好，早上读了一本关于设计的书，收获满满。下午把书桌整理了一遍，心情也变得清爽了。',
    scores: { 心情: 4, 学习: 3, 运动: 1, 工作: 2 }
  },
  '2026-06-02': {
    entryDate: '2026-06-02',
    mood: '😊 愉快',
    plans: ['完成项目文档', '整理代码'],
    content: '项目进展非常顺利，今天终于把拖延已久的文档补完了。团队协作也越来越默契。',
    scores: { 心情: 5, 学习: 2, 运动: 2, 工作: 4 }
  },
  '2026-06-05': {
    entryDate: '2026-06-05',
    mood: '☕ 平静',
    plans: ['周会汇报', '代码审查'],
    content: '和团队开了例会，讨论了下个迭代的计划。下午帮同事审查了几段代码，提出了一些优化建议。',
    scores: { 心情: 3, 学习: 3, 运动: 1, 工作: 4 }
  },
  '2026-05-28': {
    entryDate: '2026-05-28',
    mood: '🎉 兴奋',
    plans: ['发布新版本', '写发布说明'],
    content: '终于发布了酝酿已久的新版本！看到用户反馈很积极，一切辛苦都值得了。',
    scores: { 心情: 5, 学习: 2, 运动: 1, 工作: 5 }
  },
  '2026-05-30': {
    entryDate: '2026-05-30',
    mood: '😴 疲惫',
    plans: ['修复线上 Bug', '复盘会议'],
    content: '上线后出现了几个小问题，紧急修复了一整天。虽然很累，但问题都圆满解决了。',
    scores: { 心情: 2, 学习: 1, 运动: 1, 工作: 5 }
  }
};

export const fetchDiarySummaries = async (year: number, month: number) => {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const result: DiaryEntrySummary[] = [];
  for (const [iso, detail] of Object.entries(DB)) {
    if (iso.startsWith(prefix)) {
      result.push({
        entryDate: iso,
        mood: detail.mood,
        hasContent: detail.content.trim().length > 0,
        hasPlans: detail.plans.length > 0,
        scores: detail.scores ?? {}
      });
    }
  }
  return result;
};

export const fetchDiaryDetail = async (dateIso: string) => {
  return DB[dateIso] ?? null;
};

export const upsertDiaryEntry = async (payload: UpsertDiaryPayload) => {
  const detail: DiaryEntryDetail = {
    entryDate: payload.entryDate,
    mood: payload.mood ?? null,
    plans: payload.plans ?? [],
    content: payload.content,
    scores: payload.scores ?? {}
  };
  DB[payload.entryDate] = detail;
  return detail;
};

export const deleteDiaryEntry = async (dateIso: string) => {
  delete DB[dateIso];
};

export const searchDiaryEntries = async (keyword: string) => {
  const lower = keyword.toLowerCase();
  const results: DiarySearchResult[] = [];
  for (const detail of Object.values(DB)) {
    if (
      detail.content.toLowerCase().includes(lower) ||
      (detail.mood && detail.mood.toLowerCase().includes(lower)) ||
      detail.plans.some((p) => p.toLowerCase().includes(lower))
    ) {
      results.push(detail);
    }
  }
  return results;
};
