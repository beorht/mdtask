function checkBrackets(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const close = { '(': ')', '[': ']', '{': '}' };
  const stack = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch in close) stack.push(ch);
    else if (ch in pairs) {
      if (!stack.length) throw new SyntaxError('лишняя закрывающая ' + ch + ' на позиции ' + (i + 1));
      const top = stack.pop();
      if (top !== pairs[ch]) throw new SyntaxError('ожидалась ' + close[top] + ' на позиции ' + (i + 1) + ', а стоит ' + ch);
    }
  }
  if (stack.length) throw new SyntaxError('не закрыта ' + stack[stack.length - 1]);
}
while (true) {
  const s = input();
  if (s === 'конец') break;
  try {
    checkBrackets(s);
    console.log('ок');
  } catch (e) {
    console.log(e.message);
  }
}
