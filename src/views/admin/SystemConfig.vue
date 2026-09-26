<template>
  <div class="system-config">
    <!-- 概览 -->
    <section class="card card-pad panel">
      <header class="panel-head">
        <div>
          <h2 class="block-title">系统配置</h2>
          <p class="block-desc">
            网站信息、安全策略、认证、缓存、存储、短信等配置；修改后立即生效，无需重启（存储配置会自动重载）
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

          <!-- ============ 网站设置（站点信息 / 导航 / 备案 / 协议 / 悬浮按钮）============ -->
          <SiteSettingsForm v-else-if="tab === 'site'" />

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
                <p class="cfg-desc">评论开关、限流、内容校验与敏感词</p>
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
            </div>

            <p class="form-hint">
              邮件通知（评论 / 回复）已统一到「邮件通知」模块管理，见其中的「评论互动」分组
            </p>

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
          <template v-else-if="tab === 'register'">
            <section class="card card-pad">
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
              <div class="form-item">
                <label class="form-label">新用户注册验证</label>
                <SelectMenu v-model="cfg.register.verifyMode" variant="field" :options="REGISTER_VERIFY_OPTIONS" />
                <p class="form-hint">{{ registerVerifyHint }}</p>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">邮箱域名限制</h3>
                  <p class="cfg-desc">用于拦截一次性邮箱或限定内部邮箱注册，仅对邮箱注册方式生效</p>
                </div>
              </header>
              <div class="form-item">
                <label class="form-label">限制模式</label>
                <SelectMenu v-model="cfg.register.domainMode" variant="field" :options="REGISTER_DOMAIN_OPTIONS" />
                <p class="form-hint">{{ registerDomainHint }}</p>
              </div>

              <div v-if="cfg.register.domainMode === 'whitelist'" class="form-item">
                <label class="form-label">注册邮箱白名单</label>
                <textarea
                  v-model="cfg.register.whitelistText"
                  class="textarea code-textarea"
                  rows="5"
                  placeholder="qq.com&#10;163.com&#10;@foxmail.com"
                ></textarea>
                <p class="form-hint">只允许使用这些域名结尾的邮箱地址注册，每行一个域名（@ 可省略，子域自动匹配，如 qq.com 同时允许 mail.qq.com）。</p>
              </div>

              <div v-if="cfg.register.domainMode === 'blacklist'" class="form-item">
                <label class="form-label">注册邮箱黑名单</label>
                <textarea
                  v-model="cfg.register.blacklistText"
                  class="textarea code-textarea"
                  rows="5"
                  placeholder="example.com&#10;@tempmail.com"
                ></textarea>
                <p class="form-hint">禁止使用这些域名结尾的邮箱地址注册，每行一个域名（@ 可省略，子域自动匹配）。</p>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">注册后发布欢迎消息</h3>
                  <p class="cfg-desc">两项可同时开启；人工审核模式下通过审核时发送，邮箱验证模式下验证通过时发送</p>
                </div>
              </header>
              <div class="form-grid">
                <div class="form-item">
                  <label class="form-label">站内消息通知</label>
                  <SelectMenu v-model="cfg.register.welcomeMessage" variant="field" :options="ON_OFF" />
                  <p class="form-hint">注册成功后，向用户发送站内欢迎消息</p>
                </div>
                <div class="form-item">
                  <label class="form-label">发送欢迎 Email</label>
                  <SelectMenu v-model="cfg.register.welcomeEmail" variant="field" :options="ON_OFF" />
                  <p class="form-hint">注册成功后，向用户注册邮箱发送欢迎邮件</p>
                </div>
              </div>
            </section>

            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">新用户默认权限组</h3>
                  <p class="cfg-desc">注册成功后自动入组，空选表示不带任何权限组</p>
                </div>
              </header>
              <div class="form-item">
                <label class="form-label">默认权限组</label>
                <div v-if="registerGroups.loading" class="loading is-inline"><span class="spinner" /> 加载权限组...</div>
                <p v-else-if="!registerGroups.list.length" class="form-hint">
                  暂无可用权限组：请先到「安全 → 权限组」创建，或确认当前账号有权访问权限组列表。
                </p>
                <div v-else class="check-grid is-block">
                  <label v-for="g in registerGroups.list" :key="g.id" class="check-line">
                    <input v-model="cfg.register.ids" type="checkbox" :value="Number(g.id)" />
                    <span>
                      {{ g.name || g.key }}
                      <code v-if="g.key" class="group-key">{{ g.key }}</code>
                      <span v-if="Number(g.root) === 1" class="root-flag">超管</span>
                    </span>
                  </label>
                </div>
                <p class="form-hint">
                  注册成功后自动把新用户加入所选权限组（写入 ALLOW_REGISTER 的 text 字段，即分组 ID 列表）；
                  留空表示新用户不带任何权限组。含「超管」分组请谨慎勾选。
                </p>
              </div>
            </section>

            <section class="card card-pad">
              <div class="cfg-foot is-plain">
                <span class="form-hint is-inline">以上设置同属 ALLOW_REGISTER 一条记录，点保存一次即可全部生效</span>
                <button class="btn btn-primary btn-sm" :disabled="isSaving('register')" @click="saveRegister">
                  <i class="bi bi-check2" /> 保存注册设置
                </button>
              </div>
            </section>
          </template>

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

            <!-- 发件队列：分批限流 + 失败重试（config/sms.toml 的 [email] 段） -->
            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">发件队列</h3>
                  <p class="cfg-desc">
                    通知类邮件统一入队后分批发送（验证码 / 注册验证邮件入队即发，不受分批限制），
                    失败按「重试延迟」重新入队，达到「最大尝试次数」后标记失败并丢弃；
                    保存后立即生效，无需重启
                  </p>
                </div>
              </header>
              <div class="form-grid">
                <div v-for="item in MAIL_QUEUE_FIELDS" :key="item.key" class="form-item">
                  <label class="form-label">{{ item.label }}</label>
                  <input
                    v-model.number="toml.sms.emailQueue[item.key]"
                    class="input"
                    type="number"
                    step="1"
                    :min="item.min"
                    :max="item.max"
                  />
                  <p class="form-hint">{{ item.hint }}（{{ item.min }} ~ {{ item.max }}）</p>
                </div>
              </div>
              <div class="cfg-foot">
                <button class="btn btn-primary btn-sm" :disabled="isSaving('smsEmailQueue')" @click="saveSmsEmailQueue">
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

          <!-- ============ 邮件通知（统一开关）============ -->
          <template v-else-if="tab === 'mail'">
            <!-- 总开关 + 管理员收件人 -->
            <section class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">邮件通知总开关</h3>
                  <p class="cfg-desc">
                    关闭后所有场景都不再发邮件（站内消息不受影响）；
                    邮件统一走邮箱队列分批投递，失败会自动延迟重试
                    （分批 / 重试参数见「短信」标签页的「发件队列」）
                  </p>
                </div>
              </header>

              <div class="form-item">
                <label class="form-label">总开关</label>
                <SelectMenu v-model="cfg.mail.enabled" variant="field" :options="ON_OFF" />
              </div>

              <div class="form-item">
                <label class="form-label">管理员收件邮箱</label>
                <input
                  v-model="cfg.mail.adminEmail"
                  class="input"
                  type="text"
                  placeholder="多个用逗号分隔；留空则用「超级管理员」账号的邮箱"
                />
                <p class="form-hint">
                  审核 / 订单等「通知管理员」的场景发到这里；留空时自动取权限组 root=1 成员的邮箱
                </p>
              </div>
              
              <div class="cfg-foot">
                <button class="btn btn-primary btn-sm" :disabled="isSaving('mail')" @click="saveMail">
                  <i class="bi bi-check2" /> 保存
                </button>
              </div>
            </section>

            <!-- 场景开关：按分组展示，开则正常发送、关则禁用 -->
            <section v-for="group in MAIL_GROUPS" :key="group" class="card card-pad">
              <header class="cfg-head">
                <div>
                  <h3 class="cfg-title">{{ group }}</h3>
                  <p class="cfg-desc">按需开启；关闭后该场景不再发送邮件，站内记录不受影响</p>
                </div>
              </header>

              <div class="form-grid">
                <div v-for="scene in mailScenesOf(group)" :key="scene.key" class="form-item">
                  <label class="form-label">{{ scene.label }}</label>
                  <SelectMenu v-model="cfg.mail.scenes[scene.key]" variant="field" :options="ON_OFF" />
                  <p class="form-hint">{{ scene.target === 'admin' ? '发给管理员' : '发给相关用户' }}</p>
                </div>
              </div>

              <div class="cfg-foot">
                <button class="btn btn-primary btn-sm" :disabled="isSaving('mail')" @click="saveMail">
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
 * - ALLOW_REGISTER 另用 text 存「新用户默认权限组」的 ID 列表（如 "1,2"，空表示不分组），
 *   注册成功后由 Comm.auth() 读取（utils.Unity.Ids 按数字提取），把新用户写进对应 auth-group 的 uids；
 * - SYSTEM_MAIL_NOTIFY 是「统一邮件通知」记录（见 app/model/mail-notify.go）：
 *   value / json.enabled 是总开关（0 关闭时所有场景都停发），json.admin_email 是管理员收件邮箱
 *   （留空回退「超级管理员」账号邮箱），json.scenes 存各场景开关
 *   （article.pending / comment.notify / user.banned / order.paid ...，清单见 model.MailNotifyScenes()）；
 *   评论 / 回复的邮件通知也在此管理（comment.notify / comment.reply），评论模块不再有独立邮件开关；
 *   邮件统一走邮箱队列（app/facade/mail_queue.go）分批投递，失败自动延迟重试；
 * - ALLOW_REGISTER 的 json 存注册扩展设置（见 app/model/register.go）：
 *   email_domain_mode（off/whitelist/blacklist）+ email_whitelist / email_blacklist、
 *   verify_mode（none/email/manual）、welcome_message / welcome_email；
 *   none 直接注册并登录，email 会标记 email_verified=0 并发验证邮件（/auth/verify），
 *   manual 会把 status 置为 2（待审核），两者都需通过后才能登录；
 * - 内容配置 ARTICLE / MOMENTS / PAGE 结构相同（editor / audit / comment{allow,show}），
 *   分别由 article.go、moments.go、pages.go 的 config() 读取，audit 决定新建内容的默认审核态；
 *   评论配置 COMMENT 结构独立（allow / rate_limit / max_length / require_chinese /
 *   sensitive_filter / sensitive_words），由 comment.go 的 config("comment") 读取；
 *   这几份配置的 json 即配置本体，保存时整体覆盖；
 * - QPS_BLOCK 的 second 是表达式字符串（如 "60 * 60"），会自动封禁触发阈值的 IP；
 * - 密钥类字段读取时已脱敏为 `****` 串，**原样回传**即表示不修改（后端会还原真实值）；
 * - storage 不带 name 读取时不脱敏，因此这里按分组分别读取；
 * - 日志配置后端只读（没有保存接口）。
 */
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SelectMenu from '@/components/SelectMenu.vue'
import SiteSettingsForm from '@/components/admin/SiteSettingsForm.vue'
import { getConfig, saveSystemConfig } from '@/api/config'
import { listAuthGroups } from '@/api/auth-group'
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

// 新用户注册验证方式（对应后端 model.RegisterVerify* 三个常量）
const REGISTER_VERIFY_OPTIONS = [
  { value: 'none', label: '无（注册后直接登录）' },
  { value: 'email', label: 'Email 验证（验证通过后才能登录）' },
  { value: 'manual', label: '人工审核（管理员通过后才能登录）' }
]

// 邮箱域名限制模式
const REGISTER_DOMAIN_OPTIONS = [
  { value: 'off', label: '关闭' },
  { value: 'whitelist', label: '白名单模式' },
  { value: 'blacklist', label: '黑名单模式' }
]

const modules = [
  { key: 'security', label: '安全', icon: 'bi bi-shield-lock' },
  { key: 'mail', label: '邮件通知', icon: 'bi bi-envelope-paper' },
  { key: 'site', label: '网站设置', icon: 'bi bi-globe2' },
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

// 模块定位：支持 /admin/system?tab=site 这类直达链接（如用户中心跳「网站设置」）
const route = useRoute()
const router = useRouter()
const MODULE_KEYS = modules.map((m) => m.key)
const initialTab = MODULE_KEYS.includes(String(route.query.tab)) ? String(route.query.tab) : 'security'
const tab = ref(initialTab)
// 切换模块时把当前模块写回地址栏，便于刷新/分享后停留在同一模块
watch(tab, (value) => {
  if (String(route.query.tab || '') === value) return
  router.replace({ query: { ...route.query, tab: value } })
})
// 地址栏被外部改动（如侧栏再点一次直达链接）时同步模块
watch(
  () => route.query.tab,
  (value) => {
    const next = MODULE_KEYS.includes(String(value)) ? String(value) : 'security'
    if (next !== tab.value) tab.value = next
  }
)
const loading = ref(false)
const loadError = ref(false)
// 每个保存动作独立的 loading 标记，避免互相阻塞
const saving = reactive({})

// ===== config 表配置 =====
/**
 * 统一邮件通知的场景（与后端 app/model/mail-notify.go 的 MailNotifyScenes 一一对应）
 *
 * - target: admin 发给管理员（收件邮箱见上面的「管理员收件邮箱」）/ user 发给相关用户
 * - default: 默认开关（后端兜底值，前端只用于「后端还没返回该场景」时展示）
 * 新增场景时两边都要加；前端漏掉的场景后端仍按默认值处理，保存时也不会被覆盖（见 saveMail）。
 */
const MAIL_SCENES = [
  { key: 'article.pending', label: '文章待审核', group: '内容审核', target: 'admin', default: 1 },
  { key: 'article.passed', label: '文章审核通过', group: '内容审核', target: 'user', default: 1 },
  { key: 'article.rejected', label: '文章审核未通过', group: '内容审核', target: 'user', default: 1 },
  { key: 'page.pending', label: '独立页面待审核', group: '内容审核', target: 'admin', default: 1 },
  { key: 'page.passed', label: '独立页面审核通过', group: '内容审核', target: 'user', default: 1 },
  { key: 'page.rejected', label: '独立页面审核未通过', group: '内容审核', target: 'user', default: 1 },
  { key: 'links.pending', label: '友链待审核', group: '内容审核', target: 'admin', default: 1 },
  { key: 'links.passed', label: '友链审核通过', group: '内容审核', target: 'user', default: 1 },
  { key: 'links.rejected', label: '友链审核未通过', group: '内容审核', target: 'user', default: 1 },
  { key: 'comment.notify', label: '评论通知（内容作者）', group: '评论互动', target: 'user', default: 1 },
  { key: 'comment.reply', label: '回复通知（被回复人）', group: '评论互动', target: 'user', default: 1 },
  { key: 'user.pending', label: '新用户待审核', group: '用户管理', target: 'admin', default: 1 },
  { key: 'user.passed', label: '用户审核通过', group: '用户管理', target: 'user', default: 1 },
  { key: 'user.frozen', label: '账号被冻结', group: '用户管理', target: 'user', default: 1 },
  { key: 'user.unfrozen', label: '账号解除冻结', group: '用户管理', target: 'user', default: 1 },
  { key: 'user.banned', label: '账号被封禁', group: '用户管理', target: 'user', default: 1 },
  { key: 'user.unbanned', label: '账号解除封禁', group: '用户管理', target: 'user', default: 1 },
  { key: 'order.paid', label: '订单支付成功', group: '积分商城', target: 'admin', default: 1 },
  { key: 'order.shipped', label: '订单已发货', group: '积分商城', target: 'user', default: 1 },
  { key: 'order.canceled', label: '订单已取消', group: '积分商城', target: 'user', default: 1 }
]

// 场景分组（展示顺序）
const MAIL_GROUPS = ['内容审核', '评论互动', '用户管理', '积分商城']

// 默认场景开关（"1"/"0" 字符串，与 SelectMenu 的 ON_OFF 对齐）
function defaultMailScenes() {
  const scenes = {}
  MAIL_SCENES.forEach((scene) => {
    scenes[scene.key] = String(scene.default)
  })
  return scenes
}

function mailScenesOf(group) {
  return MAIL_SCENES.filter((scene) => scene.group === group)
}

const cfg = reactive({
  apiKey: { value: '0' },
  qps: { value: '1', json: { point: 15, global: 50 } },
  qpsBlock: { value: '0', json: { count: 3, second: '60 * 60' } },
  qpsNotify: { value: '0', json: { email: '', webhook: '' } },
  pageLimit: { value: '1', text: '50' },
  // 注册设置（同属 ALLOW_REGISTER 一条记录）
  // - value     → value 字段：是否允许自行注册
  // - ids       → text 字段：新用户默认权限组 ID 列表
  // - 其余字段  → json 字段：域名限制 / 验证方式 / 欢迎消息开关
  register: {
    value: '1',
    ids: [],
    verifyMode: 'none',
    domainMode: 'off',
    whitelistText: '',
    blacklistText: '',
    welcomeMessage: '0',
    welcomeEmail: '0'
  },
  // 内容配置：ARTICLE / MOMENTS / PAGE 三份结构相同（editor / audit / comment）
  content: {
    ARTICLE: { editor: 'tinymce', audit: '1', comment: { allow: '1', show: '1' } },
    MOMENTS: { editor: 'tinymce', audit: '1', comment: { allow: '1', show: '1' } },
    PAGE: { editor: 'tinymce', audit: '1', comment: { allow: '1', show: '1' } }
  },
  // 评论配置：COMMENT（结构与内容配置不同，字段更多）
  // 注：评论 / 回复的邮件开关不在评论模块，已统一到 SYSTEM_MAIL_NOTIFY（见下方 mail）
  comment: {
    allow: '1',
    rate_limit: { enabled: '1', max_count: 5, time_window: 60 },
    max_length: 500,
    require_chinese: '1',
    sensitive_filter: '1'
  },
  // 敏感词按「一行一个」编辑，保存时拆成数组
  sensitiveText: '',
  // 统一邮件通知（SYSTEM_MAIL_NOTIFY 一条记录）
  // - enabled     → json.enabled：总开关
  // - adminEmail  → json.admin_email：管理员收件邮箱（多个逗号分隔，空则用超管邮箱）
  // - scenes      → json.scenes：各场景开关（key 见 MAIL_SCENES）
  // - rawScenes   → 后端原始 scenes，保存时与表单合并（避免覆盖掉前端未知的新场景）
  mail: { enabled: '1', adminEmail: '', scenes: defaultMailScenes(), rawScenes: {} }
})

// ===== toml 配置 =====
/**
 * 发件队列参数（config/sms.toml 的 [email] 段）
 * 与后端 app/facade/mail_queue.go 的 MailQueueDefaultValues / MailQueueLimits 一一对应，
 * 默认值与取值范围改动时两边要同步。
 */
const MAIL_QUEUE_FIELDS = [
  { key: 'batch_size', label: '每批数量', def: 10, min: 1, max: 1000, hint: '一个批次窗口内最多发送多少封通知类邮件；验证码 / 注册验证邮件不受此限制，入队即发' },
  { key: 'batch_interval', label: '批次间隔（秒）', def: 600, min: 1, max: 86400, hint: '一批发满后等待多久再开下一个窗口（600 = 10 分钟）' },
  { key: 'retry_delay', label: '重试延迟（秒）', def: 60, min: 1, max: 86400, hint: '发送失败后延迟多久重新入队重试' },
  { key: 'max_attempts', label: '最大尝试次数', def: 3, min: 1, max: 10, hint: '含首次发送，达到上限后标记失败并丢弃，不会无限重试' },
  { key: 'send_timeout', label: '发送超时（秒）', def: 30, min: 5, max: 600, hint: '单封邮件超过该时长按失败处理，避免 SMTP 卡住整个队列' },
  { key: 'verify_wait', label: '验证码等待（秒）', def: 10, min: 0, max: 60, hint: '等待首轮发送结果的超时，0 = 不等待（纯异步，前端只提示「已发送」）' },
  { key: 'queue_size', label: '队列上限', def: 1000, min: 10, max: 1000000, hint: '待发任务上限，超出后通知类邮件直接丢弃并记日志（验证码始终受理）' }
]

function defaultMailQueue() {
  const result = {}
  MAIL_QUEUE_FIELDS.forEach((item) => {
    result[item.key] = item.def
  })
  return result
}

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
    // 发件队列（与 email 同属 config/sms.toml 的 [email] 段，见 app/facade/mail_queue.go）
    emailQueue: defaultMailQueue(),
    aliyun: { access_key_id: '', access_key_secret: '', endpoint: '', sign_name: '', verify_code: '' },
    aliyunNumberVerify: { access_key_id: '', access_key_secret: '', endpoint: '', sign_name: '', template_code: '' },
    tencent: { secret_id: '', secret_key: '', endpoint: '', sms_sdk_app_id: '', sign_name: '', verify_code: '', region: '' }
  },
  notification: { retention_days: 30 },
  log: { on: false, size: 0, age: 0, backups: 0 }
})

// 测试用字段（不落库）
const test = reactive({ email: '', phone: '' })

// 注册模块用到的权限组列表（后端 auth-group/all，字段同 UserList 的分配权限组弹窗）
const registerGroups = reactive({ list: [], loading: false })

async function loadAuthGroups() {
  registerGroups.loading = true
  try {
    const res = await listAuthGroups()
    registerGroups.list = res.data?.data || []
  } catch {
    // 接口受限时保持为空，页面给出提示
    registerGroups.list = []
  } finally {
    registerGroups.loading = false
  }
}

// ---------- 工具 ----------
function isSaving(key) {
  return !!saving[key]
}

async function withSaving(key, fn) {
  saving[key] = true
  try {
    await fn()
    return true
  } catch (err) {
    // 失败提示由请求拦截器统一给出（如 msg=无权限！），这里吞掉异常即可：
    // 保存按钮是 @click 直接调用，不 catch 会在控制台抛 "Uncaught (in promise)"。
    // 403 额外给一条可操作的提示：新接口的权限点需要给当前账号的权限组勾选。
    if (err?.code === 403) {
      toast.warning('当前账号没有这个权限点，请在「权限组」中勾选后重试（新接口需重启后端补录规则）')
    }
    return false
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

// 分组 ID 列表归一化：后端存的是 "|1|2|" 之类的字符串，统一取出数字（与 utils.Unity.Ids 行为一致）
function parseIdList(raw) {
  const matched = String(raw ?? '').match(/\d+/g)
  return matched ? [...new Set(matched.map(Number))] : []
}

// 邮箱域名列表 ↔ 文本：后台按「一行一个」编辑，保存时转数组（后端也会再做一次归一化）
function domainText(list) {
  return Array.isArray(list) ? list.join('\n') : String(list ?? '')
}
function parseDomainText(text) {
  const list = String(text ?? '')
    .split(/[\n\r,，;；\s]+/)
    .map((item) => item.trim().replace(/^@/, '').replace(/^\.+|\.+$/g, '').toLowerCase())
    .filter(Boolean)
  return [...new Set(list)]
}

// 注册验证方式 / 域名限制的说明文案
const registerVerifyHint = computed(() => {
  switch (cfg.register.verifyMode) {
    case 'email':
      return '选择「Email 验证」将向用户注册 Email 发送一封验证邮件以确认邮箱的有效性，验证通过前无法登录'
    case 'manual':
      return '选择「人工审核」将由管理员在「用户管理」中逐个确定是否允许新用户登录'
    default:
      return '选择「无」用户可直接注册成功（仍需要邮箱/短信验证码）'
  }
})
const registerDomainHint = computed(() => {
  switch (cfg.register.domainMode) {
    case 'whitelist':
      return '选择「白名单模式」，只有限制名单中的邮箱域名可以注册（名单为空时任何邮箱都无法注册）'
    case 'blacklist':
      return '选择「黑名单模式」，限制名单中的邮箱域名不能注册'
    default:
      return '选择「无」直接关闭本功能；名单内每行一个域名，例如 qq.com'
  }
})

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

// 注册配置（ALLOW_REGISTER）：value 是注册开关，text 是默认权限组，json 是扩展设置
function readRegisterConfig(raw) {
  const json = parseJson(raw?.json, {})

  cfg.register.value = toText(raw?.value, '1')
  // 新用户默认权限组：后端 Comm.auth() 读取该记录的 text 字段
  cfg.register.ids = parseIdList(raw?.text)

  // 域名限制
  cfg.register.domainMode = ['whitelist', 'blacklist'].includes(json.email_domain_mode)
    ? json.email_domain_mode
    : 'off'
  cfg.register.whitelistText = domainText(json.email_whitelist)
  cfg.register.blacklistText = domainText(json.email_blacklist)

  // 注册验证方式
  cfg.register.verifyMode = ['email', 'manual'].includes(json.verify_mode) ? json.verify_mode : 'none'

  // 欢迎消息 / 欢迎邮件
  cfg.register.welcomeMessage = Number(json.welcome_message) ? '1' : '0'
  cfg.register.welcomeEmail = Number(json.welcome_email) ? '1' : '0'
}

// 评论配置（COMMENT）：结构独立，敏感词转成「一行一个」的文本便于编辑
// 邮件通知（评论 / 回复）不在这里：已统一到 SYSTEM_MAIL_NOTIFY 的 comment.notify / comment.reply
function readCommentConfig(raw) {
  const json = parseJson(raw?.json, {})
  const rate = json.rate_limit && typeof json.rate_limit === 'object' ? json.rate_limit : {}
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
    words
  }
}

/**
 * 读取统一邮件通知配置（SYSTEM_MAIL_NOTIFY）
 * scenes 用默认值打底：后端新增 / 缺失的场景不会在这里丢掉（rawScenes 保存时原样合并回去）
 */
function readMailConfig(raw) {
  const json = parseJson(raw?.json, {})
  const scenes = json.scenes && typeof json.scenes === 'object' ? json.scenes : {}

  cfg.mail.enabled = toText(json.enabled, '1')
  cfg.mail.adminEmail = toText(json.admin_email, '')
  cfg.mail.rawScenes = { ...scenes }

  const form = defaultMailScenes()
  Object.keys(form).forEach((key) => {
    if (scenes[key] !== undefined) form[key] = Number(scenes[key]) === 1 ? '1' : '0'
  })
  cfg.mail.scenes = form
}

async function loadConfigs() {
  const [apiKey, qps, block, notify, pageLimit, register, article, moments, pages, comment, mailNotify] = await Promise.all([
    readConfig('SYSTEM_API_KEY'),
    readConfig('SYSTEM_QPS'),
    readConfig('SYSTEM_QPS_BLOCK'),
    readConfig('SYSTEM_QPS_NOTIFY'),
    readConfig('SYSTEM_PAGE_LIMIT'),
    readConfig('ALLOW_REGISTER'),
    readConfig('ARTICLE'),
    readConfig('MOMENTS'),
    readConfig('PAGE'),
    readConfig('COMMENT'),
    readConfig('SYSTEM_MAIL_NOTIFY')
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
  if (register) {
    readRegisterConfig(register)
  }

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
    cfg.sensitiveText = parsed.words.join('\n')
  }
  if (mailNotify) {
    readMailConfig(mailNotify)
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

  // 邮件服务与发件队列同属 [email] 段，但表单分开：队列参数单独放 emailQueue
  const emailData = smsData.email || {}
  toml.sms.email = {
    host: toText(emailData.host, ''),
    port: Number(emailData.port || 465),
    account: toText(emailData.account, ''),
    password: toText(emailData.password, ''),
    nickname: toText(emailData.nickname, ''),
    sign_name: toText(emailData.sign_name, '')
  }
  toml.sms.emailQueue = defaultMailQueue()
  MAIL_QUEUE_FIELDS.forEach((item) => {
    const value = emailData[item.key]
    if (value !== undefined && value !== null && value !== '') {
      toml.sms.emailQueue[item.key] = Number(value)
    }
  })
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
    await Promise.all([loadConfigs(), loadTomlAll(), loadAuthGroups()])
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

/**
 * 保存统一邮件通知配置（SYSTEM_MAIL_NOTIFY）
 *
 * - enabled     → json.enabled：总开关（0 关闭时后端所有场景都停发）
 * - admin_email → json.admin_email：管理员收件邮箱（空则后端回退超管账号邮箱）
 * - scenes      → json.scenes：各场景开关（1 开 / 0 关）
 * 保存前与后端原始 scenes 合并，避免把前端没列出的（后端新增的）场景覆盖掉。
 */
async function saveMail() {
  const scenes = { ...cfg.mail.rawScenes }
  Object.keys(cfg.mail.scenes).forEach((key) => {
    scenes[key] = Number(cfg.mail.scenes[key]) === 1 ? 1 : 0
  })

  await saveConfigItem(
    'mail',
    {
      key: 'SYSTEM_MAIL_NOTIFY',
      data: {
        value: cfg.mail.enabled,
        json: {
          enabled: Number(cfg.mail.enabled) === 1 ? 1 : 0,
          admin_email: String(cfg.mail.adminEmail || '').trim(),
          scenes
        }
      }
    },
    '邮件通知配置已保存'
  )

  cfg.mail.rawScenes = { ...scenes }
}

function savePageLimit() {
  return saveConfigItem(
    'pageLimit',
    { key: 'SYSTEM_PAGE_LIMIT', data: { value: cfg.pageLimit.value, text: String(cfg.pageLimit.text) } },
    '已保存'
  )
}

/**
 * 保存注册配置（ALLOW_REGISTER 一条记录承载三部分数据）
 * - value：是否允许自行注册（"0"/"1"）
 * - text ：新用户默认权限组 ID 列表，后端 Comm.auth() 注册后按它把用户加进对应权限组
 * - json ：邮箱域名限制 / 注册验证方式 / 欢迎消息开关
 * 注意：只提交本页涉及的字段，避免误清空 remark 等；保存后回读，统一数字/字符串口径。
 */
async function saveRegister() {
  const setting = {
    email_domain_mode: cfg.register.domainMode,
    // 名单文本 → 数组；后端 NormalizeDomains 会再做一次归一化（去 @、小写、去重）
    email_whitelist: parseDomainText(cfg.register.whitelistText),
    email_blacklist: parseDomainText(cfg.register.blacklistText),
    verify_mode: cfg.register.verifyMode,
    welcome_message: Number(cfg.register.welcomeMessage) ? 1 : 0,
    welcome_email: Number(cfg.register.welcomeEmail) ? 1 : 0
  }

  await saveConfigItem(
    'register',
    {
      key: 'ALLOW_REGISTER',
      data: {
        value: cfg.register.value,
        text: cfg.register.ids.map(Number).join(','),
        json: setting
      }
    },
    '已保存'
  )

  const fresh = await readConfig('ALLOW_REGISTER')
  if (fresh) readRegisterConfig(fresh)
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
        sensitive_words: words
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

// 发件队列：PUT /api/toml/sms-email-queue，只提交这 7 个参数（未提交的字段后端保持原值）
function saveSmsEmailQueue() {
  const data = {}
  MAIL_QUEUE_FIELDS.forEach((item) => {
    data[item.key] = Number(toml.sms.emailQueue[item.key] ?? item.def)
  })
  return saveTomlItem('smsEmailQueue', 'sms-email-queue', data, '发件队列配置已保存')
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
/* 单独的保存条（注册模块）：无上边框、按钮靠右 */
.cfg-foot.is-plain {
  margin-top: 0;
  padding-top: 0;
  border-top: none;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.form-hint.is-inline {
  margin: 0 auto 0 0;
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

/* ---------- 多选（注册默认权限组） ---------- */
.check-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
  margin-top: 8px;
}
.check-grid.is-block {
  grid-template-columns: 1fr;
  margin-top: 0;
}
.check-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 13px;
  color: var(--text-soft);
  cursor: pointer;
}
.check-line input {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  accent-color: var(--primary);
  cursor: pointer;
}
.group-key {
  padding: 0 6px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--primary-deep);
  background: var(--accent-soft);
  border-radius: 3px;
}
.root-flag {
  margin-left: 6px;
  padding: 0 6px;
  font-size: 11px;
  color: var(--warning);
  background: var(--gold-wash);
  border-radius: 3px;
}
.loading.is-inline {
  padding: 8px 0;
  text-align: left;
  font-size: 13px;
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
