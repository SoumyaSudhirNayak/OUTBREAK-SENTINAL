const BASE = process.env.BASE ?? 'http://localhost:8000';

async function main() {
  const outbreaksRes = await fetch(`${BASE}/outbreaks`);
  const outbreaks = await outbreaksRes.json();
  if (!Array.isArray(outbreaks) || outbreaks.length === 0) {
    console.log('no outbreaks');
    return;
  }

  const outbreakId = outbreaks[0].id;
  const res = await fetch(`${BASE}/vehicle/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outbreak_id: outbreakId }),
  });

  console.log('status', res.status);
  const text = await res.text();
  console.log(text);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

