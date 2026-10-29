const a = input().split(' ').map(Number);
console.log([...a].sort().join(' '));
console.log([...a].sort((x, y) => x - y).join(' '));
console.log([...a].sort((x, y) => y - x).join(' '));
