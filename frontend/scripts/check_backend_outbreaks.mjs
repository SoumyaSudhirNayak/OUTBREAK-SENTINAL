const base = process.env.BASE ?? 'http://localhost:8000';
const url = `${base}/outbreaks`;

const res = await fetch(url);
const text = await res.text();

console.log('url', url);
console.log('status', res.status);
console.log('content-type', res.headers.get('content-type'));
console.log('body-preview', text.slice(0, 300).replace(/\s+/g, ' '));

if (res.ok) {
  const data = JSON.parse(text);
  console.log('outbreaks', Array.isArray(data) ? data.length : typeof data);
  if (Array.isArray(data) && data[0]) {
    console.log('first', Object.keys(data[0]));
  }
}

