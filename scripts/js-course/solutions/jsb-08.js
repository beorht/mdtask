const n = Number(input());
for (let i = 1; i <= n; i++) {
  let row = '';
  for (let j = 1; j <= n; j++) row += String(i * j).padStart(4);
  console.log(row);
}
