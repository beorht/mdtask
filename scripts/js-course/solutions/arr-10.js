const n = Number(input());
const m = [];
for (let i = 0; i < n; i++) m.push(input().split(' '));
for (let c = 0; c < m[0].length; c++) {
  const row = [];
  for (let r = 0; r < n; r++) row.push(m[r][c]);
  console.log(row.join(' '));
}
