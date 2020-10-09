
"#################################################
" TypeScript Language client
"#################################################
let g:ale_fixers = ['eslint', 'prettier']

let g:ale_lint_delay = 60
let g:ale_fix_on_save = 1
let g:ale_linters = {
      \'javascript': ['eslint'],
      \'typescript': ['eslint'],
      \'typescript.tsx': ['eslint'],
      \}

nnoremap <leader>vd :lua vim.lsp.buf.definition()<CR>
nnoremap <leader>vi :lua vim.lsp.buf.implementation()<CR>
nnoremap <leader>vsh :lua vim.lsp.buf.signature_help()<CR>
nnoremap <leader>vrr :lua vim.lsp.buf.references()<CR>
nnoremap <leader>vrn :lua vim.lsp.buf.rename()<CR>
nnoremap <leader>vh :lua vim.lsp.buf.hover()<CR>
nnoremap <leader>vca :lua vim.lsp.buf.code_action()<CR>

let g:completion_matching_strategy_list = ['exact', 'substring', 'fuzzy']
