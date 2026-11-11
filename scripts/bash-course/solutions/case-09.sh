case "$1" in
  [А-Я]*) echo "русское" ;;
  [A-Z]*) echo "латинское" ;;
  *) echo "другое" ;;
esac
