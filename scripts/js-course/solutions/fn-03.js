function isPalindrome(s) {
  const t = s.toLowerCase().replaceAll(' ', '');
  for (let i = 0, j = t.length - 1; i < j; i++, j--) if (t[i] !== t[j]) return false;
  return true;
}
while (true) {
  const s = input();
  if (s === 'конец') break;
  console.log(isPalindrome(s) ? 'да' : 'нет');
}
