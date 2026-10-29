function validate(form) {
  if (!form.name || !form.name.trim()) throw new Error('нет имени');
  const age = Number(form.age);
  if (!Number.isFinite(age)) throw new Error('возраст — не число');
  if (age < 14 || age > 99) throw new Error('возраст от 14 до 99');
  const at = String(form.email || '').indexOf('@');
  if (at < 1 || !form.email.slice(at + 1).includes('.')) throw new Error('неверная почта');
}
while (true) {
  const line = input();
  if (line === 'конец') break;
  const form = JSON.parse(line);
  try {
    validate(form);
    console.log('ок: ' + form.name);
  } catch (e) {
    console.log('ошибка: ' + e.message);
  }
}
