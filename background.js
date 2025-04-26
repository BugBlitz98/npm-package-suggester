// background.js
// Initialize stats on install
chrome.runtime.onInstalled.addListener(() => {
    console.log('NPM Package Suggester extension installed');
    
    // Initialize statistics
    chrome.storage.local.set({
      packagesAnalyzed: 0,
      suggestionsShown: 0,
      installDate: new Date().toISOString()
    });
  });
  
  // Listen for messages from content script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PACKAGE_ANALYZED') {
      // Increment the packages analyzed counter
      chrome.storage.local.get(['packagesAnalyzed'], function(data) {
        const count = (data.packagesAnalyzed || 0) + 1;
        chrome.storage.local.set({ packagesAnalyzed: count });
      });
    }
    
    if (message.type === 'SUGGESTIONS_SHOWN' && message.count) {
      // Add to the suggestions shown counter
      chrome.storage.local.get(['suggestionsShown'], function(data) {
        const count = (data.suggestionsShown || 0) + message.count;
        chrome.storage.local.set({ suggestionsShown: count });
      });
    }
    
    return true;
  });