<template>
  <div class="nav-node">
    <!--
      目录只作为分组标题，不做成链接：
      前台路由是 /docs/:项目/:目录/:页面，少一段的 /docs/:项目/:目录 没有对应页面，
      做成链接点了就是死链。下面的子文档已经缩进列出了。
    -->
    <div class="nav-group" :class="{ active: isGroupActive }">
      <i class="bi" :class="node.icon || 'bi-folder2'" aria-hidden="true" />
      <span class="nav-text">{{ node.name }}</span>
    </div>

    <div v-if="hasChildren" class="nav-children">
      <NavNode
        v-for="child in node.children || []"
        :key="`g-${child.id}`"
        :node="child"
        :version="version"
      />

      <RouterLink
        v-for="doc in node.docs || []"
        :key="`d-${doc.id}`"
        :to="`/docs/${version}/${node.slug || '-'}/${doc.slug}`"
        class="nav-item nav-item--doc"
        :class="{ active: isDocActive(doc) }"
      >
        <i class="bi bi-file-earmark-text" aria-hidden="true" />
        <span class="nav-text">{{ doc.title }}</span>
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({
  node: { type: Object, required: true },
  version: { type: String, default: 'latest' }
})

const route = useRoute()

const hasChildren = computed(() => {
  const children = props.node.children || []
  const docs = props.node.docs || []
  return children.length > 0 || docs.length > 0
})

const isGroupActive = computed(
  () => route.params.group === props.node.slug
)

function isDocActive(doc) {
  return route.params.slug === doc.slug
}
</script>

<style scoped>
.nav-node {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px 4px;
  font-size: 12px;
  color: var(--text-light);
  letter-spacing: 1px;
}
.nav-group.active {
  color: var(--primary);
}
.nav-group i {
  font-size: 13px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--text-soft);
  text-decoration: none;
  border-radius: var(--radius-sm);
  transition: color 0.2s, background-color 0.2s;
}
.nav-item i {
  flex-shrink: 0;
  font-size: 14px;
  color: var(--text-light);
  transition: color 0.2s;
}
.nav-item:hover {
  color: var(--primary);
  background: var(--bg-muted);
}
.nav-item:hover i {
  color: var(--primary);
}
.nav-item.active {
  color: var(--primary);
  font-weight: 600;
  background: var(--accent-wash);
}
.nav-item.active i {
  color: var(--primary);
}
.nav-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nav-children {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-left: 10px;
  padding-left: 8px;
  border-left: 1px solid var(--border-soft);
}
</style>
