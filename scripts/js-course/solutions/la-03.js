const t = input().split(' ').map(Number);
const k = Number(input());
let sum = 0;
for (let i = 0; i < k; i++) sum += t[i];
const out = [(sum / k).toFixed(1)];
for (let i = k; i < t.length; i++) {
  sum += t[i] - t[i - k];
  out.push((sum / k).toFixed(1));
}
console.log(out.join(' '));
