if [ "$1" -ge 90 ]; then
  echo "отлично"
elif [ "$1" -ge 75 ]; then
  echo "хорошо"
elif [ "$1" -ge 60 ]; then
  echo "удовлетворительно"
else
  echo "неуд"
fi
