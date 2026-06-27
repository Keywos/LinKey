/* sandboxWorker.js — 在 Worker 隔离环境中执行用户代码 */
self.onmessage = async (e) => {
  const { code } = e.data;
  const logs = [];
  const timers = {};

  const formatArg = (arg) => {
    if (arg === null) return "null";
    if (arg === undefined) return "undefined";
    if (arg instanceof Error) {
      return arg.stack || `${arg.name}: ${arg.message}`;
    }
    if (typeof arg === "object") {
      try {
        return JSON.stringify(arg, null, 2);
      } catch {
        return String(arg);
      }
    }
    return String(arg);
  };

  const mockConsole = {
    log: (...args) => logs.push(args.map(formatArg).join(" ")),
    error: (...args) => logs.push("[Error] " + args.map(formatArg).join(" ")),
    warn: (...args) => logs.push("[Warn] " + args.map(formatArg).join(" ")),
    info: (...args) => logs.push("[Info] " + args.map(formatArg).join(" ")),
    debug: (...args) => logs.push("[Debug] " + args.map(formatArg).join(" ")),
    trace: (...args) => logs.push("[Trace] " + args.map(formatArg).join(" ")),
    dir: (obj) => logs.push(formatArg(obj)),
    table: (data) => {
      if (Array.isArray(data)) {
        logs.push("[Table]\n" + data.map((row, i) => `  ${i}: ${formatArg(row)}`).join("\n"));
      } else {
        logs.push("[Table]\n" + formatArg(data));
      }
    },
    clear: () => { logs.length = 0; },
    time: (label) => { timers[String(label)] = performance.now(); },
    timeEnd: (label) => {
      const key = String(label);
      const elapsed = timers[key] != null ? (performance.now() - timers[key]).toFixed(2) : "?";
      logs.push(`${key}: ${elapsed} ms`);
      delete timers[key];
    },
    count: (label) => {
      const key = String(label ?? "default");
      timers[key] = (timers[key] ?? 0) + 1;
      logs.push(`${key}: ${timers[key]}`);
    },
    group: () => {},
    groupEnd: () => {},
  };

  try {
    const wrapped = `(async () => { try { ${code} } catch(e) { console.error(e) } })()`;
    const fn = new Function("console", wrapped);
    await fn(mockConsole);
  } catch (error) {
    logs.push(`[Exception] ${error.message}`);
  }

  self.postMessage({ logs });
};




 