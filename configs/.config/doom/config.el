
;;; $DOOMDIR/config.el -*- lexical-binding: t; -*-
(setq user-full-name "Simon Bundgaard Egeberg"
      user-mail-address "simon@bundgaard-egeberg.dk")

(setq doom-theme 'doom-nord)

;; This determines the style of line numbers in effect. If set to `nil', line
;; numbers are disabled. For relative line numbers, set this to `relative'.
(setq display-line-numbers-type 'relative)
;; (add-to-list 'load-path "/usr/share/emacs/site-lisp/mu4e")

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

(defun my-open-agenda-and-roam-dailies ()
  "Open the weekly Org agenda below, with today's and yesterday's Org-roam daily notes side by side above."
  (interactive)
  ;; Start with a clean window layout
  (delete-other-windows)
  ;; Split the window horizontally into upper and lower panes
  (let* ((upper-window (selected-window))
         (lower-window (split-window upper-window nil 'below)))
    ;; Now split the upper window vertically
    (let ((upper-left-window upper-window)
          (upper-right-window (split-window upper-window nil 'right)))
      ;; Open today's Org-roam daily note in the upper-left window
      (with-selected-window upper-left-window
        (org-roam-dailies-goto-today))
      ;; Open yesterday's Org-roam daily note in the upper-right window
      (with-selected-window upper-right-window
        (org-roam-dailies-goto-yesterday))
      ;; Open the weekly Org agenda in the lower window
      (with-selected-window lower-window
        (org-agenda-list nil nil 'week))
      ;; Optional: Return focus to the upper-left window
      (select-window upper-left-window))))

(map! :leader
      :desc "Open agenda and roam dailies"
      "d d" #'my-open-agenda-and-roam-dailies)
