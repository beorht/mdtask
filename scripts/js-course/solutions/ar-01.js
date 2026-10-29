const f = (x) => x * x - 3 * x + 2;
const a = Number(input());
const b = Number(input());
for (let x = a; x <= b; x++) console.log(x + ' | ' + f(x));
