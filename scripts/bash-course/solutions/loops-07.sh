for ((i = 1; i <= 100; i++)); do
  if [ $((i % 7)) -ne 0 ]; then
    continue
  fi
  echo -n "$i "
done
echo
