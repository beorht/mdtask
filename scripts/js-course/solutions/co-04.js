const items = JSON.parse(input());
console.log(items.reduce((s, it) => s + it.price * it.qty, 0));
console.log(items.reduce((a, it) => (it.price < a.price ? it : a)).title);
const out = items.filter((it) => it.qty === 0).map((it) => it.title);
console.log(out.length ? out.join(', ') : 'все в наличии');
