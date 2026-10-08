local M = {}
local uv = vim.uv

local TIERS = { 'cheap', 'expensive' }

local function notify(message, level)
  vim.notify('AI comments: ' .. message, level or vim.log.levels.INFO)
end

local function project_json(root)
  return root .. '/.ai_comments.json'
end

local function global_json()
  return vim.fn.stdpath('config') .. '/ai_comments_models.json'
end

-- Mtime-cached file reads; a changed mtime is what powers live reload.
local file_cache = {}
local function cached_file(path)
  local stat = uv.fs_stat(path)
  if not stat then
    file_cache[path] = nil
    return nil
  end
  local hit = file_cache[path]
  if hit and hit.mtime == stat.mtime.sec and hit.size == stat.size then return hit.data end
  local ok, data = pcall(function() return vim.json.decode(table.concat(vim.fn.readfile(path), '\n')) end)
  if not ok or type(data) ~= 'table' then
    file_cache[path] = nil
    return nil
  end
  file_cache[path] = { mtime = stat.mtime.sec, size = stat.size, data = data }
  return data
end

---Make the source of a tier from either `{ models = { tier = ... } }` or a bare `{ tier = ... }`.
local function tier_source(data)
  if type(data) ~= 'table' then return nil end
  if type(data.models) == 'table' then return data.models end
  return data
end

---Parse pi --list-models fixed-width table into rows of { provider, model, context, thinking }.
local function parse_table(text)
  local rows = {}
  local header_seen = false
  for line in text:gmatch('[^\r\n]+') do
    if not header_seen then
      if line:match('^%s*provider%s+model') then header_seen = true end
    else
      local tokens = {}
      for token in line:gmatch('%S+') do tokens[#tokens + 1] = token end
      if #tokens >= 2 then
        rows[#rows + 1] = {
          provider = tokens[1],
          model = tokens[2],
          context = tokens[3],
          thinking = tokens[5] and tokens[5] ~= 'no' and 'yes' or 'no',
        }
      end
    end
  end
  return rows
end

---Fetch the models pi reports as available (asynchronously). callback(rows, err) via vim.schedule.
function M.fetch(callback)
  vim.system({ 'pi', '--list-models' }, { text = true }, function(result)
    local stderr = (result.stderr or ''):gsub('%s+$', '')
    local rows = parse_table(result.stdout or '')
    if result.code ~= 0 then
      callback(nil, stderr ~= '' and ('pi --list-models failed: ' .. stderr) or 'pi --list-models failed.')
      return
    end
    callback(rows, nil)
  end)
end

-- De-duplicate "tier not configured/invalid" notices until the tier becomes valid again.
local warned = {}
local function warn_once(key, message)
  if warned[key] then return end
  warned[key] = true
  notify(message, vim.log.levels.WARN)
end

---Resolve the configured models for a project (highest precedence wins per tier).
---Order: project JSON > global JSON > vim.g.ai_comments_models > setup({ models = ... }).
---No defaults: an unset tier stays nil and the caller must handle it.
function M.resolve(root, setup_models)
  local sources = {
    { name = 'project config', src = root and tier_source(cached_file(project_json(root))) },
    { name = 'global config', src = tier_source(cached_file(global_json())) },
    { name = 'vim.g.ai_comments_models', src = vim.g.ai_comments_models },
    { name = 'setup(models)', src = setup_models },
  }

  local result = {}
  for _, tier in ipairs(TIERS) do
    local model, from
    for _, layer in ipairs(sources) do
      local entry = type(layer.src) == 'table' and layer.src[tier]
      if type(entry) == 'table' then
        model = { provider = entry.provider, id = entry.id, thinking = entry.thinking }
        from = layer.name
        break
      end
    end
    if not model then
      warn_once((root or '?') .. '|' .. tier .. '|missing',
        ("tier '%s' has no model configured — run :AIModels to choose from pi's available models.")
          :format(tier))
    elseif type(model.provider) ~= 'string' or model.provider == ''
      or type(model.id) ~= 'string' or model.id == '' then
      warn_once((root or '?') .. '|' .. tier .. '|invalid',
        ("tier '%s' in %s is missing a provider/id; run :AIModels to fix it.")
          :format(tier, from))
    else
      warned[(root or '?') .. '|' .. tier .. '|missing'] = nil
      warned[(root or '?') .. '|' .. tier .. '|invalid'] = nil
      result[tier] = model
    end
  end
  return result
end

local function write_json(path, data)
  vim.fn.mkdir(vim.fn.fnamemodify(path, ':h'), 'p')
  local ok, err = pcall(vim.fn.writefile, vim.split(vim.json.encode(data, { indent = '  ' }), '\n', { plain = true }), path)
  if not ok then
    notify('Could not write ' .. path .. ': ' .. tostring(err), vim.log.levels.ERROR)
    return false
  end
  file_cache[path] = nil
  return true
end

---Interactively pick cheap/expensive models from pi's list and persist them.
---opts: { root?, global? } -- writes project .ai_comments.json by default, or the global file with global=true.
function M.configure(opts)
  opts = opts or {}
  local target = opts.global and global_json() or (opts.root and project_json(opts.root))
  if not target then
    return notify('Open a saved project file first, or use :AIModels! for the global config.', vim.log.levels.WARN)
  end

  M.fetch(function(rows, err)
    vim.schedule(function()
      if not rows then return notify(err, vim.log.levels.ERROR) end
      if #rows == 0 then
        return notify('No models available from pi. Authorize a provider with `pi update --models` / `pi auth`, then retry :AIModels.',
          vim.log.levels.ERROR)
      end

      local labels, by_label = {}, {}
      for _, r in ipairs(rows) do
        local label = ('%s/%s'):format(r.provider, r.model)
        labels[#labels + 1] = label
        by_label[label] = r
      end
      table.sort(labels)

      local function pick(title, next_fn)
        vim.ui.select(labels, { prompt = title }, function(choice)
          if not choice then
            return notify('Cancelled.', vim.log.levels.WARN)
          end
          next_fn(by_label[choice])
        end)
      end

      local function thinking_prompt(model, next_fn)
        if model.thinking ~= 'yes' then return next_fn(nil) end
        vim.ui.select({ 'off', 'low', 'medium', 'high' }, { prompt = ('%s supports thinking. Level?'):format(model.model), default = 'medium' }, function(level)
          next_fn(level)
        end)
      end

      pick('AI comments: select CHEAP tier model (used for AI! / AI? markers) [provider/model]', function(cheap)
        pick('AI comments: select EXPENSIVE tier model (used for AI!! / AI?? markers) [provider/model]', function(expensive)
          thinking_prompt(expensive, function(thinking)
            local existing = cached_file(target)
            local out = {}
            if type(existing) == 'table' then
              for k, v in pairs(existing) do
                if k ~= 'models' then out[k] = vim.deepcopy(v) end
              end
            end
            out.models = {
              cheap = { provider = cheap.provider, id = cheap.model },
              expensive = { provider = expensive.provider, id = expensive.model, thinking = thinking },
            }
            if write_json(target, out) then
              notify('Models saved to ' .. target .. '.')
            end
          end)
        end)
      end)
    end)
  end)
end

---Display the models pi can use (optionally filtered) in a scratch buffer.
function M.list_models(search)
  M.fetch(function(rows, err)
    vim.schedule(function()
      if not rows then return notify(err, vim.log.levels.ERROR) end
      if search and search ~= '' then
        local filtered = {}
        for _, r in ipairs(rows) do
          if r.provider:find(search, 1, true) or r.model:find(search, 1, true) then
            filtered[#filtered + 1] = r
          end
        end
        rows = filtered
      end
      if #rows == 0 then
        return notify('No models to list for search "' .. (search or '') .. '".', vim.log.levels.WARN)
      end
      local lines = vim.tbl_map(function(r)
        return ('%-22s %-24s %s'):format(r.provider, r.model, ('context ' .. (r.context or '-')))
      end, rows)
      local buf = vim.api.nvim_create_buf(false, true)
      vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
      vim.api.nvim_buf_set_name(buf, 'pi://models')
      vim.bo[buf].filetype = 'text'
      local width = vim.o.columns > 76 and 76 or math.max(40, vim.o.columns - 4)
      vim.api.nvim_open_win(buf, true, {
        relative = 'editor', width = width, height = #lines + 2,
        style = 'minimal', border = 'single', title = ' pi models ',
      })
    end)
  end)
end

return M
