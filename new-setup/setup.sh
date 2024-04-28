#!/bin/bash
# Installing mise and Node.js
curl https://mise.run | sh
source ~/.bashrc
npm install -g zx

mise use node
# Run the zx script after mise and node setup
./setup.mjs

