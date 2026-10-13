<template>
  <div>
    <SectionTitle title="奇思">
      <template #extra>
        <!-- 这里看的是全站动态；只想看「我关注的人」去聚合流（/feed） -->
        <RouterLink to="/feed" class="btn btn-ghost btn-sm">
          <i class="bi bi-people" aria-hidden="true" /> 关注流
        </RouterLink>
        <span class="text-muted">{{ total }} 条动态</span>
      </template>
    </SectionTitle>

    <!-- 发布：表单本体抽在 components/MomentComposer.vue，首页「发布动态」弹窗用的是同一个组件；
         卡片外观（card card-pad）由这里通过 class 提供 -->
    <MomentComposer v-if="userStore.isLogged" class="card card-pad publisher" @published="onPublished" />

    <!-- 列表 -->
    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载中...
    </div>

    <MomentItem
      v-for="m in moments"
      :key="m.id"
      :moment="m"
      @delete="onDelete"
      @refresh="load"
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
import MomentComposer from '@/components/MomentComposer.vue'
import { listMoments, removeMoment } from '@/api/moments'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'

const userStore = useUserStore()

const moments = ref([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = 15
// 发布表单（正文 / 图片 / 附件库 / 位置 / 提交）已抽到 components/MomentComposer.vue，
// 与首页「发布动态」弹窗共用同一份实现，这里不再各写一套。

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

// 发布成功后回到第一页并重新加载（表单清空由 MomentComposer 内部完成）
function onPublished() {
  page.value = 1
  load()
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
/* 发布器自身的样式都在 components/MomentComposer.vue 里（scoped 不会外泄），
   这里只保留调用方给它的卡片间距 */
.loading {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>