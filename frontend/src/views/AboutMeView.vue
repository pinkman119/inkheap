<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import FootprintMap from '@/components/FootprintMap.vue'
import { profile, sections, selfEvaluation, testimonials, timeline, travels, visitedProvinces, footprintData } from '@/data/about'

/* ===== Scroll reveal（对应原型的 IntersectionObserver） ===== */
const sectionEls = ref([])
const revealed = ref(sections.map(() => false))

function setSectionRef(el, index) {
  if (el) sectionEls.value[index] = el
}

let io = null

onMounted(() => {
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const index = sectionEls.value.indexOf(e.target)
            if (index > -1) revealed.value[index] = true
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12 },
    )
    sectionEls.value.forEach((el) => el && io.observe(el))
  } else {
    revealed.value = revealed.value.map(() => true)
  }
})

onBeforeUnmount(() => {
  if (io) {
    io.disconnect()
    io = null
  }
})
</script>

<template>
  <AppHeader active-key="about" />

  <main class="page">
    <!-- Hero -->
    <section class="page-hero">
      <div class="hero-glow" />
      <div class="page-hero-inner">
        <div class="avatar">
          <img :src="profile.avatar" :alt="profile.avatarAlt" />
        </div>
        <div class="page-hero-text">
          <span class="kicker">{{ profile.kicker }}</span>
          <h1>{{ profile.name }}</h1>
          <p class="lede">{{ profile.lede }}</p>
        </div>
      </div>
    </section>

    <div class="container">
      <!-- 个人经历 -->
      <section
        :ref="(el) => setSectionRef(el, 0)"
        class="section reveal"
        :class="{ in: revealed[0] }"
      >
        <div class="section-head">
          <span class="section-index">{{ sections[0].index }}</span>
          <h2 class="section-title">{{ sections[0].title }}</h2>
          <span class="section-sub">{{ sections[0].sub }}</span>
        </div>
        <div class="timeline">
          <div v-for="item in timeline" :key="item.year" class="tl-item">
            <span class="tl-dot" />
            <div class="tl-year">{{ item.year }}</div>
            <div class="tl-title">{{ item.title }}</div>
            <div class="tl-desc">{{ item.desc }}</div>
          </div>
        </div>
      </section>

      <!-- 我的足迹 -->
      <section
        :ref="(el) => setSectionRef(el, 1)"
        class="section reveal"
        :class="{ in: revealed[1] }"
      >
        <div class="section-head">
          <span class="section-index">{{ sections[1].index }}</span>
          <h2 class="section-title">{{ sections[1].title }}</h2>
          <span class="section-sub">{{ sections[1].sub }}</span>
        </div>
        <FootprintMap :visited-provinces="visitedProvinces" :footprint-data="footprintData" />
      </section>

      <!-- 旅行介绍 -->
      <section
        :ref="(el) => setSectionRef(el, 2)"
        class="section reveal"
        :class="{ in: revealed[2] }"
      >
        <div class="section-head">
          <span class="section-index">{{ sections[2].index }}</span>
          <h2 class="section-title">{{ sections[2].title }}</h2>
          <span class="section-sub">{{ sections[2].sub }}</span>
        </div>
        <div class="travel-grid">
          <article v-for="travel in travels" :key="travel.place" class="travel-card">
            <div class="travel-cover">
              <span class="glyph">{{ travel.glyph }}</span>
            </div>
            <div class="travel-body">
              <div class="travel-place">{{ travel.place }}</div>
              <div class="travel-meta">{{ travel.meta }}</div>
              <div class="travel-note">{{ travel.note }}</div>
            </div>
          </article>
        </div>
      </section>

      <!-- 自我评价 -->
      <section
        :ref="(el) => setSectionRef(el, 3)"
        class="section reveal"
        :class="{ in: revealed[3] }"
      >
        <div class="section-head">
          <span class="section-index">{{ sections[3].index }}</span>
          <h2 class="section-title">{{ sections[3].title }}</h2>
          <span class="section-sub">{{ sections[3].sub }}</span>
        </div>
        <div class="quote-card">
          <span class="quote-mark" aria-hidden="true">“</span>
          <blockquote>{{ selfEvaluation.quote }}</blockquote>
          <div class="by">{{ selfEvaluation.by }}</div>
        </div>
      </section>

      <!-- 我的标签 -->
      <section
        :ref="(el) => setSectionRef(el, 4)"
        class="section reveal"
        :class="{ in: revealed[4] }"
      >
        <div class="section-head">
          <span class="section-index">{{ sections[4].index }}</span>
          <h2 class="section-title">{{ sections[4].title }}</h2>
          <span class="section-sub">{{ sections[4].sub }}</span>
        </div>
        <div class="testi-grid">
          <div v-for="person in testimonials" :key="person.name" class="testi-card">
            <p class="testi-quote">{{ person.quote }}</p>
            <div class="testi-author">
              <span class="testi-avatar">{{ person.initial }}</span>
              <div>
                <div class="testi-name">{{ person.name }}</div>
                <div class="testi-rel">{{ person.relation }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </main>

  <AppFooter padding-y="28px" />
</template>

<style scoped>
/* ===== Page layout ===== */
.page {
  flex: 1;
}

.container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Page hero */
.page-hero {
  position: relative;
  overflow: hidden;
  padding: 72px 24px 56px;
  border-bottom: 1px solid var(--border-light);
}

.hero-glow {
  position: absolute;
  top: -80px;
  right: -60px;
  width: 440px;
  height: 440px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(45, 130, 100, 0.14), transparent 65%);
  filter: blur(48px);
  pointer-events: none;
}

[data-theme='dark'] .hero-glow {
  background: radial-gradient(circle, rgba(95, 197, 154, 0.13), transparent 65%);
}

.page-hero-inner {
  position: relative;
  z-index: 1;
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 40px;
}

.page-hero .avatar {
  width: 132px;
  height: 132px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  border: 3px solid var(--accent);
  box-shadow:
    var(--shadow-md),
    0 0 0 8px var(--accent-light);
  background-color: var(--bg-card);
  transition:
    transform var(--transition),
    box-shadow var(--transition);
}

.page-hero .avatar:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow:
    var(--shadow-lg),
    0 0 0 10px var(--accent-light);
}

.page-hero .avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.kicker {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  padding: 4px 12px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 100px;
  background-color: var(--accent-light);
  margin-bottom: 16px;
}

.page-hero h1 {
  font-family: var(--font-serif);
  font-size: 40px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.02em;
  margin-bottom: 12px;
}

.page-hero .lede {
  font-size: 16px;
  color: var(--text-secondary);
  max-width: 560px;
}

/* Section */
.section {
  padding: 56px 0;
  border-bottom: 1px solid var(--border-light);
}

.section:last-of-type {
  border-bottom: none;
}

.section-head {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 32px;
}

.section-index {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--accent);
  font-weight: 500;
}

.section-title {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.01em;
  position: relative;
  padding-left: 16px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 5px;
  height: 22px;
  border-radius: 100px;
  background-color: var(--accent);
}

.section-sub {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-left: auto;
}

/* Timeline */
.timeline {
  position: relative;
  padding-left: 28px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: linear-gradient(var(--accent), transparent);
  opacity: 0.45;
}

.tl-item {
  position: relative;
  padding-bottom: 28px;
}

.tl-item:last-child {
  padding-bottom: 0;
}

.tl-dot {
  position: absolute;
  left: -28px;
  top: 6px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--bg-card);
  border: 3px solid var(--accent);
  box-shadow: 0 0 0 4px var(--accent-light);
}

.tl-year {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--accent);
  font-weight: 500;
  letter-spacing: 0.04em;
}

.tl-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 2px 0 4px;
}

.tl-desc {
  font-size: 14.5px;
  color: var(--text-secondary);
}

/* Travel grid */
.travel-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.travel-card {
  position: relative;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background-color: var(--bg-card);
  overflow: hidden;
  transition:
    transform var(--transition),
    box-shadow var(--transition),
    border-color var(--transition);
}

.travel-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
}

.travel-cover {
  height: 120px;
  display: flex;
  align-items: flex-end;
  padding: 14px 16px;
  color: #ffffff;
  background:
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.18), transparent 45%),
    linear-gradient(135deg, #2d8264, #143f30);
}

[data-theme='dark'] .travel-cover {
  background:
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.14), transparent 45%),
    linear-gradient(135deg, #2f6b54, #0e2a20);
}

.travel-cover .glyph {
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.1em;
  opacity: 0.9;
}

.travel-body {
  padding: 16px 18px 20px;
}

.travel-place {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.travel-meta {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--accent);
  margin: 4px 0 8px;
}

.travel-note {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Quote (self evaluation) */
.quote-card {
  position: relative;
  padding: 40px 44px;
  background: linear-gradient(135deg, var(--bg-green-soft), var(--bg-soft));
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  border-radius: var(--radius-lg);
}

.quote-mark {
  position: absolute;
  top: 16px;
  left: 24px;
  font-family: var(--font-serif);
  font-size: 64px;
  line-height: 1;
  color: var(--accent);
  opacity: 0.22;
}

.quote-card blockquote {
  position: relative;
  z-index: 1;
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.7;
  color: var(--text-primary);
  margin-bottom: 18px;
}

[data-theme='dark'] .quote-card blockquote {
  color: var(--text-primary);
}

.quote-card .by {
  font-size: 14px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

/* Testimonials */
.testi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.testi-card {
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background-color: var(--bg-card);
  transition:
    transform var(--transition),
    box-shadow var(--transition);
}

.testi-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md);
}

.testi-quote {
  font-size: 14.5px;
  color: var(--text-secondary);
  margin-bottom: 18px;
}

.testi-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.testi-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
  font-size: 15px;
}

.testi-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.testi-rel {
  font-size: 12.5px;
  color: var(--text-tertiary);
}

/* Reveal on scroll */
.reveal {
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity .6s ease,
    transform .6s ease;
}

.reveal.in {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .travel-grid,
  .testi-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-hero {
    padding: 44px 16px 40px;
  }

  .page-hero-inner {
    flex-direction: column;
    text-align: center;
    gap: 24px;
  }

  .page-hero h1 {
    font-size: 32px;
  }

  .section-title {
    font-size: 22px;
  }

  .section-head {
    flex-wrap: wrap;
    gap: 8px;
  }

  .section-sub {
    width: 100%;
    margin-left: 0;
  }

  .travel-grid,
  .testi-grid {
    grid-template-columns: 1fr;
  }

  .quote-card {
    padding: 28px 24px;
  }

  .quote-card blockquote {
    font-size: 19px;
  }
}
</style>
