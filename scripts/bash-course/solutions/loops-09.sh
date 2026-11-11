n=0
while true; do
  n=$((n + 1))
  if [ $n -eq 3 ]; then
    break
  fi
  echo "проход $n"
done
