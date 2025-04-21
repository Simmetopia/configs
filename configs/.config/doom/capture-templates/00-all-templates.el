;;; 00-all-templates.el --- All org-roam templates in one file -*- lexical-binding: t; -*-
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
;; Defines all org-roam templates in one place to avoid conflicts
;;
;;; Code:

;; Load org-roam directly instead of using after!
(require 'org-roam)

;; Reset templates to ensure clean state
(setq org-roam-capture-templates nil)
  
;; Add the standard note template
(setq org-roam-capture-templates
      '(("s" "📝 Standard Note" plain
         "%?"
         :if-new (file+head "${slug}.org"
                           "#+title: ${title}\n#+created: %U\n#+filetags: :note:\n\n* Summary\n\n* Details\n\n* References\n")
         :unnarrowed t)
        
        ("p" "📄 Software Proposal" plain
         "%?"
         :if-new (file+head "proposals/${slug}.org"
                           "#+title: ${title}\n#+created: %U\n#+filetags: :proposal:\n\n* Goal\nPOC, production ready, functional, design complete?\n\n* Tech Stack\n- \n\n* Estimate\n- \n\n* User Stories\n| Title | Description | Est. Hours |\n|-------+-------------+------------|\n\n* Assumptions\nWhat is expected to be ready from the client?\n\n* Notes\n")
         :unnarrowed t)))
  
;; Set the default template key
(setq org-roam-capture-immediate-template "s")
(setq org-roam-capture-ref-default-template "s")
  
;; Define the helper function for software proposal
(defun org-roam-proposal-node-insert ()
  "Create a new software proposal node using the `p` capture template."
  (interactive)
  (org-roam-node-find nil nil (lambda (node) 
                               (org-roam-capture- :node node
                                                 :props '(:template "p")))))
  
;; Bind it under <leader> n r p
(map! :leader
      :desc "Insert software proposal"
      "n r p" #'org-roam-proposal-node-insert)

;; Print a message to the *Messages* buffer to confirm this file was loaded
(message "Org-roam templates loaded: %s" org-roam-capture-templates)

;;; 00-all-templates.el ends here
