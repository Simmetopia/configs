;;; $DOOMDIR/config.el -*- lexical-binding: t; -*-
(setq user-full-name "Simon Bundgaard Egeberg"
      user-mail-address "simon@bundgaard-egeberg.dk")

(setq doom-theme 'doom-one)

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
(setq org-roam-graph-viewer "/usr/bin/microsoft-edge")
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

(use-package! codeium
  :init
  ;; Add Codeium to completion-at-point-functions
  (add-to-list 'completion-at-point-functions #'codeium-completion-at-point)
  
  :config
  (setq use-dialog-box nil) ;; do not use popup boxes

  ;; get codeium status in the modeline
  (setq codeium-mode-line-enable
        (lambda (api) (not (memq api '(CancelRequest Heartbeat AcceptCompletion)))))
  (add-to-list 'mode-line-format '(:eval (car-safe codeium-mode-line)) t)

  ;; use M-x codeium-diagnose to see apis/fields that would be sent to the local language server
  (setq codeium-api-enabled
        (lambda (api)
          (memq api '(GetCompletions Heartbeat CancelRequest GetAuthToken RegisterUser auth-redirect AcceptCompletion))))

  ;; Limit the string sent to codeium for better performance
  (defun my-codeium/document/text ()
    (buffer-substring-no-properties (max (- (point) 3000) (point-min)) (min (+ (point) 1000) (point-max))))
  
  ;; Update cursor offset calculation
  (defun my-codeium/document/cursor_offset ()
    (codeium-utf8-byte-length
     (buffer-substring-no-properties (max (- (point) 3000) (point-min)) (point))))

  (setq codeium/document/text 'my-codeium/document/text)
  (setq codeium/document/cursor_offset 'my-codeium/document/cursor_offset)
  
  ;; Ensure Codeium is active in all programming modes
  (add-hook 'prog-mode-hook (lambda () 
                              (setq-local completion-at-point-functions 
                                          (cons #'codeium-completion-at-point
                                                (remove #'codeium-completion-at-point completion-at-point-functions))))))
(after! org-download
  (setq org-download-method 'directory)
  (setq org-download-image-dir "attachments")
  (setq org-download-heading-lvl nil)

  ;; Always insert links with full path relative to the file
  (defun my/org-download-insert-relative-path (link)
    (insert (format "[[file:%s]]" link)))

  (setq org-download-link-format-function #'my/org-download-insert-relative-path))
