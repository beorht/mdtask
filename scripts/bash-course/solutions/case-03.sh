case "$1" in
  [0-9]) echo "цифра" ;;
  [a-zA-Z]) echo "буква" ;;
  *) echo "другой символ" ;;
esac
