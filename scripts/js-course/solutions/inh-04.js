class Notification {
  constructor(text) { this.text = text; }
  send() { return this.text; }
}
class EmailNotification extends Notification {
  constructor(text, to) { super(text); this.to = to; }
  send() { return 'письмо на ' + this.to + ': ' + super.send(); }
}
class SmsNotification extends Notification {
  constructor(text, to) { super(text); this.to = to; }
  send() {
    const t = this.text.length > 20 ? this.text.slice(0, 20) + '…' : this.text;
    return 'смс на ' + this.to + ': ' + t;
  }
}
class PushNotification extends Notification {
  constructor(text, urgent = false) { super(text); this.urgent = urgent; }
  send() { return (this.urgent ? '[!] ' : '') + 'push: ' + super.send(); }
}
const all = [];
while (true) {
  const line = input();
  if (line === 'конец') break;
  const n = JSON.parse(line);
  if (n.type === 'email') all.push(new EmailNotification(n.text, n.to));
  else if (n.type === 'sms') all.push(new SmsNotification(n.text, n.to));
  else all.push(new PushNotification(n.text, n.urgent));
}
all.forEach((n) => console.log(n.send()));
const count = (C) => all.filter((n) => n instanceof C).length;
console.log('писем: ' + count(EmailNotification) + ', смс: ' + count(SmsNotification) + ', push: ' + count(PushNotification));
