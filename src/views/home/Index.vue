<template>
  <div class="home">
    <!-- 公告 -->
    <div
      v-if="placards.length"
      class="placard-card"
      @mouseenter="pause"
      @mouseleave="resume"
    >
      <div class="placard-head">
        <i class="bi bi-megaphone"></i>
        <span class="placard-title">公告</span>
      </div>
      <div class="placard-carousel">
        <transition name="placard-fade" mode="out-in">
          <span
            :key="current.id"
            class="placard-link"
            @click="openPlacard(current)"
          >
            <span class="placard-dot" :class="`placard-${current.type || 'notice'}`" />
            <span class="placard-name">{{ current.title }}</span>
            <span
              v-if="current.content"
              class="placard-content"
              v-html="current.content"
            />
          </span>
        </transition>
        <div v-if="placards.length > 1" class="placard-dots">
          <button
            v-for="(p, i) in placards"
            :key="p.id"
            class="placard-dot-btn"
            :class="{ active: i === index }"
            @click="goTo(i)"
          />
        </div>
      </div>
    </div>

    <!-- 最新文章 -->
    <SectionTitle title="最新文章">
      <template #extra>
        <router-link to="/articles" class="more-link">查看全部 <i class="bi bi-arrow-right" /></router-link>
      </template>
    </SectionTitle>

    <div class="article-list">
      <ArticleCard
        v-for="a in articles"
        :key="a.id"
        :article="a"
        :abstract-limit="50"
      />
      <div v-if="loading" class="loading">
        <span class="spinner" /> 加载中...
      </div>
      <EmptyState v-else-if="!articles.length" text="还没有文章" />
    </div>

    <!-- 公告详情弹窗 -->
    <Teleport to="body">
      <transition name="placard-modal">
        <div v-if="activePlacard" class="placard-mask" @click.self="closePlacard">
          <div class="placard-dialog">
            <div class="placard-dialog-head">
              <h3 class="placard-dialog-title">{{ activePlacard.title }}</h3>
              <button class="placard-dialog-close" @click="closePlacard" aria-label="关闭">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <div class="placard-dialog-body" v-html="activePlacard.content" />
            <div class="placard-dialog-foot">
              <span class="placard-dialog-date">{{ formatDate(activePlacard.create_time) }}</span>
              <a
                v-if="activePlacard.url"
                :href="activePlacard.url"
                target="_blank"
                rel="noopener"
                class="btn btn-primary btn-sm"
              >查看原文</a>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import SectionTitle from '@/components/SectionTitle.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { listArticles } from '@/api/article'
import { call } from '@/api/request'
import { formatDate } from '@/utils/time'

const loading = ref(false)
const articles = ref([])
const placards = ref([])
const index = ref(0)
let timer = null

const current = computed(() => placards.value[index.value] || {})

const activePlacard = ref(null)
function openPlacard(p) {
  if (!p || !p.id) return
  activePlacard.value = p
  pause()
}
function closePlacard() {
  activePlacard.value = null
  resume()
}
function typeLabel(type) {
  return { notice: '公告', warning: '警告', info: '提示' }[type] || '公告'
}

function next() {
  if (placards.value.length > 1) {
    index.value = (index.value + 1) % placards.value.length
  }
}
function goTo(i) {
  index.value = i
  restart()
}
function start() {
  stop()
  timer = setInterval(next, 10000)
}
function stop() {
  if (timer) clearInterval(timer)
  timer = null
}
function restart() {
  if (placards.value.length > 1) start()
}
function pause() {
  stop()
}
function resume() {
  restart()
}

async function loadPlacards() {
  try {
    const res = await call('placard', 'all', {
      method: 'GET',
      params: { page: 1, limit: 5, order: 'create_time desc' }
    })
    placards.value = res?.data?.data || []
    index.value = 0
    restart()
  } catch {
    placards.value = []
  }
}

async function loadArticles() {
  loading.value = true
  try {
    const res = await listArticles({
      page: 1,
      limit: 8,
      where: { audit: 1 },
      order: 'top desc, publish_time desc'
    })
    articles.value = res.data?.data || []
  } catch {
    articles.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPlacards()
  loadArticles()
})

onBeforeUnmount(stop)
</script>

<style scoped>
.home {
  padding-bottom: 32px;
}

/* 公告模块 */
.placard-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  margin-bottom: 24px;
}
.placard-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 10px;
}
.placard-head .bi {
  color: var(--primary);
}
.placard-carousel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 22px;
}
.placard-link {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--text-soft);
  text-decoration: none;
  line-height: 1.6;
}
.placard-link:hover {
  color: var(--primary);
}
.placard-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-top: 6px;
  background: var(--primary);
}
.placard-notice { background: var(--primary); }
.placard-warning { background: #d9544d; }
.placard-info { background: #4a90e2; }
.placard-name {
  font-weight: 500;
  flex-shrink: 0;
}
.placard-content {
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.placard-content :deep(p) {
  display: inline;
  margin: 0;
}
.placard-dots {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: 4px;
}
.placard-dot-btn {
  width: 6px;
  height: 6px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--text-muted);
  opacity: 0.4;
  cursor: pointer;
  transition: opacity 0.2s, background 0.2s;
}
.placard-dot-btn.active {
  opacity: 1;
  background: var(--primary);
}
/* 淡入淡出轮播动画 */
.placard-fade-enter-active,
.placard-fade-leave-active {
  transition: opacity 0.4s ease;
}
.placard-fade-enter-from,
.placard-fade-leave-to {
  opacity: 0;
}

.article-list {
  padding: 0;
}

.loading {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
.more-link {
  color: var(--text-muted);
  font-size: 12px;
}
.more-link:hover {
  color: var(--primary);
}

/* 公告详情弹窗 */
.placard-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.placard-dialog {
  width: 100%;
  max-width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.placard-dialog-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--border);
}
.placard-dialog-tag {
  flex-shrink: 0;
  margin-top: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.placard-dialog-title {
  flex: 1;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}
.placard-dialog-close {
  flex-shrink: 0;
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 15px;
  cursor: pointer;
  padding: 2px 4px;
}
.placard-dialog-close:hover {
  color: var(--text);
}
.placard-dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-soft);
}
.placard-dialog-body :deep(img) {
  max-width: 100%;
  border-radius: 6px;
}
.placard-dialog-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
}
.placard-dialog-date {
  font-size: 12px;
  color: var(--text-muted);
}
.placard-modal-enter-active,
.placard-modal-leave-active {
  transition: opacity 0.25s ease;
}
.placard-modal-enter-from,
.placard-modal-leave-to {
  opacity: 0;
}
.placard-modal-enter-active .placard-dialog,
.placard-modal-leave-active .placard-dialog {
  transition: transform 0.25s ease;
}
.placard-modal-enter-from .placard-dialog,
.placard-modal-leave-to .placard-dialog {
  transform: translateY(12px) scale(0.98);
}
</style>
