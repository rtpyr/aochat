#!/bin/sh
# Stamps the style.css / store.js / app.js links in index.html with a hash of both files, so a
# browser can never run a cached app.js against a newer index.html (GitHub Pages
# lets browsers cache assets for about 10 minutes). Run before committing CSS/JS changes.
cd "$(dirname "$0")/.." || exit 1
v=$(cat style.css store.js app.js | sha1sum | cut -c1-8)
sed -i -E "s#(style\.css|store\.js|app\.js)(\?v=[0-9a-f]+)?\"#\1?v=$v\"#g" index.html
