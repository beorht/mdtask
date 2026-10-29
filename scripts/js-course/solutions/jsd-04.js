const n = Number(input());
const score = {};
for (let i = 0; i < n; i++) {
  const [name, s] = input().split(' ');
  score[name] = Number(s);
}
const names = Object.keys(score);
const avg = names.reduce((s, k) => s + score[k], 0) / names.length;
let best = names[0];
for (const k of names) if (score[k] > score[best]) best = k;
const low = names.filter((k) => score[k] < avg);
console.log('среднее: ' + avg.toFixed(1));
console.log('лучший: ' + best);
console.log('ниже среднего: ' + (low.length ? low.join(', ') : 'нет'));
