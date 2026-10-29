const all = [...input().split(' '), ...input().split(' '), ...input().split(' ')].map(Number);
const unique = [];
for (const x of all) if (!unique.includes(x)) unique.push(x);
unique.sort((a, b) => a - b);
console.log(unique.join(' '));
console.log(all.length - unique.length);
