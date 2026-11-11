num=0
until [ $num -eq 5 ]; do
  echo -n "$num "
  num=$((num + 1))
done
echo
