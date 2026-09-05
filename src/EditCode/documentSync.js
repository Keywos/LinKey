export function documentMatchesContent(doc, content) {
  if (doc.length !== content.length) return false;

  let offset = 0;
  for (const chunk of doc.iter()) {
    if (!content.startsWith(chunk, offset)) return false;
    offset += chunk.length;
  }
  return true;
}