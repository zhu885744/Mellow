<template>
  <div>
    <SectionTitle title="友情链接">
      <template #extra>
        <div class="links-extra">
          <button class="btn btn-sm" @click="openExplain">友链说明</button>
          <button class="btn btn-sm btn-primary" @click="showApply = true">申请友链</button>
        </div>
      </template>
    </SectionTitle>

    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载中...
    </div>

    <div v-else-if="!groups.length" class="card card-pad">
      <EmptyState text="暂无友链分组" />
    </div>

    <div v-else>
      <div v-for="g in groups" :key="g.id" class="link-group">
        <div class="link-grid">
          <a
            v-for="link in (g.list || [])"
            :key="link.id"
            :href="link.url"
            target="_blank"
            rel="noopener"
            class="link-card card card-pad-sm"
          >
            <div class="link-head">
              <div class="link-info">
                <div class="link-name">{{ link.nickname }}</div>
                <div class="link-url">{{ host(link.url) }}</div>
              </div>
            </div>
            <p class="link-desc">{{ link.description || '期待与您的互换链接' }}</p>
          </a>
        </div>
      </div>
    </div>

    <!-- 友链说明弹窗 -->
    <div v-if="showExplain" class="dialog-mask" @click.self="showExplain = false">
      <div class="dialog dialog-lg card card-pad">
        <h3 class="dialog-title">{{ explain?.title || '友链说明' }}</h3>
        <div v-if="explainLoading" class="explain-loading">
          <span class="spinner" /> 加载中...
        </div>
        <div v-else-if="explain" class="markdown-body explain-content" v-html="explainHtml" />
        <EmptyState v-else text="暂无说明" />
        <div class="dialog-actions">
          <button class="btn btn-primary" @click="showExplain = false">我知道了</button>
        </div>
      </div>
    </div>

    <!-- 申请对话框 -->
    <div v-if="showApply" class="dialog-mask" @click.self="showApply = false">
      <div class="dialog card card-pad">
        <h3 class="dialog-title">申请友情链接</h3>
        <div class="form-item">
          <label class="form-label">站点名称 *</label>
          <input v-model="form.nickname" class="input" />
        </div>
        <div class="form-item">
          <label class="form-label">站点链接 *</label>
          <input v-model="form.url" class="input" placeholder="https://" />
        </div>
        <div class="form-item">
          <label class="form-label">站点描述</label>
          <input v-model="form.description" class="input" />
        </div>
        <div class="form-item">
          <label class="form-label">头像 URL</label>
          <input v-model="form.avatar" class="input" />
        </div>
        <div class="dialog-actions">
          <button class="btn" @click="showApply = false">取消</button>
          <button class="btn btn-primary" :disabled="submitting" @click="submit">
            {{ submitting ? '提交中...' : '提交申请' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import SectionTitle from '@/components/SectionTitle.vue'
import EmptyState from '@/components/EmptyState.vue'
import { listLinks, createLink } from '@/api/links'
import { call } from '@/api/request'
import { renderMarkdown } from '@/utils/markdown'
import { toast } from '@/utils/toast'

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/><text x="50%25" y="55%25" text-anchor="middle" font-size="36" fill="%238a8a82">友</text></svg>'

const loading = ref(false)
const groups = ref([])
const showApply = ref(false)
const submitting = ref(false)
const showExplain = ref(false)
const explainLoading = ref(false)
const explain = ref(null)

const explainHtml = computed(() => {
  const c = explain.value?.content || ''
  if (!c) return ''
  // 内容含 HTML 标签时直接渲染，否则按 markdown 渲染
  return /<\/?[a-z][\s\S]*>/i.test(c) ? c : renderMarkdown(c)
})

async function openExplain() {
  showExplain.value = true
  if (explain.value || explainLoading.value) return
  explainLoading.value = true
  try {
    const res = await call('pages', 'one', {
      method: 'GET',
      params: { key: 'links', field: 'id,key,title,content' }
    })
    explain.value = res.data || null
  } catch {
    explain.value = null
  } finally {
    explainLoading.value = false
  }
}

const form = ref({
  nickname: '',
  url: '',
  description: '',
  avatar: '',
  group: 1,
  target: '_blank'
})

async function load() {
  loading.value = true
  try {
    const res = await listLinks({
      page: 1,
      limit: 200,
      where: { audit: 1 },
      field: 'id,nickname,url,description,avatar,group'
    })
    const linksData = res.data?.data || []
    // 按 result.group 分组
    const map = new Map()
    linksData.forEach((link) => {
      const g = link.result?.group || {}
      const gid = g.id ?? 0
      if (!map.has(gid)) {
        map.set(gid, { id: gid, name: g.name || '默认分组', description: g.description || '', list: [] })
      }
      map.get(gid).list.push(link)
    })
    groups.value = [...map.values()]
  } catch {
    groups.value = []
  } finally {
    loading.value = false
  }
}

function host(url) {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

async function submit() {
  if (!form.value.nickname || !form.value.url) {
    toast.warning('请填写完整信息')
    return
  }
  submitting.value = true
  try {
    await createLink(form.value)
    toast.success('申请已提交，等待审核')
    showApply.value = false
    form.value = { nickname: '', url: '', description: '', avatar: '', group: 1, target: '_blank' }
  } catch {} finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.link-group {
  margin-bottom: 24px;
}
.group-title {
  display: flex;
  align-items: center;
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
}
.title-bar {
  width: 4px;
  height: 16px;
  background: var(--primary);
  margin-right: 10px;
  border-radius: 2px;
}
.group-desc {
  margin-left: 12px;
  font-size: 12px;
  font-weight: normal;
  color: var(--text-muted);
}

.link-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.link-card {
  display: block;
  text-decoration: none;
  color: inherit;
  transition: all 0.25s;
}
.link-card:hover {
  transform: translateY(-2px);
  border-color: var(--primary);
}
.link-head {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}
.link-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  background: var(--bg-muted);
}
.link-info {
  flex: 1;
  min-width: 0;
}
.link-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}
.link-url {
  font-size: 11px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.link-desc {
  font-size: 12px;
  color: var(--text-soft);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 4px 0 8px;
  min-height: 32px;
}

.loading {
  padding: 48px;
  text-align: center;
  color: var(--text-muted);
}

.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.links-extra {
  display: flex;
  align-items: center;
  gap: 10px;
}
.dialog {
  width: 100%;
  max-width: 420px;
}
.dialog-lg {
  max-width: 640px;
}
.dialog-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}
.explain-loading {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
}
.explain-content {
  max-height: 50vh;
  overflow-y: auto;
}
/* markdown 排版样式统一使用全局 styles.css 中的 .markdown-body */
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

@media (max-width: 640px) {
  .link-grid {
    grid-template-columns: 1fr;
  }
}
</style>