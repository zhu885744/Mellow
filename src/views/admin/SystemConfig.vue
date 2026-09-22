<template>
  <div class="system-config">
    <!-- 概览 -->
    <section class="card card-pad panel">
      <header class="panel-head">
        <div>
          <h2 class="block-title">系统配置</h2>
          <p class="block-desc">
            安全策略、认证、缓存、存储、短信等运行时配置；修改后立即生效，无需重启（存储配置会自动重载）
          </p>
        </div>
        <div class="head-actions">
          <button class="btn btn-sm" :disabled="loading" @click="loadAll">
            <i class="bi bi-arrow-clockwise" /> 重新加载
          </button>
        </div>
      </header>

      <p v-if="loadError" class="stat-error">
        <i class="bi bi-exclamation-circle" aria-hidden="true" />
        <span>部分配置读取失败，可点击「重新加载」重试</span>
      </p>
    </section>

    <div class="cfg-layout">
      <!-- 模块导航 -->
      <nav class="cfg-nav" aria-label="配置模块">
        <button
          v-for="m in modules"
          :key="m.key"
          type="button"
          class="cfg-nav-item"
          :class="{ active: tab === m.key }"
          @click="tab = m.key"
        >
          <i :class="m.icon" />
          <span>{{ m.label }}</span>
        </button>
      </nav>

      <div class="cfg-body">
        <div v-if="loading" class="loading"><span class="spinner" /> 加载中...</div>

        <template v-else>
          <!-- ============ 安全 ============ -->
          <template v-if="tab === 'security'">
            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">API KEY</h3>
                  <p class="cfg-desc">开启后调用接口需携带有效密钥，密钥在「安全 → 接口密钥」中管理</p>
                </div>
              </header>
              <div class="form-item">
                <label class="form-label">启用校验</label>
                <SelectMenu v-model="cfg.apiKey.value" variant="field" :options="ON_OFF" />
                <p class="form-hint">开启时若没有任何可用密钥，系统会自动创建一个</p>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-primary btn-sm" :disabled="isSaving('apiKey')" @click="saveApiKey">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">QPS 限流</h3>
                  <p class="cfg-desc">限制接口访问频率：单接口与全局分别限流，超出阈值的请求会被拒绝</p>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">启用限流</label>
                  <SelectMenu v-model="cfg.qps.value" variant="field" :options="ON_OFF" />
                </div>
                <div class="form-item">
                  <label class="form-label">单接口速率（次/秒）</label>
                  <input v-model="cfg.qps.json.point" class="input" type="number" min="1" step="1" />
                </div>
                <div class="form-item">
                  <label class="form-label">全局速率（次/秒）</label>
                  <input v-model="cfg.qps.json.global" class="input" type="number" min="1" step="1" />
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-primary btn-sm" :disabled="isSaving('qps')" @click="saveQps">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">自动 IP 黑名单</h3>
                  <p class="cfg-desc">
                    触发 QPS 阈值达到指定次数后，自动把该 IP 加入黑名单；同时用于限制特定 IP 的接口访问频率
                  </p>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">启用自动封禁</label>
                  <SelectMenu v-model="cfg.qpsBlock.value" variant="field" :options="ON_OFF" />
                </div>
                <div class="form-item">
                  <label class="form-label">触发次数</label>
                  <input v-model="cfg.qpsBlock.json.count" class="input" type="number" min="1" step="1" />
                </div>
                <div class="form-item">
                  <label class="form-label">封禁时长（秒，支持表达式）</label>
                  <input v-model="cfg.qpsBlock.json.second" class="input" type="text" placeholder="如 60 * 60" />
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-primary btn-sm" :disabled="isSaving('qpsBlock')" @click="saveQpsBlock">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">封禁通知</h3>
                  <p class="cfg-desc">自动封禁触发时发送通知（邮件 / Webhook），留空表示不使用该渠道</p>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">启用通知</label>
                  <SelectMenu v-model="cfg.qpsNotify.value" variant="field" :options="ON_OFF" />
                </div>
                <div class="form-item">
                  <label class="form-label">接收邮箱</label>
                  <input v-model="cfg.qpsNotify.json.email" class="input" type="text" placeholder="可选" />
                </div>
                <div class="form-item">
                  <label class="form-label">Webhook 地址</label>
                  <input v-model="cfg.qpsNotify.json.webhook" class="input" type="text" placeholder="可选" />
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-primary btn-sm" :disabled="isSaving('qpsNotify')" @click="saveQpsNotify">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>
          </template>

          <!-- ============ 内容配置（文章 / 动态 / 独立页面，三份结构相同）============ -->
          <section v-else-if="CONTENT_KEYS[tab]" class="card card-pad">
            <header class="cfg-head">
              <div>
                <h3 class="cfg-title">{{ CONTENT_KEYS[tab].title }}</h3>
                <p class="cfg-desc">
                  编辑器、审核与评论开关；审核开启后，新建内容默认进入待审核
                </p>
              </div>
            </header>
            <div class="form-grid">
              <div class="form-item">
                <label class="form-label">编辑器</label>
                <SelectMenu
                  v-model="cfg.content[CONTENT_KEYS[tab].key].editor"
                  variant="field"
                  :options="EDITOR_OPTIONS"
                />
                <p class="form-hint">Mellow 后台编辑器统一使用 Markdown，该值供其它端读取</p>
              </div>
              <div class="form-item">
                <label class="form-label">内容审核</label>
                <SelectMenu
                  v-model="cfg.content[CONTENT_KEYS[tab].key].audit"
                  variant="field"
                  :options="ON_OFF"
                />
              </div>
              <div class="form-item">
                <label class="form-label">允许评论</label>
                <SelectMenu
                  v-model="cfg.content[CONTENT_KEYS[tab].key].comment.allow"
                  variant="field"
                  :options="COMMENT_ALLOW_OPTIONS"
                />
                <p class="form-hint">设为「禁止」时覆盖内容自身设置，一律禁止</p>
              </div>
              <div class="form-item">
                <label class="form-label">显示评论</label>
                <SelectMenu
                  v-model="cfg.content[CONTENT_KEYS[tab].key].comment.show"
                  variant="field"
                  :options="COMMENT_SHOW_OPTIONS"
                />
                <p class="form-hint">设为「隐藏」时覆盖内容自身设置，整块不展示</p>
              </div>
            </div>
            <div class="cfg-foot">
              <button class="btn btn-primary btn-sm" :disabled="isSaving(`content_${tab}`)" @click="saveContent(tab)">
                <i class="bi bi-check2" /> 保存
              </button>
            </div>
          </section>

          <!-- ============ 评论配置 ============ -->
          <section v-else-if="tab === 'comment'" class="card card-pad">
            <header class="cfg-head">
              <div>
                <h3 class="cfg-title">评论配置</h3>
                <p class="cfg-desc">评论开关、限流、内容校验、敏感词与邮件通知</p>
              </div>
            </header>

            <div class="form-grid">
              <div class="form-item">
                <label class="form-label">允许评论</label>
                <SelectMenu v-model="cfg.comment.allow" variant="field" :options="ON_OFF" />
              </div>
              <div class="form-item">
                <label class="form-label">最大长度（字符）</label>
                <input v-model="cfg.comment.max_length" class="input" type="number" min="0" step="1" />
              </div>
              <div class="form-item">
                <label class="form-label">限流</label>
                <SelectMenu v-model="cfg.comment.rate_limit.enabled" variant="field" :options="ON_OFF" />
              </div>
              <div class="form-item">
                <label class="form-label">时间窗口（秒）</label>
                <input v-model="cfg.comment.rate_limit.time_window" class="input" type="number" min="1" step="1" />
              </div>
              <div class="form-item">
                <label class="form-label">窗口内最大条数</label>
                <input v-model="cfg.comment.rate_limit.max_count" class="input" type="number" min="1" step="1" />
              </div>
              <div class="form-item">
                <label class="form-label">必须包含中文</label>
                <SelectMenu v-model="cfg.comment.require_chinese" variant="field" :options="ON_OFF" />
              </div>
              <div class="form-item">
                <label class="form-label">敏感词过滤</label>
                <SelectMenu v-model="cfg.comment.sensitive_filter" variant="field" :options="ON_OFF" />
              </div>
              <div class="form-item">
                <label class="form-label">邮件通知</label>
                <SelectMenu v-model="cfg.comment.email_notify.enabled" variant="field" :options="ON_OFF" />
              </div>
              <div class="form-item">
                <label class="form-label">通知重试次数</label>
                <input v-model="cfg.comment.email_notify.retry_count" class="input" type="number" min="0" step="1" />
              </div>
              <div class="form-item">
                <label class="form-label">重试间隔（秒）</label>
                <input v-model="cfg.comment.email_notify.retry_interval" class="input" type="number" min="1" step="1" />
              </div>
            </div>

            <div class="form-item">
              <label class="form-label">敏感词</label>
              <textarea
                v-model="cfg.sensitiveText"
                class="textarea"
                rows="4"
                placeholder="一行一个，也可用逗号分隔"
              />
              <p class="form-hint">命中任意一个词即拒绝该条评论</p>
            </div>

            <div class="cfg-foot">
              <button class="btn btn-primary btn-sm" :disabled="isSaving('comment')" @click="saveComment">
                <i class="bi bi-check2" /> 保存
              </button>
            </div>
          </section>

          <!-- ============ 分页限制 ============ -->
          <section v-else-if="tab === 'page'" class="card card-pad">
            <header class="cfg-head">
              <div>
                <h3 class="cfg-title">分页限制</h3>
                <p class="cfg-desc">限制列表接口单次查询的最大条数，避免一次拉取过多数据拖慢接口</p>
              </div>
            </header>
            <div class="form-grid">
              <div class="form-item">
                <label class="form-label">启用限制</label>
                <SelectMenu v-model="cfg.pageLimit.value" variant="field" :options="ON_OFF" />
              </div>
              <div class="form-item">
                <label class="form-label">单次最大条数</label>
                <input v-model="cfg.pageLimit.text" class="input" type="number" min="1" step="1" />
              </div>
            </div>
            <div class="cfg-foot">
              <button class="btn btn-primary btn-sm" :disabled="isSaving('pageLimit')" @click="savePageLimit">
                <i class="bi bi-check2" /> 保存
              </button>
            </div>
          </section>

          <!-- ============ JWT 认证 ============ -->
          <section v-else-if="tab === 'jwt'" class="card card-pad">
            <header class="cfg-head">
              <div>
                <h3 class="cfg-title">JWT 认证</h3>
                <p class="cfg-desc">JSON Web Token 用户认证服务；修改密钥会使已签发的 Token 立即失效</p>
              </div>
            </header>
            <div class="form-grid">
              <div class="form-item">
                <label class="form-label">密钥（key）</label>
                <input v-model="toml.jwt.key" class="input" type="text" placeholder="必填" />
                <p class="form-hint">管理员可查看明文；修改后已签发的 Token 会立即失效</p>
              </div>
              <div class="form-item">
                <label class="form-label">有效期（秒，支持表达式）</label>
                <input v-model="toml.jwt.expire" class="input" type="text" placeholder="如 15 * 24 * 60 * 60" />
              </div>
              <div class="form-item">
                <label class="form-label">签发者（issuer）</label>
                <input v-model="toml.jwt.issuer" class="input" type="text" placeholder="必填" />
              </div>
              <div class="form-item">
                <label class="form-label">主题（subject）</label>
                <input v-model="toml.jwt.subject" class="input" type="text" placeholder="必填" />
              </div>
            </div>
            <div class="cfg-foot">
              <button class="btn btn-primary btn-sm" :disabled="isSaving('jwt')" @click="saveJwt">
                <i class="bi bi-check2" /> 保存
              </button>
            </div>
          </section>

          <!-- ============ 注册 ============ -->
          <section v-else-if="tab === 'register'" class="card card-pad">
            <header class="cfg-head">
              <div>
                <h3 class="cfg-title">开放注册</h3>
                <p class="cfg-desc">关闭后仅管理员可创建账号，注册接口会拒绝新用户提交</p>
              </div>
            </header>
            <div class="form-item">
              <label class="form-label">允许用户自行注册</label>
              <SelectMenu v-model="cfg.register.value" variant="field" :options="ON_OFF" />
            </div>
            <div class="cfg-foot">
              <button class="btn btn-primary btn-sm" :disabled="isSaving('register')" @click="saveRegister">
                <i class="bi bi-check2" /> 保存
              </button>
            </div>
          </section>

          <!-- ============ 缓存 ============ -->
          <template v-else-if="tab === 'cache'">
            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">缓存设置</h3>
                  <p class="cfg-desc">选择缓存驱动并配置参数；切换驱动后建议执行连通性测试</p>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">启用缓存</label>
                  <SelectMenu v-model="toml.cache.openValue" variant="field" :options="ON_OFF" />
                </div>
                <div class="form-item">
                  <label class="form-label">默认驱动</label>
                  <SelectMenu v-model="toml.cache.default" variant="field" :options="CACHE_DRIVERS" />
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-primary btn-sm" :disabled="isSaving('cacheDefault')" @click="saveCacheDefault">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">Redis</h3>
                  <p class="cfg-desc">需要 Redis 服务可达</p>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">主机</label>
                  <input v-model="toml.cache.redis.host" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">端口</label>
                  <input v-model="toml.cache.redis.port" class="input" type="number" step="1" />
                </div>
                <div class="form-item">
                  <label class="form-label">数据库</label>
                  <input v-model="toml.cache.redis.database" class="input" type="number" step="1" />
                </div>
                <div class="form-item">
                  <label class="form-label">密码</label>
                  <input v-model="toml.cache.redis.password" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">前缀</label>
                  <input v-model="toml.cache.redis.prefix" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">有效期（秒，支持表达式）</label>
                  <input v-model="toml.cache.redis.expire" class="input" type="text" />
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-sm" :disabled="isSaving('testRedis')" @click="testRedis">
                  <i class="bi bi-plug" /> 测试连接
                </button>
                <button class="btn btn-primary btn-sm" :disabled="isSaving('cacheRedis')" @click="saveCacheRedis">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">文件缓存</h3>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">存储路径</label>
                  <input v-model="toml.cache.file.path" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">前缀</label>
                  <input v-model="toml.cache.file.prefix" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">有效期（秒，支持表达式）</label>
                  <input v-model="toml.cache.file.expire" class="input" type="text" />
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-primary btn-sm" :disabled="isSaving('cacheFile')" @click="saveCacheFile">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">内存缓存</h3>
                </div>
              </header>
              <div class="form-item">
                <label class="form-label">有效期（秒，支持表达式）</label>
                <input v-model="toml.cache.ram.expire" class="input" type="text" />
              </div>
              <div class="cfg-foot">
                <button class="btn btn-primary btn-sm" :disabled="isSaving('cacheRam')" @click="saveCacheRam">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>
          </template>

          <!-- ============ 存储 ============ -->
          <template v-else-if="tab === 'storage'">
            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">默认存储</h3>
                  <p class="cfg-desc">决定附件上传使用的驱动；切换后会自动重载存储配置</p>
                </div>
              </header>
              <div class="form-item">
                <label class="form-label">默认驱动</label>
                <SelectMenu v-model="toml.storage.default" variant="field" :options="STORAGE_DRIVERS" />
              </div>
              <div class="cfg-foot">
                <button class="btn btn-primary btn-sm" :disabled="isSaving('storageDefault')" @click="saveStorageDefault">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">本地存储</h3>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">访问域名</label>
                  <input v-model="toml.storage.local.domain" class="input" type="text" placeholder="如 https://example.com" />
                </div>
                <div class="form-item">
                  <label class="form-label">存储路径</label>
                  <input v-model="toml.storage.local.path" class="input" type="text" />
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-primary btn-sm" :disabled="isSaving('storageLocal')" @click="saveStorageLocal">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">阿里云 OSS</h3>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">AccessKey ID</label>
                  <input v-model="toml.storage.oss.access_key_id" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">AccessKey Secret</label>
                  <input v-model="toml.storage.oss.access_key_secret" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">Endpoint</label>
                  <input v-model="toml.storage.oss.endpoint" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">Bucket</label>
                  <input v-model="toml.storage.oss.bucket" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">访问域名</label>
                  <input v-model="toml.storage.oss.domain" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">路径前缀</label>
                  <input v-model="toml.storage.oss.path" class="input" type="text" />
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-sm" :disabled="isSaving('testOss')" @click="testStorage('oss')">
                  <i class="bi bi-plug" /> 测试连接
                </button>
                <button class="btn btn-primary btn-sm" :disabled="isSaving('storageOss')" @click="saveStorageOss">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">腾讯云 COS</h3>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">SecretId</label>
                  <input v-model="toml.storage.cos.secret_id" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">SecretKey</label>
                  <input v-model="toml.storage.cos.secret_key" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">AppId</label>
                  <input v-model="toml.storage.cos.app_id" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">Bucket</label>
                  <input v-model="toml.storage.cos.bucket" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">地域</label>
                  <input v-model="toml.storage.cos.region" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">访问域名</label>
                  <input v-model="toml.storage.cos.domain" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">路径前缀</label>
                  <input v-model="toml.storage.cos.path" class="input" type="text" />
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-sm" :disabled="isSaving('testCos')" @click="testStorage('cos')">
                  <i class="bi bi-plug" /> 测试连接
                </button>
                <button class="btn btn-primary btn-sm" :disabled="isSaving('storageCos')" @click="saveStorageCos">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">七牛云 Kodo</h3>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">AccessKey</label>
                  <input v-model="toml.storage.kodo.access_key" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">SecretKey</label>
                  <input v-model="toml.storage.kodo.secret_key" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">Bucket</label>
                  <input v-model="toml.storage.kodo.bucket" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">地域</label>
                  <input v-model="toml.storage.kodo.region" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">访问域名</label>
                  <input v-model="toml.storage.kodo.domain" class="input" type="text" />
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-sm" :disabled="isSaving('testKodo')" @click="testStorage('kodo')">
                  <i class="bi bi-plug" /> 测试连接
                </button>
                <button class="btn btn-primary btn-sm" :disabled="isSaving('storageKodo')" @click="saveStorageKodo">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">附件上传限制</h3>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">允许的后缀</label>
                  <input v-model="toml.storage.attachment.allow_extensions" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">单文件最大（KB）</label>
                  <input v-model="toml.storage.attachment.max_file_size" class="input" type="number" min="1" step="1" />
                </div>
                <div class="form-item">
                  <label class="form-label">并发上限</label>
                  <input v-model="toml.storage.attachment.concurrent_limit" class="input" type="number" min="1" step="1" />
                </div>
                <div class="form-item">
                  <label class="form-label">每分钟上限</label>
                  <input v-model="toml.storage.attachment.limit_per_minute" class="input" type="number" min="0" step="1" />
                </div>
                <div class="form-item">
                  <label class="form-label">每小时上限</label>
                  <input v-model="toml.storage.attachment.limit_per_hour" class="input" type="number" min="0" step="1" />
                </div>
                <div class="form-item">
                  <label class="form-label">每天上限</label>
                  <input v-model="toml.storage.attachment.limit_per_day" class="input" type="number" min="0" step="1" />
                </div>
                <div class="form-item">
                  <label class="form-label">每周上限</label>
                  <input v-model="toml.storage.attachment.limit_per_week" class="input" type="number" min="0" step="1" />
                </div>
                <div class="form-item">
                  <label class="form-label">每月上限</label>
                  <input v-model="toml.storage.attachment.limit_per_month" class="input" type="number" min="0" step="1" />
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-primary btn-sm" :disabled="isSaving('storageAttachment')" @click="saveStorageAttachment">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>
          </template>

          <!-- ============ 短信 ============ -->
          <template v-else-if="tab === 'sms'">
            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">短信驱动</h3>
                  <p class="cfg-desc">分别指定「邮件验证码」与「短信验证码」使用的渠道</p>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">默认驱动</label>
                  <SelectMenu v-model="toml.sms.drive.default" variant="field" :options="SMS_DRIVERS" />
                </div>
                <div class="form-item">
                  <label class="form-label">邮件渠道</label>
                  <SelectMenu v-model="toml.sms.drive.email" variant="field" :options="SMS_DRIVERS" />
                </div>
                <div class="form-item">
                  <label class="form-label">短信渠道</label>
                  <SelectMenu v-model="toml.sms.drive.sms" variant="field" :options="SMS_DRIVERS" />
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-primary btn-sm" :disabled="isSaving('smsDrive')" @click="saveSmsDrive">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">邮件发送</h3>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">SMTP 主机</label>
                  <input v-model="toml.sms.email.host" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">端口</label>
                  <input v-model="toml.sms.email.port" class="input" type="number" step="1" />
                </div>
                <div class="form-item">
                  <label class="form-label">账号</label>
                  <input v-model="toml.sms.email.account" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">密码 / 授权码</label>
                  <input v-model="toml.sms.email.password" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">发件人昵称</label>
                  <input v-model="toml.sms.email.nickname" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">邮件签名</label>
                  <input v-model="toml.sms.email.sign_name" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">测试收件人</label>
                  <input v-model="test.email" class="input" type="text" placeholder="仅用于测试，不会保存" />
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-sm" :disabled="isSaving('testSmsEmail')" @click="testSmsEmail">
                  <i class="bi bi-envelope" /> 发送测试邮件
                </button>
                <button class="btn btn-primary btn-sm" :disabled="isSaving('smsEmail')" @click="saveSmsEmail">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">阿里云短信</h3>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">AccessKey ID</label>
                  <input v-model="toml.sms.aliyun.access_key_id" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">AccessKey Secret</label>
                  <input v-model="toml.sms.aliyun.access_key_secret" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">Endpoint</label>
                  <input v-model="toml.sms.aliyun.endpoint" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">短信签名</label>
                  <input v-model="toml.sms.aliyun.sign_name" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">模板 Code</label>
                  <input v-model="toml.sms.aliyun.verify_code" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">测试手机号</label>
                  <input v-model="test.phone" class="input" type="text" placeholder="仅用于测试，不会保存" />
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-sm" :disabled="isSaving('testSmsAliyun')" @click="testSmsAliyun">
                  <i class="bi bi-phone" /> 发送测试短信
                </button>
                <button class="btn btn-primary btn-sm" :disabled="isSaving('smsAliyun')" @click="saveSmsAliyun">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">阿里云号码认证</h3>
                  <p class="cfg-desc">用于号码认证类验证码，模板参数由服务端填充</p>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">AccessKey ID</label>
                  <input v-model="toml.sms.aliyunNumberVerify.access_key_id" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">AccessKey Secret</label>
                  <input v-model="toml.sms.aliyunNumberVerify.access_key_secret" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">Endpoint</label>
                  <input v-model="toml.sms.aliyunNumberVerify.endpoint" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">短信签名</label>
                  <input v-model="toml.sms.aliyunNumberVerify.sign_name" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">模板 Code</label>
                  <input v-model="toml.sms.aliyunNumberVerify.template_code" class="input" type="text" />
                </div>
              </div>
              <div class="cfg-foot">
                <button
                  class="btn btn-primary btn-sm"
                  :disabled="isSaving('smsAliyunNumberVerify')"
                  @click="saveSmsAliyunNumberVerify"
                >
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">腾讯云短信</h3>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">SecretId</label>
                  <input v-model="toml.sms.tencent.secret_id" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">SecretKey</label>
                  <input v-model="toml.sms.tencent.secret_key" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">Endpoint</label>
                  <input v-model="toml.sms.tencent.endpoint" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">SDK AppId</label>
                  <input v-model="toml.sms.tencent.sms_sdk_app_id" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">短信签名</label>
                  <input v-model="toml.sms.tencent.sign_name" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">模板 ID</label>
                  <input v-model="toml.sms.tencent.verify_code" class="input" type="text" />
                </div>
                <div class="form-item">
                  <label class="form-label">地域</label>
                  <input v-model="toml.sms.tencent.region" class="input" type="text" />
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-sm" :disabled="isSaving('testSmsTencent')" @click="testSmsTencent">
                  <i class="bi bi-phone" /> 发送测试短信
                </button>
                <button class="btn btn-primary btn-sm" :disabled="isSaving('smsTencent')" @click="saveSmsTencent">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>
          </template>

          <!-- ============ 通知与日志 ============ -->
          <template v-else-if="tab === 'notify'">
            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">消息保留</h3>
                  <p class="cfg-desc">超过保留天数的站内消息会被清理</p>
                </div>
              </header>
              <div class="form-item">
                <label class="form-label">保留天数</label>
                <input v-model="toml.notification.retention_days" class="input" type="number" min="1" step="1" />
              </div>
              <div class="cfg-foot">
                <button class="btn btn-primary btn-sm" :disabled="isSaving('notification')" @click="saveNotification">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">日志</h3>
                  <p class="cfg-desc">后端未提供日志配置的保存接口，此处仅供查看</p>
                </div>
              </header>
              <dl class="readonly-list">
                <div class="readonly-row">
                  <dt>启用</dt>
                  <dd>{{ toml.log.on ? '是' : '否' }}</dd>
                </div>
                <div class="readonly-row">
                  <dt>单文件体积（MB）</dt>
                  <dd>{{ toml.log.size }}</dd>
                </div>
                <div class="readonly-row">
                  <dt>保留天数</dt>
                  <dd>{{ toml.log.age }}</dd>
                </div>
                <div class="readonly-row">
                  <dt>备份数量</dt>
                  <dd>{{ toml.log.backups }}</dd>
                </div>
              </dl>
            </section>
          </template>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * 系统配置（/admin/system）
 *
 * 配置来源分两类：
 * 1. config 表（key / value / json / text）—— 安全策略、分页限制、注册开关；
 * 2. toml 文件（经 /api/toml 读写）—— JWT、缓存、存储、短信、通知、日志。
 *
 * 后端要点（app/api/controller/toml.go、app/api/middleware/*、app/model/config.go）：
 * - SYSTEM_API_KEY / SYSTEM_QPS / SYSTEM_QPS_BLOCK / SYSTEM_QPS_NOTIFY / SYSTEM_PAGE_LIMIT /
 *   ALLOW_REGISTER 均为 config 表记录，value 是 "0"/"1" 字符串；
 * - 内容配置 ARTICLE / MOMENTS / PAGE 结构相同（editor / audit / comment{allow,show}），
 *   分别由 article.go、moments.go、pages.go 的 config() 读取，audit 决定新建内容的默认审核态；
 *   评论配置 COMMENT 结构独立（allow / rate_limit / max_length / require_chinese /
 *   sensitive_filter / sensitive_words / email_notify），由 comment.go 的 config("comment") 读取；
 *   这几份配置的 json 即配置本体，保存时整体覆盖；
 * - QPS_BLOCK 的 second 是表达式字符串（如 "60 * 60"），会自动封禁触发阈值的 IP；
 * - 密钥类字段读取时已脱敏为 `****` 串，**原样回传**即表示不修改（后端会还原真实值）；
 * - storage 不带 name 读取时不脱敏，因此这里按分组分别读取；
 * - 日志配置后端只读（没有保存接口）。
 */
import { ref, reactive, onMounted } from 'vue'
import SelectMenu from '@/components/SelectMenu.vue'
import { getConfig, saveSystemConfig } from '@/api/config'
import {
  saveToml,
  testToml,
  getTomlLog,
  getTomlNotification,
  getTomlSms,
  getTomlCache,
  getTomlJwt,
  getStorageGroup
} from '@/api/toml'
import { toast } from '@/utils/toast'

// 开关选项（config.value 是字符串）
const ON_OFF = [
  { value: '1', label: '开启' },
  { value: '0', label: '关闭' }
]

const CACHE_DRIVERS = [
  { value: 'redis', label: 'Redis' },
  { value: 'file', label: '文件' },
  { value: 'ram', label: '内存' }
]

const STORAGE_DRIVERS = [
  { value: 'local', label: '本地' },
  { value: 'oss', label: '阿里云 OSS' },
  { value: 'cos', label: '腾讯云 COS' },
  { value: 'kodo', label: '七牛云 Kodo' }
]

const SMS_DRIVERS = [
  { value: 'email', label: '邮件' },
  { value: 'aliyun', label: '阿里云短信' },
  { value: 'aliyun_number_verify', label: '阿里云号码认证' },
  { value: 'tencent', label: '腾讯云短信' }
]

const modules = [
  { key: 'security', label: '安全', icon: 'bi bi-shield-lock' },
  { key: 'article', label: '文章配置', icon: 'bi bi-file-earmark-text' },
  { key: 'moments', label: '动态配置', icon: 'bi bi-chat-square-text' },
  { key: 'pagesCfg', label: '独立页面配置', icon: 'bi bi-window' },
  { key: 'comment', label: '评论配置', icon: 'bi bi-chat-dots' },
  { key: 'page', label: '分页限制', icon: 'bi bi-list-ol' },
  { key: 'jwt', label: 'JWT 认证', icon: 'bi bi-key' },
  { key: 'register', label: '注册', icon: 'bi bi-person-plus' },
  { key: 'cache', label: '缓存', icon: 'bi bi-database' },
  { key: 'storage', label: '存储', icon: 'bi bi-hdd' },
  { key: 'sms', label: '短信', icon: 'bi bi-send' },
  { key: 'notify', label: '通知与日志', icon: 'bi bi-bell' }
]

// 内容配置的 key 与展示名（PAGE / ARTICLE / MOMENTS 三份结构相同）
const CONTENT_KEYS = {
  article: { key: 'ARTICLE', title: '文章配置' },
  moments: { key: 'MOMENTS', title: '动态配置' },
  pagesCfg: { key: 'PAGE', title: '独立页面配置' }
}

const EDITOR_OPTIONS = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'tinymce', label: 'TinyMCE' }
]

// 内容级评论开关与后端 / 前台口径一致：1 允许/显示、2 禁止/隐藏
// （0 是内容自身的「继承」，总开关不需要该选项）
const COMMENT_ALLOW_OPTIONS = [
  { value: '1', label: '允许' },
  { value: '2', label: '禁止' }
]
const COMMENT_SHOW_OPTIONS = [
  { value: '1', label: '显示' },
  { value: '2', label: '隐藏' }
]

const tab = ref('security')
const loading = ref(false)
const loadError = ref(false)
// 每个保存动作独立的 loading 标记，避免互相阻塞
const saving = reactive({})

// ===== config 表配置 =====
const cfg = reactive({
  apiKey: { value: '0' },
  qps: { value: '1', json: { point: 15, global: 50 } },
  qpsBlock: { value: '0', json: { count: 3, second: '60 * 60' } },
  qpsNotify: { value: '0', json: { email: '', webhook: '' } },
  pageLimit: { value: '1', text: '50' },
  register: { value: '1' },
  // 内容配置：ARTICLE / MOMENTS / PAGE 三份结构相同（editor / audit / comment）
  content: {
    ARTICLE: { editor: 'tinymce', audit: '1', comment: { allow: '1', show: '1' } },
    MOMENTS: { editor: 'tinymce', audit: '1', comment: { allow: '1', show: '1' } },
    PAGE: { editor: 'tinymce', audit: '1', comment: { allow: '1', show: '1' } }
  },
  // 评论配置：COMMENT（结构与内容配置不同，字段更多）
  comment: {
    allow: '1',
    rate_limit: { enabled: '1', max_count: 5, time_window: 60 },
    max_length: 500,
    require_chinese: '1',
    sensitive_filter: '1',
    email_notify: { enabled: '1', retry_count: 3, retry_interval: 5 }
  },
  // 敏感词按「一行一个」编辑，保存时拆成数组
  sensitiveText: ''
})

// ===== toml 配置 =====
const toml = reactive({
  jwt: { key: '', expire: '', issuer: '', subject: '' },
  cache: {
    openValue: '0',
    default: 'file',
    redis: { host: '', port: 6379, database: 0, password: '', prefix: '', expire: '' },
    file: { path: '', prefix: '', expire: '' },
    ram: { expire: '' }
  },
  storage: {
    default: 'local',
    local: { domain: '', path: '' },
    oss: { access_key_id: '', access_key_secret: '', endpoint: '', bucket: '', domain: '', path: '' },
    cos: { secret_id: '', secret_key: '', app_id: '', bucket: '', region: '', domain: '', path: '' },
    kodo: { access_key: '', secret_key: '', bucket: '', region: '', domain: '' },
    attachment: {
      allow_extensions: '',
      max_file_size: 0,
      concurrent_limit: 0,
      limit_per_minute: 0,
      limit_per_hour: 0,
      limit_per_day: 0,
      limit_per_week: 0,
      limit_per_month: 0
    }
  },
  sms: {
    drive: { default: 'email', email: 'email', sms: 'email' },
    email: { host: '', port: 465, account: '', password: '', nickname: '', sign_name: '' },
    aliyun: { access_key_id: '', access_key_secret: '', endpoint: '', sign_name: '', verify_code: '' },
    aliyunNumberVerify: { access_key_id: '', access_key_secret: '', endpoint: '', sign_name: '', template_code: '' },
    tencent: { secret_id: '', secret_key: '', endpoint: '', sms_sdk_app_id: '', sign_name: '', verify_code: '', region: '' }
  },
  notification: { retention_days: 30 },
  log: { on: false, size: 0, age: 0, backups: 0 }
})

// 测试用字段（不落库）
const test = reactive({ email: '', phone: '' })

// ---------- 工具 ----------
function isSaving(key) {
  return !!saving[key]
}

async function withSaving(key, fn) {
  saving[key] = true
  try {
    await fn()
  } finally {
    saving[key] = false
  }
}

// config 的 json 字段可能是字符串，也可能是后端解码后的对象
function parseJson(raw, fallback = {}) {
  if (!raw) return { ...fallback }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return typeof parsed === 'object' && parsed !== null ? parsed : { ...fallback }
    } catch {
      return { ...fallback }
    }
  }
  if (typeof raw === 'object') return raw
  return { ...fallback }
}

// 把对象里的值统一成字符串，便于输入框绑定
function toText(value, fallback = '') {
  if (value === null || value === undefined) return fallback
  return String(value)
}

// ---------- 读取 ----------
async function readConfig(key) {
  // 配置项可能尚未初始化，失败时不弹全局提示
  const res = await getConfig(key, { silent: true })
  return res?.data && typeof res.data === 'object' ? res.data : null
}

// 内容配置（ARTICLE / MOMENTS / PAGE）结构相同：editor / audit / comment{allow,show}
function readContentConfig(raw) {
  const json = parseJson(raw?.json, {})
  const comment = json.comment && typeof json.comment === 'object' ? json.comment : {}
  return {
    editor: toText(json.editor, 'tinymce'),
    audit: toText(json.audit, '1'),
    comment: {
      allow: toText(comment.allow, '1'),
      show: toText(comment.show, '1')
    }
  }
}

// 评论配置（COMMENT）：结构独立，敏感词转成「一行一个」的文本便于编辑
function readCommentConfig(raw) {
  const json = parseJson(raw?.json, {})
  const rate = json.rate_limit && typeof json.rate_limit === 'object' ? json.rate_limit : {}
  const email = json.email_notify && typeof json.email_notify === 'object' ? json.email_notify : {}
  const words = Array.isArray(json.sensitive_words) ? json.sensitive_words : []
  return {
    allow: toText(json.allow, '1'),
    rate_limit: {
      enabled: toText(rate.enabled, '1'),
      max_count: Number(rate.max_count || 5),
      time_window: Number(rate.time_window || 60)
    },
    max_length: Number(json.max_length || 500),
    require_chinese: toText(json.require_chinese, '1'),
    sensitive_filter: toText(json.sensitive_filter, '1'),
    email_notify: {
      enabled: toText(email.enabled, '1'),
      retry_count: Number(email.retry_count || 3),
      retry_interval: Number(email.retry_interval || 5)
    },
    words
  }
}

async function loadConfigs() {
  const [apiKey, qps, block, notify, pageLimit, register, article, moments, pages, comment] = await Promise.all([
    readConfig('SYSTEM_API_KEY'),
    readConfig('SYSTEM_QPS'),
    readConfig('SYSTEM_QPS_BLOCK'),
    readConfig('SYSTEM_QPS_NOTIFY'),
    readConfig('SYSTEM_PAGE_LIMIT'),
    readConfig('ALLOW_REGISTER'),
    readConfig('ARTICLE'),
    readConfig('MOMENTS'),
    readConfig('PAGE'),
    readConfig('COMMENT')
  ])

  if (apiKey) cfg.apiKey.value = toText(apiKey.value, '0')
  if (qps) {
    cfg.qps.value = toText(qps.value, '1')
    cfg.qps.json = { point: 15, global: 50, ...parseJson(qps.json, {}) }
  }
  if (block) {
    cfg.qpsBlock.value = toText(block.value, '0')
    cfg.qpsBlock.json = { count: 3, second: '60 * 60', ...parseJson(block.json, {}) }
  }
  if (notify) {
    cfg.qpsNotify.value = toText(notify.value, '0')
    cfg.qpsNotify.json = { email: '', webhook: '', ...parseJson(notify.json, {}) }
  }
  if (pageLimit) {
    cfg.pageLimit.value = toText(pageLimit.value, '1')
    cfg.pageLimit.text = toText(pageLimit.text, '50')
  }
  if (register) cfg.register.value = toText(register.value, '1')

  if (article) cfg.content.ARTICLE = readContentConfig(article)
  if (moments) cfg.content.MOMENTS = readContentConfig(moments)
  if (pages) cfg.content.PAGE = readContentConfig(pages)
  if (comment) {
    const parsed = readCommentConfig(comment)
    cfg.comment.allow = parsed.allow
    cfg.comment.rate_limit = parsed.rate_limit
    cfg.comment.max_length = parsed.max_length
    cfg.comment.require_chinese = parsed.require_chinese
    cfg.comment.sensitive_filter = parsed.sensitive_filter
    cfg.comment.email_notify = parsed.email_notify
    cfg.sensitiveText = parsed.words.join('\n')
  }
}

async function loadTomlAll() {
  const [jwt, cache, sms, notification, log] = await Promise.all([
    getTomlJwt().catch(() => null),
    getTomlCache().catch(() => null),
    getTomlSms().catch(() => null),
    getTomlNotification().catch(() => null),
    getTomlLog().catch(() => null)
  ])

  // crypt 不带 name 返回 { jwt: {...} }，带 name=jwt 返回内层；两种都兼容
  const jwtData = jwt?.data?.jwt || jwt?.data || {}
  toml.jwt = {
    key: toText(jwtData.key),
    expire: toText(jwtData.expire),
    issuer: toText(jwtData.issuer),
    subject: toText(jwtData.subject)
  }

  const cacheData = cache?.data || {}
  toml.cache.openValue = cacheData.open ? '1' : '0'
  toml.cache.default = toText(cacheData.default, 'file')
  toml.cache.redis = { host: '', port: 6379, database: 0, password: '', prefix: '', expire: '', ...(cacheData.redis || {}) }
  toml.cache.file = { path: '', prefix: '', expire: '', ...(cacheData.file || {}) }
  toml.cache.ram = { expire: '', ...(cacheData.ram || {}) }

  const smsData = sms?.data || {}
  toml.sms.drive = { default: 'email', email: 'email', sms: 'email', ...(smsData.drive || {}) }
  toml.sms.email = { host: '', port: 465, account: '', password: '', nickname: '', sign_name: '', ...(smsData.email || {}) }
  toml.sms.aliyun = { access_key_id: '', access_key_secret: '', endpoint: '', sign_name: '', verify_code: '', ...(smsData.aliyun || {}) }
  toml.sms.aliyunNumberVerify = {
    access_key_id: '',
    access_key_secret: '',
    endpoint: '',
    sign_name: '',
    template_code: '',
    ...(smsData.aliyun_number_verify || {})
  }
  toml.sms.tencent = {
    secret_id: '',
    secret_key: '',
    endpoint: '',
    sms_sdk_app_id: '',
    sign_name: '',
    verify_code: '',
    region: '',
    ...(smsData.tencent || {})
  }

  toml.notification.retention_days = Number(notification?.data?.retention_days || 30)
  const logData = log?.data || {}
  toml.log = {
    on: !!logData.on,
    size: Number(logData.size || 0),
    age: Number(logData.age || 0),
    backups: Number(logData.backups || 0)
  }

  // 存储按分组读取（不带 name 的接口不脱敏，不能直接用于表单回填）
  const names = ['local', 'oss', 'cos', 'kodo', 'attachment']
  const groups = await Promise.all(names.map((name) => getStorageGroup(name).catch(() => null)))
  const picked = {}
  groups.forEach((res, index) => {
    picked[names[index]] = res?.data || {}
  })
  toml.storage.default = toText(picked.local?.default || picked.oss?.default || 'local', 'local')
  toml.storage.local = { domain: '', path: '', ...(picked.local || {}) }
  toml.storage.oss = { access_key_id: '', access_key_secret: '', endpoint: '', bucket: '', domain: '', path: '', ...(picked.oss || {}) }
  toml.storage.cos = { secret_id: '', secret_key: '', app_id: '', bucket: '', region: '', domain: '', path: '', ...(picked.cos || {}) }
  toml.storage.kodo = { access_key: '', secret_key: '', bucket: '', region: '', domain: '', ...(picked.kodo || {}) }
  toml.storage.attachment = {
    allow_extensions: '',
    max_file_size: 0,
    concurrent_limit: 0,
    limit_per_minute: 0,
    limit_per_hour: 0,
    limit_per_day: 0,
    limit_per_week: 0,
    limit_per_month: 0,
    ...(picked.attachment || {})
  }
}

async function loadAll() {
  loading.value = true
  loadError.value = false
  try {
    await Promise.all([loadConfigs(), loadTomlAll()])
  } catch {
    loadError.value = true
    toast.error('配置加载失败')
  } finally {
    loading.value = false
  }
}

// ---------- config 保存 ----------
async function saveConfigItem(key, payload, okText) {
  await withSaving(key, async () => {
    await saveSystemConfig({ key: payload.key, ...payload.data })
    toast.success(okText)
  })
}

function saveApiKey() {
  return saveConfigItem('apiKey', { key: 'SYSTEM_API_KEY', data: { value: cfg.apiKey.value } }, '已保存')
}

function saveQps() {
  return saveConfigItem(
    'qps',
    {
      key: 'SYSTEM_QPS',
      data: {
        value: cfg.qps.value,
        json: { point: Number(cfg.qps.json.point), global: Number(cfg.qps.json.global) }
      }
    },
    '已保存'
  )
}

function saveQpsBlock() {
  return saveConfigItem(
    'qpsBlock',
    {
      key: 'SYSTEM_QPS_BLOCK',
      data: {
        value: cfg.qpsBlock.value,
        json: { count: Number(cfg.qpsBlock.json.count), second: String(cfg.qpsBlock.json.second) }
      }
    },
    '已保存'
  )
}

function saveQpsNotify() {
  return saveConfigItem(
    'qpsNotify',
    {
      key: 'SYSTEM_QPS_NOTIFY',
      data: {
        value: cfg.qpsNotify.value,
        json: { email: cfg.qpsNotify.json.email, webhook: cfg.qpsNotify.json.webhook }
      }
    },
    '已保存'
  )
}

function savePageLimit() {
  return saveConfigItem(
    'pageLimit',
    { key: 'SYSTEM_PAGE_LIMIT', data: { value: cfg.pageLimit.value, text: String(cfg.pageLimit.text) } },
    '已保存'
  )
}

function saveRegister() {
  return saveConfigItem('register', { key: 'ALLOW_REGISTER', data: { value: cfg.register.value } }, '已保存')
}

/**
 * 保存内容配置（ARTICLE / MOMENTS / PAGE）
 * 这三份的 json 就是配置本体且结构固定，因此直接整体覆盖；
 * 保存后重新读取，避免把数字/字符串差异留在表单里。
 */
async function saveContent(moduleKey) {
  const target = CONTENT_KEYS[moduleKey]
  if (!target) return
  const item = cfg.content[target.key]

  await withSaving(`content_${moduleKey}`, async () => {
    await saveSystemConfig({
      key: target.key,
      json: {
        editor: item.editor,
        audit: Number(item.audit),
        comment: {
          allow: Number(item.comment.allow),
          show: Number(item.comment.show)
        }
      }
    })
    toast.success('已保存')
    const fresh = await readConfig(target.key)
    if (fresh) cfg.content[target.key] = readContentConfig(fresh)
  })
}

/** 保存评论配置：敏感词按「一行一个 / 逗号分隔」解析成数组 */
async function saveComment() {
  const words = String(cfg.sensitiveText || '')
    .split(/[\n,，]/)
    .map((w) => w.trim())
    .filter(Boolean)

  await withSaving('comment', async () => {
    await saveSystemConfig({
      key: 'COMMENT',
      json: {
        allow: Number(cfg.comment.allow),
        rate_limit: {
          enabled: Number(cfg.comment.rate_limit.enabled),
          max_count: Number(cfg.comment.rate_limit.max_count),
          time_window: Number(cfg.comment.rate_limit.time_window)
        },
        max_length: Number(cfg.comment.max_length),
        require_chinese: Number(cfg.comment.require_chinese),
        sensitive_filter: Number(cfg.comment.sensitive_filter),
        sensitive_words: words,
        email_notify: {
          enabled: Number(cfg.comment.email_notify.enabled),
          retry_count: Number(cfg.comment.email_notify.retry_count),
          retry_interval: Number(cfg.comment.email_notify.retry_interval)
        }
      }
    })
    toast.success('已保存')
    const fresh = await readConfig('COMMENT')
    if (fresh) {
      const parsed = readCommentConfig(fresh)
      cfg.sensitiveText = parsed.words.join('\n')
    }
  })
}

// ---------- toml 保存 ----------
async function saveTomlItem(key, method, data, okText = '已保存') {
  await withSaving(key, async () => {
    await saveToml(method, data)
    toast.success(okText)
    // 保存后重新读取，回填后端规范化后的值（如脱敏串）
    await loadTomlAll()
  })
}

function saveJwt() {
  return saveTomlItem('jwt', 'crypt-jwt', {
    key: toml.jwt.key,
    expire: toml.jwt.expire,
    issuer: toml.jwt.issuer,
    subject: toml.jwt.subject
  })
}

function saveCacheDefault() {
  return saveTomlItem('cacheDefault', 'cache-default', {
    value: toml.cache.default,
    open: toml.cache.openValue === '1'
  })
}

function saveCacheRedis() {
  return saveTomlItem('cacheRedis', 'cache-redis', { ...toml.cache.redis })
}

function saveCacheFile() {
  return saveTomlItem('cacheFile', 'cache-file', { ...toml.cache.file })
}

function saveCacheRam() {
  return saveTomlItem('cacheRam', 'cache-ram', { expire: toml.cache.ram.expire })
}

function saveStorageDefault() {
  return saveTomlItem('storageDefault', 'storage-default', { value: toml.storage.default })
}

function saveStorageLocal() {
  return saveTomlItem('storageLocal', 'storage-local', { ...toml.storage.local })
}

function saveStorageOss() {
  return saveTomlItem('storageOss', 'storage-oss', { ...toml.storage.oss })
}

function saveStorageCos() {
  return saveTomlItem('storageCos', 'storage-cos', { ...toml.storage.cos })
}

function saveStorageKodo() {
  return saveTomlItem('storageKodo', 'storage-kodo', { ...toml.storage.kodo })
}

function saveStorageAttachment() {
  return saveTomlItem('storageAttachment', 'storage-attachment', { ...toml.storage.attachment })
}

function saveSmsDrive() {
  return saveTomlItem('smsDrive', 'sms-drive', {
    default: toml.sms.drive.default,
    email: toml.sms.drive.email,
    sms: toml.sms.drive.sms
  })
}

function saveSmsEmail() {
  return saveTomlItem('smsEmail', 'sms-email', { ...toml.sms.email })
}

function saveSmsAliyun() {
  return saveTomlItem('smsAliyun', 'sms-aliyun', { ...toml.sms.aliyun })
}

function saveSmsAliyunNumberVerify() {
  return saveTomlItem('smsAliyunNumberVerify', 'sms-aliyun-number-verify', { ...toml.sms.aliyunNumberVerify })
}

function saveSmsTencent() {
  return saveTomlItem('smsTencent', 'sms-tencent', { ...toml.sms.tencent })
}

function saveNotification() {
  return saveTomlItem('notification', 'notification', { retention_days: Number(toml.notification.retention_days) })
}

// ---------- 连通性测试 ----------
async function runTest(key, method, data, okText) {
  await withSaving(key, async () => {
    const res = await testToml(method, data)
    const detail = res?.data && typeof res.data === 'string' ? `（${res.data}）` : ''
    toast.success(`${okText}${detail}`)
  })
}

function testRedis() {
  return runTest('testRedis', 'test-redis', { ...toml.cache.redis }, 'Redis 连接成功')
}

function testStorage(kind) {
  if (kind === 'oss') {
    return runTest('testOss', 'test-oss', {
      access_key_id: toml.storage.oss.access_key_id,
      access_key_secret: toml.storage.oss.access_key_secret,
      endpoint: toml.storage.oss.endpoint,
      bucket: toml.storage.oss.bucket
    }, 'OSS 连接成功')
  }
  if (kind === 'cos') {
    return runTest('testCos', 'test-cos', {
      secret_id: toml.storage.cos.secret_id,
      secret_key: toml.storage.cos.secret_key,
      app_id: toml.storage.cos.app_id,
      bucket: toml.storage.cos.bucket,
      region: toml.storage.cos.region
    }, 'COS 连接成功')
  }
  return runTest('testKodo', 'test-kodo', {
    access_key: toml.storage.kodo.access_key,
    secret_key: toml.storage.kodo.secret_key,
    bucket: toml.storage.kodo.bucket,
    region: toml.storage.kodo.region
  }, 'Kodo 连接成功')
}

function testSmsEmail() {
  if (!test.email.trim()) {
    toast.warning('请填写测试收件人')
    return
  }
  return runTest('testSmsEmail', 'test-sms-email', { ...toml.sms.email, email: test.email.trim() }, '测试邮件已发送')
}

function testSmsAliyun() {
  if (!test.phone.trim()) {
    toast.warning('请填写测试手机号')
    return
  }
  return runTest('testSmsAliyun', 'test-sms-aliyun', { ...toml.sms.aliyun, phone: test.phone.trim() }, '测试短信已发送')
}

function testSmsTencent() {
  if (!test.phone.trim()) {
    toast.warning('请填写测试手机号')
    return
  }
  return runTest('testSmsTencent', 'test-sms-tencent', { ...toml.sms.tencent, phone: test.phone.trim() }, '测试短信已发送')
}

onMounted(loadAll)
</script>

<style scoped>
.system-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.block-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.block-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.stat-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--danger);
}

/* ---------- 布局 ---------- */
.cfg-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 16px;
  align-items: start;
}
.cfg-nav {
  position: sticky;
  top: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.cfg-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 13px;
  text-align: left;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.cfg-nav-item:hover {
  background: var(--bg-muted);
  color: var(--primary);
}
.cfg-nav-item.active {
  background: var(--accent-wash);
  color: var(--primary-deep);
  font-weight: 600;
}

.cfg-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

/* ---------- 卡片 ---------- */
.cfg-head {
  margin-bottom: 16px;
}
.cfg-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.cfg-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.cfg-foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--border-soft);
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 12px;
}
.form-hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}
.form-hint code {
  padding: 0 4px;
  font-size: 11px;
  background: var(--bg-muted);
  border-radius: 3px;
}

/* ---------- 只读信息 ---------- */
.readonly-list {
  margin: 0;
}
.readonly-row {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px dashed var(--border-soft);
}
.readonly-row:last-child {
  border-bottom: none;
}
.readonly-row dt {
  width: 140px;
  flex-shrink: 0;
  color: var(--text-muted);
}
.readonly-row dd {
  margin: 0;
  color: var(--text-soft);
}

.loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .cfg-layout {
    grid-template-columns: 1fr;
  }
  .cfg-nav {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
