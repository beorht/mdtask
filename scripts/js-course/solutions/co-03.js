const m = new Map();
for (const ch of input().toLowerCase()) if (ch.toLowerCase() !== ch.toUpperCase()) m.set(ch, (m.get(ch) || 0) + 1);
let best = null;
for (const [ch, n] of m) if (best === null || n > m.get(best)) best = ch;
console.log(best + ' ' + m.get(best));
console.log(m.size);
