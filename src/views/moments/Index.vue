<template>
  <div>
    <SectionTitle title="奇思">
      <template #extra>
        <span class="text-muted">{{ total }} 条动态</span>
      </template>
    </SectionTitle>

    <!-- 发布 -->
    <div v-if="userStore.isLogged" class="card card-pad publisher">
      <div class="pub-head">
        <img :src="user?.avatar || defaultAvatar" class="avatar" />
        <span class="name">{{ user?.nickname }}</span>
      </div>
      <textarea
        v-model="newContent"
        class="textarea"
        placeholder="此刻的想法..."
        rows="3"
      />
      <div class="pub-actions">
        <button class="btn btn-primary btn-sm" :disabled="publishing" @click="publish">
          {{ publishing ? '发布中...' : '发布' }}
        </button>
      </div>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载中...
    </div>

    <MomentItem
      v-for="m in moments"
      :key="m.id"
      :moment="m"
      @delete="onDelete"
    />

    <EmptyState v-if="!loading && !moments.length" icon="✨" text="还没有动态" />

    <Pagination
      :current="page"
      :total="total"
      :page-size="pageSize"
      @update:current="(p) => { page = p; load() }"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import SectionTitle from '@/components/SectionTitle.vue'
import MomentItem from '@/components/MomentItem.vue'
import Pagination from '@/components/Pagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { listMoments, createMoment, removeMoment } from '@/api/moments'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { toast } from '@/utils/toast'

const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23e8e6dd"/></svg>'

const moments = ref([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = 15
const newContent = ref('')
const publishing = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await listMoments({
      page: page.value,
      limit: pageSize
    })
    moments.value = res.data?.data || []
    total.value = res.data?.count || 0
  } catch {
    moments.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function publish() {
  if (!newContent.value.trim()) {
    toast.warning('内容不能为空')
    return
  }
  publishing.value = true
  try {
    await createMoment({ content: newContent.value, status: 1, audit: 1 })
    newContent.value = ''
    toast.success('发布成功')
    page.value = 1
    load()
  } catch {} finally {
    publishing.value = false
  }
}

async function onDelete(m) {
  if (!confirm('确定要删除这条动态吗？')) return
  try {
    await removeMoment(String(m.id))
    toast.success('删除成功')
    load()
  } catch {}
}

onMounted(load)
</script>

<style scoped>
.publisher {
  margin-bottom: 16px;
}
.pub-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}
.name {
  font-size: 13px;
  font-weight: 500;
}
.pub-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.loading {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>