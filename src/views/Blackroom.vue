<template>
  <div>
    <SectionTitle title="小黑屋">
      <template #extra>
        <span class="text-muted">共 {{ total }} 条封禁记录</span>
      </template>
    </SectionTitle>

    <p class="blackroom-desc">
      以下用户因违反社区规范被封禁，昵称已做脱敏处理。若你认为封禁有误，可在登录后提交申诉。
    </p>

    <div v-if="loading" class="loading"><span class="spinner" /> 加载中...</div>

    <div v-else-if="!list.length" class="card card-pad">
      <EmptyState text="目前没有用户被关进小黑屋" />
    </div>

    <template v-else>
      <div class="card card-pad">
        <table class="data-table">
          <thead>
            <tr>
              <th>用户</th>
              <th>封禁原因</th>
              <th>限制范围</th>
              <th>时长</th>
              <th>封禁时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>
                <div class="ban-user">
                  <img :src="item.result?.user?.avatar || defaultAvatar" class="ban-avatar" alt="avatar" />
                  <span class="ban-name">{{ item.result?.user?.nickname || '匿名用户' }}</span>
                </div>
              </td>
              <td class="td-desc">{{ item.reason || '未说明' }}</td>
              <td>
                <span v-for="t in (item.result?.ban_types || [])" :key="t.bit" class="type-tag">
                  {{ t.name }}
                </span>
                <span v-if="!(item.result?.ban_types || []).length" class="text-muted">全面封禁</span>
              </td>
              <td class="td-num">{{ durationText(item) }}</td>
              <td>{{ formatDate(item.ban_time) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Pagination
        v-if="total > pageSize"
        :current="page"
        :total="total"
        :page-size="pageSize"
        @update:current="changePage"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SectionTitle from '@/components/SectionTitle.vue'
import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import { getBlackroom } from '@/api/users'
import { formatDate } from '@/utils/time'

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23e8e6dd"/></svg>'

const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const loading = ref(false)

// 封禁时长：0 表示永久
function durationText(item) {
  const d = Number(item.duration) || 0
  return d === 0 ? '永久' : `${d} 天`
}

async function load() {
  loading.value = true
  try {
    const res = await getBlackroom({
      page: page.value,
      limit: pageSize
    })
    list.value = res.data?.data || []
    total.value = res.data?.count || 0
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function changePage(p) {
  if (p < 1 || p === page.value) return
  page.value = p
  load()
}

onMounted(load)
</script>

<style scoped>
.blackroom-desc {
  margin: 0 0 16px;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-soft);
  background: var(--bg-muted);
  border-left: 3px solid var(--danger);
  border-radius: 0 var(--radius) var(--radius) 0;
}
.text-muted {
  color: var(--text-muted);
  font-size: 12px;
}

.loading {
  padding: 48px;
  text-align: center;
  color: var(--text-muted);
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th,
.data-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-soft);
  vertical-align: middle;
}
.data-table thead th {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-muted);
  white-space: nowrap;
}
.data-table tbody tr:last-child td {
  border-bottom: none;
}
.data-table tbody tr:hover {
  background: var(--bg-muted);
}
.data-table .td-num {
  color: var(--danger);
  font-weight: 600;
  white-space: nowrap;
}
.data-table .td-desc {
  color: var(--text-muted);
  max-width: 260px;
}

.ban-user {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ban-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.ban-name {
  font-weight: 600;
  white-space: nowrap;
}
.type-tag {
  display: inline-block;
  margin: 2px 4px 2px 0;
  padding: 1px 8px;
  font-size: 11px;
  border-radius: 999px;
  background: rgba(217, 84, 77, 0.12);
  color: var(--danger);
  white-space: nowrap;
}

@media (max-width: 768px) {
  /* 窄屏隐藏次要列（封禁原因、封禁时间），避免横向溢出 */
  .data-table thead th:nth-child(2),
  .data-table tbody td:nth-child(2),
  .data-table thead th:nth-child(5),
  .data-table tbody td:nth-child(5) {
    display: none;
  }
}
</style>
