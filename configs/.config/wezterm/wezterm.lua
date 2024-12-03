local wezterm = require 'wezterm'
local mux = wezterm.mux
local act = wezterm.action
local config = {}
local keybinds = require 'keybinds'
local window_frame = require 'window_frame'

config.enable_wayland = false

config.color_scheme = 'Kasugano (terminal.sexy)'
config.font = wezterm.font 'FiraCode Nerd Font'

wezterm.on('mux-startup', function()
  local tab, pane, window = mux.spawn_window {}
  pane:split { direction = 'Top' }
end)

config.unix_domains = {
  { name = 'unix' }
}

config.default_gui_startup_args = { 'connect', 'unix' }

config.leader = { key = 'a', mods = 'CTRL', timeout_milliseconds = 1000 }

config.keys = keybinds.set_keymap(act)
config.key_tables = keybinds.set_config(act)

window_frame.set_window_frame(config)
config.window_padding = {
  left = 0,
  right = 0,
  top = 0,
  bottom = 0
}

return config
