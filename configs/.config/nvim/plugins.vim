
call plug#begin('~/.vim/plugged')

Plug 'vuciv/vim-bujo'
Plug 'lervag/vimtex'
Plug 'pantharshit00/vim-prisma'

Plug 'ryanoasis/vim-devicons'
Plug 'preservim/nerdtree'
Plug 'mcchrish/nnn.vim'
Plug 'junegunn/fzf', { 'dir': '~/.fzf', 'do': './install --all' }
Plug 'junegunn/fzf.vim'

Plug 'mbbill/undotree'
Plug 'benmills/vimux'

Plug 'SirVer/ultisnips'
Plug 'honza/vim-snippets'


Plug 'neoclide/coc.nvim', {'branch': 'release'}
Plug 'mhinz/vim-startify'

Plug 'prettier/vim-prettier', { 'do': 'yarn install' }

Plug 'tpope/vim-fugitive'
Plug 'tpope/vim-dispatch'
Plug 'tpope/vim-commentary'

Plug 'tpope/vim-surround'

Plug 'airblade/vim-gitgutter'
Plug 'sheerun/vim-polyglot'
Plug 'vim-airline/vim-airline'
Plug 'gruvbox-community/gruvbox'
"
" Neovim lsp Plugins
Plug 'neovim/nvim-lspconfig'
Plug 'nvim-lua/completion-nvim'
Plug 'tjdevries/nlua.nvim'
Plug 'tjdevries/lsp_extensions.nvim'
call plug#end()
