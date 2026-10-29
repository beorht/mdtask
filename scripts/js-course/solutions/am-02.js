const words = input().split(' ');
const k = Number(input());
const long = words.filter((w) => w.length > k).map((w) => w.toUpperCase());
console.log(long.length ? long.join(' ') : 'нет');
