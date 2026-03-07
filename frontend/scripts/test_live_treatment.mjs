const BASE = process.env.BASE ?? 'http://localhost:8000';

async function j(path) {
  const res = await fetch(`${BASE}${path}`);
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return JSON.parse(text);
}

async function main() {
  const cats = await j('/treatment/live-category-stats');
  const trend = await j('/treatment/live-recovery-trend?days=7');
  console.log('cats', Array.isArray(cats) ? cats.length : typeof cats);
  console.log('trend', Array.isArray(trend) ? trend.length : typeof trend);
  if (Array.isArray(cats) && cats[0]) console.log('cat_keys', Object.keys(cats[0]));
  if (Array.isArray(trend) && trend[0]) console.log('trend_keys', Object.keys(trend[0]));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

