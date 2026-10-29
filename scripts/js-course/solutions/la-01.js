const even = [];
const odd = [];
for (const x of input().split(' ').map(Number)) (x % 2 === 0 ? even : odd).push(x);
console.log('чётные: ' + (even.length ? even.join(' ') : 'нет'));
console.log('нечётные: ' + (odd.length ? odd.join(' ') : 'нет'));
