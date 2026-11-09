-- Highlight groups and icons for the conversation timeline.
local M = {}

local links = {
  AIBandUser = 'DiffAdd', AIBandAssistant = 'DiffChange', AIBandRestored = 'CursorLine', AIBandMeta = 'Comment',
  AIToolRead = 'Comment', AIToolExec = 'DiagnosticInfo', AIToolWrite = 'DiagnosticWarn',
  AIToolRunning = 'DiagnosticHint', AIToolOk = 'DiagnosticOk', AIToolFailed = 'DiagnosticError',
  AIEvent = 'Comment', AIEventWarn = 'DiagnosticWarn', AIEventError = 'DiagnosticError',
  AIFold = 'Folded', AICode = 'CursorLine',
}

function M.setup()
  for name, link in pairs(links) do vim.api.nvim_set_hl(0, name, { link = link, default = true }) end
end
M.setup()

function M.icons() return require('ai.config').options.ui.icons end

return M
