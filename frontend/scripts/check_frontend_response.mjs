const url = process.env.URL ?? 'http://localhost:5173/';

const res = await fetch(url, { redirect: 'manual' });
const text = await res.text();

console.log('status', res.status);
console.log('content-type', res.headers.get('content-type'));
console.log('bytes', text.length);
console.log(text.slice(0, 200).replace(/\s+/g, ' '));

