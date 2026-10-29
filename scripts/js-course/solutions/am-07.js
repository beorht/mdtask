const groups = input().split(' ').reduce((acc, w) => {
  const ch = w[0];
  if (!acc[ch]) acc[ch] = [];
  acc[ch].push(w);
  return acc;
}, {});
for (const ch in groups) console.log(ch + ': ' + groups[ch].join(', '));
