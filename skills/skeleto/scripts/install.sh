#!/bin/sh
# Installs Skeleto into the application in the current directory, built from the repository this skill lives in.
# The package is packed into ./vendor and installed from there, so the application keeps the exact version it was built against.
set -e
here=$(cd "$(dirname "$0")" && pwd -P)
repo=$(cd "$here/../../.." && pwd -P)
app=$(pwd -P)

[ -f "$app/package.json" ] || npm init -y >/dev/null
npm pkg set type=module >/dev/null

(cd "$repo" && npm install --silent && npm run --silent build)
version=$(node -p "require('$repo/package.json').version")
mkdir -p "$app/vendor"
(cd "$repo" && npm pack --silent --pack-destination "$app/vendor" >/dev/null)
npm install "./vendor/skeleto-$version.tgz"
npm install --save-dev tsx typescript @types/node
echo "skeleto $version installed from $repo"
