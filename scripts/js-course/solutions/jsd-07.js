const n = Number(input());
const back = {};
for (let i = 0; i < n; i++) {
  const [key, value] = input().split(' ');
  if (!back[value]) back[value] = [];
  back[value].push(key);
}
for (const v in back) console.log(v + ': ' + back[v].join(', '));
