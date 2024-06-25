#!/usr/bin/env zx

async function main() {
  // Update and install essential build tools
  console.log("apt update")
  await $`sudo apt-get update`;
  console.log("stuff for erlang")
  await $`sudo apt-get -y install build-essential autoconf m4 libgl1-mesa-dev libglu1-mesa-dev libpng-dev libssh-dev unixodbc-dev xsltproc fop libxml2-utils libncurses-dev openjdk-11-jdk`;
console.log("installing fish")
  await $`sudo apt-get -y install fish`;
  console.log("set fish shell default")
  await $`chsh -s $(which fish)`;

  // Install the latest Erlang and Elixir using mise
  try {
  console.log("installing erlang latest")
    console.log(await $`mise install erlang@latest`);
    console.log("install elixir")
    await $`mise install elixir@latest`;
  } catch (error) {
    console.error('Failed to install Erlang or Elixir:', error);
  }

  // Install Rust
  try {
  console.log("install rust and nvim")
    await $`mise use rust`;
    await $`cargo install bob-nvim`;
    await $`bob use nightly`;
  } catch (error) {
    console.error('Failed to install Rust or Bob:', error);
  }

  // Create a directory for code
  await $`mkdir -p ~/code`;

  // Install additional utilities
  try {
  console.log("ripgrep bat exa fzf")
    await $`sudo apt-get install -y ripgrep bat exa fzf`;
  } catch (error) {
    console.error('Failed to install utilities:', error);
  }

  try {
  console.log("system 76 drivers")
    await $`sudo apt-add-repository -y ppa:system76-dev/stable && sudo apt-get update`;
    await $`sudo apt-get install -y system76-driver-nvidia`;
  } catch (error) {
    console.error('system76 drivers', error);
  }
}

main();

