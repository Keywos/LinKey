/* ===== Browser / Worker polyfills for Surge APIs ===== */

var error = null;
self.__surge_pending = 0;
self.__surge_on_idle = null;

//==========================
// $environment
//==========================
if (typeof $environment === "undefined" && typeof self !== "undefined") {
  self.$environment = { "surge-version": "920" };
}

//==========================
// $argument — 脚本参数
//==========================
if (typeof $argument === "undefined" && typeof self !== "undefined") {
  self.$argument = "";
}

// if (typeof $httpAPI === "undefined" && typeof self !== "undefined") {
//   self.$httpAPI = function (i) {
//     return null;
//   };
// }

//==========================
// $persistentStore
//==========================
if (typeof $persistentStore === "undefined" && typeof self !== "undefined") {
  self.$persistentStore = {
    read: function (key) {
      try {
        if (typeof localStorage !== "undefined") return localStorage.getItem(key);
      } catch (e) {}
      return null;
    },
    write: function (value, key) {
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(key, value);
          return true;
        }
      } catch (e) {}
      return false;
    },
  };
}

//==========================
// $prefs
//==========================
if (typeof $prefs === "undefined" && typeof self !== "undefined") {
  self.$prefs = {
    valueForKey: function (key) {
      try {
        if (typeof localStorage !== "undefined") return localStorage.getItem(key);
      } catch (e) {}
      return null;
    },
    setValueForKey: function (value, key) {
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.setItem(key, value);
          return true;
        }
      } catch (e) {}
      return false;
    },
    removeValueForKey: function (key) {
      try {
        if (typeof localStorage !== "undefined") {
          localStorage.removeItem(key);
          return true;
        }
      } catch (e) {}
      return false;
    },
    isKeyExist: function (key) {
      try {
        if (typeof localStorage !== "undefined") return localStorage.getItem(key) !== null;
      } catch (e) {}
      return false;
    },
    dictionary: function () {
      try {
        if (typeof localStorage === "undefined") return {};
        var d = {};
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          d[k] = localStorage.getItem(k);
        }
        return d;
      } catch (e) {
        return {};
      }
    },
  };
}

//==========================
// $httpClient
//==========================
if (typeof $httpClient === "undefined" && typeof self !== "undefined") {
  self.$httpClient = {};
  var _HTTP_METHODS = ["get", "post", "put", "delete", "head", "options", "patch"];

  _HTTP_METHODS.forEach(function (m) {
    self.$httpClient[m] = function (params, callback) {
      // ---- 参数解析 ----
      if (typeof params === "string") {
        params = { url: params };
      }
      var url = params.url;
      if (!url) {
        callback("Missing url", null, null);
        return;
      }
      self.__surge_pending++;
      var method = (params.method || m).toUpperCase();
      var timeout = params.timeout != null ? params.timeout : 5000;
      var headers = params.headers || {};
      var binaryMode = params["binary-mode"] === true;

      // ---- body 处理 ----
      var body = params.body;
      if (body != null) {
        if (params["body-base64"]) {
          try {
            body = Uint8Array.from(atob(body), function (c) {
              return c.charCodeAt(0);
            });
          } catch (e) {
            callback("body-base64 decode error: " + e.message, null, null);
            return;
          }
        } else if (typeof body === "object" && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
          body = JSON.stringify(body);
        }
      }

      var settled = false;
      function finish(err, resp, data) {
        if (settled) return;
        settled = true;
        clearTimeout(guardTimer);
        error = err;
        callback(err, resp, data);
        self.__surge_pending--;
        if (self.__surge_pending <= 0 && self.__surge_on_idle) {
          var cb = self.__surge_on_idle;
          self.__surge_on_idle = null;
          cb();
        }
      }

      var guardTimer = setTimeout(function () {
        if (!settled) {
          finish("Request timeout (" + timeout + "ms)", null, null);
        }
      }, timeout + 1000);

      function done(err, resp, data) {
        finish(err, resp, data);
      }

      var fetchOpts = { method: method, headers: headers };
      if (body != null && method !== "GET" && method !== "HEAD") {
        fetchOpts.body = body;
      }
      if (params["auto-redirect"] === false) {
        fetchOpts.redirect = "manual";
      }

      var isCrossOrigin = false;
      if (typeof location !== "undefined") {
        try {
          isCrossOrigin = new URL(url, location.origin).origin !== location.origin;
        } catch (e) {}
      }

      function doFetch(u, opts, t) {
        t = t || 10000;
        var ctrl, timer;
        if (typeof AbortController !== "undefined") {
          ctrl = new AbortController();
          timer = setTimeout(function () {
            try {
              ctrl.abort();
            } catch (e) {}
          }, t);
          opts = Object.assign({}, opts, { signal: ctrl.signal });
        }
        return fetch(u, opts)
          .then(function (r) {
            if (timer) clearTimeout(timer);
            return r;
          })
          .catch(function (err) {
            if (timer) clearTimeout(timer);
            throw err;
          });
      }

      function makeProxyUrl(u) {
        var pu = "https://surgetool.com/api/fetch?url=" + encodeURIComponent(u);
        if (headers && Object.keys(headers).length) {
          pu += "&linkeyheaders=" + encodeURIComponent(JSON.stringify(headers));
        }
        if (body != null) {
          pu += "&linkeybody=" + encodeURIComponent(typeof body === "string" ? body : JSON.stringify(body));
        }
        return pu;
      }

      // 提取 headers
      function getHeaders(r) {
        var h = {};
        if (!r || !r.headers) return h;
        try {
          if (typeof r.headers.forEach === "function") {
            r.headers.forEach(function (v, k) {
              h[k] = v;
            });
          } else if (typeof r.headers.entries === "function") {
            var it = r.headers.entries();
            while (true) {
              var n = it.next();
              if (n.done) break;
              h[n.value[0]] = n.value[1];
            }
          } else {
            Object.assign(h, r.headers);
          }
        } catch (e) {}
        return h;
      }

      // 构造 response
      function makeResp(r, b) {
        var s = r && r.status != null ? r.status : r && r.statusCode != null ? r.statusCode : 200;
        return { status: s, statusCode: s, headers: getHeaders(r), body: b || "" };
      }

      // ★ 跨域 URL 跳过直接 fetch（必败），直接走代理；同域才先试直接 fetch
      if (isCrossOrigin) {
        doFetch(makeProxyUrl(url), { method: "GET" }, timeout)
          .then(function (resp) {
            return resp.text().then(function (text) {
              done(null, makeResp(resp, text), text);
            });
          })
          .catch(function (err2) {
            done((err2 && err2.message) || String(err2), null, null);
          });
      } else {
        doFetch(url, fetchOpts, timeout)
          .then(function (resp) {
            if (binaryMode) {
              return resp.arrayBuffer().then(function (buf) {
                done(null, makeResp(resp, buf), buf);
              });
            }
            return resp.text().then(function (text) {
              done(null, makeResp(resp, text), text);
            });
          })
          .catch(function () {
            doFetch(makeProxyUrl(url), { method: "GET" }, timeout)
              .then(function (resp) {
                return resp.text().then(function (text) {
                  done(null, makeResp(resp, text), text);
                });
              })
              .catch(function (err2) {
                done((err2 && err2.message) || String(err2), null, null);
              });
          });
      }
    };
  });
}

//==========================
// $task
//==========================
if (typeof $task === "undefined" && typeof self !== "undefined") {
  self.$task = {
    fetch: function (request) {
      var method = (request.method || "get").toLowerCase();
      var timeout = request.timeout != null ? request.timeout : 5000;
      var body = request.body;
      if (body && typeof body === "object" && !(body instanceof FormData) && !(body instanceof URLSearchParams)) {
        body = JSON.stringify(body);
      }
      // 内联 fetchWithFallback
      // 检测跨域
      var isCrossOrigin = false;
      if (typeof location !== "undefined") {
        try {
          isCrossOrigin = new URL(request.url, location.origin).origin !== location.origin;
        } catch (e) {}
      }

      function doReq(u, hdrs, meth, bd, to) {
        meth = meth || "GET";
        var opts = { method: meth, headers: hdrs || {} };
        if (bd != null && meth !== "GET" && meth !== "HEAD") opts.body = bd;
        var ctrl, timer;
        if (typeof AbortController !== "undefined") {
          ctrl = new AbortController();
          timer = setTimeout(function () {
            try {
              ctrl.abort();
            } catch (e) {}
          }, to);
          opts = Object.assign({}, opts, { signal: ctrl.signal });
        }
        function directReq() {
          return fetch(u, opts)
            .then(function (r) {
              if (timer) clearTimeout(timer);
              return r;
            })
            .catch(function (err) {
              if (timer) clearTimeout(timer);
              throw err;
            });
        }
        function proxyReq() {
          var pu = "https://surgetool.com/api/fetch?url=" + encodeURIComponent(u);
          if (hdrs && Object.keys(hdrs).length) pu += "&headers=" + encodeURIComponent(JSON.stringify(hdrs));
          return fetch(pu, { method: "GET" }).then(function (r) {
            return r;
          });
        }
        // 跨域跳过 directReq，直接走代理
        return isCrossOrigin
          ? proxyReq()
          : directReq().catch(function () {
              return proxyReq();
            });
      }
      function extractHeaders(r) {
        var h = {};
        if (!r || !r.headers) return h;
        try {
          if (typeof r.headers.forEach === "function")
            r.headers.forEach(function (v, k) {
              h[k] = v;
            });
          else if (typeof r.headers.entries === "function") {
            var it = r.headers.entries();
            while (true) {
              var n = it.next();
              if (n.done) break;
              h[n.value[0]] = n.value[1];
            }
          } else Object.assign(h, r.headers);
        } catch (e) {}
        return h;
      }
      return doReq(request.url, request.headers, method, body, timeout)
        .then(function (resp) {
          return resp.text().then(function (text) {
            error = null;
            return {
              statusCode: resp && resp.status != null ? resp.status : resp && resp.statusCode != null ? resp.statusCode : 200,
              headers: extractHeaders(resp),
              body: text,
            };
          });
        })
        .catch(function (err) {
          error = (err && err.message) || String(err);
          return Promise.reject({ error: error });
        });
    },
  };
}

//==========================
// $request / $response / $done
//==========================
if (typeof $request === "undefined" && typeof self !== "undefined") {
  self.$request = { url: "", method: "GET", headers: {}, body: null, id: "" };
}
if (typeof $response === "undefined" && typeof self !== "undefined") {
  self.$response = { status: 200, headers: {}, body: null };
}
if (typeof $done === "undefined" && typeof self !== "undefined") {
  self.$done = function (mod) {
    if (mod === undefined) return;
    if (mod.url != null) $request.url = mod.url;
    if (mod.headers != null) {
      if ($response && $response.headers) {
        Object.assign($response.headers, mod.headers);
      } else {
        $request.headers = mod.headers;
      }
    }
    if (mod.body != null) {
      if ($response) $response.body = mod.body;
    }
    if (mod.status != null && $response) $response.status = mod.status;
    if (mod.response != null) {
      if (mod.response.status != null) $response.status = mod.response.status;
      if (mod.response.headers != null) $response.headers = mod.response.headers;
      if (mod.response.body != null) $response.body = mod.response.body;
    }
  };
}

//==========================
// $utils
//==========================
if (typeof $utils === "undefined" && typeof self !== "undefined") {
  self.$utils = {
    geoip: function (ip) {
      return "ZZ";
    },
    ipasn: function (ip) {
      return "AS?????";
    },
  };
}
