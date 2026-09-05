-- Keybinds (migrated from keybinds.conf)
-- Docs: https://wiki.hypr.land/Configuring/Basics/Binds/

local mod = "SUPER"

-- Workspaces 1-6 (+ named)
for i = 1, 6 do
    hl.bind(mod .. " + " .. i, hl.dsp.focus({ workspace = i }))
end
hl.bind(mod .. " + T", hl.dsp.focus({ workspace = 7 }))
hl.bind(mod .. " + Y", hl.dsp.focus({ workspace = 8 }))
hl.bind(mod .. " + W", hl.dsp.focus({ workspace = 9 }))

-- Move active window to workspace
for i = 1, 6 do
    hl.bind(mod .. " + SHIFT + " .. i, hl.dsp.window.move({ workspace = i }))
end
hl.bind(mod .. " + SHIFT + T", hl.dsp.window.move({ workspace = 7 }))
hl.bind(mod .. " + SHIFT + Y", hl.dsp.window.move({ workspace = 8 }))
hl.bind(mod .. " + SHIFT + W", hl.dsp.window.move({ workspace = 9 }))

-- Move window in direction
hl.bind(mod .. " + SHIFT + H", hl.dsp.window.move({ direction = "l" }))
hl.bind(mod .. " + SHIFT + L", hl.dsp.window.move({ direction = "r" }))

-- Fullscreen / maximize
hl.bind(mod .. " + SHIFT + M", hl.dsp.window.fullscreen({ mode = "fullscreen" })) -- old: fullscreen, 0
hl.bind(mod .. " + M", hl.dsp.window.fullscreen({ mode = "maximized" }))          -- old: fullscreen, 1

-- Resize active
hl.bind(mod .. " + right", hl.dsp.window.resize({ x = 50, y = 0, relative = true }))
hl.bind(mod .. " + left", hl.dsp.window.resize({ x = -50, y = 0, relative = true }))
hl.bind(mod .. " + up", hl.dsp.window.resize({ x = 0, y = -10, relative = true }))
hl.bind(mod .. " + down", hl.dsp.window.resize({ x = 0, y = 10, relative = true }))

-- Keyboard layout
hl.bind("CTRL + SPACE", hl.dsp.exec_cmd("hyprctl switchxkblayout all next"))

-- Apps
hl.bind(mod .. " + RETURN", hl.dsp.exec_cmd("footclient -e zellij"))
hl.bind(mod .. " + D", hl.dsp.exec_cmd("fuzzel"))
hl.bind(mod .. " + period", hl.dsp.exec_cmd('BEMOJI_PICKER_CMD="fuzzel -d" bemoji -t'))
hl.bind(mod .. " + R", hl.dsp.exec_cmd("fuzzel --list-executables-in-path"))
hl.bind(mod .. " + L", hl.dsp.exec_cmd("hyprlock"))
hl.bind(mod .. " + P", hl.dsp.exec_cmd('grim -g "$(slurp)" - | satty --filename - --copy-command wl-copy'))
hl.bind(mod .. " + SHIFT + S", hl.dsp.exec_cmd('grim -g "$(slurp)" - | satty --filename - --copy-command wl-copy'))

-- Window management
hl.bind(mod .. " + Q", hl.dsp.window.close({}))              -- killactive
hl.bind(mod .. " + SHIFT + Q", hl.dsp.exit())               -- hyprctl dispatch exit
hl.bind(mod .. " + O", hl.dsp.window.move({ monitor = "relative:+1" }))

-- 1Password quick access
hl.bind("CTRL + SHIFT + space", hl.dsp.exec_cmd("1password --quick-access"))

-- Brightness
hl.bind("XF86MonBrightnessUp", hl.dsp.exec_cmd("brightnessctl set +5%"))
hl.bind("XF86MonBrightnessDown", hl.dsp.exec_cmd("brightnessctl set 5%-"))

-- Volume
hl.bind("XF86AudioRaiseVolume", hl.dsp.exec_cmd("wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+"))
hl.bind("XF86AudioLowerVolume", hl.dsp.exec_cmd("wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-"))
hl.bind("XF86AudioMute", hl.dsp.exec_cmd("wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle"))

-- Monitors (kept commented, as in the original)
-- Meta+W+1: Home setup
-- hl.bind(mod .. " + CTRL + 1", hl.dsp.exec_cmd("~/.config/hypr/scripts/monitors/home.sh"))
-- hl.bind(mod .. " + CTRL + 2", hl.dsp.exec_cmd("~/.config/hypr/scripts/monitors/minds.sh"))
