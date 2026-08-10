<template>
  <div class="profile-page">
    <div v-if="loading" class="loading-state">加载中...</div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="loadProfile" class="btn btn-secondary">重试</button>
    </div>

    <div v-else-if="profile" class="profile-content">
      <!-- 左右布局 -->
      <div class="hero-split">
        <!-- 左侧：个人信息 -->
        <div class="hero-left">
          <div class="avatar">
            <img :src="headImg" alt="头像" class="avatar-img" />
          </div>
          <h1 class="name">{{ profile.fullName }}</h1>
          <p class="headline">{{ profile.headline }}</p>
          <div class="contact-links">
     
            <a v-if="profile.website" :href="profile.website" target="_blank" rel="noopener" class="contact-link">
              <svg width="23" height="23" viewBox="0 0 1061 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1692">
                <path d="M258.490881 610.759953c-0.076713 0.076713-0.153427 0.23014-0.23014 0.306854 2.991819-3.375386 6.137065-6.904198 9.205598-10.356298-5.753499 6.443918-8.975458 10.049444-8.975458 10.049444z" fill="#1590E9" p-id="1693"></path>
                <path d="M246.293464 657.248222c21.709868-24.241407 79.16814-88.603878 136.472986-153.273202-41.885469 46.948548-93.436816 104.8671-136.472986 153.273202z" fill="#1590E9" p-id="1694"></path>
                <path d="M0 512a512 508.54023 90 1 0 1017.080459 0 512 508.54023 90 1 0-1017.080459 0Z" fill="#2CC35A" p-id="1695"></path>
                <path d="M768.864559 345.485314l19.638608-11.583711c7.978185-4.679512 6.980912-16.493363-1.610979-19.868748l-9.435738-3.682239c-13.808397-5.446645-26.235953-13.961823-35.825117-25.315394-12.04399-14.191963-34.290851-34.597705-69.732403-46.641695-40.427916-13.808397-109.623326-11.046717-148.210122-8.054898-12.197417 0.92056-19.178328 14.11525-13.348117 24.931827 32.679872 60.296665 12.811123 87.683318-4.372659 107.935633-26.312667 30.992179-74.718768 86.072338-123.278295 140.845645 16.800216-18.794762 32.066165-35.901831 44.570435-49.940368 27.923646-31.299032 70.039256-47.178688 111.311019-39.660783 131.563333 24.011267 146.52243 194.391538-7.057625 295.806538 20.022175-1.073986 40.351203-2.531539 60.756944-4.602798 193.777831-19.945462 209.120494-178.051602 167.235025-256.145756-14.882383-27.693506-17.030356-46.411555-15.419376-64.36247 1.534266-16.493363 10.586437-31.299032 24.7784-39.660783z" fill="#CCCCCC" p-id="1696"></path>
                <path d="M538.647904 414.37387c-41.271763-7.517905-83.387372 8.361751-111.311019 39.660783-12.50427 13.961823-27.77022 31.068892-44.570435 49.940367C325.461604 568.644344 268.003332 633.006814 246.293464 657.248222c-3.145246 3.528812-6.213778 6.980912-9.205597 10.356297-9.742591 11.430284-3.068533 29.151059 11.890563 31.145605 53.622606 6.904198 162.555512 17.720776 282.535136 11.506997 153.580055-101.491714 138.697672-271.871985 7.134338-295.883251z" fill="#FFFFFF" p-id="1697"></path>
                <path d="M248.97843 698.750124c-14.959096-1.917833-21.633155-19.638608-11.890563-31.145605-39.660783 44.723862-70.346109 79.39828-76.022894 86.379191-18.487909 22.630428 190.018879 75.102334 370.218453-43.573162 0.076713-0.076713 0.23014-0.153427 0.306853-0.23014-120.056336 6.290492-228.989242-4.526086-282.611849-11.430284z" fill="#CCCCCC" p-id="1698"></path>
                <path d="M614.88713 562.195056m-93.024866 0a93.024866 93.024866 0 1 0 186.049731 0 93.024866 93.024866 0 1 0-186.049731 0Z" fill="#225000" fill-opacity="0" p-id="1699"></path>
                <path d="M217.417039 662.753936a421.90098 187.006347 0 1 0 843.80196 0 421.90098 187.006347 0 1 0-843.80196 0Z" fill="#225000" fill-opacity="0" p-id="1700"></path>
              </svg>
              <span>yuque</span>
            </a>
            <a href="https://github.com" target="_blank" rel="noopener" class="contact-link">
              <svg width="24" height="24" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="10341">
                <path d="M512 85.333333C276.266667 85.333333 85.333333 276.266667 85.333333 512a426.410667 426.410667 0 0 0 291.754667 404.821333c21.333333 3.712 29.312-9.088 29.312-20.309333 0-10.112-0.554667-43.690667-0.554667-79.445333-107.178667 19.754667-134.912-26.112-143.445333-50.133334-4.821333-12.288-25.6-50.133333-43.733333-60.288-14.933333-7.978667-36.266667-27.733333-0.554667-28.245333 33.621333-0.554667 57.6 30.933333 65.621333 43.733333 38.4 64.512 99.754667 46.378667 124.245334 35.2 3.754667-27.733333 14.933333-46.378667 27.221333-57.045333-94.933333-10.666667-194.133333-47.488-194.133333-210.688 0-46.421333 16.512-84.778667 43.733333-114.688-4.266667-10.666667-19.2-54.4 4.266667-113.066667 0 0 35.712-11.178667 117.333333 43.776a395.946667 395.946667 0 0 1 106.666667-14.421333c36.266667 0 72.533333 4.778667 106.666666 14.378667 81.578667-55.466667 117.333333-43.690667 117.333334-43.690667 23.466667 58.666667 8.533333 102.4 4.266666 113.066667 27.178667 29.866667 43.733333 67.712 43.733334 114.645333 0 163.754667-99.712 200.021333-194.645334 210.688 15.445333 13.312 28.8 38.912 28.8 78.933333 0 57.045333-0.554667 102.912-0.554666 117.333334 0 11.178667 8.021333 24.490667 29.354666 20.224A427.349333 427.349333 0 0 0 938.666667 512c0-235.733333-190.933333-426.666667-426.666667-426.666667z" fill="#000000" p-id="10342"></path>
              </svg>
                            <span>github</span>

            </a>
  
          </div>
        </div>

        <!-- 右侧：命令行窗口 -->
        <div class="hero-right">
          <div class="terminal">
            <div class="terminal-header">
              <div class="terminal-buttons">
                <span class="terminal-button terminal-button-close"></span>
                <span class="terminal-button terminal-button-minimize"></span>
                <span class="terminal-button terminal-button-maximize"></span>
              </div>
              <div class="terminal-title">Terminal</div>
            </div>
            <div class="terminal-body">
              <div class="terminal-line">
                <span class="terminal-prompt">$</span>
                <span class="terminal-text">{{ displayedText }}<span class="terminal-cursor">|</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 关于我 -->
      <section v-if="profile.bio" class="section">
        <h2>关于我</h2>
        <p class="bio">{{ profile.bio }}</p>
      </section>

      <!-- 工作经历 -->
      <section class="section">
        <h2>工作经历</h2>
        <ul v-if="workExperiences.length > 0" class="timeline-list">
          <li v-for="item in workExperiences" :key="item.id" class="timeline-item">
            <div class="timeline-content">
              <div class="timeline-header">
                <h3>{{ item.company }}</h3>
                <time>{{ formatDateRange(item.startDate, item.endDate) }}</time>
              </div>
              <p class="timeline-title">{{ item.title }}</p>
              <p v-if="item.description" class="timeline-desc">{{ item.description }}</p>
            </div>
          </li>
        </ul>
        <p v-else class="empty-text">暂无工作经历</p>
      </section>

      <!-- 教育背景 -->
      <section class="section">
        <h2>教育背景</h2>
        <ul v-if="educationRecords.length > 0" class="timeline-list">
          <li v-for="record in educationRecords" :key="record.id" class="timeline-item">
            <div class="timeline-content">
              <div class="timeline-header">
                <h3>{{ record.school }}</h3>
                <time>{{ formatDateRange(record.startDate, record.endDate) }}</time>
              </div>
              <p class="timeline-title">{{ record.degree }} · {{ record.fieldOfStudy }}</p>
              <p v-if="record.description" class="timeline-desc">{{ record.description }}</p>
            </div>
          </li>
        </ul>
        <p v-else class="empty-text">暂无教育记录</p>
      </section>

      <!-- 技能 -->
      <section v-if="skills.length > 0" class="section skills-section">
        <h2>技能</h2>
        <div class="skills-list">
          <div v-for="skill in skills" :key="skill.id" class="skill-item">
            <span class="skill-name">{{ skill.name }}</span>
            <div class="skill-level">
              <div class="skill-bar" :class="`level-${skill.proficiency}`"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import headImg from '@/img/head.jpg';

// Mock 数据
const mockProfile = {
  fullName: '王五',
  headline: '产品经理 / 设计师',
  email: 'zhangsan@example.com',
  location: '广州',
  website: 'https://zhangsan.com',
  bio: '我是一名专注于用户体验的产品设计师，擅长将复杂的业务需求转化为简洁直观的界面设计。拥有5年互联网产品设计经验，热爱探索设计系统与用户研究的结合点。\n\n在过去的几年里，我参与并主导了多个产品从0到1的设计与迭代，积累了丰富的实战经验。我始终相信，优秀的设计不仅体现在视觉上，更体现在对用户需求的深刻理解和精准满足。\n\n除了产品设计，我还对前端技术保持着浓厚兴趣，能够与开发团队高效协作，确保设计方案能够完美落地。我相信跨领域的知识储备能够帮助我在产品设计中做出更全面的决策。\n\n工作之余，我喜欢阅读设计书籍、参加技术分享会，保持对新知识的渴求。我相信持续学习是设计师保持竞争力的关键。',
  workExperiences: [
    {
      id: '1',
      company: '某科技公司',
      title: '高级产品经理',
      startDate: '2021-06',
      endDate: null,
      description: '负责核心产品的设计与迭代，带领团队完成用户增长目标。主导设计了全新的用户体验流程，将用户留存率提升了40%。建立了设计系统，统一了多个产品的视觉风格，提升了品牌一致性。'
    },
    {
      id: '2',
      company: '互联网公司',
      title: '产品设计师',
      startDate: '2019-03',
      endDate: '2021-05',
      description: '参与多个项目的用户研究与界面设计，提升了产品的用户体验。负责移动端APP的改版设计，通过用户调研发现痛点，重新设计了核心流程，用户满意度提升35%。'
    },
    {
      id: '3',
      company: '初创公司',
      title: 'UI 设计师',
      startDate: '2018-01',
      endDate: '2019-02',
      description: '负责公司旗下3款产品的UI设计，从零开始构建设计规范。与开发团队紧密合作，确保设计稿的高保真还原。'
    }
  ],
  educationRecords: [
    {
      id: '1',
      school: '某某大学',
      degree: '计算机科学',
      fieldOfStudy: '学士学位',
      startDate: '2015-09',
      endDate: '2019-06',
      description: '主修计算机科学与技术，辅修设计学。在校期间参与了多个校园产品设计项目，获得校级设计大赛一等奖。'
    },
    {
      id: '2',
      school: '某某艺术院校',
      degree: '交互设计',
      fieldOfStudy: '暑期课程',
      startDate: '2018-07',
      endDate: '2018-08',
      description: '参加了为期2个月的交互设计强化课程，系统学习了用户体验设计的方法论和实践技巧。'
    }
  ],
  skills: [
    { id: '1', name: '产品设计', proficiency: 'expert' },
    { id: '2', name: 'Figma', proficiency: 'expert' },
    { id: '3', name: '用户研究', proficiency: 'senior' },
    { id: '4', name: '产品策略', proficiency: 'senior' },
    { id: '5', name: 'Vue.js', proficiency: 'intermediate' },
    { id: '6', name: '数据分析', proficiency: 'intermediate' },
    { id: '7', name: 'Sketch', proficiency: 'expert' },
    { id: '8', name: 'Prototyping', proficiency: 'senior' },
    { id: '9', name: 'Design Systems', proficiency: 'senior' },
    { id: '10', name: 'React', proficiency: 'intermediate' },
    { id: '11', name: 'JavaScript', proficiency: 'intermediate' },
    { id: '12', name: 'HTML/CSS', proficiency: 'expert' }
  ]
};

const loading = ref(true);
const error = ref<string | null>(null);
const profile = ref<ReturnType<typeof mockProfile> | null>(null);

const workExperiences = computed(() => profile.value?.workExperiences ?? []);
const educationRecords = computed(() => profile.value?.educationRecords ?? []);
const skills = computed(() => profile.value?.skills ?? []);

// 打字效果
const targetText = 'Hello，World.\nWelcome to My Pag！\nNow，let me show you about me！这里只能定义一部分的我，这里不能定义我的全部！';
const displayedText = ref('');

const typeWriter = () => {
  let index = 0;
  const typeNext = () => {
    if (index < targetText.length) {
      displayedText.value += targetText[index];
      index++;
      setTimeout(typeNext, 80);
    }
  };
  typeNext();
};

const loadProfile = async () => {
  loading.value = true;
  error.value = null;
  try {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    profile.value = mockProfile;

    // 开始打字效果
    setTimeout(typeWriter, 500);
  } catch (err) {
    error.value = '加载个人信息失败，请稍后重试。';
    console.error('[PublicProfile] loadProfile', err);
  } finally {
    loading.value = false;
  }
};

const formatDateRange = (start: string, end: string | null) => {
  const startLabel = formatDateLabel(start);
  const endLabel = end ? formatDateLabel(end) : '至今';
  return `${startLabel} — ${endLabel}`;
};

const formatDateLabel = (value: string) => {
  const [year, month] = value.split('-');
  return `${year}.${month}`;
};

onMounted(() => {
  loadProfile();
});
</script>

<style scoped>
.profile-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 0 0;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 6rem 0;
  color: var(--public-text-secondary);
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

/* 左右布局 */
.hero-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  min-height: calc(100vh - 4rem);
  padding-bottom: 6rem;
  border-bottom: 1px solid var(--public-border-light);
}

/* 左侧：个人信息 */
.hero-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right:50px;
}

.avatar {
  width: 300px;
  height: 300px;
  margin-bottom: 1.5rem;
  border-radius: 50%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.12),
    0 8px 30px rgba(0, 0, 0, 0.15),
    0 16px 50px rgba(0, 0, 0, 0.1);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.name {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--public-text);
}

.headline {
  font-size: 1.125rem;
  color: var(--public-text-secondary);
  margin-bottom: 1.5rem;
}

.contact-links {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.contact-link,
.contact-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--public-text-secondary);
  text-decoration: none;
  font-size: 0.9375rem;
  transition: color 0.2s ease;
}

.contact-link:hover {
  color: var(--public-accent);
}

/* 右侧：终端窗口 */
.hero-right {
  display: flex;
  justify-content: flex-end;
}

.terminal {
  width: 100%;
  max-width: 450px;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  font-family: 'Courier New', Courier, monospace;
}

.terminal-header {
  background: #2d333b;
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
}

.terminal-buttons {
  display: flex;
  gap: 0.5rem;
}

.terminal-button {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.terminal-button-close {
  background: #ff5f56;
}

.terminal-button-minimize {
  background: #ffbd2e;
}

.terminal-button-maximize {
  background: #27c93f;
}

.terminal-title {
  color: #888;
  font-size: 0.875rem;
  flex: 1;
  text-align: right;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  margin: 0;
  width: 100%;
  padding-right: 0.5rem;
}

.terminal-body {
  padding: 1rem;
  min-height: 60vh;
  display: flex;
  align-items: flex-start;
}

.terminal-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.terminal-prompt {
  color: #27c93f;
  font-weight: bold;
}

.terminal-text {
  color: #fff;
  font-size: 1rem;
}

.terminal-cursor {
  display: inline-block;
  width: 8px;
  height: 1.2em;
  background: #fff;
  margin-left: 2px;
  animation: blink 1s step-end infinite;
  vertical-align: middle;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

/* Section */
.section {
  padding-bottom: 1rem;
}

.section h2 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--public-text);
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--public-border-light);
}

.bio {
  font-size: 1rem;
  line-height: 1.8;
  color: var(--public-text-secondary);
  white-space: pre-line;
}

/* Timeline */
.timeline-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.timeline-item {
  position: relative;
  padding-left: 1.5rem;
  margin-bottom: 2.5rem;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.5rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--public-accent);
}

.timeline-content {
  padding-left: 0.75rem;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.25rem;
  flex-wrap: wrap;
}

.timeline-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--public-text);
  margin: 0;
}

.timeline-header time {
  font-size: 0.875rem;
  color: var(--public-text-muted);
}

.timeline-title {
  font-size: 0.9375rem;
  color: var(--public-accent);
  margin-bottom: 0.5rem;
}

.timeline-desc {
  font-size: 0.9375rem;
  color: var(--public-text-secondary);
  line-height: 1.6;
  margin: 0;
}

.empty-text {
  color: var(--public-text-muted);
  font-style: italic;
}

/* Skills */
.skills-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skill-item {
  display: grid;
  grid-template-columns: 120px 1fr;
  align-items: center;
  gap: 1rem;
}

.skill-name {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--public-text);
}

.skill-level {
  height: 6px;
  background: var(--public-border-light);
  border-radius: 3px;
  overflow: hidden;
}

.skill-bar {
  height: 100%;
  border-radius: 3px;
  background: var(--public-accent);
}

.skill-bar.level-expert {
  width: 95%;
}

.skill-bar.level-senior {
  width: 80%;
}

.skill-bar.level-intermediate {
  width: 60%;
}

.skill-bar.level-junior {
  width: 40%;
}

@media (max-width: 768px) {
  .hero-split {
    grid-template-columns: 1fr;
    gap: 2rem;
  }

  .hero-left {
    align-items: center;
  }

  .hero-right {
    justify-content: center;
  }

  .terminal {
    max-width: 100%;
  }

  .name {
    font-size: 2rem;
  }
}
</style>