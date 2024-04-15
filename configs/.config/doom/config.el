
;;; $DOOMDIR/config.el -*- lexical-binding: t; -*-

;; Place your private configuration here! Remember, you do not need to run 'doom
;; sync' after modifying this file!


;; Some functionality uses this to identify you, e.g. GPG configuration, email
;; clients, file templates and snippets. It is optional.
(setq user-full-name "Simon Bundgaard Egeberg"
      user-mail-address "simon@bundgaard-egeberg.dk")

;; Doom exposes five (optional) variables for controlling fonts in Doom:
;;
;; - `doom-font' -- the primary font to use
;; - `doom-variable-pitch-font' -- a non-monospace font (where applicable)
;; - `doom-big-font' -- used for `doom-big-font-mode'; use this for
;;   presentations or streaming.
;; - `doom-symbol-font' -- for symbols
;; - `doom-serif-font' -- for the `fixed-pitch-serif' face
;;
;; See 'C-h v doom-font' for documentation and more examples of what they
;; accept. For example:
;;
;;(setq doom-font (font-spec :family "Fira Code" :size 12 :weight 'semi-light)
;;      doom-variable-pitch-font (font-spec :family "Fira Sans" :size 13))
;;
;; If you or Emacs can't find your font, use 'M-x describe-font' to look them
;; up, `M-x eval-region' to execute elisp code, and 'M-x doom/reload-font' to
;; refresh your font settings. If Emacs still can't find your font, it likely
;; wasn't installed correctly. Font issues are rarely Doom issues!

;; There are two ways to load a theme. Both assume the theme is installed and
;; available. You can either set `doom-theme' or manually load a theme with the
;; `load-theme' function. This is the default:

(setq doom-theme 'doom-horizon)

;; This determines the style of line numbers in effect. If set to `nil', line
;; numbers are disabled. For relative line numbers, set this to `relative'.
(setq display-line-numbers-type 'relative)
(add-to-list 'load-path "/usr/share/emacs/site-lisp/mu4e")

;; If you use `org' and don't want your org files in the default location below,
;; change `org-directory'. It must be set before org loads!
;;
(setq org-directory "~/org-roam/")
(setq org-roam-directory "~/org-roam/")
(setq org-roam-graph-viewer "/usr/bin/microsoft-edge")
(setq org-agenda-files '("~/org-roam"
                         "~/org-roam/daily/"))

(setq doom-font "JetBrains Mono Nerd Font")
(setq auth-sources '("~/.authinfo.gpg"))

(setq +notmuch-sync-backend 'mbsync)

;; (set-email-account! "simmetopia"
;;   '((mu4e-sent-folder       . "/one.com/Sent Items")
;;     (mu4e-drafts-folder     . "/one.com/Drafts")
;;     (mu4e-trash-folder      . "/one.com/Trash")
;;     (mu4e-refile-folder     . "/one.com/Arkiv")
;;     (smtpmail-smtp-user     . "simon@bundgaard-egeberg.dk")
;;     (mu4e-compose-signature . "---\nYours truly\nSimon"))
;;   t)

;; Ensure SMTP is correctly configured
(setq message-send-mail-function 'smtpmail-send-it)


(use-package! copilot
  :hook (prog-mode . copilot-mode)
  :bind (:map copilot-completion-map
              ("<tab>" . 'copilot-accept-completion)
              ("TAB" . 'copilot-accept-completion)
              ("C-TAB" . 'copilot-accept-completion-by-word)
              ("C-<tab>" . 'copilot-accept-completion-by-word)))
