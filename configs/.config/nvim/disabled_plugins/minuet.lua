vim.pack.add({
  'https://github.com/nvim-lua/plenary.nvim',
  'https://github.com/milanglacier/minuet-ai.nvim',
})

require('minuet').setup({
  provider = 'openai_fim_compatible',
  n_completions = 1,
  context_window = 8000,
  request_timeout = 8,
  throttle = 350,
  debounce = 120,
  provider_options = {
    openai_fim_compatible = {
      api_key = 'TERM',
      end_point = 'http://localhost:8080/v1/completions',
      model = 'opencoder-1.5b-base',
      name = 'LocalAI-FIM',
      stream = true,
      optional = {
        max_tokens = 128,
        top_p = 0.9,
      },
    },
  },
  virtualtext = {
    auto_trigger_ft = { '*' },
    show_on_completion_menu = true,
    keymap = {
      accept = '<A-A>',
      accept_line = '<A-l>',
      accept_n_lines = '<A-z>',
      prev = '<A-[>',
      next = '<A-]>',
      dismiss = '<A-e>',
    },
  },
})

vim.keymap.set('n', '<leader>am', '<cmd>Minuet virtualtext toggle<CR>', { desc = 'toggle Minuet ghost text' })
