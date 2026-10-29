const words = input().split(' ');
const out = [];
for (const w of words) if (!out.includes(w)) out.push(w);
console.log(out.join(' '));
console.log(words.length - out.length);
