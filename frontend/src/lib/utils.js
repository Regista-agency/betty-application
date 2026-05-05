export function extractHashtags(text) {
  const re = /#[\p{L}\p{N}_]+/gu;
  const matches = text.match(re) || [];
  return Array.from(new Set(matches));
}
