-- Hyprland Lua config (migrated from hyprland.conf)
-- Lua configs are supported since Hyprland 0.55. If this file exists it is
-- loaded INSTEAD of hyprland.conf. Delete/rename it to fall back to the .conf.
-- Docs: https://wiki.hypr.land/Configuring/

-- Autostart (exec-once equivalents)
require("startup")

-- Monitors
-- monitor=,preferred,0x0,1
-- Home setup
-- hl.monitor({ output = "HDMI-A-3", mode = "preferred", position = "0x0", scale = 1 })
-- hl.monitor({ output = "DP-1", mode = "preferred", position = "2560x0", scale = 1 })
-- hl.monitor({ output = "eDP-1", mode = "preferred", position = "5120x0", scale = 1 })
-- hl.monitor({ output = "eDP-1", disabled = true })

-- Work / itminds
hl.monitor({ output = "eDP-1", mode = "1920x1080@165", position = "0x0", scale = 1 })
hl.monitor({ output = "DVI-I-2", mode = "2560x1440@75", position = "1920x0", scale = 1 })
hl.monitor({ output = "DVI-I-1", mode = "2560x1440@75", position = "4480x0", scale = 1 })

hl.monitor({ output = "Unknown-1", disabled = true })
hl.monitor({ output = "Unknown-2", disabled = true })

-- Options
hl.config({
  input = {
    kb_layout = "us,dk",
  },
  general = {
    gaps_in = 5,
    gaps_out = 5,
    border_size = 1,
    layout = "dwindle",
  },
  decoration = {
    rounding = 4,
  },
})

-- Keybinds
require("keybinds")

-- Window rules
require("windowrules")
