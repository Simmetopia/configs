(require 'package) ;; Emacs builtin

;; set package.el repositories
(setq package-archives
'(
   ("org" . "https://orgmode.org/elpa/")
   ("gnu" . "https://elpa.gnu.org/packages/")
   ("melpa" . "https://melpa.org/packages/")
))

;; initialize built-in package management
(package-initialize)

;; update packages list if we are on a new install
(unless package-archive-contents
  (package-refresh-contents))

;; a list of pkgs to programmatically install
;; ensure installed via package.el
(setq my-package-list '(use-package))

;; programmatically install/ensure installed
;; pkgs in your personal list
(dolist (package my-package-list)
  (unless (package-installed-p package)
    (package-install package)))

;; now you can
;; (use-package pkgname) etc as per
;; use-package example docs
(use-package which-key
  :ensure t
  :config
  (which-key-mode))

(use-package ivy
    :ensure t
    :config
    (ivy-mode t)
    (setq ivy-use-virtual-buffers t)
    (setq enable-recursive-minibuffers t)
    ;; enable this if you want `swiper' to use it
    ;; (setq search-default-mode #'char-fold-to-regexp)
    (global-set-key "\C-s" 'swiper)
    (global-set-key (kbd "C-c C-r") 'ivy-resume)
    (global-set-key (kbd "<f6>") 'ivy-resume)
    (global-set-key (kbd "M-x") 'counsel-M-x)
    (global-set-key (kbd "C-x C-f") 'counsel-find-file)
    (global-set-key (kbd "<f1> f") 'counsel-describe-function)
    (global-set-key (kbd "<f1> v") 'counsel-describe-variable)
    (global-set-key (kbd "<f1> o") 'counsel-describe-symbol)
    (global-set-key (kbd "<f1> l") 'counsel-find-library)
    (global-set-key (kbd "<f2> i") 'counsel-info-lookup-symbol)
    (global-set-key (kbd "<f2> u") 'counsel-unicode-char)
    (global-set-key (kbd "C-c g") 'counsel-git)
    (global-set-key (kbd "C-c j") 'counsel-git-grep)
    (global-set-key (kbd "C-c k") 'counsel-ag)
    (global-set-key (kbd "C-x l") 'counsel-locate)
    (global-set-key (kbd "C-S-o") 'counsel-rhythmbox)
    (define-key minibuffer-local-map (kbd "C-r") 'counsel-minibuffer-history))


(use-package evil-leader
  :ensure t
  :config
  (global-evil-leader-mode)
  (evil-leader/set-leader "<SPC>")
  (evil-leader/set-key
    "/" 'reload
    "o e" 'eshell))


(use-package evil
             :ensure t)
(evil-mode 1)

(use-package nord-theme :ensure t)
(load-theme 'nord)

(use-package magit
  :ensure t)

(use-package eshell
  :ensure t)

(use-package company
  :ensure t
  :config
  (global-company-mode 1))

(use-package eshell-up
  :ensure t)
(use-package eshell-z
  :ensure t)
(use-package shrink-path
  :ensure t)
(use-package esh-help
  :ensure t)
(use-package eshell-did-you-mean
  :ensure t)

(add-hook
 'eshell-mode-hook
 (lambda ()
   (setq pcomplete-cycle-completions nil)))

(setq ivy-do-completion-in-region t) ; this is the default

(defun setup-eshell-ivy-completion ()
  (define-key eshell-mode-map [remap eshell-pcomplete] 'completion-at-point)
  ;; only if you want to use the minibuffer for completions instead of the
  ;; in-buffer interface
  (setq-local ivy-display-functions-alist
              (remq (assoc 'ivy-completion-in-region ivy-display-functions-alist)
                    ivy-display-functions-alist)))

(add-hook 'eshell-mode-hook #'setup-eshell-ivy-completion)


(use-package eshell-syntax-highlighting
  :after esh-mode
  :demand t ;; Install if not already installed.
  :config
  ;; Enable in all Eshell buffers.
  (eshell-syntax-highlighting-global-mode +1))

(use-package esh-autosuggest
  :hook (eshell-mode . esh-autosuggest-mode)
  ;; If you have use-package-hook-name-suffix set to nil, uncomment and use the
  ;; line below instead:
  ;; :hook (eshell-mode-hook . esh-autosuggest-mode)
  :ensure t)

(defun reload ()
  "reload emcs"
  (interactive)
  (load-file "~/.config/emacs/init.el"))



(custom-set-variables
 ;; custom-set-variables was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(custom-safe-themes
   '("37768a79b479684b0756dec7c0fc7652082910c37d8863c35b702db3f16000f8" default))
 '(package-selected-packages
   '(esh-autosuggest better-defaults nordless-theme evil which-key use-package toggle-test region-bindings-mode projectile powerline paredit org-super-agenda org-bullets nord-theme multiple-cursors markdown-mode magit ivy-posframe highlight-symbol git-timemachine git-gutter flycheck-joker flycheck-clj-kondo expand-region exec-path-from-shell esup dumb-jump diminish delight define-word counsel company-emoji company-anaconda clojure-mode-extra-font-locking cider aggressive-indent ace-jump-mode)))
(custom-set-faces
 ;; custom-set-faces was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 )
