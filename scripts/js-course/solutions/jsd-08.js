const total = {};
for (let s = 0; s < 2; s++) {
  for (const pair of input().split(' ')) {
    const [name, qty] = pair.split(':');
    total[name] = (total[name] || 0) + Number(qty);
  }
}
for (const [name, qty] of Object.entries(total)) console.log(name + ' — ' + qty);
console.log('итого позиций: ' + Object.keys(total).length);
