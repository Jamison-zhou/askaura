export function buildCompactShareLines(data = {}, labels = {}) {
  return [
    data.symbol,
    data.summary,
    data.action ? `${labels.action}: ${data.action}` : "",
  ].filter(Boolean);
}
