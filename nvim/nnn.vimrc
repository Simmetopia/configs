" Floating window (neovim latest and vim with patch 8.2.191)
let g:nnn#layout = { 'window': { 'width': 0.9, 'height': 0.6, 'highlight': 'Debug' } }

" Disable default mappings
let g:nnn#set_default_mappings = 1

" Set your own
nnoremap <silent> <leader>cn :NnnPicker<CR>

" Or override
" Start nnn in the current file's directory
nnoremap <leader>n :NnnPicker '%:p:h'<CR>
