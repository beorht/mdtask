const DAY = 24 * 60 * 60 * 1000;
const today = new Date(input());
const event = new Date(input());
const n = Math.round((event - today) / DAY);
console.log(n > 0 ? 'осталось ' + n + ' дн.' : n === 0 ? 'событие сегодня' : 'прошло ' + -n + ' дн.');
