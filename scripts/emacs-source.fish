function install_emacs 
  git clone --depth=1 --single-branch --branch master https://github.com/emacs-mirror/emacs.git

  cd emacs/

  sudo apt gcc-10 install -y autoconf make gcc texinfo libgtk-3-dev libxpm-dev \
       libjpeg-dev libgif-dev libtiff5-dev libgnutls28-dev libncurses5-dev \
       libjansson-dev libharfbuzz-dev libharfbuzz-bin libgccjit*

  set CC "gcc-10" ./autogen.sh

  ./configure --with-native-compilation
  make
  sudo make install
end
