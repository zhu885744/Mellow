<template>
  <div class="card card-pad">
    <h2 class="block-title">账号安全</h2>

    <div class="security-list">
      <div class="sec-item">
        <div class="sec-info">
          <div class="sec-name">邮箱</div>
          <div class="sec-value">{{ user?.email || '未绑定' }}</div>
        </div>
        <button class="btn btn-sm">更换</button>
      </div>
      <div class="sec-item">
        <div class="sec-info">
          <div class="sec-name">手机号</div>
          <div class="sec-value">{{ user?.phone || '未绑定' }}</div>
        </div>
        <button class="btn btn-sm">更换</button>
      </div>
      <div class="sec-item">
        <div class="sec-info">
          <div class="sec-name">密码</div>
          <div class="sec-value">建议每 3 个月更换一次</div>
        </div>
        <button class="btn btn-sm">修改</button>
      </div>
      <div class="sec-item">
        <div class="sec-info">
          <div class="sec-name">两步验证</div>
          <div class="sec-value">通过邮箱/手机号验证</div>
        </div>
        <span class="enabled">已启用</span>
      </div>
    </div>

    <h2 class="block-title danger-title">账号注销</h2>
    <p class="danger-tip">
      注销账号后，您的所有数据将被永久删除且无法恢复。
    </p>
    <button class="btn btn-danger" @click="confirmDestroy">
      注销我的账号
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { destroy, destroySendCode } from '@/api/users'
import { toast } from '@/utils/toast'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const user = computed(() => userStore.user)
const router = useRouter()

async function confirmDestroy() {
  if (!confirm('注销账号是不可恢复的操作，确定要继续吗？')) return
  // 验证邮箱/手机
  try {
    await destroySendCode()
    toast.info('请输入您收到的验证码')
  } catch {}
  const code = prompt('请输入验证码：')
  if (!code) return
  const password = prompt('请输入您的登录密码：')
  if (!password) return
  try {
    await destroy(code, password)
    userStore.clear()
    toast.success('账号已注销')
    router.replace('/')
  } catch {}
}
</script>

<style scoped>
.block-title {
  font-size: 16px;
  font-weight: 600;
  margin: 24px 0 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-soft);
}
.block-title:first-child {
  margin-top: 0;
}
.danger-title {
  color: var(--danger);
}
.danger-tip {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(217, 84, 77, 0.08);
  border-radius: var(--radius);
}

.security-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sec-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-muted);
  border-radius: var(--radius);
}
.sec-name {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
}
.sec-value {
  font-size: 12px;
  color: var(--text-muted);
}
.enabled {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(108, 154, 77, 0.1);
  color: var(--success);
  border-radius: var(--radius);
  font-size: 12px;
}
</style>