const secret = input();
let left = 3;
let ok = false;
do {
  const attempt = input();
  left--;
  if (attempt === secret) ok = true;
  else if (left > 0) console.log('Неверно, осталось ' + left);
} while (!ok && left > 0);
console.log(ok ? 'Доступ разрешён' : 'Доступ заблокирован');
