const ABC = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
function generatePassword(length, random) {
  let p = '';
  for (let i = 0; i < length; i++) p += ABC[Math.floor(random() * ABC.length)];
  return p;
}
function strength(p) {
  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[!@#$%]/].filter((re) => re.test(p)).length;
  if (kinds === 4 && p.length >= 12) return 'надёжный';
  return kinds >= 3 ? 'средний' : 'слабый';
}
let seed = Number(input());
const random = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
while (true) {
  const s = input();
  if (s === 'конец') break;
  const p = generatePassword(Number(s), random);
  console.log(p + ' — ' + strength(p));
}
