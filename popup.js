// popup.js
document.addEventListener('DOMContentLoaded', function() {
    const statusMessage = document.getElementById('status-message');
    const statusIcon = document.getElementById('status-icon');
    const packagesAnalyzed = document.getElementById('packages-analyzed');
    const suggestionsShown = document.getElementById('suggestions-shown');
    //const authorLink = document.getElementById('author-link');
    
   
    
    // Get extension stats from local storage
    chrome.storage.local.get(['packagesAnalyzed', 'suggestionsShown'], function(data) {
        console.log('Data retrieved from storage:', data);
      packagesAnalyzed.textContent = data.packagesAnalyzed || 0;
      suggestionsShown.textContent = data.suggestionsShown || 0;
    });
    
    // Check if we're on an npm package page
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      const currentUrl = tabs[0].url || '';
      
      if (currentUrl.includes('npmjs.com/package/')) {
        const packageName = currentUrl.split('/package/')[1].split('/')[0];
        
        statusMessage.textContent = `Active: Analyzing alternatives for "${packageName}"`;
        statusIcon.classList.remove('inactive');
        statusIcon.classList.add('active');
        
        // Update the icon to show active state
        statusIcon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        `;
      } else {
        statusMessage.textContent = 'Navigate to an npm package page to see suggestions';
        
        // Update the icon to show inactive state
        statusIcon.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        `;
      }
    });
    
  
  });