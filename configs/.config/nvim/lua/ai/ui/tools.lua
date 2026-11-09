-- Compact progress from tool metadata only; never display results or edit contents.
local M = {}

local function short(value)
  if type(value) ~= 'string' then return nil end
  local text = vim.trim(value:gsub('%c', ' '):gsub('%s+', ' '))
  if text == '' then return nil end
  if vim.fn.strchars(text) > 140 then text = vim.fn.strcharpart(text, 0, 140) .. '…' end
  return text
end

local function summary(event)
  local name = short(event.toolName) or 'tool'
  local args = type(event.args) == 'table' and event.args or {}
  local detail
  if name == 'bash' then
    detail = short(args.command)
  elseif name == 'read' or name == 'edit' or name == 'write' or name == 'ls' then
    detail = short(args.path)
    if name == 'read' and type(args.offset) == 'number' and detail then
      detail = detail .. ' (line ' .. args.offset .. ')'
    end
  elseif name == 'grep' or name == 'find' then
    detail = short(args.pattern)
    if short(args.path) then detail = (detail and detail .. ' in ' or '') .. short(args.path) end
  elseif name == 'web_search' then
    detail = short(args.query)
  elseif name == 'webfetch' then
    detail = short(args.url)
  end
  return name .. (detail and ': ' .. short(detail) or '')
end

function M.start(session, event)
  session.tools = session.tools or {}
  local label = summary(event)
  session.tools[event.toolCallId or event.toolName or 'tool'] = { label = label, started = vim.uv.hrtime() }
  return 'Tool: ' .. label .. ' [running]'
end

function M.finish(session, event)
  local key = event.toolCallId or event.toolName or 'tool'
  local tool = session.tools and session.tools[key]
  if session.tools then session.tools[key] = nil end
  local elapsed = tool and string.format(' (%.1fs)', (vim.uv.hrtime() - tool.started) / 1e9) or ''
  return 'Tool: ' .. (tool and tool.label or summary(event)) .. (event.isError and ' [failed]' or ' [done]') .. elapsed
end

return M
