<template>
  <div class="config-page">
    <!-- 页面头部 -->
    <SectionTitle title="站点配置">
      <template #extra>
        <span class="text-muted">管理网站全局设置、评论配置、自定义代码</span>
      </template>
    </SectionTitle>

    <!-- 权限检查 -->
    <div v-if="!isAdmin" class="card card-pad">
      <EmptyState icon="bi bi-lock" text="您没有权限访问此页面，请联系管理员" />
    </div>

    <!-- 配置内容 -->
    <template v-else>
      <!-- 标签导航 -->
      <div class="tab-bar">
        <button
          v-for="t in tabs"
          :key="t.key"
          :class="['tab-item', { active: activeTab === t.key }]"
          @click="activeTab = t.key"
        >
          <span class="tab-icon"><i :class="t.icon" /></span>
          {{ t.label }}
        </button>
      </div>

      <div class="tab-panel">
        <!-- ========== 全局设置 ========== -->
        <div v-show="activeTab === 'global'">
          <!-- 网站基本信息 -->
          <div class="section">
            <h3 class="section-title">网站基本信息</h3>
            <div class="field">
              <label class="field-label">网站标题</label>
              <input v-model="globalConfig.title" class="input" placeholder="输入您的网站标题" />
              <div class="field-hint">显示在浏览器标签和网站头部</div>
            </div>
            <div class="field">
              <label class="field-label">网站描述</label>
              <input v-model="globalConfig.description" class="input" placeholder="输入您的网站描述" />
              <div class="field-hint">用于 SEO 和社交媒体分享</div>
            </div>
            <div class="field">
              <label class="field-label">网站关键词</label>
              <input v-model="globalConfig.keyword" class="input" placeholder="输入关键词，用逗号分隔" />
              <div class="field-hint">用于 SEO 优化，多个关键词用逗号分隔</div>
            </div>
            <div class="field">
              <label class="field-label">网站 LOGO</label>
              <input v-model="globalConfig.avatar" class="input" placeholder="输入 LOGO URL" />
              <div class="field-hint">网站的 LOGO 图片</div>
            </div>
            <div class="field">
              <label class="field-label">网站图标</label>
              <input v-model="globalConfig.favicon" class="input" placeholder="输入 favicon URL" />
              <div class="field-hint">浏览器标签显示的图标</div>
            </div>
            <div class="field">
              <label class="field-label">建站日期</label>
              <input type="date" class="input" :value="formatDate(globalConfig.date)" @change="handleDateChange" />
              <div class="field-hint">网站的建立日期</div>
            </div>
          </div>

          <!-- 自定义导航栏 -->
          <div class="section">
            <h3 class="section-title">自定义导航栏</h3>
            <div class="field">
              <label class="field-label">自定义导航链接</label>
              <textarea
                v-model="globalConfig.custom_nav_links"
                class="textarea code-textarea"
                rows="5"
                placeholder="百度一下 || https://baidu.com&#10;腾讯视频 || https://v.qq.com"
              ></textarea>
              <div class="field-hint">
                格式：<code>跳转文字 || 跳转链接</code>（中间使用两个竖杠分隔），一行一个。
              </div>
            </div>
          </div>

          <!-- 备案信息 -->
          <div class="section">
            <h3 class="section-title">备案信息</h3>
            <div class="field">
              <label class="field-label">ICP 备案编号</label>
              <input v-model="globalConfig.copy.code" class="input" placeholder="输入 ICP 备案编号" />
            </div>
            <div class="field">
              <label class="field-label">ICP 备案链接</label>
              <input v-model="globalConfig.copy.link" class="input" placeholder="输入备案链接" />
            </div>
            <div class="field">
              <label class="field-label">公安联网备案编号</label>
              <input v-model="globalConfig.police.code" class="input" placeholder="输入公安联网备案编号" />
            </div>
            <div class="field">
              <label class="field-label">公安备案链接</label>
              <input v-model="globalConfig.police.link" class="input" placeholder="输入公安备案链接" />
            </div>
          </div>

          <!-- 登录协议 -->
          <div class="section">
            <h3 class="section-title">登录协议提示配置</h3>
            <div class="switch-row">
              <div>
                <div class="field-label">启用登录协议提示</div>
                <div class="field-hint">在登录/注册/找回密码弹窗中显示协议同意提示</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="globalConfig.auth_dialog_agreement.enabled" />
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="field" v-if="globalConfig.auth_dialog_agreement.enabled">
              <label class="field-label">用户协议内容</label>
              <textarea v-model="globalConfig.auth_dialog_agreement.user_agreement_content" class="textarea" rows="4"></textarea>
            </div>
            <div class="field" v-if="globalConfig.auth_dialog_agreement.enabled">
              <label class="field-label">隐私协议内容</label>
              <textarea v-model="globalConfig.auth_dialog_agreement.privacy_agreement_content" class="textarea" rows="4"></textarea>
            </div>
          </div>

          <!-- 悬浮按钮 -->
          <div class="section">
            <h3 class="section-title">右侧悬浮按钮设置</h3>
            <div class="switch-row">
              <div>
                <div class="field-label">启用悬浮按钮</div>
                <div class="field-hint">在网站右侧显示悬浮按钮</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="globalConfig.float_buttons.enabled" />
                <span class="switch-slider"></span>
              </label>
            </div>

            <template v-if="globalConfig.float_buttons.enabled">
              <div class="switch-row compact">
                <label class="field-label">显示返回顶部按钮</label>
                <label class="switch">
                  <input type="checkbox" v-model="globalConfig.float_buttons.show_back_to_top" />
                  <span class="switch-slider"></span>
                </label>
              </div>
              <div class="field">
                <label class="field-label">按钮样式</label>
                <select v-model="globalConfig.float_buttons.style" class="input">
                  <option value="rounded">圆角按钮</option>
                  <option value="square">方形按钮</option>
                </select>
              </div>
              <div class="field">
                <label class="field-label">显示位置</label>
                <select v-model="globalConfig.float_buttons.position" class="input">
                  <option value="center">右侧居中</option>
                  <option value="bottom">右侧底部</option>
                </select>
              </div>

              <!-- 按钮管理 -->
              <div class="float-btn-manager">
                <div class="manager-head">
                  <span class="field-label">悬浮按钮管理</span>
                  <button class="btn btn-sm" @click="addFloatButton"><i class="bi bi-plus-lg" /> 添加</button>
                </div>
                <div v-for="(button, index) in globalConfig.float_buttons.buttons" :key="button.id" class="float-btn-item">
                  <div class="float-btn-head">
                    <strong>{{ button.name }}</strong>
                    <div class="float-btn-actions">
                      <button class="btn btn-sm" @click="moveFloatButton(index, 'up')" :disabled="index === 0"><i class="bi bi-arrow-up" /></button>
                      <button class="btn btn-sm" @click="moveFloatButton(index, 'down')" :disabled="index === globalConfig.float_buttons.buttons.length - 1"><i class="bi bi-arrow-down" /></button>
                      <button class="btn btn-sm btn-danger" @click="removeFloatButton(index)">删除</button>
                    </div>
                  </div>
                  <div class="switch-row compact">
                    <label class="field-label">启用</label>
                    <label class="switch">
                      <input type="checkbox" v-model="button.enabled" />
                      <span class="switch-slider"></span>
                    </label>
                  </div>
                  <div class="field">
                    <label class="field-label">按钮名称</label>
                    <input v-model="button.name" class="input" />
                  </div>
                  <div class="field">
                    <label class="field-label">按钮图标</label>
                    <input v-model="button.icon" class="input" placeholder="例如：bi bi-qq" />
                  </div>
                  <div class="field">
                    <label class="field-label">按钮链接</label>
                    <input v-model="button.url" class="input" placeholder="输入按钮链接" />
                  </div>
                  <div class="field">
                    <label class="field-label">按钮简介</label>
                    <input v-model="button.tooltip" class="input" placeholder="鼠标悬停时显示" />
                  </div>
                  <div class="field">
                    <label class="field-label">图片链接</label>
                    <input v-model="button.image_url" class="input" placeholder="鼠标移到此处的图片" />
                    <div class="field-hint">设置此处后，按钮链接将失效</div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <div class="save-actions">
            <button class="btn btn-primary" :disabled="saving" @click="saveGlobalConfig">
              {{ saving ? '保存中...' : '保存全局设置' }}
            </button>
            <button class="btn" :disabled="saving" @click="resetGlobalConfig">重置</button>
          </div>
        </div>

        <!-- ========== 评论设置 ========== -->
        <div v-show="activeTab === 'comment'">
          <div class="section">
            <h3 class="section-title">全局设置</h3>
            <div class="switch-row">
              <div>
                <div class="field-label">启用全局评论功能</div>
                <div class="field-hint">关闭后，所有文章的评论模块将完全不显示</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="commentConfig.enabled" />
                <span class="switch-slider"></span>
              </label>
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">速率限制</h3>
            <div class="switch-row">
              <div>
                <div class="field-label">启用速率限制</div>
                <div class="field-hint">防止频繁评论</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="commentConfig.rate_limit.enabled" />
                <span class="switch-slider"></span>
              </label>
            </div>
            <template v-if="commentConfig.rate_limit.enabled">
              <div class="field">
                <label class="field-label">最大评论数（次）</label>
                <input type="number" v-model.number="commentConfig.rate_limit.max_count" class="input" min="1" max="100" />
              </div>
              <div class="field">
                <label class="field-label">时间窗口（秒）</label>
                <input type="number" v-model.number="commentConfig.rate_limit.time_window" class="input" min="1" max="3600" />
              </div>
            </template>
          </div>

          <div class="section">
            <h3 class="section-title">评论长度</h3>
            <div class="field">
              <label class="field-label">最大长度（字）</label>
              <input type="number" v-model.number="commentConfig.max_length" class="input" min="1" max="10000" />
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">内容要求</h3>
            <div class="switch-row compact">
              <label class="field-label">要求评论内容包含中文</label>
              <label class="switch">
                <input type="checkbox" v-model="commentConfig.require_chinese" />
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="switch-row compact">
              <label class="field-label">启用敏感词过滤</label>
              <label class="switch">
                <input type="checkbox" v-model="commentConfig.sensitive_filter" />
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="field" v-if="commentConfig.sensitive_filter">
              <label class="field-label">敏感词列表</label>
              <textarea v-model="commentConfig.sensitive_words" class="textarea" rows="3" placeholder="多个敏感词用「，」分隔"></textarea>
            </div>
          </div>

          <div class="section">
            <h3 class="section-title">邮件通知</h3>
            <div class="switch-row">
              <div>
                <div class="field-label">启用邮件通知</div>
                <div class="field-hint">评论时发送邮件通知</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="commentConfig.email_notify.enabled" />
                <span class="switch-slider"></span>
              </label>
            </div>
            <template v-if="commentConfig.email_notify.enabled">
              <div class="field">
                <label class="field-label">重试次数（次）</label>
                <input type="number" v-model.number="commentConfig.email_notify.retry_count" class="input" min="1" max="10" />
              </div>
              <div class="field">
                <label class="field-label">重试间隔（秒）</label>
                <input type="number" v-model.number="commentConfig.email_notify.retry_interval" class="input" min="1" max="60" />
              </div>
            </template>
          </div>

          <div class="save-actions">
            <button class="btn btn-primary" :disabled="saving" @click="saveCommentConfig">
              {{ saving ? '保存中...' : '保存评论设置' }}
            </button>
            <button class="btn" :disabled="saving" @click="resetCommentConfig">重置</button>
          </div>
        </div>

        <!-- ========== 文章设置 ========== -->
        <div v-show="activeTab === 'article'">
          <div class="section">
            <h3 class="section-title">打赏设置</h3>
            <div class="switch-row">
              <div>
                <div class="field-label">启用打赏功能</div>
                <div class="field-hint">开启或关闭文章打赏功能</div>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="globalConfig.reward.enabled" />
                <span class="switch-slider"></span>
              </label>
            </div>
            <div class="field">
              <label class="field-label">微信收款码</label>
              <input v-model="globalConfig.reward.wechat" class="input" placeholder="输入微信收款码图片链接" />
            </div>
            <div class="field">
              <label class="field-label">支付宝收款码</label>
              <input v-model="globalConfig.reward.alipay" class="input" placeholder="输入支付宝收款码图片链接" />
            </div>
          </div>

          <div class="save-actions">
            <button class="btn btn-primary" :disabled="saving" @click="saveGlobalConfig">
              {{ saving ? '保存中...' : '保存文章设置' }}
            </button>
          </div>
        </div>

        <!-- ========== 自定义代码 ========== -->
        <div v-show="activeTab === 'custom'">
          <div class="section">
            <h3 class="section-title">CSS 代码</h3>
            <div class="field">
              <textarea v-model="customCodeConfig.css" class="textarea code-textarea" rows="5" placeholder="自定义 CSS 样式，会全局生效"></textarea>
            </div>
          </div>
          <div class="section">
            <h3 class="section-title">JavaScript 代码</h3>
            <div class="field">
              <textarea v-model="customCodeConfig.js" class="textarea code-textarea" rows="5" placeholder="自定义 JavaScript 脚本，会在页面加载时执行"></textarea>
            </div>
          </div>
          <div class="section">
            <h3 class="section-title">头部 HTML 代码</h3>
            <div class="field">
              <textarea v-model="customCodeConfig.header" class="textarea code-textarea" rows="4" placeholder="会被插入到 HTML 的 head 标签中"></textarea>
            </div>
          </div>
          <div class="section">
            <h3 class="section-title">底部 HTML 代码</h3>
            <div class="field">
              <textarea v-model="customCodeConfig.footer" class="textarea code-textarea" rows="4" placeholder="会被插入到 HTML 的 body 标签末尾"></textarea>
            </div>
          </div>
          <div class="section">
            <h3 class="section-title">网站统计代码</h3>
            <div class="field">
              <textarea v-model="customCodeConfig.analytics" class="textarea code-textarea" rows="4" placeholder="会被插入到 HTML 的 body 标签末尾"></textarea>
            </div>
          </div>

          <div class="save-actions">
            <button class="btn btn-primary" :disabled="saving" @click="saveCustomCodeConfig">
              {{ saving ? '保存中...' : '保存自定义代码' }}
            </button>
            <button class="btn" :disabled="saving" @click="resetCustomCodeConfig">重置</button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import SectionTitle from '@/components/SectionTitle.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getConfig, saveConfig } from '@/api/config'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import { isAdmin as helperIsAdmin } from '@/utils/helper'

const userStore = useUserStore()

const CONFIG_KEY = 'Mellow_functions'
const COMMENT_KEY = 'COMMENT'

// 配置缓存
let cachedFunctionsConfig = null
let cachedFunctionsTime = 0
const CACHE_EXPIRE = 5 * 60 * 1000

async function getFunctionsConfig() {
  const now = Date.now()
  if (cachedFunctionsConfig && (now - cachedFunctionsTime) < CACHE_EXPIRE) {
    return cachedFunctionsConfig
  }
  const res = await getConfig(CONFIG_KEY)
  if (res.code === 200 && res.data) {
    cachedFunctionsConfig = res.data.json || {}
    cachedFunctionsTime = now
    return cachedFunctionsConfig
  }
  return {}
}

function clearFunctionsCache() {
  cachedFunctionsConfig = null
  cachedFunctionsTime = 0
}

// Tab
const tabs = [
  { key: 'global', label: '全局设置', icon: 'bi bi-globe' },
  { key: 'comment', label: '评论设置', icon: 'bi bi-chat-dots' },
  { key: 'article', label: '文章设置', icon: 'bi bi-file-text' },
  { key: 'custom', label: '自定义代码', icon: 'bi bi-gear' }
]
const activeTab = ref('global')

// 管理员判断
const isAdmin = computed(() => helperIsAdmin(userStore.user))

// 评论配置
const commentConfig = ref({
  enabled: true,
  rate_limit: { enabled: true, max_count: 5, time_window: 60 },
  max_length: 500,
  require_chinese: true,
  sensitive_filter: true,
  sensitive_words: '广告,开发,开发',
  email_notify: { enabled: true, retry_count: 3, retry_interval: 5 }
})

// 全局配置
const globalConfig = ref({
  title: '',
  description: '',
  keyword: '',
  avatar: '',
  favicon: '',
  date: Math.floor(Date.now() / 1000).toString(),
  custom_nav_links: '',
  copy: { code: '', link: 'https://beian.miit.gov.cn/#/Integrated/index' },
  police: { code: '', link: 'https://beian.mps.gov.cn/#/query/webSearch' },
  auth_dialog_agreement: {
    enabled: true,
    user_agreement_content: '用户协议\n\n欢迎使用我们的服务！请仔细阅读以下用户协议。\n\n1. 服务条款\n您必须年满13周岁才能使用本服务。\n\n2. 账户安全\n您有责任维护账户密码的安全性。\n\n3. 用户行为规范\n请勿发布违法或侵犯他人权益的内容。',
    privacy_agreement_content: '隐私协议\n\n我们重视您的隐私。\n\n1. 收集的信息\n我们可能收集您的账户信息和使用数据。\n\n2. 信息使用\n用于提供和改进服务。\n\n3. 信息共享\n我们不会向第三方出售您的个人信息。'
  },
  float_buttons: {
    enabled: true,
    style: 'rounded',
    position: 'center',
    show_back_to_top: true,
    buttons: []
  },
  reward: { enabled: true, wechat: '', alipay: '' }
})

const customCodeConfig = ref({ css: '', js: '', header: '', footer: '', analytics: '' })
const saving = ref(false)

// 格式化日期
function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(parseInt(timestamp) * 1000)
  return date.toISOString().split('T')[0]
}

function handleDateChange(event) {
  const dateStr = event.target.value
  globalConfig.value.date = dateStr
    ? Math.floor(new Date(dateStr).getTime() / 1000).toString()
    : Math.floor(Date.now() / 1000).toString()
}

// 获取评论配置
async function getCommentConfig() {
  try {
    const res = await getConfig(COMMENT_KEY)
    if (res.code === 200 && res.data) {
      const config = res.data.json || {}
      commentConfig.value = {
        enabled: config.enabled === 1,
        rate_limit: {
          enabled: config.rate_limit?.enabled === 1,
          max_count: config.rate_limit?.max_count || 5,
          time_window: config.rate_limit?.time_window || 60
        },
        max_length: config.max_length || 500,
        require_chinese: config.require_chinese === 1,
        sensitive_filter: config.sensitive_filter === 1,
        sensitive_words: config.sensitive_words?.join(',') || '广告,开发,开发',
        email_notify: {
          enabled: config.email_notify?.enabled === 1,
          retry_count: config.email_notify?.retry_count || 3,
          retry_interval: config.email_notify?.retry_interval || 5
        }
      }
    }
  } catch {
    toast.error('获取评论配置失败')
  }
}

// 获取全局配置
async function getGlobalConfig() {
  try {
    const config = await getFunctionsConfig()
    globalConfig.value = {
      title: config.title || '',
      description: config.description || '',
      keyword: config.keyword || '',
      avatar: config.avatar || '',
      favicon: config.favicon || '',
      date: config.date || Math.floor(Date.now() / 1000).toString(),
      custom_nav_links: config.custom_nav_links || '',
      copy: { code: config.copy?.code || '', link: config.copy?.link || 'http://beian.miit.gov.cn/' },
      police: { code: config.police?.code || '', link: config.police?.link || 'https://beian.mps.gov.cn/#/query/webSearch' },
      auth_dialog_agreement: {
        enabled: config.auth_dialog_agreement?.enabled !== false,
        user_agreement_content: config.auth_dialog_agreement?.user_agreement_content || globalConfig.value.auth_dialog_agreement.user_agreement_content,
        privacy_agreement_content: config.auth_dialog_agreement?.privacy_agreement_content || globalConfig.value.auth_dialog_agreement.privacy_agreement_content
      },
      float_buttons: {
        enabled: config.float_buttons?.enabled !== false,
        style: config.float_buttons?.style || 'rounded',
        position: config.float_buttons?.position || 'center',
        show_back_to_top: config.float_buttons?.show_back_to_top !== false,
        buttons: config.float_buttons?.buttons || []
      },
      reward: {
        enabled: config.reward?.enabled !== false,
        wechat: config.reward?.wechat || '',
        alipay: config.reward?.alipay || ''
      }
    }
  } catch {
    toast.error('获取全局配置失败')
  }
}

// 获取自定义代码配置
async function getCustomCodeConfig() {
  try {
    const config = await getFunctionsConfig()
    customCodeConfig.value = config.custom_code || { css: '', js: '', header: '', footer: '', analytics: '' }
  } catch {
    toast.error('获取自定义代码配置失败')
  }
}

// 保存评论配置
async function saveCommentConfig() {
  saving.value = true
  try {
    const c = commentConfig.value
    const config = {
      enabled: c.enabled ? 1 : 0,
      rate_limit: {
        enabled: c.rate_limit.enabled ? 1 : 0,
        max_count: c.rate_limit.max_count || 5,
        time_window: c.rate_limit.time_window || 60
      },
      max_length: c.max_length || 500,
      require_chinese: c.require_chinese ? 1 : 0,
      sensitive_filter: c.sensitive_filter ? 1 : 0,
      sensitive_words: c.sensitive_words.split(',').map((w) => w.trim()).filter(Boolean),
      email_notify: {
        enabled: c.email_notify.enabled ? 1 : 0,
        retry_count: c.email_notify.retry_count || 3,
        retry_interval: c.email_notify.retry_interval || 5
      }
    }
    await saveConfig(COMMENT_KEY, config)
    toast.success('评论设置保存成功')
  } catch {
    toast.error('评论设置保存失败')
  } finally {
    saving.value = false
  }
}

// 保存全局配置
async function saveGlobalConfig() {
  saving.value = true
  try {
    await saveConfig(CONFIG_KEY, globalConfig.value)
    toast.success('全局配置保存成功')
    clearFunctionsCache()
  } catch {
    toast.error('全局配置保存失败')
  } finally {
    saving.value = false
  }
}

// 保存自定义代码
async function saveCustomCodeConfig() {
  saving.value = true
  try {
    const current = await getFunctionsConfig()
    const updated = { ...current, custom_code: customCodeConfig.value }
    await saveConfig(CONFIG_KEY, updated)
    toast.success('自定义代码保存成功')
    clearFunctionsCache()
  } catch {
    toast.error('自定义代码保存失败')
  } finally {
    saving.value = false
  }
}

// 悬浮按钮管理
function addFloatButton() {
  const buttons = globalConfig.value.float_buttons.buttons
  const newId = buttons.length > 0 ? Math.max(...buttons.map((b) => b.id)) + 1 : 1
  buttons.push({ id: newId, name: '新按钮', icon: 'bi bi-link', url: '', tooltip: '', enabled: true, content: '' })
}

function removeFloatButton(index) {
  globalConfig.value.float_buttons.buttons.splice(index, 1)
}

function moveFloatButton(index, direction) {
  const buttons = globalConfig.value.float_buttons.buttons
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= buttons.length) return
  const temp = buttons[index]
  buttons[index] = buttons[target]
  buttons[target] = temp
}

// 重置
function resetCommentConfig() {
  commentConfig.value = {
    enabled: true,
    rate_limit: { enabled: true, max_count: 5, time_window: 60 },
    max_length: 500,
    require_chinese: true,
    sensitive_filter: true,
    sensitive_words: '广告,开发,开发',
    email_notify: { enabled: true, retry_count: 3, retry_interval: 5 }
  }
}

function resetGlobalConfig() {
  globalConfig.value = {
    title: '',
    description: '',
    keyword: '',
    avatar: '',
    favicon: '',
    date: Math.floor(Date.now() / 1000).toString(),
    custom_nav_links: '',
    copy: { code: '', link: 'http://beian.miit.gov.cn/' },
    police: { code: '', link: 'https://beian.mps.gov.cn/#/query/webSearch' },
    auth_dialog_agreement: { enabled: true, user_agreement_content: '', privacy_agreement_content: '' },
    float_buttons: { enabled: true, style: 'rounded', position: 'center', show_back_to_top: true, buttons: [] },
    reward: { enabled: true, wechat: '', alipay: '' }
  }
}

function resetCustomCodeConfig() {
  customCodeConfig.value = { css: '', js: '', header: '', footer: '', analytics: '' }
}

onMounted(async () => {
  await userStore.verifyToken(true)
  if (isAdmin.value) {
    await Promise.all([getCommentConfig(), getGlobalConfig(), getCustomCodeConfig()])
  }
})
</script>

<style scoped>
.config-page {
  padding-bottom: 32px;
}

.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
  padding: 4px;
  overflow-x: auto;
}
.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-soft);
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-item:hover {
  color: var(--primary);
}
.tab-item.active {
  background: var(--primary);
  color: #fff;
  font-weight: 500;
}
.tab-icon {
  font-size: 14px;
}

.tab-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  padding: 24px;
}

.section {
  margin-bottom: 28px;
}
.section:last-child {
  margin-bottom: 0;
}
.section-title {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-soft);
}
.section-title::before {
  content: '';
  width: 3px;
  height: 14px;
  background: var(--primary);
  border-radius: 2px;
  margin-right: 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}
.field:last-child {
  margin-bottom: 0;
}
.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-soft);
}
.field-hint {
  font-size: 12px;
  color: var(--text-muted);
}
.field-hint code {
  background: var(--bg-muted);
  padding: 1px 5px;
  border-radius: 3px;
  color: var(--primary-deep);
  font-size: 11px;
}

.code-textarea {
  font-family: var(--font-mono);
  font-size: 12px;
}

/* 开关 */
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  background: var(--bg-muted);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
  margin-bottom: 14px;
}
.switch-row.compact {
  padding: 8px 14px;
  min-height: auto;
}
.switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  flex-shrink: 0;
  cursor: pointer;
}
.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}
.switch-slider {
  position: absolute;
  inset: 0;
  background: var(--border);
  border-radius: 22px;
  transition: 0.2s;
}
.switch-slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 3px;
  top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: 0.2s;
}
.switch input:checked + .switch-slider {
  background: var(--primary);
}
.switch input:checked + .switch-slider::before {
  transform: translateX(18px);
}

/* 悬浮按钮管理 */
.float-btn-manager {
  margin-top: 8px;
}
.manager-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.float-btn-item {
  background: var(--bg-soft);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
  padding: 14px;
  margin-bottom: 12px;
}
.float-btn-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.float-btn-head strong {
  font-size: 13px;
}
.float-btn-actions {
  display: flex;
  gap: 4px;
}

.save-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px solid var(--border-soft);
}
</style>
