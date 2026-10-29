const h = Number(input());
const m = Number(input());
const s = Number(input());
const add = Number(input());
const total = (h * 3600 + m * 60 + s + add) % 86400;
console.log(Math.floor(total / 3600) + ':' + Math.floor(total / 60) % 60 + ':' + total % 60);
