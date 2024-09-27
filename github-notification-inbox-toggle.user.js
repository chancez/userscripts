// ==UserScript==
// @name         GitHub Notification Inbox Toggle
// @namespace    http://tampermonkey.net/
// @version      1.17
// @description  Toggle hiding or showing done notifications in GitHub inbox
// @match        https://github.com/notifications*
// @grant        none
// @inject-into  content
// @updateURL   https://github.com/chancez/userscripts/raw/refs/heads/main/github-notification-inbox-toggle.user.js
// @downloadURL https://github.com/chancez/userscripts/raw/refs/heads/main/github-notification-inbox-toggle.user.js
// ==/UserScript==

(function() {
    'use strict';

    // Retrieve initial states from sessionStorage or set defaults
    let isHidden = sessionStorage.getItem('isHidden') === 'true';
    let showDoneOnly = sessionStorage.getItem('showDoneOnly') === 'true';
    const doneSelectors = [
        'svg.octicon-issue-closed',
        'svg.octicon-git-pull-request-closed',
        'svg.octicon-git-merge',
        'svg.octicon-x',
        'svg.octicon-stop',
        'svg.octicon-rocket',
    ];

    const createButton = (text, positionY) => {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.position = 'fixed';
        button.style.left = '50%';
        button.style.transform = 'translateX(-50%)';
        button.style.zIndex = '1000';
        button.style.padding = '5px 10px';
        button.style.border = '1px solid #ccc';
        button.style.borderRadius = '4px';
        button.style.cursor = 'pointer';
        button.style.transition = 'background-color 0.3s, color 0.3s';
        button.style.top = `${positionY}px`;
        button.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        button.style.color = '#333';
        button.addEventListener('click', (event) => {
            event.preventDefault();
            if (text === 'Toggle Hidden Notifications') {
                isHidden = !isHidden;
                showDoneOnly = false;
            } else if (text === 'Show Only Done Notifications') {
                showDoneOnly = !showDoneOnly;
                isHidden = false;
            }
            saveFilterState();
            updateVisibleNotifications();
        });
        return button;
    };

    const toggleVisibilityButton = createButton('Toggle Hidden Notifications', 10);
    const toggleShowDoneButton = createButton('Show Only Done Notifications', 50);
    document.body.appendChild(toggleVisibilityButton);
    document.body.appendChild(toggleShowDoneButton);

    function updateButtonState(button, isActive) {
        button.style.backgroundColor = isActive ? '#4caf50' : 'rgba(255, 255, 255, 0.9)';
        button.style.color = isActive ? '#fff' : '#333';
    }

    function updateVisibleNotifications() {
        const items = document.querySelectorAll('.js-navigation-container li');
        items.forEach(item => {
            const isVisible = getComputedStyle(item).display !== 'none';
            const isDone = item.querySelector(doneSelectors);
            const shouldShow = showDoneOnly ? isDone : !isHidden || !isDone;
            if (isVisible && !shouldShow) {
                item.style.display = 'none'; // Hide if it shouldn't be displayed
            } else if (!isVisible && shouldShow) {
                item.style.display = ''; // Show if it isnt' visible but should be
            }
        });

        updateButtonState(toggleVisibilityButton, isHidden);
        updateButtonState(toggleShowDoneButton, showDoneOnly);
    }

    function saveFilterState() {
        sessionStorage.setItem('isHidden', isHidden);
        sessionStorage.setItem('showDoneOnly', showDoneOnly);
    }

    // Initial call to update visibility
    updateVisibleNotifications();

    // Observe for changes in the notification list
    const observer = new MutationObserver(() => {
        updateVisibleNotifications();
    });

    const targetNode = document.querySelector('.js-navigation-container');
    if (targetNode) {
        observer.observe(targetNode, { childList: true, subtree: true });
    }

    // Add a MutationObserver to catch changes in the document
    const pageObserver = new MutationObserver(() => {
        updateVisibleNotifications(); // Apply visibility immediately
    });

    // Observe the body for when new notifications are loaded
    pageObserver.observe(document.body, { childList: true, subtree: true });

    // Clear observers on unload
    window.addEventListener('beforeunload', () => {
        observer.disconnect();
        pageObserver.disconnect();
    });
})();
