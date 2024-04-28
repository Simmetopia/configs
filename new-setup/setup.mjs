#!/usr/bin/env zx

async function main() {
  // Update and install essential build tools
  await $`sudo apt-get update`;
  await $`sudo apt-get -y install build-essential autoconf m4 libncurses5-dev libwxgtk3.0-gtk3-dev libwxgtk-webview3.0-gtk3-dev libgl1-mesa-dev libglu1-mesa-dev libpng-dev libssh-dev unixodbc-dev xsltproc fop libxml2-utils libncurses-dev openjdk-11-jdk`;

  await $`sudo apt-get -y install fish`;
  await $`chsh -s $(which fish)`;

  // Install the latest Erlang and Elixir using mise
  try {
    await $`mise install erlang@latest`;
    await $`mise install elixir@latest`;
  } catch (error) {
    console.error('Failed to install Erlang or Elixir:', error);
  }

  // Install Rust
  try {
    await $`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`;
    await $`source $HOME/.cargo/env`;
    await $`cargo install bob-nvim`;
    await $`bob use nightly`;
  } catch (error) {
    console.error('Failed to install Rust or Bob:', error);
  }

  // Create a directory for code
  await $`mkdir -p ~/code`;

  // Install additional utilities
  try {
    await $`sudo apt-get install -y ripgrep bat exa fzf`;
  } catch (error) {
    console.error('Failed to install utilities:', error);
  }

  try {
    await $`sudo apt-add-repository -y ppa:system76-dev/stable && sudo apt-get update`;
    await $`sudo apt-get install -y system76-driver-nvidia`;
  } catch (error) {
    console.error('system76 drivers', error);
  }
}

main();

