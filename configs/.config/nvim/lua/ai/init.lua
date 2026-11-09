-- The single public entry point. Modules do not register global hooks themselves.
local M = {}
local configured = false

function M.setup(options)
  if configured then return end -- avoid duplicate commands/autocmds/process ownership
  local config = require('ai.config').setup(options)
  local comments = require('ai.comments')
  local chat = require('ai.chat')
  local function profile_names()
    local names = vim.tbl_keys(config.profiles)
    table.sort(names)
    return names
  end
  local function profile_status()
    local profiles = require('ai.profiles')
    local status = profiles.status()
    local profile = config.profiles[status.active]
    local roles = {}
    for _, role in ipairs({ 'chat', 'cheap', 'expensive' }) do
      local model = profile.models[role]
      roles[#roles + 1] = ('%s=%s/%s/%s'):format(role, model.provider, model.id, model.thinking)
    end
    local help = profiles.help_roles()
    local text = ('AI profile: %s (%s); %s; AIHelp=%s AIHelp!=%s'):format(
      status.active, status.phase, table.concat(roles, ', '), help.role, help.bang_role)
    if status.target then text = text .. ' → ' .. status.target end
    if status.error then text = text .. ': ' .. status.error end
    vim.notify(text)
  end
  local function profile_command(opts)
    local profiles = require('ai.profiles')
    local name = vim.trim(opts.args or '')
    if name == '' then
      local token = profiles.token()
      return vim.ui.select(profile_names(), {
        prompt = 'AI profile',
        format_item = function(candidate)
          local profile = config.profiles[candidate]
          local model = profile.models.chat
          return ('%s — chat %s/%s/%s'):format(candidate, model.provider, model.id, model.thinking)
        end,
      }, function(selected)
        if not selected then return end
        if not profiles.allows(token) then
          return vim.notify('AI: profile picker is stale; reopen :AIProfile', vim.log.levels.WARN)
        end
        profiles.switch(selected, function(ok, err)
          if ok then vim.notify('AI profile active: ' .. selected)
          else vim.notify('AI: ' .. tostring(err), vim.log.levels.WARN) end
        end)
      end)
    end
    profiles.switch(name, function(ok, err)
      if ok then vim.notify('AI profile active: ' .. name)
      else vim.notify('AI: ' .. tostring(err), vim.log.levels.WARN) end
    end)
  end
  local commands = {
    AIToggle = comments.toggle, AIClear = comments.clear, AIStatus = comments.status, AIAbort = comments.abort,
    AINew = comments.new, AIStop = comments.stop, AIRestart = comments.restart,
    AIChat = chat.toggle, AIChatNew = chat.new, AIChatClear = chat.clear, AIChatStop = chat.stop, AIChatRestart = chat.restart,
  }
  for name, callback in pairs(commands) do vim.api.nvim_create_user_command(name, callback, {}) end
  vim.api.nvim_create_user_command('AIProfile', profile_command, { nargs = '?', complete = profile_names,
    desc = 'Show or switch the active AI profile when all workflows are idle' })
  vim.api.nvim_create_user_command('AIProfileStatus', profile_status, { desc = 'Show AI profile switch status' })
  local help = require('ai.help')
  vim.api.nvim_create_user_command('AIHelp', help.command, { range = true, nargs = '*', bang = true,
    desc = 'AI edit/question on the range; ! (or a leading !) uses the stronger model' })
  vim.api.nvim_create_user_command('AIHelpReview', help.review, { desc = 'Review conflicting AI selection proposals' })
  vim.api.nvim_create_user_command('AIHelpAbort', help.abort, { desc = 'Abort pending AI selection jobs' })
  vim.api.nvim_create_user_command('AIHelpModel', help.model, { nargs = '?', bang = true, complete = help.tiers,
    desc = 'Show/set the :AIHelp model tier (! sets the :AIHelp! tier)' })
  if config.mappings.project then
    vim.keymap.set('n', config.mappings.project, comments.toggle, { desc = 'Toggle project AI conversation' })
  end
  if config.mappings.chat then
    vim.keymap.set('n', config.mappings.chat, chat.toggle, { desc = 'Toggle Pi web chat' })
  end
  if config.mappings.help then
    -- No <CR>: leaves :'<,'>AIHelp on the command line for the instruction (prefix ! for the stronger model).
    vim.keymap.set('x', config.mappings.help, ':AIHelp ', { desc = 'AI help on selection (async)' })
  end
  local group = vim.api.nvim_create_augroup('AI', { clear = true })
  if config.comments.enabled then
    vim.api.nvim_create_autocmd('BufWritePost', { group = group, callback = function(ev) comments.saved(ev.buf) end })
    vim.api.nvim_create_autocmd({ 'FocusGained', 'BufEnter' }, { group = group, callback = function(ev) comments.refresh(ev.buf) end })
  end
  vim.api.nvim_create_autocmd('ColorScheme', { group = group, callback = help.highlights })
  vim.api.nvim_create_autocmd('ColorScheme', { group = group, callback = require('ai.ui.highlights').setup })
  vim.api.nvim_create_autocmd('VimResized', { group = group, callback = require('ai.ui.view').resize })
  vim.api.nvim_create_autocmd('VimLeavePre', { group = group, callback = require('ai.rpc').shutdown })
  configured = true
end

return M
