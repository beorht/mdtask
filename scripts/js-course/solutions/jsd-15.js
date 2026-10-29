let clean = '';
for (const ch of input().toLowerCase()) {
  const letter = ch.toLowerCase() !== ch.toUpperCase();
  clean += letter || (ch >= '0' && ch <= '9') || ch === '-' ? ch : ' ';
}
const words = clean.split(' ').map((w) => w.replace(/^-+|-+$/g, '')).filter((w) => w !== '');
const freq = new Map();
for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
const ranked = [...freq].sort((a, b) => b[1] - a[1]);
const avgLen = words.reduce((s, w) => s + w.length, 0) / words.length;
console.log('уникальных: ' + freq.size);
console.log('самое частое: ' + ranked[0][0] + ' (' + ranked[0][1] + ')');
console.log('средняя длина: ' + avgLen.toFixed(1));
console.log('топ-3: ' + ranked.slice(0, 3).map((e) => e[0]).join(', '));
