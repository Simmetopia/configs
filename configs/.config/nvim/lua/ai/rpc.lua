-- Owns the child process, pipes, response IDs, and shutdown deadlines.
-- All callbacks run on Neovim's main loop. Session/workflow policy lives elsewhere.
local uv = vim.uv
local protocol = require('ai.protocol')
local M = {}
local serial = 0
local clients = {}

local function close(handle)
  if handle and not handle:is_closing() then handle:close() end
end

function M.spawn(root, args, callbacks)
  local client = { callbacks = {}, parser = { pending = '' }, alive = true, hooks = callbacks }
  local stdin, stdout, stderr = uv.new_pipe(false), uv.new_pipe(false), uv.new_pipe(false)
  client.stdin = stdin
  local handle, err
  local env = {}
  for name, value in pairs(vim.fn.environ()) do env[#env + 1] = name .. '=' .. value end
  handle, err = uv.spawn(require('ai.config').options.executable, {
    cwd = root, args = args, env = env, stdio = { stdin, stdout, stderr },
  }, function(code)
    vim.schedule(function()
      client.alive = false
      client.callbacks = {}
      close(client.deadline)
      close(client.kill_timer)
      for _, pipe in ipairs({ stdin, stdout, stderr }) do close(pipe) end
      close(handle)
      clients[client] = nil
      callbacks.on_exit(code, client.stopping)
    end)
  end)
  if not handle then
    client.alive = false
    for _, pipe in ipairs({ stdin, stdout, stderr }) do close(pipe) end
    return nil, err
  end
  client.handle = handle
  clients[client] = true
  stdout:read_start(function(read_err, chunk)
    vim.schedule(function()
      if not client.alive then return end
      if read_err then callbacks.on_error('RPC stdout read error') end
      if chunk then
        protocol.feed(client.parser, chunk, function(record)
          if record.type == 'response' and client.callbacks[record.id] then
            local cb = client.callbacks[record.id]
            client.callbacks[record.id] = nil
            cb(record)
          else
            callbacks.on_event(record)
          end
        end, function() callbacks.on_error('Malformed/oversized RPC record') end)
      end
    end)
  end)
  stderr:read_start(function(_, chunk)
    if chunk then vim.schedule(function()
      if client.alive and not client.stderr_seen then
        client.stderr_seen = true
        -- Never expose stderr: it can contain credentials or file/prompt content.
        callbacks.on_diagnostic('Pi stderr diagnostic (details withheld)')
      end
    end) end
  end)
  return client
end

function M.send(client, command, callback)
  if not client or not client.alive or client.stopping then return false end
  serial = serial + 1
  local record = vim.tbl_extend('force', command, { id = command.type == 'extension_ui_response' and command.id or 'nvim-ai-' .. serial })
  if record.type ~= 'extension_ui_response' then
    client.callbacks[record.id] = callback or function() end
  end
  local ok = pcall(function()
    client.stdin:write(vim.json.encode(record) .. '\n', function(err)
      if err then vim.schedule(function()
        if not client.alive then return end
        client.callbacks[record.id] = nil
        client.hooks.on_error('RPC write failed')
      end) end
    end)
  end)
  if not ok then client.callbacks[record.id] = nil end
  return ok
end

function M.deadline(client, milliseconds, callback)
  client.deadline = uv.new_timer()
  client.deadline:start(milliseconds, 0, function()
    vim.schedule(function()
      if client.alive and not client.stopping then callback() end
    end)
  end)
end

function M.clear_deadline(client)
  close(client.deadline)
  client.deadline = nil
end

function M.stop(client)
  if not client or not client.alive or client.stopping then return end
  client.stopping = true
  M.clear_deadline(client)
  pcall(function() client.stdin:shutdown() end)
  client.kill_timer = uv.new_timer()
  client.kill_timer:start(require('ai.config').options.limits.shutdown_ms, 0, function()
    close(client.kill_timer)
    if client.alive and not client.handle:is_closing() then client.handle:kill('sigterm') end
  end)
end

function M.is_idle()
  return next(clients) == nil
end

function M.shutdown()
  for client in pairs(clients) do M.stop(client) end
end

return M
