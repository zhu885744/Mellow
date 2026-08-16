<template>
  <div class="card card-pad">
    <h2 class="block-title">每日签到</h2>

    <div class="sign-card">
      <div class="sign-main">
        <div class="sign-title">连续签到</div>
        <div class="sign-count">{{ user?.exp?.continuous_days || 0 }} <span>天</span></div>
        <div class="sign-tip">
          已累计经验值 <strong>{{ user?.exp?.total || 0 }}</strong>
        </div>
        <button class="btn btn-primary btn-lg" :disabled="checked || signing" @click="checkIn">
          {{ checked ? '今日已签到' : (signing ? '签到中...' : '签到 +10') }}
        </button>
      </div>
    </div>

    <h3 class="subtitle">经验值规则</h3>
    <ul class="rule-list">
      <li v-for="r in rules" :key="r.type">
        <span class="rule-name">{{ r.name }}</span>
        <span class="rule-value">+{{ r.value }} / {{ r.limit > 0 ? `每日 ${r.limit} 次` : '无限制' }}</span>
      </li>
    </ul>

    <h3 class="subtitle">活跃榜</h3>
    <ol class="rank-list">
      <li v-for="(u, idx) in rank" :key="u.id" class="rank-item">
        <span :class="['rank-num', `top${idx + 1}`]">{{ idx + 1 }}</span>
        <img :src="u.avatar || defaultAvatar" class="rank-avatar" />
        <span class="rank-name">{{ u.nickname }}</span>
        <span class="rank-exp">{{ u.exp }} EXP</span>
      </li>
    </ol>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { checkIn, checkInStatus } from '@/api/users'
import { call } from '@/api/request'
import { expActive } from '@/api/tags'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'

const userStore = useUserStore()
const user = computed(() => userStore.user)

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23e8e6dd"/></svg>'

const checked = ref(false)
const signing = ref(false)
const rank = ref([])

const rules = ref([
  { type: 'login', name: '每日登录', value: 5, limit: 1 },
  { type: 'check-in', name: '每日签到', value: 10, limit: 1 },
  { type: 'visit', name: '访问文章', value: 1, limit: 10 },
  { type: 'share', name: '分享内容', value: 1, limit: 10 },
  { type: 'moments', name: '发布动态', value: 50, limit: 1 },
  { type: 'article-create', name: '发布文章', value: 5, limit: 10 },
  { type: 'comment-create', name: '发表评论', value: 5, limit: 10 },
  { type: 'article-like', name: '内容获赞', value: 5, limit: 10 },
  { type: 'article-collect', name: '内容被收藏', value: 5, limit: 10 }
])

async function load() {
  try {
    const res = await checkInStatus()
    checked.value = !!res.data?.today
  } catch {}

  try {
    const r = await expActive()
    rank.value = r.data?.slice(0, 10) || []
  } catch {}
}

async function checkInFn() {
  signing.value = true
  try {
    const res = await checkIn()
    toast.success(res.msg || '签到成功 +10 EXP')
    checked.value = true
    // 刷新用户信息
    await userStore.verifyToken(true)
  } catch {} finally {
    signing.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.block-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-soft);
}
.subtitle {
  font-size: 14px;
  font-weight: 600;
  margin: 24px 0 12px;
  color: var(--text);
}

.sign-card {
  background: linear-gradient(135deg, #fdf3e2, #fbe8c8);
  border-radius: var(--radius-lg);
  padding: 32px;
  text-align: center;
}
.sign-title {
  font-size: 13px;
  color: var(--primary-deep);
  margin-bottom: 8px;
}
.sign-count {
  font-size: 48px;
  font-weight: 600;
  color: var(--primary-deep);
  line-height: 1;
}
.sign-count span {
  font-size: 16px;
  color: var(--text-muted);
  font-weight: normal;
  margin-left: 4px;
}
.sign-tip {
  font-size: 13px;
  color: var(--text-muted);
  margin: 12px 0 16px;
}
.sign-tip strong {
  color: var(--primary);
}

.rule-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rule-list li {
  display: flex;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg-muted);
  border-radius: var(--radius);
}
.rule-name { font-size: 13px; }
.rule-value { font-size: 12px; color: var(--primary); font-weight: 500; }

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: var(--bg-muted);
  border-radius: var(--radius);
  font-size: 13px;
}
.rank-num {
  display: inline-flex;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--border);
  color: var(--text-soft);
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
}
.rank-num.top1 { background: #f4c025; color: #fff; }
.rank-num.top2 { background: #b4b4b4; color: #fff; }
.rank-num.top3 { background: #c69464; color: #fff; }
.rank-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}
.rank-name {
  flex: 1;
}
.rank-exp {
  font-size: 12px;
  color: var(--primary-deep);
}
</style>