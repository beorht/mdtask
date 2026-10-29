const n = Number(input());
for (let i = 1; i <= n; i++) {
  let row = '';
  for (let j = i; j < i + n; j++) row += j + ' ';
  console.log(row.trim());
}
