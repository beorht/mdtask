const old = JSON.parse(input());
const fresh = JSON.parse(input());
for (const item in old) {
  if (!(item in fresh)) console.log(item + ': убран из прайса');
  else {
    const d = fresh[item] - old[item];
    console.log(item + ': ' + (d === 0 ? '0 (не изменилась)' : (d > 0 ? '+' : '') + d));
  }
}
const added = Object.keys(fresh).filter((k) => !(k in old));
console.log('новые: ' + (added.length ? added.join(', ') : 'нет'));
