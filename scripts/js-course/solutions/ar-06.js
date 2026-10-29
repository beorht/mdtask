const tests = {
  'чётные': (n) => n % 2 === 0,
  'простые': (n) => {
    if (n < 2) return false;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
    return true;
  },
  'палиндромы': (n) => String(n) === String(n).split('').reverse().join(''),
  'квадраты': (n) => Number.isInteger(Math.sqrt(n)),
};
const n = Number(input());
const check = tests[input()];
let count = 0;
for (let k = 1; k <= n; k++) if (check(k)) count++;
console.log(count);
