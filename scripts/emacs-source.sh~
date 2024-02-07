#! /usr/bin/bash
git clone --depth=1 --single-branch --branch master https://github.com/emacs-mirror/emacs.git

cd emacs/

sudo apt install -y autoconf make gcc texinfo libgtk-3-dev libxpm-dev \
     libjpeg-dev libgif-dev libtiff5-dev libgnutls28-dev libncurses5-dev \
     libjansson-dev libharfbuzz-dev libharfbuzz-bin libgccjit

./autogen.sh

./configure --with-native-compilation
make
sudo make install
