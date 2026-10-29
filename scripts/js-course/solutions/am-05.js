const a = input().split(' ').map(Number);
const k = Number(input());
const x = a.find((v) => v > 0 && v % k === 0);
console.log(x === undefined ? 'не найдено' : x);
