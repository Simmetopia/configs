local wezterm = require 'wezterm'
local mux = wezterm.mux
local act = wezterm.action
local config = {}
local keybinds = require 'keybinds'
local window_frame = require 'window_frame'

config.enable_wayland = false

config.color_scheme = 'Kasugano (terminal.sexy)'
-- config.color_scheme = 'Atelier Dune Light (base16)'
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

wezterm.on('user-var-changed', function(window, pane, name, value)
  local overrides = window:get_config_overrides() or {}
  if name == "ZEN_MODE" then
    local incremental = value:find("+")
    local number_value = tonumber(value)
    if incremental ~= nil then
      while (number_value > 0) do
        window:perform_action(wezterm.action.IncreaseFontSize, pane)
        number_value = number_value - 1
      end
      overrides.enable_tab_bar = false
    elseif number_value < 0 then
      window:perform_action(wezterm.action.ResetFontSize, pane)
      overrides.font_size = nil
      overrides.enable_tab_bar = true
    else
      overrides.font_size = number_value
      overrides.enable_tab_bar = false
    end
  end
  window:set_config_overrides(overrides)
end)

window_frame.set_window_frame(config)
config.window_padding = {
  left = 0,
  right = 0,
  top = 0,
  bottom = 0
}

return config
