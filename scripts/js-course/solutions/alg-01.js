const n = Number(input());
if (n === 1) console.log('ни простое, ни составное');
else {
  let prime = true;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) { prime = false; break; }
  console.log(prime ? 'простое' : 'составное');
}
