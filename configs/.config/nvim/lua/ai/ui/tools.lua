-- Compact progress from tool metadata only; never display results or edit contents.
local timeline = require('ai.ui.timeline')
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
  return name, detail and short(detail)
end

local function key_of(event) return event.toolCallId or event.toolName or 'tool' end

function M.start(session, event)
  session.tools = session.tools or {}
  local name, detail = summary(event)
  local entry = timeline.tool({ call_id = event.toolCallId, name = name, detail = detail, state = 'running', started = vim.uv.hrtime() })
  session.tools[key_of(event)] = entry
  return entry
end

function M.finish(session, event)
  local key = key_of(event)
  local entry = session.tools and session.tools[key]
  if session.tools then session.tools[key] = nil end
  local state = event.isError and 'failed' or 'done'
  if entry then
    entry.state = state
    entry.elapsed = (vim.uv.hrtime() - entry.started) / 1e9
    return entry
  end
  local name, detail = summary(event)
  return timeline.tool({ call_id = event.toolCallId, name = name, detail = detail, state = state, started = vim.uv.hrtime() })
end

return M
