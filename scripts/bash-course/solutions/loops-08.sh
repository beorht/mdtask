for ((i = 1; i <= 3; i++)); do
  for ((j = 1; j <= 3; j++)); do
    printf "%4d" $((i * j))
  done
  echo
done
