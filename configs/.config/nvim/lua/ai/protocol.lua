-- Pure JSONL framing and message reconstruction; no processes or UI here.
local M = {}

function M.feed(parser, chunk, on_record, on_error)
  parser.pending = parser.pending .. chunk
  local limit = require('ai.config').options.limits.record_bytes
  while true do
    local pos = parser.pending:find('\n', 1, true)
    if not pos then break end
    local line = parser.pending:sub(1, pos - 1):gsub('\r$', '')
    parser.pending = parser.pending:sub(pos + 1)
    if #line > limit then
      on_error()
    elseif line ~= '' then
      local ok, record = pcall(vim.json.decode, line)
      if ok and type(record) == 'table' then
        on_record(record)
      else
        on_error()
      end
    end
  end
  if #parser.pending > limit then parser.pending = ''; on_error() end
end

function M.text(message)
  if type(message.content) == 'string' then return message.content end
  local parts = {}
  for _, block in ipairs(message.content or {}) do
    if block.type == 'text' and block.text then parts[#parts + 1] = block.text end
  end
  return table.concat(parts)
end

-- Keep the start of an answer so truncation does not drop the opening code fence.
function M.clip(text, limit)
  if #text <= limit then return text end
  local last = limit
  while last > 0 and text:byte(last + 1) and text:byte(last + 1) >= 128 and text:byte(last + 1) < 192 do
    last = last - 1
  end
  return text:sub(1, last) .. '\n[display truncated; full response is in the Pi session]'
end

function M.update(session, event)
  local index = (event.contentIndex or 0) + 1
  session.blocks = session.blocks or {}
  if event.type == 'text_delta' then
    session.blocks[index] = ((session.blocks[index] or '') .. (event.delta or '')):sub(1, require('ai.config').options.limits.response_bytes + 1)
  elseif event.type == 'text_end' then
    session.blocks[index] = (event.content or session.blocks[index] or ''):sub(1, require('ai.config').options.limits.response_bytes + 1)
  else
    return
  end
  local parts = {}
  for _, key in ipairs(vim.tbl_keys(session.blocks)) do parts[#parts + 1] = key end
  table.sort(parts)
  local text = {}
  for _, key in ipairs(parts) do text[#text + 1] = session.blocks[key] end
  session.stream = M.clip(table.concat(text), require('ai.config').options.limits.response_bytes)
end

return M
