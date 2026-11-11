if [ -f "$1" ]; then
  echo "Строк: $(wc -l < "$1")"
else
  echo "нет файла"
fi
