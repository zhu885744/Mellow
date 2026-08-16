<template>
  <div class="auth-layout">
    <div class="auth-bg"></div>
    <div class="auth-card">
      <router-link to="/" class="auth-logo">朱某的生活印记</router-link>
      <router-view />
      <div class="auth-footer">
        <router-link to="/">← 返回首页</router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-soft);
  position: relative;
  padding: 32px 16px;
}
.auth-bg {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(at 20% 30%, rgba(184, 153, 104, 0.08) 0px, transparent 50%),
    radial-gradient(at 80% 70%, rgba(184, 153, 104, 0.05) 0px, transparent 50%);
  pointer-events: none;
}
.auth-card {
  width: 100%;
  max-width: 400px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-soft);
  padding: 40px 32px;
  position: relative;
}
.auth-logo {
  display: block;
  text-align: center;
  font-family: var(--font-serif);
  font-size: 22px;
  letter-spacing: 2px;
  color: var(--text);
  margin-bottom: 32px;
}
.auth-footer {
  text-align: center;
  margin-top: 24px;
  font-size: 13px;
}
</style>