/* ===== Browser / Worker polyfills for Surge APIs ===== */
if (typeof $persistentStore === 'undefined' && typeof self !== 'undefined') {
  if (typeof $environment === 'undefined') {
    self.$environment = { 'surge-version': '920' }
  }

  if (typeof $persistentStore === 'undefined') {
    const _store = {}
    self.$persistentStore = {
      read(key) {
        if (typeof localStorage !== 'undefined') {
          try { return localStorage.getItem(key) } catch { return null }
        }
        return _store[key] ?? null
      },
      write(val, key) {
        if (typeof localStorage !== 'undefined') {
          try { localStorage.setItem(key, val); return true } catch { return false }
        }
        _store[key] = val
        return true
      },
    }
  }

  // 优先浏览器直连，失败则回退到 surgetool.com 代理
  const _fetchWithFallback = (url, headers, method, body) => {
    const opts = { method, headers: headers || {} }
    if (body && method !== 'GET') opts.body = body

    const fallback = () => {
      let proxyUrl = 'https://surgetool.com/api/fetch?url=' + encodeURIComponent(url)
      if (headers && Object.keys(headers).length > 0) {
        proxyUrl += '&headers=' + encodeURIComponent(JSON.stringify(headers))
      }
      return fetch(proxyUrl)
    }

    return fetch(url, opts).then(resp => {
      // status=0 表示跨域不透明响应，也回退到代理
      if (resp.status === 0) return fallback()
      return resp
    }).catch(() => fallback())
  }

  if (typeof $httpClient === 'undefined') {
    self.$httpClient = {
      get(request, callback) {
        if (typeof request === 'string') request = { url: request }
        _fetchWithFallback(request.url, request.headers, 'GET')
          .then(async (resp) => {
            const body = await resp.text()
            callback(null, {
              status: resp.status,
              statusCode: resp.status,
              headers: Object.fromEntries(resp.headers.entries()),
              body,
            }, body)
          })
          .catch((err) => callback(err.message || String(err)))
      },
      post(request, callback) {
        if (typeof request === 'string') request = { url: request }
        const method = (request.method || 'post').toUpperCase()
        _fetchWithFallback(request.url, request.headers, method, request.body)
          .then(async (resp) => {
            const body = await resp.text()
            callback(null, {
              status: resp.status,
              statusCode: resp.status,
              headers: Object.fromEntries(resp.headers.entries()),
              body,
            }, body)
          })
          .catch((err) => callback(err.message || String(err)))
      },
    }
  }

  if (typeof $task === 'undefined') {
    self.$task = {
      fetch(request) {
        const method = (request.method || 'get').toLowerCase()
        return _fetchWithFallback(request.url, request.headers, method, request.body)
          .then(async (resp) => ({
            statusCode: resp.status,
            headers: Object.fromEntries(resp.headers.entries()),
            body: await resp.text(),
          }))
          .catch((err) => Promise.reject({ error: err.message || String(err) }))
      },
    }
  }

  if (typeof $done === 'undefined') {
    self.$done = () => {}
  }

  if (typeof $utils === 'undefined') {
    const _geoCache = {}
    self.$utils = {
      geoip(ip) {
        if (_geoCache[ip]) return _geoCache[ip].country_code || 'ZZ'
        _fetchWithFallback(`http://ip-api.com/json/${ip}?fields=countryCode`, null, 'GET')
          .then(r => r.json())
          .then(d => { _geoCache[ip] = d })
          .catch(() => {})
        return 'ZZ'
      },
      ipasn(ip) {
        if (_geoCache[ip]) return _geoCache[ip].as || 'AS?????'
        _fetchWithFallback(`http://ip-api.com/json/${ip}?fields=as,org`, null, 'GET')
          .then(r => r.json())
          .then(d => { _geoCache[ip] = d })
          .catch(() => {})
        return 'AS?????'
      },
    }
  }
}
