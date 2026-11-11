if [ -e "$1" ]; then
  if [ -d "$1" ]; then
    echo "каталог"
  else
    echo "файл"
  fi
else
  echo "нет"
fi
