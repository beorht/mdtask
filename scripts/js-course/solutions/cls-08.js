class Ticket {
  static #counters = {};
  static #total = 0;
  constructor(hall) {
    Ticket.#counters[hall] = (Ticket.#counters[hall] || 0) + 1;
    Ticket.#total++;
    this.code = hall + '-' + String(Ticket.#counters[hall]).padStart(3, '0');
  }
  static total() { return Ticket.#total; }
}
while (true) {
  const hall = input();
  if (hall === 'конец') break;
  console.log(new Ticket(hall).code);
}
console.log('всего: ' + Ticket.total());
