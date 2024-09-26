/* ==UserStyle==
@name        github-status-checks-expanded
@description Expand Github PR status checks
@version      1.0
@match       https://github.com/*
@inject-into content
@grant GM.addStyle
==/UserStyle== */

GM.addStyle( `
  .branch-action-item.open>.merge-status-list-wrapper>.merge-status-list, 
  .branch-action-item.open>.merge-status-list {
    max-height: none !important
   }
` );