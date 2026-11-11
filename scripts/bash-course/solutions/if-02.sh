if [ "$1" -gt 0 ]; then
  echo "положительное"
elif [ "$1" -lt 0 ]; then
  echo "отрицательное"
else
  echo "ноль"
fi
