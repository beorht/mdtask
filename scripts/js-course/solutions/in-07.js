const eggs = Number(input());
const box = Number(input());
console.log('Полных коробок: ' + Math.floor(eggs / box));
console.log('Осталось яиц: ' + eggs % box);
