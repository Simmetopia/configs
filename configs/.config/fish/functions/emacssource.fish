function emacssource
  echo "Cloning Emacs repository..."
  git clone --depth=1 --single-branch --branch master https://github.com/emacs-mirror/emacs.git

  echo "Changing directory to emacs..."
  cd emacs/ || exit

  echo "Installing required packages..."
  sudo apt update
  sudo apt install -y autoconf make gcc texinfo libgtk-3-dev libxpm-dev \
       libjpeg-dev libgif-dev libtiff-dev libgnutls-dev libncurses-dev \
       libjansson-dev libharfbuzz-dev libharfbuzz-bin libgccjit-dev

  echo "Running autogen.sh..."
  ./autogen.sh

  echo "Configuring Emacs with native compilation..."
  ./configure --with-native-compilation

  echo "Making Emacs..."
  make

  echo "Installing Emacs..."
  sudo make install

end
