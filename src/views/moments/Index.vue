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
      <EmojiEditor
        v-model="newContent"
        placeholder="此刻的想法..."
      >
        <template #extra>
          <button
            type="button"
            class="pub-img-btn"
            :disabled="uploading"
            @click="triggerPick"
          >
            <i class="bi bi-image" /> {{ uploading ? '上传中...' : '图片' }}
          </button>
        </template>
      </EmojiEditor>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        class="file-input"
        @change="onPick"
      />
      <div v-if="newImages.length" class="pub-images">
        <div v-for="(img, i) in newImages" :key="img" class="pub-img-item">
          <img :src="img" class="pub-img" alt="预览" />
          <button type="button" class="img-remove" title="移除" @click="removeImage(i)">
            <i class="bi bi-x-lg" />
          </button>
        </div>
      </div>
      <div class="pub-actions">
        <button class="btn btn-primary btn-sm" :disabled="publishing || uploading" @click="publish">
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
import EmojiEditor from '@/components/EmojiEditor.vue'
import { listMoments, createMoment, removeMoment, uploadMomentImages } from '@/api/moments'
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
const fileInput = ref(null)
const newImages = ref([])
const uploading = ref(false)

function triggerPick() {
  fileInput.value?.click()
}

// 选择图片后立即上传（attachment/batch），成功后记录 URL 用于预览
async function onPick(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  if (!files.length || uploading.value) return
  if (newImages.value.length + files.length > 9) {
    toast.warning('最多上传 9 张图片')
    return
  }
  const valid = files.filter((file) => {
    if (file.size > 50 * 1024 * 1024) {
      toast.warning(`图片「${file.name}」超过 50MB 限制`)
      return false
    }
    if (!file.type.startsWith('image/')) {
      toast.warning(`文件「${file.name}」不是图片`)
      return false
    }
    return true
  })
  if (!valid.length) return
  uploading.value = true
  try {
    const fd = new FormData()
    valid.forEach((file) => fd.append('files', file))
    const res = await uploadMomentImages(fd)
    const results = res.data?.results || []
    const urls = results
      .filter((r) => r.status !== 'fail' && r.full_url)
      .map((r) => r.full_url)
    newImages.value.push(...urls)
    if (results.some((r) => r.status === 'fail')) {
      toast.warning('部分图片上传失败')
    }
  } catch {
    /* 拦截器已提示 */
  } finally {
    uploading.value = false
  }
}

function removeImage(i) {
  newImages.value.splice(i, 1)
}

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
    await createMoment({
      content: newContent.value,
      images: newImages.value.join(','),
      status: 1,
      audit: 1
    })
    newContent.value = ''
    newImages.value = []
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
.file-input {
  display: none;
}
.pub-img-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  font-size: 13px;
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  border: 1px solid var(--border);
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.2s;
}
.pub-img-btn:hover:not(:disabled) {
  color: var(--primary);
  border-color: var(--primary);
  background: rgba(184, 153, 104, 0.08);
}
.pub-img-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.pub-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.pub-img-item {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border-soft);
}
.pub-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.img-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.img-remove:hover {
  background: var(--danger);
}
.pub-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 8px;
}
.loading {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
</style>