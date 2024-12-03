local M = {}

function M.set_window_frame(config)
  config.window_frame = {
    active_titlebar_bg = "#1e1e2e",   -- Title bar background when the window is active (Mocha base)
    inactive_titlebar_bg = "#1e1e2e", -- Title bar background when inactive (Mocha base)
    button_fg = "#cdd6f4",            -- Minimize/maximize/close button foreground (Mocha text)
    button_bg = "#1e1e2e",            -- Minimize/maximize/close button background (Mocha base)
    button_hover_fg = "#f5e0dc",      -- Button foreground on hover (Mocha Rosewater)
    button_hover_bg = "#313244",      -- Button background on hover (Mocha Surface1)
  }

  config.colors = {
    tab_bar = {
      background = "#1e1e2e", -- Background color for the tab bar (Mocha base)

      active_tab = {
        bg_color = "#313244", -- Background color for the active tab (Mocha Surface1)
        fg_color = "#cdd6f4", -- Foreground color (text) for the active tab (Mocha text)
        intensity = "Bold",   -- Make the active tab slightly more visible
      },

      inactive_tab = {
        bg_color = "#1e1e2e", -- Same background as the tab bar for a subtle inactive tab (Mocha base)
        fg_color = "#585b70", -- Slightly faded text color for inactive tabs (Mocha Overlay1)
      },

      inactive_tab_hover = {
        bg_color = "#313244", -- Slightly different background on hover (Mocha Surface1)
        fg_color = "#f5e0dc", -- Text color on hover (Mocha Rosewater)
      },

      new_tab = {
        bg_color = "#1e1e2e", -- Background for the new tab button (Mocha base)
        fg_color = "#585b70", -- Faded color for the new tab button (Mocha Overlay1)
      },

      new_tab_hover = {
        bg_color = "#313244", -- Background color when hovering over the new tab button (Mocha Surface1)
        fg_color = "#cdd6f4", -- Slightly brighter text when hovering over the new tab button (Mocha text)
      },
    },
  }
end

function M.set_tab_flat_style(config)
  -- Make tabs appear more box-like by making the background and foreground fill the whole area
  config.tab_max_width = 30 -- You can adjust this to control how wide the tabs should be

  config.colors = config.colors or {}

  config.colors.tab_bar = {
    background = "#1e1e2e", -- Background color for the tab bar (Mocha base)

    active_tab = {
      bg_color = "#313244", -- Active tab background (Mocha Surface1)
      fg_color = "#cdd6f4", -- Active tab text color (Mocha text)
      intensity = "Bold",   -- Keep the active tab bold for better visibility
      underline = "None",   -- Remove any underline
      italic = false,       -- No italic text
    },

    inactive_tab = {
      bg_color = "#1e1e2e", -- Inactive tab background matches the tab bar (Mocha base)
      fg_color = "#585b70", -- Slightly dim text for inactive tabs (Mocha Overlay1)
      underline = "None",   -- No underline
      italic = false,       -- No italic text
    },

    inactive_tab_hover = {
      bg_color = "#313244", -- Hovering over the tab makes it the same as an active tab (Mocha Surface1)
      fg_color = "#f5e0dc", -- Slightly highlighted text when hovered (Mocha Rosewater)
      underline = "None",   -- No underline on hover
      italic = false,       -- No italic text on hover
    },

    new_tab = {
      bg_color = "#1e1e2e", -- Background color for the new tab button (Mocha base)
      fg_color = "#585b70", -- Dim text color for the new tab button (Mocha Overlay1)
      underline = "None",   -- No underline on the new tab button
      italic = false,       -- No italic text
    },

    new_tab_hover = {
      bg_color = "#313244", -- Same as active tab background when hovered (Mocha Surface1)
      fg_color = "#cdd6f4", -- Bright text when hovered (Mocha text)
      underline = "None",   -- No underline on hover
      italic = false,       -- No italic text on hover
    },
  }
end

return M
