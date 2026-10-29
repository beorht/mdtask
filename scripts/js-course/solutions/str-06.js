const mail = input();
const at = mail.indexOf('@');
console.log(mail.slice(0, at));
console.log(mail.slice(at + 1));
