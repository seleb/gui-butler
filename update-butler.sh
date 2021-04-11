#!/bin/bash
# https://itch.io/docs/butler/installing.html
# -L follows redirects
# -O specifies output name
curl -L -o butler.zip https://broth.itch.ovh/butler/windows-amd64/LATEST/archive/default
unzip butler.zip -d ./butler
rm butler.zip
cd ./butler
# GNU unzip tends to not set the executable bit even though it's set in the .zip
chmod +x butler
# just a sanity check run (and also helpful in case you're sharing CI logs)
./butler -V
