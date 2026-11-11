case "$1" in
  start) echo "Запуск" ;;
  stop|halt) echo "Стоп" ;;
  status) echo "Статус" ;;
  *) echo "неизвестная команда" ;;
esac
