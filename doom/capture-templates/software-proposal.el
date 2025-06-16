;;; software-proposal.el --- Description -*- lexical-binding: t; -*-
;;
;; Copyright (C) 2025 Simon Bundgaard Egeberg
;;
;; Author: Simon Bundgaard Egeberg <simon@bundgaard-egeberg.dk>
;; Maintainer: Simon Bundgaard Egeberg <simon@bundgaard-egeberg.dk>
;; Created: April 03, 2025
;; Modified: April 03, 2025
;; Version: 0.0.1
;; Keywords: abbrev bib c calendar comm convenience data docs emulations extensions faces files frames games hardware help hypermedia i18n internal languages lisp local maint mail matching mouse multimedia news outlines processes terminals tex text tools unix vc
;; Homepage: https://github.com/simmetopia/software-proposal
;; Package-Requires: ((emacs "24.3"))
;;
;; This file is not part of GNU Emacs.
;;
;;; Commentary:
;;
;;  Description
;;
;;; Code:

(after! org-roam
  ;; Define the capture template with key as a symbol.
  (add-to-list 'org-roam-capture-templates
               '(p "📄 Software Proposal" plain
                 (file "~/org/proposals/${slug}.org")
                 "#+title: ${title}\n#+created: %U\n#+filetags: :proposal:\n\n* Goal\nPOC, production ready, functional, design complete?\n\n* Tech Stack\n- \n\n* Estimate\n- \n\n* User Stories\n| Title | Description | Est. Hours |\n|-------+-------------+------------|\n\n* Assumptions\nWhat is expected to be ready from the client?\n\n* Notes\n"
                 :target (file+head "proposals/${slug}.org" "#+title: ${title}")
                 :unnarrowed t))

  ;; Define the helper function using the symbol 'p as the template key.
  (defun org-roam-proposal-node-insert ()
    "Create a new software proposal node using the `p` capture template."
    (interactive)
    (org-roam-capture :template-key 'p))

  ;; Bind it under <leader> n r p
  (map! :leader
        :desc "Insert software proposal"
        "n r p" #'org-roam-proposal-node-insert))
