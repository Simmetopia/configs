require('projects').setup({
  min_score = 1.5,
  mapping = '<leader>sp',
  -- Functions replace a default listener; additional names add listeners.
  -- Defaults: ai, dap, overseer, terminals. Return an idle predicate to wait.
  listeners = {
    -- overseer = function(ctx)
    --   local overseer = package.loaded.overseer
    --   if not overseer then return end
    --   overseer.close()
    --   for _, task in ipairs(overseer.list_tasks()) do task:dispose(true) end
    -- end,
  },
})
