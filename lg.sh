#!/bin/sh
# litegraph launcher (Linux, macOS, WSL, Git Bash): runs tools/lg/lg.mjs on Bun, else Node.
# LG_RUNTIME=bun|node picks one explicitly. ./lg.sh help lists the commands.
LG_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) || exit 1
LG_HELPER="$LG_ROOT/tools/lg/lg.mjs"

case "${LG_RUNTIME:-}" in
  "" ) order="bun node" ;;
  bun|node ) order="$LG_RUNTIME" ;;
  * ) echo "lg: LG_RUNTIME must be bun or node (got \"$LG_RUNTIME\")" >&2; exit 2 ;;
esac

for runtime in $order; do
  if command -v "$runtime" >/dev/null 2>&1; then
    exec "$runtime" "$LG_HELPER" "$@"
  fi
done

if [ -n "${LG_RUNTIME:-}" ]; then
  echo "lg: LG_RUNTIME=$LG_RUNTIME, but $LG_RUNTIME was not found on PATH." >&2
else
  echo "lg: neither Bun nor Node.js was found on PATH." >&2
fi
echo "    Install one of them, then run npm ci (or bun install) in $LG_ROOT:" >&2
echo "      Bun:     https://bun.sh" >&2
echo "      Node.js: https://nodejs.org (version 18 or newer)" >&2
exit 127
