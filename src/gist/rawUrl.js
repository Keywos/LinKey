export const toStableGistRawUrl = (rawUrl) => {
  if (!rawUrl) return "";

  try {
    const url = new URL(rawUrl);
    const match = url.pathname.match(/^(.*\/raw)\/[^/]+\/(.+)$/);
    if (!match) return rawUrl;
    url.pathname = `${match[1]}/${match[2]}`;
    return url.toString();
  } catch {
    return rawUrl.replace(/(\/raw)\/[^/]+\/(.+)$/, "$1/$2");
  }
};