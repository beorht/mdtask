function weighted(weights, ...values) {
  let s = 0;
  for (let i = 0; i < values.length; i++) s += values[i] * (i < weights.length ? weights[i] : 1);
  return s;
}
const w = input().split(' ').map(Number);
const v = input().split(' ').map(Number);
console.log(weighted(w, ...v));
