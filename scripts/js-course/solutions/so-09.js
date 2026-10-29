const a = input().split(' ').map(Number);
const s = [...a].sort((x, y) => x - y);
const m = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
console.log(m);
console.log(a.filter((x) => x < m).length);
