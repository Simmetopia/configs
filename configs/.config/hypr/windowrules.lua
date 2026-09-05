-- Window rules (migrated from hyprland.conf windowrule lines)
-- NOTE: the original .conf used an invalid syntax:
--   windowrule = float on, match:class com.gabm.satty
-- which was almost certainly not being applied. This is the corrected form.
-- Docs: https://wiki.hypr.land/Configuring/Basics/Window-Rules/

hl.window_rule({
    match = { class = "^(com\\.gabm\\.satty)$" },
    float = true,
    size = { "90%", "90%" },
    center = true,
})
