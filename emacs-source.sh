#! /usr/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Define the number of jobs for parallel compilation
JOBS=$(nproc)

# Update and install essential build dependencies
echo "Updating package lists and installing build dependencies..."
sudo apt update
sudo apt install -y \
    build-essential \
    texinfo \
    libgtk-3-dev \
    libsqlite3-dev \
    libxpm-dev \
    libjpeg-dev \
    libgif-dev \
    libtiff5-dev \
    libgnutls28-dev \
    libncurses5-dev \
    libjansson-dev \
    libharfbuzz-dev \
    libtree-sitter-dev \
    libgccjit-11-dev \
    imagemagick \
    libmagick++-dev \
    libwebp-dev \
    libxft-dev \
    ripgrep \
    fd-find

# Clone the Emacs repository
echo "Cloning the Emacs repository..."
git clone --depth=1 --branch master git://git.savannah.gnu.org/emacs.git
cd emacs/

# Prepare the build environment
echo "Running autogen.sh..."
./autogen.sh

# Configure the build options
echo "Configuring the build..."
./configure \
    --with-native-compilation \
    --with-tree-sitter \
    --with-json \
    --with-imagemagick \
    --with-harfbuzz \
    --with-cairo \
    --with-x-toolkit=gtk3

# Compile and install Emacs
echo "Compiling Emacs..."
make -j$JOBS
echo "Installing Emacs..."
sudo make install

# Clean up
echo "Cleaning up..."
cd ..
rm -rf emacs/

# Install Doom Emacs
echo "Installing Doom Emacs..."
git clone --depth=1 https://github.com/doomemacs/doomemacs ~/.emacs.d
~/.emacs.d/bin/doom install

# Verify the installation
echo "Running Doom Emacs doctor..."
~/.emacs.d/bin/doom doctor

echo "Emacs and Doom Emacs installation completed successfully."
