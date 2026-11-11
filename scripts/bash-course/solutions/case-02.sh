case "$1" in
  *.jpg|*.png|*.gif) echo "изображение" ;;
  *.txt|*.md) echo "текст" ;;
  *) echo "неизвестно" ;;
esac
