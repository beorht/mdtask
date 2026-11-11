read n
if [ "$n" -gt 0 ]; then
  echo "положительное"
elif [ "$n" -lt 0 ]; then
  echo "отрицательное"
else
  echo "ноль"
fi
