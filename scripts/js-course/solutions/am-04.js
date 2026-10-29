const m = input().split(' ').map(Number);
const yes = (b) => (b ? 'да' : 'нет');
console.log(yes(m.every((x) => x >= 3)));
console.log(yes(m.some((x) => x === 5)));
console.log(yes(m.some((x) => x === 2)));
const i = m.findIndex((x) => x === 2);
console.log(i === -1 ? 'нет' : i + 1);
