nnoremap <F5> :call LanguageClient_contextMenu()<CR>
" Or map each action separately
nmap gd <Plug>(coc-definition)
nmap gr <Plug>(coc-references) 
nmap gf <Plug>(coc-format)
nmap <F2> <Plug>(coc-rename)
nmap <C-Space> <Plug>(coc-codeaction)
nnoremap <leader>f :Files<cr>
nnoremap <leader>gf :GFiles<cr>
"#################################################
" yank keybindings
"#################################################
" " Copy to clipboard
vnoremap  <leader>y  "+y
nnoremap  <leader>Y  "+yg_
nnoremap  <leader>y  "+y
nnoremap  <leader>yy  "+yy

"nnoremap <leader>l :PrettierAsync<CR>
" " Paste from clipboard
nnoremap <leader>p "+p
nnoremap <leader>P "+P
vnoremap <leader>p "+p
vnoremap <leader>P "+P<Paste>

"#################################################
" Fugitive keybindings
"#################################################
nnoremap <leader>gs :G<CR>
nnoremap <leader>gp :Git push<CR>
nnoremap <leader>w :Gwrite<CR>
nnoremap <leader>' :call VimuxRunLastCommand()<CR>

nnoremap <silent> <leader>x :bufdo bd<bar>Startify<CR> 

" Startify fasd project change
nmap <silent> <leader>pp :Startify<CR> :call fzf#run(fzf#wrap({'source': 'fasd -d -R', 'sink': { line -> execute('cd '.split(line)[-1]) }}))<CR> 
nmap <silent> <leader>lf :Startify<CR> :call fzf#run(fzf#wrap({'source': 'fasd -f -R', 'sink': { line -> execute('e '.split(line)[-1]) }}))<CR> 

nnoremap <leader>oe :vsplit term://zsh<CR>
nnoremap <leader>tl :CocList todolist<CR>
nnoremap <leader>tn :CocCommand todolist.create<CR>

nnoremap <leader>gc :GBranches<CR>
nnoremap <leader>ga :Git fetch --all<CR>
nnoremap <leader>ghw :h <C-R>=expand("<cword>")<CR><CR>
nnoremap <leader>prw :CocSearch <C-R>=expand("<cword>")<CR><CR>
nnoremap <leader>pw :Rg <C-R>=expand("<cword>")<CR><CR>
nnoremap <leader>h :wincmd h<CR>
nnoremap <leader>j :wincmd j<CR>
nnoremap <leader>k :wincmd k<CR>
nnoremap <leader>l :wincmd l<CR>
nnoremap <leader>u :UndotreeShow<CR>
nnoremap <leader>pv :wincmd v<bar> :Ex <bar> :vertical resize 30<CR>
nnoremap <Leader>ps :Rg<SPACE>
nnoremap <Leader><CR> :so ~/.config/nvim/init.vim<CR>
