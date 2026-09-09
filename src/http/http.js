export const sendReq = async (method, url, headers, body) => {
  const config = { method, url };
  if (headers !== undefined) config.headers = headers;
  if (body !== undefined) config.data = body;

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      credentials: "same-origin",
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        const errText = await response.text();
        if (errText) {
          const parsed = JSON.parse(errText);
          errorBody = parsed?.message || JSON.stringify(parsed);
        } else {
          errorBody = errText;
        }
      } catch {
        errorBody = "";
      }
      return {
        status: response.status,
        statusText: response.statusText,
        message: errorBody || response.statusText || "请求失败",
      };
    }

    const text = await response.text();
    let data = text;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        // 非 JSON 响应保留原始文本。
      }
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      config,
    };
  } catch (error) {
    console.error(`${String(method).toUpperCase()} request error2:`, error);
    return error;
  }
};
