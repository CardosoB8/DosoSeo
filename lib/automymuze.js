'use strict';

// ============================================================================
// AUTO MYMUZE — Módulo completo (reset às 03:00 MZ)
// ============================================================================
// ÍNDICE:
//   SEÇÃO 1  — CONFIG
//   SEÇÃO 2  — CRYPTO
//   SEÇÃO 3  — REDIS KEYS
//   SEÇÃO 4  — HTTP CLIENT + DATA "MYMUZE"
//   SEÇÃO 5  — KEYS
//   SEÇÃO 6  — FREE TRIAL
//   SEÇÃO 7  — TICK (controle "já atualizou hoje" com reset às 03:00 MZ)
//   SEÇÃO 8  — CRON
//   SEÇÃO 9  — ENDPOINTS PÚBLICOS + /internal/tick
//   SEÇÃO 10 — ENDPOINTS ADMIN
//   SEÇÃO 11 — REGISTRO
// ============================================================================


// ============================================================================
// SEÇÃO 1 — CONFIG
// ============================================================================

const AMZ_CONFIG = {
  MYMUZE_APP_KEY: process.env.MYMUZE_APP_KEY || 'jq684h6gxdk65iuy',
  MYMUZE_MASTER_PASSWORD: process.env.MYMUZE_MASTER_PASSWORD || 'MovTV@2026#SecureKey!',
  COUNTRY_ISO3: 'MOZ',

  CRON_SCHEDULE: process.env.AMZ_CRON_SCHEDULE || '*/10 * * * *',
  CRON_TIMEZONE: process.env.AMZ_TIMEZONE || 'Africa/Maputo',
  RATE_PER_MIN: parseInt(process.env.AMZ_RATE_PER_MIN || '20', 10),
  CONCURRENCY: parseInt(process.env.AMZ_CONCURRENCY || '3', 10),

  BATCH_SIZE: parseInt(process.env.AMZ_BATCH_SIZE || '30', 10),

  FREE_TRIAL_DAYS: parseInt(process.env.AMZ_FREE_TRIAL_DAYS || '15', 10),
  PAID_DAYS_DEFAULT: parseInt(process.env.AMZ_PAID_DAYS_DEFAULT || '30', 10),
  KEY_EXPIRY_HOURS: parseInt(process.env.AMZ_KEY_EXPIRY_HOURS || '168', 10),
  GRACE_DAYS: parseInt(process.env.AMZ_GRACE_DAYS || '7', 10),
  FAIL_PAUSE_HOURS: parseInt(process.env.AMZ_FAIL_PAUSE_HOURS || '6', 10),

  PROXY_LIST: (process.env.PROXY_LIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  WHATSAPP_NUMBER: process.env.AMZ_WHATSAPP_NUMBER || '258858861745',

  PROFILE_CACHE_MS: 24 * 3600 * 1000,
  LOCK_TTL_SECONDS: 90,

  CRON_TOKEN_FALLBACK: 'amz-cron-secret-2026-x7Kp9mN3vBq8sL2rT',

  // Hora (MZ) em que o MyMuze vira o dia útil
  MYMUZE_RESET_HOUR_MZ: 3,
};


// ============================================================================
// SEÇÃO 2 — CRYPTO
// ============================================================================

const crypto = require('crypto');

const AMZ_CRYPTO = (() => {
  const SALT = Buffer.from([
    0x4a, 0x8f, 0x2c, 0x11, 0x7e, 0x3b, 0x9d, 0x5a,
    0x1f, 0x6c, 0x8e, 0x2d, 0x4b, 0x7a, 0x3f, 0x9c,
  ]);
  const ITERATIONS = 10000;
  const KEY_SIZE = 32;

  function getKey() {
    return crypto.pbkdf2Sync(
      AMZ_CONFIG.MYMUZE_MASTER_PASSWORD,
      SALT,
      ITERATIONS,
      KEY_SIZE,
      'sha256'
    );
  }

  return {
    encrypt(plain) {
      if (!plain) return '';
      const key = getKey();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(plain, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      return Buffer.concat([iv, Buffer.from(encrypted, 'base64')]).toString('base64');
    },
    decrypt(ciphertext) {
      if (!ciphertext) return '';
      try {
        const key = getKey();
        const buf = Buffer.from(ciphertext, 'base64');
        const iv = buf.slice(0, 16);
        const encrypted = buf.slice(16).toString('base64');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch (e) {
        console.error('[amz:crypto] falha ao descriptografar:', e.message);
        return '';
      }
    },
  };
})();


// ============================================================================
// SEÇÃO 3 — REDIS KEYS
// ============================================================================

const AMZ_KEYS = {
  user: (msisdn) => `amz:user:${msisdn}`,
  userHome: (msisdn) => `amz:home:${msisdn}`,
  userProfile: (msisdn) => `amz:profile:${msisdn}`,
  key: (codigo) => `amz:key:${codigo}`,
  lock: (msisdn) => `amz:lock:${msisdn}`,
  freeTrialsUsed: 'amz:free_trials_used',
  updateQueue: 'amz:update_queue',
  stats: 'amz:stats',
};


// ============================================================================
// SEÇÃO 4 — HTTP CLIENT + DATA "MYMUZE"
// ============================================================================

const https = require('https');

let AMZ_PROXY_AGENTS = [];
try {
  const { HttpsProxyAgent } = require('https-proxy-agent');
  AMZ_PROXY_AGENTS = AMZ_CONFIG.PROXY_LIST
    .map((p) => {
      try {
        return new HttpsProxyAgent(p);
      } catch (e) {
        console.error('[amz:client] proxy inválido:', p);
        return null;
      }
    })
    .filter(Boolean);
} catch (e) {
  if (AMZ_CONFIG.PROXY_LIST.length > 0) {
    console.warn('[amz:client] https-proxy-agent não instalado, proxy ignorado');
  }
}

let amzProxyIndex = 0;
function amzPickAgent() {
  if (AMZ_PROXY_AGENTS.length === 0) return undefined;
  const agent = AMZ_PROXY_AGENTS[amzProxyIndex % AMZ_PROXY_AGENTS.length];
  amzProxyIndex++;
  return agent;
}

function amzSleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================
// ⭐ DATA "MYMUZE" — vira às 03:00 MZ (UTC+2), não à meia-noite
// ============================================================
// Se estiver entre 00:00 e 02:59 MZ, ainda pertence ao dia anterior
// (o MyMuze atualiza o conteúdo às 03:00 MZ)
function amzTodayDate() {
  const now = new Date();
  // Passa pra UTC+2 (Moçambique)
  const mz = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  // Se estiver antes das 03:00 MZ, ainda é "dia anterior" no MyMuze
  if (mz.getUTCHours() < AMZ_CONFIG.MYMUZE_RESET_HOUR_MZ) {
    mz.setUTCDate(mz.getUTCDate() - 1);
  }
  return mz.toISOString().split('T')[0];
}

// Retorna o timestamp do próximo "reset MyMuze" (próxima 03:00 MZ)
function amzNextResetMs() {
  const now = new Date();
  // Agora em MZ (UTC+2)
  const mz = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const resetHour = AMZ_CONFIG.MYMUZE_RESET_HOUR_MZ;

  // Próximo reset em MZ
  const next = new Date(mz);
  next.setUTCHours(resetHour, 0, 0, 0);
  if (next.getTime() <= mz.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  // Converte de volta pra UTC real
  return next.getTime() - 2 * 60 * 60 * 1000;
}

// Retorna o timestamp da ÚLTIMA 03:00 MZ (início do "dia útil atual")
function amzLastResetMs() {
  const now = new Date();
  const mz = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const resetHour = AMZ_CONFIG.MYMUZE_RESET_HOUR_MZ;

  const last = new Date(mz);
  last.setUTCHours(resetHour, 0, 0, 0);
  if (last.getTime() > mz.getTime()) {
    last.setUTCDate(last.getUTCDate() - 1);
  }

  return last.getTime() - 2 * 60 * 60 * 1000;
}

const AMZ_CLIENT = (() => {
  async function rawRequest(method, path, { body, token, noAuth, timeoutMs = 15000 } = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'X-KUACK-APP': AMZ_CONFIG.MYMUZE_APP_KEY,
    };
    if (!noAuth && token) headers.Authorization = `Bearer ${token}`;

    const agent = amzPickAgent();
    const payload = body ? JSON.stringify(body) : undefined;

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.prod.kuackmedia.com',
          path: `/api${path}`,
          method,
          headers,
          agent,
          timeout: timeoutMs,
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            let parsed;
            try {
              parsed = data ? JSON.parse(data) : null;
            } catch {
              parsed = data;
            }
            resolve({
              status: res.statusCode,
              ok: res.statusCode >= 200 && res.statusCode < 300,
              data: parsed,
            });
          });
        }
      );
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  async function api(method, path, opts = {}) {
    const retries = opts.retries ?? 2;
    let lastErr;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await rawRequest(method, path, opts);
      } catch (e) {
        lastErr = e;
        if (attempt < retries) {
          await amzSleep(1000 * Math.pow(2, attempt));
          continue;
        }
      }
    }
    throw new Error(`[amz:client] ${method} ${path} falhou: ${lastErr?.message}`);
  }

  return {
    api,
    sendOtp: (msisdn, deviceId) =>
      api('POST', '/auth/device/send_otp', {
        noAuth: true,
        body: { msisdn, countryIsoCode: AMZ_CONFIG.COUNTRY_ISO3, deviceId },
      }),
    loginOtp: (msisdn, deviceId, otp) =>
      api('POST', '/login/otp', {
        noAuth: true,
        body: { msisdn, countryIsoCode: AMZ_CONFIG.COUNTRY_ISO3, deviceId, otp },
      }),
    renewToken: (refreshToken) =>
      api('POST', '/auth/token', {
        noAuth: true,
        body: { grantType: 'refresh_token', token: refreshToken },
        retries: 1,
      }),
    getProfile: (accessToken) =>
      api('GET', '/me/profile?ignore-app-data=1', { token: accessToken }),
    getHomeUpdateDate: (accessToken) =>
      api('GET', '/home/updateDate', { token: accessToken }),
    getHome: (accessToken, updateDate) =>
      api(
        'GET',
        updateDate ? `/home?updateDate=${encodeURIComponent(updateDate)}` : '/home',
        { token: accessToken }
      ),
    hasProxy: AMZ_PROXY_AGENTS.length > 0,
  };
})();


// ============================================================================
// SEÇÃO 5 — KEYS (chaves de renovação)
// ============================================================================

const AMZ_KEYSLIB = (() => {
  function generateCodigo() {
    const raw = crypto.randomBytes(6).toString('hex').toUpperCase();
    return `AMZ-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
  }

  async function createKey(redis, { msisdn, dias, adminUser }) {
    if (!msisdn || !/^\d{9,15}$/.test(msisdn)) throw new Error('MSISDN inválido');
    const d = parseInt(dias || AMZ_CONFIG.PAID_DAYS_DEFAULT, 10);
    if (!Number.isInteger(d) || d < 1 || d > 365) throw new Error('Dias inválido');

    let codigo;
    for (let i = 0; i < 5; i++) {
      codigo = generateCodigo();
      const exists = await redis.exists(AMZ_KEYS.key(codigo));
      if (!exists) break;
      codigo = null;
    }
    if (!codigo) throw new Error('Não consegui gerar código único');

    const now = Date.now();
    const expiraEm = now + AMZ_CONFIG.KEY_EXPIRY_HOURS * 3600 * 1000;

    await redis.hSet(AMZ_KEYS.key(codigo), {
      codigo,
      msisdn_destino: String(msisdn),
      dias: String(d),
      criada_em: String(now),
      expira_em: String(expiraEm),
      usada_em: '',
      status: 'nova',
      criada_por: adminUser || 'admin',
    });

    return { codigo, dias: d, expira_em: expiraEm, msisdn_destino: msisdn };
  }

  async function getKey(redis, codigo) {
    const data = await redis.hGetAll(AMZ_KEYS.key(codigo));
    if (!data || Object.keys(data).length === 0) return null;
    return data;
  }

  async function validateKeyForMsisdn(redis, codigo, msisdn) {
    const key = await getKey(redis, codigo);
    if (!key) return { valid: false, reason: 'nao_existe' };
    if (key.status === 'cancelada') return { valid: false, reason: 'cancelada' };
    if (Number(key.expira_em) < Date.now()) return { valid: false, reason: 'expirada' };
    if (String(key.msisdn_destino) !== String(msisdn)) return { valid: false, reason: 'msisdn_diferente' };
    if (key.status === 'usada') return { valid: true, key, alreadyUsed: true };
    return { valid: true, key };
  }

  async function markKeyUsed(redis, codigo) {
    await redis.hSet(AMZ_KEYS.key(codigo), {
      usada_em: String(Date.now()),
      status: 'usada',
    });
  }

  async function cancelKey(redis, codigo) {
    const key = await getKey(redis, codigo);
    if (!key) return false;
    await redis.hSet(AMZ_KEYS.key(codigo), { status: 'cancelada' });
    return true;
  }

  async function* scanKeys(redis, pattern, count = 200) {
    let cursor = '0';
    do {
      const reply = await redis.scan(cursor, { MATCH: pattern, COUNT: count });
      cursor = reply.cursor;
      yield reply.keys || [];
    } while (cursor !== '0');
  }

  async function listKeys(redis, { status = null, limit = 100 } = {}) {
    const results = [];
    for await (const batch of scanKeys(redis, 'amz:key:*', 200)) {
      for (const keyName of batch) {
        const data = await redis.hGetAll(keyName);
        if (!data || !data.codigo) continue;
        if (status && data.status !== status) continue;
        results.push(data);
      }
      if (results.length >= limit) break;
    }
    results.sort((a, b) => Number(b.criada_em) - Number(a.criada_em));
    return results.slice(0, limit);
  }

  return { generateCodigo, createKey, getKey, validateKeyForMsisdn, markKeyUsed, cancelKey, listKeys, scanKeys };
})();


// ============================================================================
// SEÇÃO 6 — FREE TRIAL
// ============================================================================

const AMZ_FREETRIAL = (() => {
  async function canUseFreeTrial(redis, msisdn) {
    const used = await redis.sIsMember(AMZ_KEYS.freeTrialsUsed, String(msisdn));
    return !used;
  }

  async function markFreeTrialUsed(redis, msisdn) {
    await redis.sAdd(AMZ_KEYS.freeTrialsUsed, String(msisdn));
  }

  async function startFreeTrial(redis, msisdn, deviceId, fingerprint) {
    if (!msisdn || !/^\d{9,15}$/.test(msisdn)) {
      return { ok: false, reason: 'msisdn_invalido' };
    }
    const canUse = await canUseFreeTrial(redis, msisdn);
    if (!canUse) return { ok: false, reason: 'teste_ja_usado' };

    const existing = await redis.hGetAll(AMZ_KEYS.user(msisdn));
    if (existing && existing.refresh_token_enc && existing.refresh_token_enc.length > 0) {
      return { ok: false, reason: 'ja_tem_sessao' };
    }

    const now = Date.now();
    const fim = now + AMZ_CONFIG.FREE_TRIAL_DAYS * 24 * 3600 * 1000;

    await redis.hSet(AMZ_KEYS.user(msisdn), {
      plano: 'free_trial',
      plano_inicio: String(now),
      plano_fim: String(fim),
      otp_needed: 'true',
      otp_needed_at: String(now),
      device_id: deviceId || '',
      fingerprint: fingerprint || '',
      created_at: String(now),
      updated_at: String(now),
      fail_count_consecutive: '0',
      last_update_ok: '0',
      last_update_attempt: '0',
      last_update_date: '',
    });

    await markFreeTrialUsed(redis, msisdn);
    return { ok: true, plano: 'free_trial', dias: AMZ_CONFIG.FREE_TRIAL_DAYS, plano_fim: fim };
  }

  return { canUseFreeTrial, markFreeTrialUsed, startFreeTrial };
})();


// ============================================================================
// SEÇÃO 7 — TICK (controle "já atualizou hoje" com reset às 03:00 MZ)
// ============================================================================

const AMZ_TICK = (() => {
  function jitter(ms) {
    return Math.floor(Math.random() * ms);
  }

  // ⭐ Reagenda pro próximo "reset MyMuze" (próxima 03:00 MZ) + jitter de até 2h
  // Isso evita que todos caiam exatamente na mesma hora
  function calcNextUpdate() {
    const nextReset = amzNextResetMs();
    // + jitter de até 2h APÓS o reset (pra espalhar)
    return nextReset + jitter(2 * 3600 * 1000);
  }

  async function processOne(redis, msisdn) {
    const lockKey = AMZ_KEYS.lock(msisdn);
    const locked = await redis.set(lockKey, '1', { NX: true, EX: AMZ_CONFIG.LOCK_TTL_SECONDS });
    if (!locked) return { msisdn, skipped: 'locked' };

    try {
      const userKey = AMZ_KEYS.user(msisdn);
      const user = await redis.hGetAll(userKey);
      if (!user || !user.plano) return { msisdn, skipped: 'sem_plano' };

      // ⭐ CONTROLE: já atualizou no "dia MyMuze" atual?
      const hoje = amzTodayDate();
      if (user.last_update_date === hoje) {
        await redis.zRem(AMZ_KEYS.updateQueue, msisdn);
        return { msisdn, skipped: 'ja_atualizado_hoje' };
      }

      const planoFim = Number(user.plano_fim) || 0;
      if (planoFim > 0 && Date.now() > planoFim + AMZ_CONFIG.GRACE_DAYS * 24 * 3600 * 1000) {
        await redis.hSet(userKey, { plano: 'expired_grace' });
        await redis.zRem(AMZ_KEYS.updateQueue, msisdn);
        return { msisdn, skipped: 'expired_grace' };
      }

      if (user.otp_needed === 'true') {
        await redis.zRem(AMZ_KEYS.updateQueue, msisdn);
        return { msisdn, skipped: 'otp_needed' };
      }

      if (!user.refresh_token_enc) {
        await redis.hSet(userKey, { otp_needed: 'true', otp_needed_at: String(Date.now()) });
        await redis.zRem(AMZ_KEYS.updateQueue, msisdn);
        return { msisdn, skipped: 'sem_refresh_token' };
      }

      const lastAttempt = Number(user.last_update_attempt) || 0;
      const failCount = Number(user.fail_count_consecutive) || 0;
      if (failCount >= 3 && Date.now() - lastAttempt < AMZ_CONFIG.FAIL_PAUSE_HOURS * 3600 * 1000) {
        await redis.zRem(AMZ_KEYS.updateQueue, msisdn);
        return { msisdn, skipped: 'pausa_apos_falhas' };
      }

      const refreshToken = AMZ_CRYPTO.decrypt(user.refresh_token_enc);
      if (!refreshToken) {
        await redis.hSet(userKey, {
          otp_needed: 'true',
          otp_needed_at: String(Date.now()),
          fail_count_consecutive: String(failCount + 1),
          last_update_attempt: String(Date.now()),
        });
        await redis.zRem(AMZ_KEYS.updateQueue, msisdn);
        return { msisdn, error: 'refresh_token_corrompido' };
      }

      const tokenRes = await AMZ_CLIENT.renewToken(refreshToken);

      if (tokenRes.status === 401 || tokenRes.status === 403) {
        await redis.hSet(userKey, {
          otp_needed: 'true',
          otp_needed_at: String(Date.now()),
          fail_count_consecutive: String(failCount + 1),
          last_update_attempt: String(Date.now()),
        });
        await redis.zRem(AMZ_KEYS.updateQueue, msisdn);
        return { msisdn, error: 'otp_necessario', status: tokenRes.status };
      }

      if (tokenRes.status === 204 || !tokenRes.ok) {
        if (!user.access_token) {
          await redis.hSet(userKey, {
            otp_needed: 'true',
            otp_needed_at: String(Date.now()),
            fail_count_consecutive: String(failCount + 1),
            last_update_attempt: String(Date.now()),
          });
          await redis.zRem(AMZ_KEYS.updateQueue, msisdn);
          return { msisdn, error: 'sem_access_token' };
        }
      }

      const accessToken = tokenRes.ok && tokenRes.data?.accessToken
        ? tokenRes.data.accessToken
        : user.access_token;
      const newRefresh = tokenRes.ok && tokenRes.data?.refreshToken
        ? tokenRes.data.refreshToken
        : refreshToken;

      // Profile (cache 24h)
      const profileKey = AMZ_KEYS.userProfile(msisdn);
      const profileCached = await redis.get(profileKey);
      let profile = null;
      if (profileCached) {
        try { profile = JSON.parse(profileCached); } catch {}
      } else {
        const p = await AMZ_CLIENT.getProfile(accessToken);
        if (p.ok && p.data) {
          profile = p.data;
          await redis.setEx(profileKey, Math.floor(AMZ_CONFIG.PROFILE_CACHE_MS / 1000), JSON.stringify(profile));
        }
      }

      // Home (só busca se updateDate mudou)
      let homeUpdated = false;
      try {
        const updRes = await AMZ_CLIENT.getHomeUpdateDate(accessToken);
        const newUpdateDate = updRes.ok ? updRes.data?.new_home : null;
        if (newUpdateDate) {
          const homeKey = AMZ_KEYS.userHome(msisdn);
          const cachedDate = await redis.hGet(homeKey, 'update_date');
          if (String(cachedDate) !== String(newUpdateDate)) {
            const homeRes = await AMZ_CLIENT.getHome(accessToken, newUpdateDate);
            if (homeRes.ok && homeRes.data) {
              await redis.hSet(homeKey, {
                update_date: String(newUpdateDate),
                data: JSON.stringify(homeRes.data),
                fetched_at: String(Date.now()),
              });
              homeUpdated = true;
            }
          }
        }
      } catch (e) {
        console.warn(`[amz:tick] home falhou ${msisdn}:`, e.message);
      }

      const now = Date.now();
      const next = calcNextUpdate();

      await redis.hSet(userKey, {
        refresh_token_enc: AMZ_CRYPTO.encrypt(newRefresh),
        access_token: accessToken,
        access_token_exp: String(now + 600 * 1000),
        last_update_ok: String(now),
        last_update_attempt: String(now),
        last_update_date: hoje,
        fail_count_consecutive: '0',
        next_update_scheduled: String(next),
        updated_at: String(now),
      });

      await redis.zAdd(AMZ_KEYS.updateQueue, { score: next, value: msisdn });
      await redis.hIncrBy(AMZ_KEYS.stats, 'ok_24h', 1);

      return { msisdn, ok: true, homeUpdated, profile: !!profile };
    } catch (e) {
      const userKey = AMZ_KEYS.user(msisdn);
      const user = await redis.hGetAll(userKey);
      const failCount = Number(user?.fail_count_consecutive || 0) + 1;
      const next = Date.now() + 30 * 60 * 1000;
      await redis.hSet(userKey, {
        fail_count_consecutive: String(failCount),
        last_update_attempt: String(Date.now()),
        next_update_scheduled: String(next),
      });
      await redis.zAdd(AMZ_KEYS.updateQueue, { score: next, value: msisdn });
      await redis.hIncrBy(AMZ_KEYS.stats, 'fail_24h', 1);
      return { msisdn, error: e.message };
    } finally {
      await redis.del(lockKey);
    }
  }

  async function tick(redis) {
    const now = Date.now();
    const today = amzTodayDate();

    // Só processa se já passou do reset (03:00 MZ) ou se o usuário ainda não foi processado hoje
    // (Não precisa filtrar por hora — o `last_update_date` já faz esse controle)

    const ready = await redis.zRangeByScore(AMZ_KEYS.updateQueue, '-inf', now, {
      LIMIT: { offset: 0, count: AMZ_CONFIG.BATCH_SIZE },
    });

    if (!ready || ready.length === 0) {
      await redis.hSet(AMZ_KEYS.stats, 'last_cron_run', String(now));
      return { processed: 0, ok: 0, errors: 0, skipped: 0, batchSize: 0, today_mz: today };
    }

    const results = [];
    let idx = 0;
    const CONCURRENCY = AMZ_CONFIG.CONCURRENCY;

    async function worker() {
      while (idx < ready.length) {
        const msisdn = ready[idx++];
        try {
          results.push(await processOne(redis, msisdn));
        } catch (e) {
          results.push({ msisdn, error: e.message });
        }
      }
    }

    await Promise.all(
      Array(Math.min(CONCURRENCY, ready.length)).fill(0).map(() => worker())
    );

    await redis.hSet(AMZ_KEYS.stats, 'last_cron_run', String(now));

    return {
      processed: results.length,
      ok: results.filter((r) => r.ok).length,
      errors: results.filter((r) => r.error).length,
      skipped: results.filter((r) => r.skipped).length,
      batchSize: ready.length,
      today_mz: today,
      details: results,
    };
  }

  return { tick, processOne, amzTodayDate, amzNextResetMs, amzLastResetMs };
})();


// ============================================================================
// SEÇÃO 8 — CRON (interno — não roda no Vercel)
// ============================================================================

const AMZ_CRON = (() => {
  let cronLib = null;
  try { cronLib = require('node-cron'); } catch { cronLib = null; }

  let running = false;
  let lastRunAt = 0;
  let scheduledTask = null;

  async function runTick(redis) {
    if (running) return;
    running = true;
    const startedAt = Date.now();
    try {
      const result = await AMZ_TICK.tick(redis);
      const dur = Date.now() - startedAt;
      console.log(
        `[amz:cron] tick ${result.processed}/${result.batchSize} | ok=${result.ok} err=${result.errors} skip=${result.skipped} | today=${result.today_mz} | ${dur}ms`
      );
      lastRunAt = Date.now();
    } catch (e) {
      console.error('[amz:cron] erro no tick:', e);
    } finally {
      running = false;
    }
  }

  function start(redis) {
    if (!redis) return console.error('[amz:cron] redis não fornecido');
    if (!cronLib) return console.error('[amz:cron] node-cron não instalado');

    console.log(`[amz:cron] iniciado | "${AMZ_CONFIG.CRON_SCHEDULE}" tz=${AMZ_CONFIG.CRON_TIMEZONE} batch=${AMZ_CONFIG.BATCH_SIZE} conc=${AMZ_CONFIG.CONCURRENCY} reset=${AMZ_CONFIG.MYMUZE_RESET_HOUR_MZ}:00 MZ`);

    setTimeout(() => runTick(redis).catch(() => {}), 5000);

    scheduledTask = cronLib.schedule(
      AMZ_CONFIG.CRON_SCHEDULE,
      () => runTick(redis).catch(() => {}),
      { timezone: AMZ_CONFIG.CRON_TIMEZONE }
    );
  }

  function status() {
    return { running, lastRunAt };
  }

  return { start, runTick, status };
})();


// ============================================================================
// SEÇÃO 9 — ENDPOINTS PÚBLICOS + /internal/tick
// ============================================================================

function amzFingerprint(req) {
  const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';
  const ua = req.headers['user-agent'] || '';
  return crypto.createHash('sha256').update(ip + ua).digest('hex').substring(0, 20);
}

function amzDeviceId() {
  return 'web-' + Math.random().toString(36).slice(2, 12);
}

const AMZ_ENDPOINTS = (app, redis) => {
  // GET /api/automymuze/status?msisdn=...
  app.get('/api/automymuze/status', async (req, res) => {
    try {
      const msisdn = String(req.query.msisdn || '').trim();
      if (!/^\d{9,15}$/.test(msisdn)) return res.status(400).json({ error: 'MSISDN inválido' });

      const user = await redis.hGetAll(AMZ_KEYS.user(msisdn));
      if (!user || !user.plano) {
        const canFree = await AMZ_FREETRIAL.canUseFreeTrial(redis, msisdn);
        return res.json({
          hasPlan: false,
          canFreeTrial: canFree,
          freeTrialDays: AMZ_CONFIG.FREE_TRIAL_DAYS,
        });
      }

      res.json({
        hasPlan: true,
        msisdn,
        plano: user.plano,
        plano_inicio: Number(user.plano_inicio) || null,
        plano_fim: Number(user.plano_fim) || null,
        otp_needed: user.otp_needed === 'true',
        last_update_ok: Number(user.last_update_ok) || null,
        last_update_date: user.last_update_date || '',
        hoje_mz: amzTodayDate(),
        proximo_reset_mz: amzNextResetMs(),
        ativo: user.plano === 'free_trial' || user.plano === 'paid',
      });
    } catch (e) {
      console.error('[amz:status]', e);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // POST /api/automymuze/free-trial { msisdn, deviceId? }
  app.post('/api/automymuze/free-trial', async (req, res) => {
    try {
      const msisdn = String(req.body.msisdn || '').trim();
      const deviceId = req.body.deviceId || amzDeviceId();
      const fp = amzFingerprint(req);

      const result = await AMZ_FREETRIAL.startFreeTrial(redis, msisdn, deviceId, fp);
      if (!result.ok) return res.status(400).json({ error: result.reason, ...result });

      await AMZ_CLIENT.sendOtp(msisdn, deviceId);
      res.json({ ok: true, ...result, deviceId, needsOtp: true });
    } catch (e) {
      console.error('[amz:free-trial]', e);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // POST /api/automymuze/verify-otp { msisdn, otp, deviceId }
  app.post('/api/automymuze/verify-otp', async (req, res) => {
    try {
      const msisdn = String(req.body.msisdn || '').trim();
      const otp = String(req.body.otp || '').trim();
      const deviceId = String(req.body.deviceId || '').trim();
      if (!msisdn || !otp || !deviceId) return res.status(400).json({ error: 'Dados incompletos' });

      const login = await AMZ_CLIENT.loginOtp(msisdn, deviceId, otp);
      if (!login.ok || !login.data?.refreshToken) {
        return res.status(401).json({ error: 'OTP inválido', detail: login.data });
      }

      const userKey = AMZ_KEYS.user(msisdn);
      const existing = await redis.hGetAll(userKey);
      if (!existing.plano) {
        const now = Date.now();
        const fim = now + AMZ_CONFIG.FREE_TRIAL_DAYS * 24 * 3600 * 1000;
        await redis.hSet(userKey, {
          plano: 'free_trial',
          plano_inicio: String(now),
          plano_fim: String(fim),
          created_at: String(now),
        });
        await AMZ_FREETRIAL.markFreeTrialUsed(redis, msisdn);
      }

      // ⭐ Agenda primeiro update pra agora + 60s (pega conteúdo do dia atual se já passou das 03:00)
      const next = Date.now() + 60 * 1000;
      await redis.hSet(userKey, {
        refresh_token_enc: AMZ_CRYPTO.encrypt(login.data.refreshToken),
        access_token: login.data.accessToken || '',
        access_token_exp: String(Date.now() + (login.data.expiresIn || 600) * 1000),
        otp_needed: 'false',
        otp_needed_at: '',
        device_id: deviceId,
        last_update_ok: '0',
        last_update_attempt: '0',
        last_update_date: '',
        fail_count_consecutive: '0',
        next_update_scheduled: String(next),
        updated_at: String(Date.now()),
      });

      await redis.zAdd(AMZ_KEYS.updateQueue, { score: next, value: msisdn });

      const updated = await redis.hGetAll(userKey);
      res.json({
        ok: true,
        plano: updated.plano,
        plano_fim: Number(updated.plano_fim),
        firstUpdateScheduled: next,
        today_mz: amzTodayDate(),
      });
    } catch (e) {
      console.error('[amz:verify-otp]', e);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // POST /api/automymuze/redeem-key { msisdn, codigo }
  app.post('/api/automymuze/redeem-key', async (req, res) => {
    try {
      const msisdn = String(req.body.msisdn || '').trim();
      const codigo = String(req.body.codigo || '').trim().toUpperCase();
      if (!msisdn || !codigo) return res.status(400).json({ error: 'Dados incompletos' });

      const validation = await AMZ_KEYSLIB.validateKeyForMsisdn(redis, codigo, msisdn);
      if (!validation.valid) {
        const map = {
          nao_existe: 'Chave não existe',
          cancelada: 'Chave cancelada',
          expirada: 'Chave expirada',
          msisdn_diferente: 'Essa chave é de outro número',
        };
        return res.status(400).json({ error: map[validation.reason] || 'Chave inválida' });
      }

      const dias = Number(validation.key.dias) || AMZ_CONFIG.PAID_DAYS_DEFAULT;
      const userKey = AMZ_KEYS.user(msisdn);
      const user = await redis.hGetAll(userKey);
      const now = Date.now();

      const planoBase = user?.plano_fim && Number(user.plano_fim) > now
        ? Number(user.plano_fim)
        : now;
      const novoFim = planoBase + dias * 24 * 3600 * 1000;

      await redis.hSet(userKey, {
        plano: 'paid',
        plano_inicio: user?.plano_inicio || String(now),
        plano_fim: String(novoFim),
        updated_at: String(now),
      });

      await AMZ_KEYSLIB.markKeyUsed(redis, codigo);

      const precisaOtp = !user?.refresh_token_enc || user?.otp_needed === 'true';
      if (!precisaOtp) {
        const next = now + 60 * 1000;
        await redis.hSet(userKey, { next_update_scheduled: String(next) });
        await redis.zAdd(AMZ_KEYS.updateQueue, { score: next, value: msisdn });
      }

      res.json({
        ok: true,
        dias,
        plano_fim: novoFim,
        precisaOtp,
        message: precisaOtp
          ? 'Chave aplicada! Agora faça login com OTP para ativar a automação.'
          : 'Chave aplicada! Automação renovada.',
      });
    } catch (e) {
      console.error('[amz:redeem-key]', e);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // DELETE /api/automymuze/account?msisdn=...
  app.delete('/api/automymuze/account', async (req, res) => {
    try {
      const msisdn = String(req.query.msisdn || '').trim();
      if (!/^\d{9,15}$/.test(msisdn)) return res.status(400).json({ error: 'MSISDN inválido' });

      await redis.del(AMZ_KEYS.user(msisdn));
      await redis.del(AMZ_KEYS.userHome(msisdn));
      await redis.del(AMZ_KEYS.userProfile(msisdn));
      await redis.zRem(AMZ_KEYS.updateQueue, msisdn);
      await redis.sRem(AMZ_KEYS.freeTrialsUsed, msisdn);

      res.json({ ok: true, message: 'Conta removida do auto MyMuze.' });
    } catch (e) {
      console.error('[amz:delete-account]', e);
      res.status(500).json({ error: 'Erro interno' });
    }
  });

  // ============================================================
  // GET/POST /internal/automymuze/tick
  // ============================================================
  const cronTickHandler = async (req, res) => {
    try {
      const authHeader = req.headers['authorization'] || '';
      const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const customToken = req.headers['x-cron-token'] || req.query.token;

      const expectedCronSecret = process.env.CRON_SECRET;
      const expectedCustomToken = process.env.AMZ_CRON_TOKEN || AMZ_CONFIG.CRON_TOKEN_FALLBACK;

      const isVercelCron = expectedCronSecret && bearerToken === expectedCronSecret;
      const isExternalCron = expectedCustomToken && customToken === expectedCustomToken;

      if (!isVercelCron && !isExternalCron) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await AMZ_TICK.tick(redis);
      res.json({
        ok: true,
        processed: result.processed,
        batchSize: result.batchSize,
        ok_count: result.ok,
        errors: result.errors,
        skipped: result.skipped,
        timestamp: Date.now(),
        today_mz: result.today_mz,
        proximo_reset_mz: amzNextResetMs(),
        source: isVercelCron ? 'vercel-cron' : 'external-cron',
      });
    } catch (e) {
      console.error('[amz:internal-tick]', e);
      res.status(500).json({ error: 'Erro interno', detail: e.message });
    }
  };

  app.get('/internal/automymuze/tick', cronTickHandler);
  app.post('/internal/automymuze/tick', cronTickHandler);
};


// ============================================================================
// SEÇÃO 10 — ENDPOINTS ADMIN
// ============================================================================

const AMZ_ADMIN_ENDPOINTS = (app, redis, requireAdmin) => {
  app.get('/admin/api/automymuze/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await redis.hGetAll(AMZ_KEYS.stats);
      const queueSize = await redis.zCard(AMZ_KEYS.updateQueue);
      const cron = AMZ_CRON.status();
      res.json({
        ok_24h: Number(stats.ok_24h) || 0,
        fail_24h: Number(stats.fail_24h) || 0,
        last_cron_run: Number(stats.last_cron_run) || 0,
        queueSize,
        cron,
        proxy: AMZ_CLIENT.hasProxy,
        today_mz: amzTodayDate(),
        proximo_reset_mz: amzNextResetMs(),
      });
    } catch (e) {
      res.status(500).json({ error: 'Erro' });
    }
  });

  app.get('/admin/api/automymuze/users', requireAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit || '100', 10);
      const users = [];
      for await (const batch of AMZ_KEYSLIB.scanKeys(redis, 'amz:user:*', 200)) {
        for (const userKey of batch) {
          const data = await redis.hGetAll(userKey);
          if (!data || !data.plano) continue;
          const msisdn = userKey.split(':').pop();
          users.push({
            msisdn,
            plano: data.plano,
            plano_fim: Number(data.plano_fim) || null,
            otp_needed: data.otp_needed === 'true',
            last_update_ok: Number(data.last_update_ok) || null,
            last_update_date: data.last_update_date || '',
            fail_count: Number(data.fail_count_consecutive) || 0,
            updated_at: Number(data.updated_at) || null,
          });
        }
        if (users.length >= limit) break;
      }
      users.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
      res.json({ users: users.slice(0, limit), total: users.length, today_mz: amzTodayDate() });
    } catch (e) {
      res.status(500).json({ error: 'Erro' });
    }
  });

  app.post('/admin/api/automymuze/user/:msisdn/extend', requireAdmin, async (req, res) => {
    try {
      const msisdn = req.params.msisdn;
      const dias = parseInt(req.body.dias || AMZ_CONFIG.PAID_DAYS_DEFAULT, 10);
      const userKey = AMZ_KEYS.user(msisdn);
      const user = await redis.hGetAll(userKey);
      if (!user || !user.plano) return res.status(404).json({ error: 'Não encontrado' });
      const now = Date.now();
      const base = Number(user.plano_fim) > now ? Number(user.plano_fim) : now;
      const novoFim = base + dias * 24 * 3600 * 1000;
      await redis.hSet(userKey, {
        plano: 'paid',
        plano_fim: String(novoFim),
        otp_needed: 'false',
        otp_needed_at: '',
        updated_at: String(now),
      });
      if (user.refresh_token_enc) {
        const next = now + 60 * 1000;
        await redis.zAdd(AMZ_KEYS.updateQueue, { score: next, value: msisdn });
      }
      res.json({ ok: true, plano_fim: novoFim, dias });
    } catch (e) {
      res.status(500).json({ error: 'Erro' });
    }
  });

  app.post('/admin/api/automymuze/user/:msisdn/cancel', requireAdmin, async (req, res) => {
    try {
      const msisdn = req.params.msisdn;
      const userKey = AMZ_KEYS.user(msisdn);
      const now = Date.now();
      await redis.hSet(userKey, {
        plano: 'expired_grace',
        plano_fim: String(now - 1),
        updated_at: String(now),
      });
      await redis.zRem(AMZ_KEYS.updateQueue, msisdn);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Erro' });
    }
  });

  app.post('/admin/api/automymuze/user/:msisdn/force-update', requireAdmin, async (req, res) => {
    try {
      const msisdn = req.params.msisdn;
      await redis.hSet(AMZ_KEYS.user(msisdn), { last_update_date: '' });
      const result = await AMZ_TICK.processOne(redis, msisdn);
      res.json({ ok: true, result });
    } catch (e) {
      res.status(500).json({ error: 'Erro' });
    }
  });

  app.get('/admin/api/automymuze/keys', requireAdmin, async (req, res) => {
    try {
      const keys = await AMZ_KEYSLIB.listKeys(redis, { status: req.query.status || null, limit: 200 });
      res.json({ keys });
    } catch (e) {
      res.status(500).json({ error: 'Erro' });
    }
  });

  app.post('/admin/api/automymuze/keys', requireAdmin, async (req, res) => {
    try {
      const msisdn = String(req.body.msisdn || '').trim();
      const dias = parseInt(req.body.dias || AMZ_CONFIG.PAID_DAYS_DEFAULT, 10);
      const created = await AMZ_KEYSLIB.createKey(redis, { msisdn, dias, adminUser: 'admin' });
      res.json({ ok: true, ...created });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/admin/api/automymuze/keys/:codigo/cancel', requireAdmin, async (req, res) => {
    try {
      const ok = await AMZ_KEYSLIB.cancelKey(redis, req.params.codigo.toUpperCase());
      if (!ok) return res.status(404).json({ error: 'Não encontrada' });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: 'Erro' });
    }
  });

  app.get('/admin/api/automymuze/config', requireAdmin, (req, res) => {
    res.json({
      whatsapp_number: AMZ_CONFIG.WHATSAPP_NUMBER,
      free_trial_days: AMZ_CONFIG.FREE_TRIAL_DAYS,
      paid_days_default: AMZ_CONFIG.PAID_DAYS_DEFAULT,
      batch_size: AMZ_CONFIG.BATCH_SIZE,
      concurrency: AMZ_CONFIG.CONCURRENCY,
      reset_hour_mz: AMZ_CONFIG.MYMUZE_RESET_HOUR_MZ,
    });
  });
};


// ============================================================================
// SEÇÃO 11 — REGISTRO
// ============================================================================

const AutoMyMuze = {
  start(redis) {
    AMZ_CRON.start(redis);
  },
  registerRoutes(app, redis, requireAdmin) {
    AMZ_ENDPOINTS(app, redis);
    AMZ_ADMIN_ENDPOINTS(app, redis, requireAdmin);
    console.log('[amz] rotas registradas | reset=' + AMZ_CONFIG.MYMUZE_RESET_HOUR_MZ + ':00 MZ');
  },
  __internal: {
    config: AMZ_CONFIG,
    crypto: AMZ_CRYPTO,
    keys: AMZ_KEYS,
    client: AMZ_CLIENT,
    keysLib: AMZ_KEYSLIB,
    freeTrial: AMZ_FREETRIAL,
    tick: AMZ_TICK,
    cron: AMZ_CRON,
  },
};

module.exports = AutoMyMuze;
