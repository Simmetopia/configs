call plug#begin('~/.vim/plugged')

Plug 'vuciv/vim-bujo'
Plug 'lervag/vimtex'
Plug 'pantharshit00/vim-prisma'
Plug 'jparise/vim-graphql'
Plug 'ryanoasis/vim-devicons'
Plug 'preservim/nerdtree'
Plug 'neoclide/coc.nvim', {'branch': 'master', 'do': 'yarn install --frozen-lockfile'}
Plug 'mcchrish/nnn.vim'
Plug 'junegunn/fzf', { 'dir': '~/.fzf', 'do': './install --all' }
Plug 'junegunn/goyo.vim'
Plug 'junegunn/limelight.vim'
Plug 'junegunn/fzf.vim'

Plug 'mbbill/undotree'
Plug 'benmills/vimux'

Plug 'SirVer/ultisnips'
Plug 'honza/vim-snippets'

Plug 'mhinz/vim-startify'
Plug 'prettier/vim-prettier', { 'do': 'yarn install' }

Plug 'tpope/vim-fugitive'
Plug 'tpope/vim-dispatch'
Plug 'tpope/vim-commentary'

Plug 'tpope/vim-surround'
Plug 'vim-crystal/vim-crystal'

Plug 'airblade/vim-gitgutter'
Plug 'vim-airline/vim-airline'
Plug 'gruvbox-community/gruvbox'
Plug 'arcticicestudio/nord-vim'

" Neovim lsp Plugins
Plug 'nvim-lua/popup.nvim'
Plug 'nvim-lua/plenary.nvim'
Plug 'nvim-telescope/telescope.nvim' 
Plug 'nvim-treesitter/nvim-treesitter'
Plug 'neovim/nvim-lspconfig' 
Plug 'nvim-lua/completion-nvim'
Plug 'tjdevries/nlua.nvim'
Plug 'nvim-lua/lsp_extensions.nvim'

" Install this plugin.
Plug 'tjdevries/nlua.nvim'
call plug#end()
