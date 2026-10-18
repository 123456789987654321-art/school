/* Login UI for device-local encrypted accounts. No credentials leave this device. */
(() => {
  'use strict';
  window.ThreePagesAuthUI = function (onUnlock) {
    const host = document.querySelector('#auth-screen');
    let mode = 'login', busy = false;
    function show() {
      mode = 'login'; busy = false;
      document.body.classList.add('signed-out');
      host.hidden = false;
      render();
      document.title = '登录 · 三页 ThreePages';
    }
    function render() {
      const registering = mode === 'register';
      host.innerHTML = `<div class="auth-layout">
        <section class="auth-intro" aria-label="三页介绍">
          <div class="brand"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span>三页 <small>ThreePages</small></span></div>
          <p class="auth-eyebrow">留给自己的一方阅读空间</p>
          <h1>从空白开始，<br>留下你的知识。</h1>
          <p class="auth-description">把值得读的资料放进来，<br>把值得记住的想法留下来。</p>
          <div class="auth-pages" aria-hidden="true"><span>01 <b>阅读</b></span><span>02 <b>理解</b></span><span>03 <b>记住</b></span></div>
          <p class="auth-local-note">本地账号 · 资料按账号独立保存</p>
        </section>
        <section class="auth-card" aria-labelledby="auth-title">
          <div class="auth-tabs" role="group" aria-label="账号操作"><button type="button" data-auth-mode="login" aria-pressed="${!registering}">登录</button><button type="button" data-auth-mode="register" aria-pressed="${registering}">注册账号</button></div>
          <h2 id="auth-title">${registering ? '创建你的阅读空间' : '欢迎回到三页'}</h2>
          <p class="auth-subtitle">${registering ? '新账号从空白开始，只保存你自己的资料。' : '登录后，继续阅读属于你的资料。'}</p>
          <form id="auth-form">
            <div class="field"><label for="auth-name">账号</label><input id="auth-name" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" minlength="2" maxlength="32" required aria-describedby="auth-name-help"><small id="auth-name-help">2–32 个汉字、字母、数字、下划线或短横线；字母不区分大小写。</small></div>
            <div class="field"><label for="auth-password">密码</label><div class="password-field"><input id="auth-password" name="password" type="password" autocomplete="${registering ? 'new-password' : 'current-password'}" minlength="8" maxlength="128" required><button type="button" id="toggle-password" aria-label="显示密码" aria-pressed="false">显示</button></div>${registering ? '<small>至少 8 个字符。请妥善记住密码，本地账号无法找回。</small>' : ''}</div>
            ${registering ? '<div class="field"><label for="auth-confirm">确认密码</label><input id="auth-confirm" name="confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></div>' : ''}
            <p id="auth-error" class="form-error" role="alert"></p>
            <button class="primary-button auth-submit" type="submit">${registering ? '注册并进入' : '登录我的空间'}</button>
          </form>
          <div class="auth-storage-note"><strong>资料保存在当前设备</strong><p>不同账号的资料互不共享。更换设备、浏览器或使用 APK，不会自动同步；清除应用数据或卸载可能丢失资料。忘记密码无法恢复，请定期导出重要内容。</p></div>
        </section>
      </div>`;
    }
    host.addEventListener('click', event => {
      if (busy) return;
      const tab = event.target.closest('[data-auth-mode]');
      if (tab) { mode = tab.dataset.authMode; render(); host.querySelector('#auth-name').focus(); }
      if (event.target.closest('#toggle-password')) {
        const input = host.querySelector('#auth-password'), button = host.querySelector('#toggle-password'), visible = input.type === 'password';
        input.type = visible ? 'text' : 'password'; button.textContent = visible ? '隐藏' : '显示';
        button.setAttribute('aria-label',visible ? '隐藏密码' : '显示密码'); button.setAttribute('aria-pressed',String(visible));
      }
    });
    host.addEventListener('submit', async event => {
      if (event.target.id !== 'auth-form') return;
      event.preventDefault(); if (busy) return;
      const form = event.target, values = new FormData(form), error = host.querySelector('#auth-error');
      error.textContent = '';
      if (mode === 'register' && values.get('password') !== values.get('confirm')) { error.textContent = '两次输入的密码不一致。'; return; }
      busy = true; form.setAttribute('aria-busy','true');
      host.querySelectorAll('button,input').forEach(el => { el.disabled = true; });
      form.querySelector('[type="submit"]').textContent = mode === 'register' ? '正在创建…' : '正在解锁…';
      try {
        const store = window.ThreePagesAccounts.createAccountStore(window.localStorage);
        const session = await store[mode](values.get('username'),values.get('password'));
        form.reset(); host.replaceChildren(); host.hidden = true;
        document.body.classList.remove('signed-out');
        onUnlock(session);
      } catch (err) {
        error.textContent = err.message || '无法打开本地存储，请检查浏览器权限后重试。';
        host.querySelectorAll('button,input').forEach(el => { el.disabled = false; });
        form.querySelector('[type="submit"]').textContent = mode === 'register' ? '注册并进入' : '登录我的空间';
      } finally { busy = false; form.removeAttribute('aria-busy'); }
    });
    return {show};
  };
})();
