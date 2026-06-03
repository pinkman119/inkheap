<template>
  <div class="profile-workspace">
    <section v-if="error" class="status-card error">
      <h3>无法加载档案</h3>
      <p>{{ error }}</p>
      <button type="button" @click="loadProfile">重试</button>
    </section>

    <section v-else-if="loading" class="status-card loading">
      <div class="shimmer-row" v-for="index in 5" :key="index"></div>
    </section>

    <template v-else-if="profile">
      <section class="primary-card">
        <header>
          <div>
            <h3>个人信息</h3>
            <p>保持资料精准，方便随时对外展示</p>
          </div>
          <button type="button" @click="startEditing">编辑资料</button>
        </header>

        <div class="grid">
          <dl v-for="field in identityFields" :key="field.key">
            <dt>{{ field.label }}</dt>
            <dd>
              <template v-if="field.type === 'email'">
                <a :href="`mailto:${field.value}`">{{ field.value }}</a>
              </template>
              <template v-else-if="field.type === 'link'">
                <a v-if="field.value" :href="field.value" target="_blank" rel="noopener">{{ field.value }}</a>
                <span v-else class="muted">{{ field.fallback ?? '未填写' }}</span>
              </template>
              <template v-else>
                {{ field.value }}
              </template>
            </dd>
          </dl>
        </div>

        <p v-if="profile.bio" class="bio">{{ profile.bio }}</p>
      </section>

      <section class="timeline">
        <header>
          <h3>履历概览</h3>
          <button type="button" @click="exportResume" :disabled="exporting">
            {{ exporting ? '生成中…' : '导出 PDF' }}
          </button>
        </header>

        <div class="columns">
          <article>
            <h4>工作经历</h4>
            <ul v-if="workExperiences.length">
              <li v-for="item in workExperiences" :key="item.id ?? `${item.company}-${item.startDate}`">
                <div class="item-header">
                  <strong>{{ item.company }} · {{ item.title }}</strong>
                  <span>{{ formatRange(item.startDate, item.endDate) }}</span>
                </div>
                <p v-if="item.description">{{ item.description }}</p>
              </li>
            </ul>
            <p v-else class="empty-state">尚未填写工作经历</p>
          </article>

          <article>
            <h4>教育与技能</h4>
            <ul v-if="educationRecords.length">
              <li v-for="record in educationRecords" :key="record.id ?? `${record.school}-${record.startDate}`">
                <div class="item-header">
                  <strong>
                    {{ record.school }}
                    <template v-if="record.degree || record.fieldOfStudy">
                      · {{ record.degree ?? record.fieldOfStudy }}
                    </template>
                  </strong>
                  <span>{{ formatRange(record.startDate, record.endDate) }}</span>
                </div>
                <p v-if="record.description">{{ record.description }}</p>
              </li>
            </ul>
            <p v-else class="empty-state">尚未填写教育记录</p>

            <div class="skills" v-if="skills.length">
              <h5>技能矩阵</h5>
              <ul class="skills-grid">
                <li v-for="skill in skills" :key="skill.id ?? `${skill.name}-${skill.description ?? ''}`">
                  <div class="skill-header">
                    <span class="skill-name">{{ skill.name }}</span>
                    <span v-if="skill.badge" class="skill-badge">{{ skill.badge }}</span>
                  </div>
                  <p v-if="skill.description">{{ skill.description }}</p>
                </li>
              </ul>
            </div>
          </article>
        </div>
      </section>
    </template>

    <section v-else class="status-card empty">
      <h3>个人信息尚未创建</h3>
      <p>点击下方按钮即可录入基本信息与履历。</p>
      <button type="button" class="primary" @click="startEditing">开始编辑</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { isHttpError } from '../services/http';
import { fetchProfile, type Profile } from '../services/profileService';

type IdentityField = {
  key: string;
  label: string;
  value: string;
  type?: 'email' | 'link' | 'text';
  fallback?: string;
};

type SkillView = {
  id: number | null;
  name: string;
  badge: string | null;
  description: string | null;
};

const profile = ref<Profile | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const exporting = ref(false);

const loadProfile = async () => {
  loading.value = true;
  error.value = null;
  try {
    profile.value = await fetchProfile();
  } catch (err) {
    if (isHttpError(err, 404)) {
      profile.value = null;
      error.value = null;
    } else {
      error.value = '加载过程中出现问题，请稍后重试。';
    }
  } finally {
    loading.value = false;
  }
};

onMounted(loadProfile);

const identityFields = computed<IdentityField[]>(() => {
  const current = profile.value;
  if (!current) return [];
  return [
    { key: 'fullName', label: '姓名', value: current.fullName, type: 'text' },
    { key: 'headline', label: '定位', value: current.headline ?? '待补充', type: 'text' },
    { key: 'email', label: '邮箱', value: current.email, type: 'email' },
    { key: 'location', label: '所在城市', value: current.location ?? '待补充', type: 'text' },
    { key: 'website', label: '网站', value: current.website ?? '', type: 'link', fallback: '未填写' }
  ];
});

const workExperiences = computed(() => profile.value?.workExperiences ?? []);
const educationRecords = computed(() => profile.value?.educationRecords ?? []);
const skills = computed<SkillView[]>(() => {
  const entries = profile.value?.skills ?? [];
  return entries.map((skill) => ({
    id: skill.id,
    name: skill.name,
    badge: skill.proficiency ? skill.proficiency.toUpperCase() : null,
    description: skill.description
  }));
});

const formatRange = (start: string, end: string | null) => {
  const startLabel = formatDateLabel(start);
  const endLabel = end ? formatDateLabel(end) : '至今';
  return `${startLabel} — ${endLabel}`;
};

const formatDateLabel = (value: string) => {
  const [year, month] = value.split('-');
  return `${year}.${month}`;
};

const startEditing = () => {
  // 编辑流程将在后续迭代中接入
};

const exportResume = async () => {
  if (!profile.value) return;
  exporting.value = true;
  try {
    // 后续会替换为真正的导出流程
    await new Promise((resolve) => setTimeout(resolve, 600));
  } finally {
    exporting.value = false;
  }
};
</script>

<style scoped>
.profile-workspace {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.primary-card,
.timeline,
.status-card {
  background: var(--surface-card);
  border-radius: 1.5rem;
  padding: 1.75rem;
  box-shadow: 0 14px 32px rgba(55, 64, 120, 0.08);
}

.primary-card header,
.timeline header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.primary-card header p {
  margin: 0.25rem 0 0;
  color: var(--text-secondary);
}

.primary-card button,
.timeline button,
.status-card button {
  border: none;
  background: var(--surface-pill);
  padding: 0.6rem 1.1rem;
  border-radius: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease;
}

.primary-card button:disabled,
.timeline button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.primary-card button:not(:disabled):hover,
.timeline button:not(:disabled):hover,
.status-card button:hover {
  transform: translateY(-1px);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 1rem;
}

dl {
  margin: 0;
  background: var(--surface-pill);
  border-radius: 1rem;
  padding: 1rem 1.1rem;
}

dl dt {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

dl dd {
  margin: 0.3rem 0 0;
  font-weight: 600;
  word-break: break-word;
}

dl a {
  color: var(--accent-primary, #5b5ef5);
  text-decoration: none;
}

.muted {
  color: var(--text-secondary);
}

.bio {
  margin-top: 1.5rem;
  line-height: 1.8;
  color: var(--text-secondary);
}

.columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 1.5rem;
}

article ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

article li {
  background: var(--surface-pill);
  border-radius: 1rem;
  padding: 1rem 1.2rem;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  flex-wrap: wrap;
}

article strong {
  font-weight: 700;
}

article span {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

article p {
  margin: 0.6rem 0 0;
  line-height: 1.6;
}

.skills {
  margin-top: 2rem;
  background: rgba(91, 94, 245, 0.08);
  border-radius: 1.2rem;
  padding: 1.25rem 1.5rem;
}

.skills h5 {
  margin: 0 0 0.75rem;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  color: var(--text-secondary);
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 0.85rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.skills-grid li {
  background: var(--surface-card);
  border-radius: 1rem;
  padding: 0.9rem 1rem;
  box-shadow: inset 0 0 0 1px rgba(91, 94, 245, 0.12);
}

.skill-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.skill-name {
  font-weight: 600;
}

.skill-badge {
  font-size: 0.7rem;
  text-transform: uppercase;
  background: rgba(91, 94, 245, 0.16);
  color: var(--accent-primary, #5b5ef5);
  padding: 0.1rem 0.4rem;
  border-radius: 0.5rem;
  letter-spacing: 0.08em;
}

.empty-state {
  margin: 0;
  padding: 1rem 1.2rem;
  border-radius: 1rem;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.4);
}

.status-card {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.status-card.loading {
  align-items: stretch;
}

.status-card.error {
  border: 1px solid rgba(255, 99, 132, 0.35);
}

.status-card.empty {
  align-items: center;
}

.status-card .primary {
  background: var(--accent-primary, #5b5ef5);
  color: #fff;
}

.shimmer-row {
  height: 1.1rem;
  border-radius: 0.75rem;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.35) 50%, rgba(255, 255, 255, 0.1) 100%);
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -180px 0;
  }
  100% {
    background-position: 180px 0;
  }
}

@media (max-width: 768px) {
  .primary-card,
  .timeline,
  .status-card {
    padding: 1.5rem;
    border-radius: 1.25rem;
  }

  .skills-grid {
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  }
}
</style>
