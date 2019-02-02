#!/bin/sh

yes "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." | head -n 200000 > "$1"
