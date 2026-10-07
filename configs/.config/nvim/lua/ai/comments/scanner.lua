local core = require('ai.comments.markers')
local treesitter = require('ai.comments.treesitter')
local M = {}

function M.scan(buf, lines, ft)
  local markers = treesitter.scan(buf, lines, ft)
  if markers ~= nil then return markers, 'treesitter' end
  return core.scan(lines, ft), 'fallback'
end

return M
