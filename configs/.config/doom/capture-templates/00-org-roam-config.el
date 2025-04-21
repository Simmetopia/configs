;;; org-roam-config.el --- Configure org-roam defaults -*- lexical-binding: t; -*-
;;
;; Copyright (C) 2025 Simon Bundgaard Egeberg
;;
;; Author: Simon Bundgaard Egeberg <simon@bundgaard-egeberg.dk>
;; Maintainer: Simon Bundgaard Egeberg <simon@bundgaard-egeberg.dk>
;; Created: April 03, 2025
;; Modified: April 03, 2025
;; Version: 0.0.1
;;
;; This file is not part of GNU Emacs.
;;
;;; Commentary:
;;
;; Sets up org-roam with default templates and configuration
;;
;;; Code:

;; This file should be loaded first, before other template files
;; Ensure it's loaded first by renaming it to "00-org-roam-config.el"

(after! org-roam
  ;; Reset org-roam-capture-templates to ensure clean state
  (setq org-roam-capture-templates nil)
  
  ;; Set the default template key
  (setq org-roam-capture-immediate-template "s")
  (setq org-roam-capture-ref-default-template "s"))

;;; org-roam-config.el ends here
