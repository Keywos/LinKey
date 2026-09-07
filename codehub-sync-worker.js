// =========================
// 安全跨域 (CORS) 配置
// =========================

const getCorsHeaders = (request, env) => {
  const origin = request.headers.get("Origin") || "";

  // 从 env.ALLOWED_ORIGINS 读取白名单（支持英文逗号分隔多个域名）
  // 例如在 Worker 环境变量中设置: ALLOWED_ORIGINS = "http://127.0.0.1:8888,https://xn--ji8h.eu.org"
  const envOrigins = (env?.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // 默认白名单（当 Worker 环境变量未配置时作为兜底）
  const defaultOrigins = ["https://xn--ji8h.eu.org", "https://ikey.eu.org"];

  const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;

  // 检查请求的 Origin 是否在允许的白名单列表中
  const isAllowed = allowedOrigins.includes(origin);

  // 如果在白名单内，把当前的 origin 原样返回给浏览器；否则返回 null 拒绝跨域
  const allowOrigin = isAllowed ? origin : "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin", // 告诉浏览器和 CDN 根据请求 Origin 区分缓存
  };
};

// 单个文件最大大小限制（50MB）
const MAX_PAYLOAD_SIZE = 50 * 1024 * 1024;

// =========================
// 安全限制
// =========================

// 认证失败记录
// key: IP 维度（防止每次换不同密码绕过限流）
// value: { count, lastFailedAt }
const authFailures = new Map();

// 失败次数对应的延迟配置
const AUTH_DELAY_BASE = 1000; // 基础延迟 1 秒
const AUTH_DELAY_MAX = 60000; // 最大延迟 60 秒
const AUTH_FAILURE_TTL = 10 * 60 * 1000; // 10 分钟后自动重置

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getClientIP = (request) =>
  request.headers.get("CF-Connecting-IP") ||
  request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
  "unknown";

// 按客户端 IP 进行失败计数，防止攻击者通过每次更换 token 绕过频率限制
const getAuthFailureKey = (request) => {
  const ip = getClientIP(request);
  return `auth_fail:${ip}`;
};

const timingSafeEqualString = async (a, b) => {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(hashA, hashB);
};

// 延迟梯度：前 3 次错误不限制（delay = 0），第 4 次起开始指数级增加延迟
const getAuthDelay = (count) => {
  if (count <= 3) return 0;
  return Math.min(AUTH_DELAY_BASE * Math.pow(2, count - 4), AUTH_DELAY_MAX);
};

const recordAuthFailure = (key) => {
  const now = Date.now();
  const old = authFailures.get(key);
  if (!old || now - old.lastFailedAt > AUTH_FAILURE_TTL) {
    const item = {
      count: 1,
      lastFailedAt: now,
    };

    authFailures.set(key, item);
    return item.count;
  }

  const item = {
    count: old.count + 1,
    lastFailedAt: now,
  };

  authFailures.set(key, item);
  return item.count;
};

const clearAuthFailure = (key) => {
  authFailures.delete(key);
};

const cleanupAuthFailures = () => {
  const now = Date.now();

  for (const [key, value] of authFailures) {
    if (now - value.lastFailedAt > AUTH_FAILURE_TTL) {
      authFailures.delete(key);
    }
  }
};

export default {
  async fetch(request, env) {
    // 动态生成符合安全白名单的 CORS 响应头
    const corsHeaders = getCorsHeaders(request, env);

    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    cleanupAuthFailures();

    if (!env.SYNC_TOKEN) {
      return json(
        {
          error:
            "Server error: SYNC_TOKEN is not configured in Worker settings",
        },
        500,
      );
    }

    const authHeader = (request.headers.get("Authorization") || "").trim();
    const expectedAuth = `Bearer ${env.SYNC_TOKEN.trim()}`;
    const failureKey = getAuthFailureKey(request);

    const isAuthorized = await timingSafeEqualString(authHeader, expectedAuth);

    // 认证失败
    if (!isAuthorized) {
      const failureCount = recordAuthFailure(failureKey);
      const delay = getAuthDelay(failureCount);

      if (delay > 0) {
        await sleep(delay);
      }

      return json(
        {
          error: "no router",
        },
        401,
      );
    }

    clearAuthFailure(failureKey);

    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/index") {
      if (request.method === "GET") {
        const object = await env.CODEHUB_BUCKET.get("index.json");

        if (!object) {
          return json({ index: null });
        }

        const raw = await object.text();
        try {
          const index = JSON.parse(raw);
          return json({ index });
        } catch {
          return json({ index: raw });
        }
      }

      if (request.method === "PUT") {
        const contentLength = Number(
          request.headers.get("Content-Length") || 0,
        );
        if (contentLength > MAX_PAYLOAD_SIZE) {
          return json({ error: "Payload too large (max 50MB)" }, 413);
        }

        const content = await request.text();
        if (content.length > MAX_PAYLOAD_SIZE) {
          return json({ error: "Payload too large (max 50MB)" }, 413);
        }

        await env.CODEHUB_BUCKET.put("index.json", content, {
          httpMetadata: {
            contentType: "text/plain; charset=utf-8",
          },
        });

        return json({ ok: true });
      }

      return json({ error: "Method not allowed" }, 405);
    }

    const fileMatch = pathname.match(/^\/files\/([^/]+)$/);

    if (fileMatch) {
      const fileId = decodeURIComponent(fileMatch[1]);

      if (!fileId || /[\/\\]/.test(fileId) || fileId.includes("..")) {
        return json({ error: "Invalid fileId" }, 400);
      }

      const key = `files/${fileId}`;

      if (request.method === "GET") {
        const object = await env.CODEHUB_BUCKET.get(key);

        if (!object) {
          return new Response("404", {
            status: 404,
            headers: corsHeaders,
          });
        }

        const text = await object.text();

        return new Response(text, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "text/plain; charset=utf-8",
          },
        });
      }

      if (request.method === "PUT") {
        const contentLength = Number(
          request.headers.get("Content-Length") || 0,
        );
        if (contentLength > MAX_PAYLOAD_SIZE) {
          return json({ error: "Payload too large (max 50MB)" }, 413);
        }

        const content = await request.text();
        if (content.length > MAX_PAYLOAD_SIZE) {
          return json({ error: "Payload too large (max 50MB)" }, 413);
        }

        await env.CODEHUB_BUCKET.put(key, content, {
          httpMetadata: {
            contentType: "text/plain; charset=utf-8",
          },
        });

        return json({
          ok: true,
          id: fileId,
        });
      }

      if (request.method === "DELETE") {
        await env.CODEHUB_BUCKET.delete(key);
        return json({
          ok: true,
          id: fileId,
          deleted: true,
        });
      }

      return json({ error: "Method not allowed" }, 405);
    }

    if (pathname === "/snapshot") {
      if (request.method === "GET") {
        const object = await env.CODEHUB_BUCKET.get("snapshot.json");

        if (!object) {
          return json({
            snapshot: null,
          });
        }

        const snapshot = await object.json();

        return json({
          snapshot,
        });
      }

      if (request.method === "PUT") {
        const snapshot = await request.json();

        await env.CODEHUB_BUCKET.put(
          "snapshot.json",
          JSON.stringify(snapshot),
          {
            httpMetadata: {
              contentType: "application/json",
            },
          },
        );

        return json({
          ok: true,
          snapshot,
        });
      }

      return json({ error: "Method not allowed" }, 405);
    }
    return json({ error: "404" }, 404);
  },
};
