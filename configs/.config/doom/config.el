;;; $DOOMDIR/config.el -*- lexical-binding: t; -*-
(setq user-full-name "Simon Bundgaard Egeberg"
      user-mail-address "simon@bundgaard-egeberg.dk")

(setq doom-theme 'doom-nord)

;; import files in capture-templates
(load "~/.config/doom/capture-templates/00-all-templates")
;; This determines the style of line numbers in effect. If set to `nil', line
;; numbers are disabled. For relative line numbers, set this to `relative'.
(setq display-line-numbers-type 'relative)
;; (add-to-list local'load-path "/usr/share/emacs/site-lisp/mu4e")

;; If you use `org' and don't want your org files in the default location below,
;; change `org-directory'. It must be set before org loads!
;;
(setq org-directory "~/obs-vault/")
(setq org-roam-directory "~/obs-vault/")
(setq org-agenda-files '("~/obs-vault"
                         "~/obs-vault/daily/"))

(setq doom-font (font-spec :family "FiraCode Nerd Font" :size 16))

(defun my/org-roam-filter-by-tag (tag-name)
  (lambda (node)
    (member tag-name (org-roam-node-tags node))))

(defun my/org-roam-list-notes-by-tag (tag-name)
  (mapcar #'org-roam-node-file
          (seq-filter
           (my/org-roam-filter-by-tag tag-name)
           (org-roam-node-list))))

;; Load all custom capture templates
;; (mapc #'load (directory-files "~/.config/doom/capture-templates" t "\\.el$"))

;; (add-hook 'org-mode-hook #'enable-auto-save-for-org)

;; use M-x codeium-diagnose to see apis/fields that would be sent to the local language server
(after! org-download
  (setq org-download-method 'directory)
  (setq org-download-image-dir "attachments")
  (setq org-download-heading-lvl nil)

  ;; Always insert links with full path relative to the file
  (defun my/org-download-insert-relative-path (link)
    (insert (format "[[file:%s]]" link)))

  (setq org-download-link-format-function #'my/org-download-insert-relative-path))
