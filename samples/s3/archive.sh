#!/bin/sh

zip -r lambda.zip index.js node_modules -x "*.zip" -x "*.txt" -x "*.sh" > /dev/null
