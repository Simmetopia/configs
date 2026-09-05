-- Autostart (migrated from startup.conf)
-- exec-once has no direct key in Lua; run commands on the hyprland.start event.
-- Docs: https://wiki.hypr.land/Configuring/Basics/Autostart/

hl.on("hyprland.start", function()
    hl.exec_cmd("zellij --session main")
    hl.exec_cmd("foot --server")

    hl.exec_cmd("swww-daemon")
    hl.exec_cmd("swww img ~/.config/awesome/themes/darkblue/wallpapers/itm-green.png")

    hl.exec_cmd("waybar")
    hl.exec_cmd("mako")
    hl.exec_cmd("hypridle")
end)
