class Queue {
  #items = [];
  enqueue(x) { this.#items.push(x); }
  dequeue() { return this.#items.shift(); }
  front() { return this.#items[0]; }
  size() { return this.#items.length; }
}
const normal = new Queue();
const urgent = new Queue();
while (true) {
  const line = input();
  if (line === 'конец') break;
  if (line.startsWith('+ ')) normal.enqueue(line.slice(2));
  else if (line.startsWith('! ')) urgent.enqueue(line.slice(2));
  else if (line === 'next') {
    const q = urgent.size() ? urgent : normal;
    console.log(q.size() ? 'приём: ' + q.dequeue() : 'никого нет');
  } else console.log('в очереди: ' + (normal.size() + urgent.size()) + ' (срочных: ' + urgent.size() + ')');
}
