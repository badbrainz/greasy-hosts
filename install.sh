#!/bin/bash

set -e

APP=host.js
NAME=greasyhost
HOST=com.$NAME
JSON=com.$NAME.json
DESCRIPTION="$NAME host file"
ID="{e4a8a97b-f2ed-450b-b12d-ee082ba24781}"

DIR="${1:-"$( cd "$( dirname "$0" )" && pwd )"}"
if [ "$(whoami)" == "root" ]; then
  TARGET_DIR="/usr/lib/mozilla/native-messaging-hosts"
else
    TARGET_DIR="$HOME/.mozilla/native-messaging-hosts"
fi

mkdir -p $TARGET_DIR

TMPL='"%s":"%s",\n'
{
printf "{\n";
printf $TMPL "name" "$HOST";
printf $TMPL "description" "$DESCRIPTION";
printf $TMPL "path" "$DIR/$APP";
printf $TMPL "type" "stdio";
printf '"%s":["%s"]\n' "allowed_extensions" "$ID";
printf "}"
} > $TARGET_DIR/$JSON

chmod o+r $TARGET_DIR/$JSON

echo $TARGET_DIR/$JSON has been installed.
