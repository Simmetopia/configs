local awful = require("awful")
local lain = require("lain")
local my_custom_layout = {}

my_custom_layout.name = "wide_layout"

function my_custom_layout.arrange(p)
  local clients = p.clients
  local workarea = p.workarea

  local n = #clients

  if n == 1 then
    -- Single window occupies the full screen
    lain.layout.centerwork.arrange(p)
  elseif n == 2 then
    -- Two windows with a 1:3 split
    local c1 = clients[1]
    local c2 = clients[2]

    local width1 = workarea.width * (1 / 4)
    local width2 = workarea.width * (3 / 4)

    local g1 = {
      x = workarea.x,
      y = workarea.y,
      width = width1,
      height = workarea.height,
    }
    local g2 = {
      x = workarea.x + width1,
      y = workarea.y,
      width = width2,
      height = workarea.height,
    }
    p.geometries[c1] = g1
    p.geometries[c2] = g2
  else
    -- For more than three windows, fallback to the default tile layout
    lain.layout.centerwork.arrange(p)
  end
end

return my_custom_layout
