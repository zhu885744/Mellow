<template>
  <div class="admin-dashboard">
    <div class="stat-grid">
      <div v-for="s in stats" :key="s.key" class="stat-card">
        <div class="stat-icon" :style="{ color: s.color }">
          <i :class="s.icon" />
        </div>
        <div class="stat-body">
          <div class="stat-value">
            <span v-if="loading">···</span>
            <span v-else-if="s.error" class="stat-error" :title="s.error">—</span>
            <span v-else>{{ format(s.value) }}</span>
          </div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">欢迎使用 Mellow 管理后台</div>
      <p class="panel-text">
        这里是站点管理的专属后台。左侧菜单包含文章、评论、动态、用户、友链与站点设置等模块，
        上方统计卡片实时读取各控制器的 <code>/count</code> 接口。当前为基础界面搭建阶段，模块页面已就绪，后续将逐步接入数据表格。
      </p>
      <ul class="panel-tips">
        <li><i class="bi bi-check-circle" /> 仅管理员可访问（基于 <code>isAdmin</code> 校验）</li>
        <li><i class="bi bi-check-circle" /> 侧边栏支持移动端折叠 / 桌面端收起</li>
        <li><i class="bi bi-check-circle" /> 统计卡片并行请求各模块数量接口</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { call } from '@/api/request'

// 每个统计项对应一个控制器的 /count 接口
const defs = [
  { key: 'article', label: '文章', icon: 'bi bi-file-earmark-text', color: 'var(--primary)', ctrl: 'article' },
  { key: 'comment', label: '评论', icon: 'bi bi-chat-square-text', color: '#3b82f6', ctrl: 'comment' },
  { key: 'moments', label: '动态', icon: 'bi bi-lightning-charge', color: '#f59e0b', ctrl: 'moments' },
  { key: 'links', label: '友链', icon: 'bi bi-link-45deg', color: '#10b981', ctrl: 'links' },
  { key: 'users', label: '用户', icon: 'bi bi-people', color: '#8b5cf6', ctrl: 'users' },
  { key: 'tags', label: '标签', icon: 'bi bi-tags', color: '#ec4899', ctrl: 'tags' },
  { key: 'pages', label: '页面', icon: 'bi bi-file-earmark', color: '#0ea5e9', ctrl: 'pages' },
  { key: 'banner', label: '轮播', icon: 'bi bi-images', color: '#ef4444', ctrl: 'banner' },
  { key: 'placard', label: '公告', icon: 'bi bi-megaphone', color: '#14b8a6', ctrl: 'placard' }
]

const stats = ref(defs.map((d) => ({ ...d, value: 0, error: '' })))
const loading = ref(false)

function format(n) {
  return typeof n === 'number' ? n.toLocaleString('zh-CN') : n
}

async function loadCounts() {
  loading.value = true
  await Promise.all(
    defs.map(async (d) => {
      const idx = stats.value.findIndex((s) => s.key === d.key)
      try {
        const res = await call(d.ctrl, 'count', { method: 'GET' })
        // count 接口返回结构可能为：
        //   1) { code:200, data: 99 }         —— data 直接是数字（INIS 文档标准）
        //   2) { code:200, data: { count:99 } } —— data 是嵌套对象
        const payload = res?.data
        let count = 0
        if (typeof payload === 'number') {
          count = payload
        } else if (payload && typeof payload === 'object') {
          count = payload.count ?? payload.data ?? 0
        }
        stats.value[idx].value = Number(count) || 0
      } catch (e) {
        stats.value[idx].error = e?.msg || e?.response?.data?.msg || '获取失败'
      }
    })
  )
  loading.value = false
}

onMounted(loadCounts)
</script>

<style scoped>
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.stat-icon {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--bg-muted);
  font-size: 22px;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  min-height: 28px;
}
.stat-error {
  color: var(--text-muted);
  font-weight: 400;
  cursor: help;
}
.stat-label {
  font-size: 13px;
  color: var(--text-muted);
}
.panel {
  padding: 22px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.panel-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
}
.panel-text {
  color: var(--text-soft);
  line-height: 1.7;
  font-size: 14px;
}
.panel-text code {
  background: var(--bg-muted);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
}
.panel-tips {
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.panel-tips li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-soft);
}
.panel-tips i {
  color: var(--primary);
}
.panel-tips code {
  background: var(--bg-muted);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
}
@media (max-width: 768px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
