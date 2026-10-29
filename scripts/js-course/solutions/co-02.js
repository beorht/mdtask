const a = input().split(' ');
const b = input().split(' ');
const sa = new Set(a);
const sb = new Set(b);
const show = (arr) => (arr.length ? arr.join(' ') : 'нет');
console.log(show([...sa].filter((x) => sb.has(x))));
console.log(show([...sa].filter((x) => !sb.has(x))));
console.log(show([...sb].filter((x) => !sa.has(x))));
