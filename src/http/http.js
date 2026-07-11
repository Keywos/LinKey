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
      return { status: response.status, message: "Not Found" };
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
