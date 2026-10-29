const words = input().split(' ');
const set = new Set(words);
console.log(set.size);
console.log([...set].join(' '));
console.log(set.size < words.length ? 'есть повторы' : 'повторов нет');
