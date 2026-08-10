export type WorkExperience = {
  id: number | null;
  company: string;
  title: string;
  startDate: string;
  endDate: string | null;
  description: string | null;
};

export type EducationRecord = {
  id: number | null;
  school: string;
  degree: string | null;
  fieldOfStudy: string | null;
  startDate: string;
  endDate: string | null;
  description: string | null;
};

export type Skill = {
  id: number | null;
  name: string;
  proficiency: string | null;
  description: string | null;
};

export type Profile = {
  id: number | null;
  fullName: string;
  headline: string | null;
  email: string;
  location: string | null;
  website: string | null;
  bio: string | null;
  workExperiences: WorkExperience[];
  educationRecords: EducationRecord[];
  skills: Skill[];
};

export type WorkExperiencePayload = {
  company: string;
  title: string;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
};

export type EducationRecordPayload = {
  school: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate: string;
  endDate?: string | null;
  description?: string | null;
};

export type SkillPayload = {
  name: string;
  proficiency?: string | null;
  description?: string | null;
};

export type ProfilePayload = {
  fullName: string;
  headline?: string | null;
  email: string;
  location?: string | null;
  website?: string | null;
  bio?: string | null;
  workExperiences?: WorkExperiencePayload[];
  educationRecords?: EducationRecordPayload[];
  skills?: SkillPayload[];
};

let mockProfile: Profile = {
  id: 1,
  fullName: '张三',
  headline: '全栈工程师 / 开源爱好者',
  email: 'zhangsan@example.com',
  location: '上海',
  website: 'https://zhangsan.com',
  bio: '我是一名热爱技术的全栈工程师，专注于Web开发和用户体验设计。拥有5年互联网产品开发经验，擅长将复杂的业务需求转化为简洁优雅的代码实现。\n\n在技术栈方面，我精通Vue.js生态和Node.js后端开发，同时对架构设计和性能优化有深入理解。我相信好的代码不仅要能运行，更要易于维护和扩展。\n\n工作之余，我积极参与开源社区，维护了几个受欢迎的工具库。我也喜欢写技术博客，分享学习心得和实践经验。',
  workExperiences: [
    {
      id: 1,
      company: '某科技公司',
      title: '高级前端工程师',
      startDate: '2021-06',
      endDate: null,
      description: '负责核心产品前端架构设计与开发，带领团队完成多个重大项目。主导建设了内部组件库，提升了团队开发效率30%。'
    },
    {
      id: 2,
      company: '互联网公司',
      title: '前端工程师',
      startDate: '2019-03',
      endDate: '2021-05',
      description: '参与电商平台前端开发，负责商品详情页和购物车模块。通过性能优化将页面加载时间减少40%。'
    },
    {
      id: 3,
      company: '初创公司',
      title: '全栈开发工程师',
      startDate: '2018-01',
      endDate: '2019-02',
      description: '负责公司官网和管理后台的全栈开发，使用Vue.js + Node.js技术栈。'
    }
  ],
  educationRecords: [
    {
      id: 1,
      school: '某某大学',
      degree: '学士学位',
      fieldOfStudy: '计算机科学与技术',
      startDate: '2015-09',
      endDate: '2019-06',
      description: '主修计算机科学与技术，辅修设计学。在校期间参与了多个校园项目开发，获得校级编程大赛一等奖。'
    },
    {
      id: 2,
      school: '某某在线教育平台',
      degree: '结业证书',
      fieldOfStudy: '前端进阶课程',
      startDate: '2020-01',
      endDate: '2020-06',
      description: '系统学习了前端工程化、性能优化和大型项目架构设计。'
    }
  ],
  skills: [
    { id: 1, name: 'Vue.js', proficiency: 'expert', description: '精通Vue 3 Composition API和生态工具链' },
    { id: 2, name: 'TypeScript', proficiency: 'expert', description: '类型系统高级应用和工程化实践' },
    { id: 3, name: 'Node.js', proficiency: 'senior', description: '后端API开发和微服务架构' },
    { id: 4, name: 'React', proficiency: 'senior', description: '中大型项目开发和状态管理' },
    { id: 5, name: 'UI/UX Design', proficiency: 'intermediate', description: '产品设计和用户交互设计' },
    { id: 6, name: 'Docker', proficiency: 'intermediate', description: '容器化部署和CI/CD流程' },
    { id: 7, name: 'PostgreSQL', proficiency: 'intermediate', description: '数据库设计和查询优化' }
  ]
};

export const fetchProfile = async (_email?: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { ...mockProfile };
};

export const upsertProfile = async (payload: ProfilePayload) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const next: Profile = {
    ...mockProfile,
    ...payload,
    workExperiences: payload.workExperiences
      ? payload.workExperiences.map<WorkExperience>((w, i) => ({
          id: i + 1,
          company: w.company,
          title: w.title,
          startDate: w.startDate,
          endDate: w.endDate ?? null,
          description: w.description ?? null
        }))
      : mockProfile.workExperiences,
    educationRecords: payload.educationRecords
      ? payload.educationRecords.map<EducationRecord>((e, i) => ({
          id: i + 1,
          school: e.school,
          degree: e.degree ?? null,
          fieldOfStudy: e.fieldOfStudy ?? null,
          startDate: e.startDate,
          endDate: e.endDate ?? null,
          description: e.description ?? null
        }))
      : mockProfile.educationRecords,
    skills: payload.skills
      ? payload.skills.map<Skill>((s, i) => ({
          id: i + 1,
          name: s.name,
          proficiency: s.proficiency ?? null,
          description: s.description ?? null
        }))
      : mockProfile.skills
  };
  mockProfile = next;
  return { ...next };
};

export const deleteProfile = async (_email: string) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  mockProfile = {
    id: null,
    fullName: '',
    headline: null,
    email: '',
    location: null,
    website: null,
    bio: null,
    workExperiences: [],
    educationRecords: [],
    skills: []
  };
};
