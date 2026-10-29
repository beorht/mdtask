const lucky = (k) => {
  const s = String(k).padStart(6, '0');
  return Number(s[0]) + Number(s[1]) + Number(s[2]) === Number(s[3]) + Number(s[4]) + Number(s[5]);
};
const t = Number(input());
console.log(lucky(t) ? 'счастливый' : 'обычный');
let next = t + 1;
while (next <= 999999 && !lucky(next)) next++;
console.log(next <= 999999 ? String(next).padStart(6, '0') : 'нет');
