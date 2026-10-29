class Stack {
  #items = [];
  push(x) { this.#items.push(x); }
  pop() { return this.#items.pop(); }
  peek() { return this.#items[this.#items.length - 1]; }
  isEmpty() { return this.#items.length === 0; }
  size() { return this.#items.length; }
}
const ops = { '+': (a, b) => a + b, '-': (a, b) => a - b, '*': (a, b) => a * b, '/': (a, b) => a / b };
while (true) {
  const line = input();
  if (line === 'конец') break;
  const st = new Stack();
  let ok = true;
  for (const tok of line.split(' ')) {
    if (tok in ops) {
      if (st.size() < 2) { ok = false; break; }
      const b = st.pop();
      const a = st.pop();
      st.push(ops[tok](a, b));
    } else st.push(Number(tok));
  }
  console.log(ok && st.size() === 1 ? st.peek() : 'ошибка');
}
