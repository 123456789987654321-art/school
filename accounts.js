(function (root) {
  'use strict';
  const C = typeof module !== 'undefined' && module.exports ? require('./core.js') : root.ThreePagesCore;
  const PREFIX = 'threepages.account.v1.';
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  const encode = bytes => btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
  const decode = text => Uint8Array.from(atob(text), char => char.charCodeAt(0));
  function username(value) {
    const name = String(value).normalize('NFKC').trim().toLowerCase();
    if (!/^[\p{L}\p{N}_-]{2,32}$/u.test(name)) throw new Error('账号需为 2–32 个字母、汉字、数字、下划线或短横线。');
    return name;
  }
  function validateData(data) {
    if (!data || !Array.isArray(data.docs) || !Array.isArray(data.cards) || !Array.isArray(data.activity) || !Array.isArray(data.chatHistory) || !Number.isFinite(data.reviewed)) throw new Error('账号资料损坏，请保留当前存储，不要覆盖。');
    return data;
  }
  function createAccountStore(storage, cryptoApi = globalThis.crypto, locks = globalThis.navigator?.locks) {
    function checkCrypto() {
      if (!cryptoApi?.subtle) throw new Error('当前环境不支持安全登录，请使用 HTTPS 网站、本机 localhost 或新版安卓应用。');
      if (!locks?.request) throw new Error('当前浏览器不支持安全保存，请更新浏览器或 Android System WebView 后重试。');
    }
    async function derive(password, salt) {
      checkCrypto();
      const material = await cryptoApi.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
      return cryptoApi.subtle.deriveKey({name:'PBKDF2',salt,iterations:600000,hash:'SHA-256'}, material, {name:'AES-GCM',length:256}, false, ['encrypt','decrypt']);
    }
    async function seal(name, key, data) {
      const iv = cryptoApi.getRandomValues(new Uint8Array(12));
      const ciphertext = await cryptoApi.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(name)}, key, encoder.encode(JSON.stringify(data)));
      return {iv:encode(iv),ciphertext:encode(new Uint8Array(ciphertext))};
    }
    function session(name, key, record, data) {
      let active = true, revision = record.revision, queue = Promise.resolve();
      const storageKey = PREFIX + encodeURIComponent(name);
      return {
        name, data,
        lock() { active = false; key = null; },
        save(next) {
          if (!active) return Promise.reject(new Error('请重新登录。'));
          const snapshot = JSON.parse(JSON.stringify(validateData(next)));
          const result = queue.catch(() => {}).then(async () => {
            if (!active) throw new Error('请重新登录。');
            const sealed = await seal(name, key, snapshot);
            if (!active) throw new Error('请重新登录。');
            await locks.request(storageKey, () => {
              if (!active) throw new Error('请重新登录。');
              const current = JSON.parse(storage.getItem(storageKey));
              if (!current || current.revision !== revision || current.salt !== record.salt) throw new Error('此账号已在其他页面更改。请先导出本页资料，再退出并重新登录。');
              const updated = {...record,...sealed,revision:revision+1};
              storage.setItem(storageKey, JSON.stringify(updated));
              record = updated; revision = updated.revision;
            });
          });
          queue = result;
          return result;
        }
      };
    }
    return {
      async register(input, password) {
        checkCrypto();
        const name = username(input), storageKey = PREFIX + encodeURIComponent(name);
        if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new Error('密码需要 8–128 个字符。');
        if (storage.getItem(storageKey) !== null) throw new Error('这个账号已存在，请直接登录。');
        const salt = cryptoApi.getRandomValues(new Uint8Array(16)), key = await derive(password, salt), data = C.emptyWorkspace();
        const record = {version:1,name,salt:encode(salt),revision:1,...await seal(name,key,data)};
        // Re-check after async crypto so two tabs cannot replace a newly created account.
        await locks.request(storageKey, () => {
          if (storage.getItem(storageKey) !== null) throw new Error('这个账号已存在，请直接登录。');
          storage.setItem(storageKey,JSON.stringify(record));
        });
        return session(name,key,record,data);
      },
      async login(input, password) {
        checkCrypto();
        const name = username(input), raw = storage.getItem(PREFIX+encodeURIComponent(name));
        if (!raw) throw new Error('账号不存在或密码不正确。');
        let record, key, data;
        try {
          record = JSON.parse(raw);
          if (record.version !== 1 || record.name !== name || !Number.isSafeInteger(record.revision)) throw new Error();
          key = await derive(password,decode(record.salt));
          const plain = await cryptoApi.subtle.decrypt({name:'AES-GCM',iv:decode(record.iv),additionalData:encoder.encode(name)},key,decode(record.ciphertext));
          data = validateData(JSON.parse(decoder.decode(plain)));
        } catch { throw new Error('密码不正确，或账号资料已损坏。'); }
        return session(name,key,record,data);
      }
    };
  }
  const api = {createAccountStore};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ThreePagesAccounts = api;
})(typeof window !== 'undefined' ? window : globalThis);
