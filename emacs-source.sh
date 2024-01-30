#! /usr/bin/bash
git clone --depth=1 --single-branch --branch master https://github.com/emacs-mirror/emacs.git

cd emacs/

sudo apt install -y autoconf make gcc texinfo libgtk-3-dev libxpm-dev \
     libjpeg-dev libgif-dev libtiff5-dev libgnutls28-dev libncurses5-dev \
     libjansson-dev libharfbuzz-dev libharfbuzz-bin

./autogen.sh

./configure --with-json --with-modules --with-harfbuzz --with-compress-install \
            --with-threads --with-included-regex --with-x-toolkit=lucid --with-zlib --without-sound \
            --without-xpm --with-jpeg --without-tiff --without-gif --with-png \
            --without-rsvg --with-imagemagick  --without-toolkit-scroll-bars \
            --without-gpm --without-dbus --without-makeinfo --without-pop \
            --without-mailutils --without-gsettings --without-pop
make
sudo make install
