const cmds = { double: (x) => x * 2, inc: (x) => x + 1, square: (x) => x * x, neg: (x) => -x };
let x = Number(input());
while (true) {
  const c = input();
  if (c === 'конец') break;
  if (!cmds[c]) {
    console.log('нет команды ' + c);
    continue;
  }
  x = cmds[c](x);
  console.log(c + ': ' + x);
}
