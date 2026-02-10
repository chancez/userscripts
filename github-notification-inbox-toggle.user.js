// ==UserScript==
// @name         GitHub Notification Inbox Toggle
// @namespace    http://tampermonkey.net/
// @version      1.21
// @description  Toggle hiding or showing done notifications in GitHub inbox
// @match        https://github.com/notifications*
// @grant        none
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
    'svg.octicon-check',
  ];

  const getNotificationItems = () => {
    return document.querySelectorAll('.js-navigation-container li.notifications-list-item');
  };

  const getNextButton = () => {
    return document.querySelector('.js-notifications-container .paginate-container a[aria-label="Next"]');
  };

  const itemIsDone = (item) => {
    return item.querySelector(':not(.notification-list-item)').querySelector(doneSelectors);
  };

  const itemIsVisible = (item) => {
    return getComputedStyle(item).display !== 'none';
  };

  const toggleItemCheckBox = (item) => {
    const checkBox = item.querySelector('input[type="checkbox"]');
    checkBox.click();
  };

  const checkItemCheckBox = (item) => {
    const checkBox = item.querySelector('input[type="checkbox"]');
    if (!checkBox.checked) {
      checkBox.click();
    }
  };

  const clickDoneButton = () => {
    document.querySelector('.notifications-list .js-notification-action.js-notification-bulk-action form[data-status="archived"] button[type="submit"]').click();
  }

  const createButton = (text, handler) => {
    // Add buttons to the overlay
    const button = document.createElement('button');
    button.textContent = text;
    // button.style.width = '120px'
    button.style.height = '50px'
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.display = 'flex';
    button.style.flex = '1 1 80px';
    button.style.padding = '5px 5px';
    button.style.border = '1px solid #ccc';
    button.style.borderRadius = '4px';
    button.style.cursor = 'pointer';
    button.style.transition = 'background-color 0.3s, color 0.3s';
    button.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
    button.style.color = '#333';
    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (handler) {
        handler(event);
      }
    });
    return button;
  };

  const createOverlay = (elems) => {
    const overlay = document.createElement('div');
    const overlayContent = document.createElement('div')
    overlay.appendChild(overlayContent)
    for (let elem of elems) {
      overlayContent.appendChild(elem)
    }

    overlay.id = 'inbox-button-overlay'
    overlay.style.position = 'fixed';
    overlay.style.left = '50%';
    overlay.style.transform = 'translateX(-50%)';
    overlay.style.zIndex = '1000';
    overlay.style.top = '10px';
    overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    overlay.style.width = '400px';
    // Don't set height, let the content determine it and allow for wrapping
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.border = '2px solid #CCCCCC';
    overlay.style.padding = '5px';

    overlayContent.id = 'inbox-button-overlay-content'
    overlayContent.style.display = 'flex';
    overlayContent.style.flexWrap = 'wrap';
    overlayContent.style.justifyContent = 'center';
    overlayContent.style.alignItems = 'center';
    overlayContent.style.gap = '10px';

    return overlay;
  };

  const toggleHideDoneButton = createButton('Hide Done', () => {
    isHidden = !isHidden;
    showDoneOnly = false;
    saveFilterState();
    updateVisibleNotifications();
  });

  const toggleShowDoneButton = createButton('Show Only Done', () => {
    showDoneOnly = !showDoneOnly;
    isHidden = false;
    saveFilterState();
    updateVisibleNotifications();
  });

  const checkDoneItems = () => {
    let hasDoneItems = false;
    const items = getNotificationItems();
    items.forEach(item => {
      const isDone = itemIsDone(item);
      if (isDone) {
        toggleItemCheckBox(item);
        hasDoneItems = true;
      }
    })
    return hasDoneItems;
  };

  const selectDoneButton = createButton('Mark Done', checkDoneItems)

  const clearDoneButton = createButton('Clear Done', () => {
    checkDoneItems()
    clickDoneButton();
  });

  const resetMultiPageClearing = () => {
    sessionStorage.setItem('isMultiPageClearing', 'false');
    console.log('Multi-page clearing cancelled');
    updateButtonState(clearDoneMultiPageButton, false);
  }

  const clearCurrentPageAndContinue = () => {
    console.log('Clearing current page');
    checkDoneItems()
    clickDoneButton();

    console.log('Going to next page');
    const nextButton = getNextButton();
    if (!nextButton) {
      console.log('No more pages to clear');
      return true
    }
    nextButton.click();
  };

  const isMultiPageClearing = () => {
    return sessionStorage.getItem('isMultiPageClearing') === 'true';
  }

  const startMultiPageClearing = () => {
    if (!isMultiPageClearing()) {
      // May occur if user toggles multi-page clearing off and on quickly, or
      // if there is an error during clearing that resets the state but the
      // user tries to start again without realizing it
      console.warn('Attempted to start multi-page clearing, but it is not marked as in progress, stopping early.');
      return
    }

    updateButtonState(clearDoneMultiPageButton, true);

    try {
      const done = clearCurrentPageAndContinue();
      if (done) {
        resetMultiPageClearing();
        console.log('Multi-page clearing completed');
      }
    } catch (error) {
      console.error('Error during multi-page clearing:', error);
      resetMultiPageClearing();
    }
  };

  const clearDoneMultiPageButton = createButton('Clear Done (Multi-page)', () => {
    // Toggle multi-page clearing on/off while it is in progress to allow user
    // to cancel if they change their mind or if something goes wrong
    if (isMultiPageClearing()) {
      resetMultiPageClearing();
      return;
    }

    // Track multi-page clearing state in sessionStorage to persist across page navigations
    sessionStorage.setItem('isMultiPageClearing', 'true');
    startMultiPageClearing();
  });

  const buttons = [
    toggleHideDoneButton,
    toggleShowDoneButton,
    selectDoneButton,
    clearDoneButton,
    clearDoneMultiPageButton,
  ];

  const overlay = createOverlay(buttons)
  document.body.appendChild(overlay);

  function updateButtonState(button, isActive) {
    button.style.backgroundColor = isActive ? '#4caf50' : 'rgba(255, 255, 255, 0.9)';
    button.style.color = isActive ? '#fff' : '#333';
  }

  function updateVisibleNotifications() {
    const items = getNotificationItems()
    items.forEach(item => {
      const isVisible = itemIsVisible(item);
      const isDone = itemIsDone(item);
      const shouldShow = showDoneOnly ? isDone : !isHidden || !isDone;
      if (isVisible && !shouldShow) {
        item.style.display = 'none'; // Hide if it shouldn't be displayed
      } else if (!isVisible && shouldShow) {
        item.style.display = ''; // Show if it isnt' visible but should be
      }
    });

    updateButtonState(toggleHideDoneButton, isHidden);
    updateButtonState(toggleShowDoneButton, showDoneOnly);
  }

  function saveFilterState() {
    sessionStorage.setItem('isHidden', isHidden);
    sessionStorage.setItem('showDoneOnly', showDoneOnly);
  }

  // Initial call to update visibility
  updateVisibleNotifications();

  // Resume multi-page clearing if it was in progress
  if (isMultiPageClearing()) {
    console.log('Resuming multi-page clearing after page load');
    updateButtonState(clearDoneMultiPageButton, true);

    // Wait for page to be fully loaded before continuing
    if (document.readyState === 'complete') {
      startMultiPageClearing();
    } else {
      window.addEventListener('load', () => {
        startMultiPageClearing();
      });
    }
  }

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
