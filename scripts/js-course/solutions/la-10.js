const n = Number(input());
const m = [];
for (let i = 0; i < n; i++) m.push(input().split(' '));
let top = 0;
let bottom = n - 1;
let left = 0;
let right = m[0].length - 1;
const out = [];
while (top <= bottom && left <= right) {
  for (let c = left; c <= right; c++) out.push(m[top][c]);
  top++;
  for (let r = top; r <= bottom; r++) out.push(m[r][right]);
  right--;
  if (top <= bottom) {
    for (let c = right; c >= left; c--) out.push(m[bottom][c]);
    bottom--;
  }
  if (left <= right) {
    for (let r = bottom; r >= top; r--) out.push(m[r][left]);
    left++;
  }
}
console.log(out.join(' '));
