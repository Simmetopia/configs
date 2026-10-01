local core = require('ai_comments.core')
local M = {}

-- nil means that parsing was unavailable; an empty table means it succeeded
-- and found no markers. In the latter case, never rescan strings heuristically.
function M.scan(buf, lines, ft)
  local ok, parser = pcall(vim.treesitter.get_parser, buf)
  if not ok or not parser then return nil end

  local parsed, markers = pcall(function()
    local by_line = {}
    parser:parse()
    parser:for_each_tree(function(tree, language_tree)
      local language = language_tree:lang()
      local function visit(node)
        if node:type():find('comment', 1, true) then
          local start_row, start_col, end_row, end_col = node:range()
          if start_row == end_row and lines[start_row + 1] then
            local fragment = lines[start_row + 1]:sub(start_col + 1, end_col)
            -- The root grammar can have a different name from the filetype.
            -- Never use the parent filetype to parse an injected language.
            local marker = core.parse_comment(fragment, language)
            if not marker and language_tree == parser then
              marker = core.parse_comment(fragment, ft)
            end
            if marker then
              marker.line = lines[start_row + 1]
              marker.comment_at = start_col + marker.comment_at
              by_line[start_row + 1] = marker
            end
          end
        end
        for child in node:iter_children() do visit(child) end
      end
      visit(tree:root())
    end)
    return core.collect(lines, function(_, number) return by_line[number] end)
  end)
  if not parsed then return nil end
  return markers
end

return M
