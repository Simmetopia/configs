"Plug
if !exists('g:vscode')
source ~/.config/nvim/plugins.vim
map <SPC> <Nop>
let mapleader=" "

"Dependencies
source ~/.config/nvim/nnn.vimrc
source ~/.config/nvim/coc_config.vim
source ~/.config/nvim/navigation.vim
source ~/.config/nvim/keybinds.vim
source ~/.config/nvim/utils.vim
source ~/.config/nvim/jest_test.vim

" Gruvbox setup
let g:gruvbox_contrast_dark = 'hard'
let g:gruvbox_invert_selection='0'

colorscheme gruvbox
set background=dark

autocmd InsertLeave * if pumvisible() == 0 | pclose | endif

" set filetypes as typescript.tsx
autocmd BufNewFile,BufRead *.tsx,*.jsx set filetype=typescript.tsx
" Personilzation here
syntax on

set guicursor=
set noshowmatch
set relativenumber
set hidden
set noerrorbells
set tabstop=4 softtabstop=4
set shiftwidth=4
set expandtab
set smartindent
set nu
set nowrap
set smartcase
set noswapfile
set nobackup
set undodir=~/.vim/undodir
set undofile
set incsearch
set termguicolors
set scrolloff=8
set noshowmode
set completeopt=menuone,noinsert,noselect
set shell=/bin/bash

" Give more space for displaying messages.
set cmdheight=2

" Having longer updatetime (default is 4000 ms = 4 s) leads to noticeable
" delays and poor user experience.
set updatetime=50

" Don't pass messages to |ins-completion-menu|.
set shortmess+=c


"netrw basic setup
let g:netrw_banner = 0
let g:UltiSnipsExpandTrigger = '<F5>'
let g:snips_author = "Simon Bundgaard-Egeberg"
" Startify types
let g:startify_lists = [
  \ { 'type': 'files',     'header': ['   recently opened']            },
  \ { 'type': 'sessions',  'header': ['   Sessions']       },
  \ { 'type': 'bookmarks', 'header': ['   Bookmarks']      },
  \ ]
" Insert new bookmarks here
" [keybind]:[location]
let g:startify_bookmarks = [{'c': '~/configs/configs/.config/nvim/init.vim'},{'i3':'~/.config/i3/config'}]
" Amount of recent files to remember
let g:startify_files_number = 8
" Should not persist a session automatic
let g:startify_session_persistence = 0
" However is a session was created manually, load that one
let g:startify_session_autoload = 1

let g:startify_change_to_dir = 0
" When opening a file in a VCS , make that folder the PWD
let g:startify_change_to_vcs_root = 1

let g:ascii = [
\ '   _____ _                      _          __    ___________________   ______  ___    ______  __',
\ '  / ___/(_)___ ___  ____  ____ ( )_____   / /   / ____/ ____/ ____/ | / / __ \/   |  / __ \ \/ /',
\ '  \__ \/ / __ `__ \/ __ \/ __ \|// ___/  / /   / __/ / / __/ __/ /  |/ / / / / /| | / /_/ /\  / ',
\ ' ___/ / / / / / / / /_/ / / / / (__  )  / /___/ /___/ /_/ / /___/ /|  / /_/ / ___ |/ _, _/ / /  ',
\ '/____/_/_/ /_/ /_/\____/_/ /_/ /____/  /_____/_____/\____/_____/_/ |_/_____/_/  |_/_/ |_| /_/   ',
\ '                                                                                                ',
\ '',
\ '           _    ________  ___   __________  _   __________________',
\ '          | |  / /  _/  |/  /  / ____/ __ \/ | / / ____/  _/ ____/',
\ '          | | / // // /|_/ /  / /   / / / /  |/ / /_   / // / __  ',
\ '          | |/ // // /  / /  / /___/ /_/ / /|  / __/ _/ // /_/ /  ',
\ '          |___/___/_/  /_/   \____/\____/_/ |_/_/   /___/\____/   ',
\]

let g:startify_custom_header =
          \ 'map(g:ascii + startify#fortune#boxed(), "\"   \".v:val")'
"
"" Exit terminal mode with ESC
tnoremap <Esc> <C-\><C-n>
endif

let g:tex_flavor='latex'
