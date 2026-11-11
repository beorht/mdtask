if [ $(($1 % 15)) -eq 0 ]; then
  echo "FizzBuzz"
elif [ $(($1 % 3)) -eq 0 ]; then
  echo "Fizz"
elif [ $(($1 % 5)) -eq 0 ]; then
  echo "Buzz"
else
  echo "$1"
fi
