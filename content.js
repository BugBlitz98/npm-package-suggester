(function() {
    // Function to extract package name and update UI
    function handlePageChange() {
      cachedAlternatives = []; // Clear cache
      const packageName = window.location.pathname.split('/package/')[1];
      if (!packageName) {
        console.log('No package name found in URL');
        return;
      }
  
      console.log(`Looking for alternatives to: ${packageName}`);
  
      // Notify background script that we analyzed a package
      chrome.runtime.sendMessage({ type: 'PACKAGE_ANALYZED' });
  
      // Remove existing toggle and container if they exist
      const existingToggle = document.querySelector('.npm-suggester-toggle');
      const existingContainer = document.querySelector('.npm-suggester-corner-container');
      if (existingToggle) existingToggle.remove();
      if (existingContainer) existingContainer.remove();
  
      // Create a corner popup toggle button
      const popupToggle = document.createElement('div');
      popupToggle.className = 'npm-suggester-toggle';
      popupToggle.innerHTML = `
        <div class="toggle-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3l8 4.5v9l-8 4.5-8-4.5v-9l8-4.5M12 5.4L6.5 8.5 12 11.6l5.5-3.1-5.5-3.1M5 15.5l6 3.4v-6.8l-6-3.4v6.8M13 18.9l6-3.4v-6.8l-6 3.4v6.8z"/>
          </svg>
        </div>
        <span class="current-package-score">?%</span>
        <span class="badge-count">0</span>
      `;
      document.body.appendChild(popupToggle);
  
      // Create a container for suggestions
      const suggestionsContainer = document.createElement('div');
      suggestionsContainer.className = 'npm-suggester-corner-container';
      suggestionsContainer.style.display = 'none'; // Hidden by default
      suggestionsContainer.innerHTML = `
        <div class="corner-header">
          <div class="header-content">
            <div class="header-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3l8 4.5v9l-8 4.5-8-4.5v-9l8-4.5M12 5.4L6.5 8.5 12 11.6l5.5-3.1-5.5-3.1M5 15.5l6 3.4v-6.8l-6-3.4v6.8M13 18.9l6-3.4v-6.8l-6 3.4v6.8z"/>
              </svg>
            </div>
            <div class="header-text">
              <h3>Package Alternatives</h3>
              <div class="current-package-info">
                <span class="current-package-name">${packageName}</span>
                <span class="current-package-score-badge">?%</span>
              </div>
            </div>
            <div class="close-button">×</div>
          </div>
        </div>
        <div class="corner-content">
          <div class="suggestions-loading">
            <div class="loading-spinner"></div>
            <p>Analyzing alternatives...</p>
          </div>
        </div>
      `;
      document.body.appendChild(suggestionsContainer);
  
      // Toggle popup visibility
      popupToggle.addEventListener('click', () => {
        if (suggestionsContainer.style.display === 'none') {
          suggestionsContainer.style.display = 'block';
          setTimeout(() => suggestionsContainer.classList.add('active'), 10);
        } else {
          suggestionsContainer.classList.remove('active');
          setTimeout(() => suggestionsContainer.style.display = 'none', 300);
        }
      });
  
      // Close popup
      const closeButton = suggestionsContainer.querySelector('.close-button');
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        suggestionsContainer.classList.remove('active');
        setTimeout(() => suggestionsContainer.style.display = 'none', 300);
      });
  
      // Fetch alternative packages with a slight delay to ensure DOM updates
      setTimeout(() => fetchAlternatives(packageName, suggestionsContainer, popupToggle), 0);
    }
  
    // Run on initial page load
    window.addEventListener('load', handlePageChange);
  
    // Detect navigation changes using popstate
    window.addEventListener('popstate', handlePageChange);
  
    // Use MutationObserver to detect DOM changes (for SPAs)
    const observer = new MutationObserver((mutations) => {
      // Check if the URL has changed
      const currentPath = window.location.pathname;
      if (currentPath !== observer.lastPath) {
        observer.lastPath = currentPath;
        handlePageChange();
      }
    });
  
    // Observe changes in the body
    observer.lastPath = window.location.pathname;
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  
    // Store fetched alternatives for tab switching
    let cachedAlternatives = [];
  
    function fetchAlternatives(packageName, container, toggleButton) {
      let badgeCount = toggleButton?.querySelector('.badge-count');
      let currentPackageScoreEl = toggleButton?.querySelector('.current-package-score');
      let currentPackageScoreBadge = container?.querySelector('.current-package-score-badge');
      
      // Make sure elements exist
      if (!toggleButton) {
        console.error('Toggle button is null or undefined');
        return;
      }
      
      if (!badgeCount) {
        console.warn('Badge count not found, creating one');
        badgeCount = document.createElement('span');
        badgeCount.className = 'badge-count';
        badgeCount.textContent = '0';
        toggleButton.appendChild(badgeCount);
      }
  
      fetch(`https://api.npms.io/v2/package/${encodeURIComponent(packageName)}`)
        .then(response => response.json())
        .then(data => {
          // Debug the API response to see where the score is
          console.log('Current package data:', data);
          
          // Make sure we're accessing the score correctly
          const packageScore = data.score?.final || 0;
          const formattedScore = (packageScore * 100).toFixed(0);
          const scoreClass = getScoreClass(formattedScore);
          
          console.log(`Current package score: ${packageScore}, formatted: ${formattedScore}`);
          
          // Update current package score in toggle button
          if (currentPackageScoreEl) {
            currentPackageScoreEl.textContent = `${formattedScore}%`;
            currentPackageScoreEl.className = `current-package-score package-score-${scoreClass}`;
          }
          
          // Update current package score badge in popup header
          if (currentPackageScoreBadge) {
            currentPackageScoreBadge.textContent = `${formattedScore}%`;
            currentPackageScoreBadge.className = `current-package-score-badge package-score-${scoreClass}`;
          }
  
          const keywords = data.collected?.metadata?.keywords || [];
          if (keywords.length === 0) {
            renderNoSuggestions(container);
            return;
          }
  
          const searchKeywords = keywords.slice(0, 3).join(' OR ');
          return fetch(`https://api.npms.io/v2/search?q=${encodeURIComponent(searchKeywords)}&size=10`)
            .then(response => response.json())
            .then(searchData => {
              console.log('Search API Response:', searchData);
              const alternatives = searchData.results
                .filter(pkg => pkg.package.name !== packageName)
                .sort((a, b) => b.score.final - a.score.final)
                .slice(0, 5);
  
              // Fetch download data for each alternative
              Promise.all(
                alternatives.map(alt =>
                  fetch(`https://api.npms.io/v2/package/${encodeURIComponent(alt.package.name)}`)
                    .then(response => response.json())
                    .then(pkgData => {
                      console.log(`Package ${alt.package.name} Data:`, pkgData);
                      return {
                        ...alt,
                        weeklyDownloads: pkgData.collected?.npm?.downloads?.[0]?.downloads || 
                                        pkgData.collected?.npm?.downloads || 0
                      };
                    })
                )
              ).then(enhancedAlternatives => {
                // Update cached alternatives
                cachedAlternatives = enhancedAlternatives;
                
                renderCornerSuggestions(cachedAlternatives, container);
  
                if (badgeCount) {
                  badgeCount.textContent = cachedAlternatives.length;
                }
  
                if (cachedAlternatives.length > 0 && chrome?.runtime) {
                  toggleButton.classList.add('active');
                  chrome.runtime.sendMessage({
                    type: 'SUGGESTIONS_SHOWN',
                    count: cachedAlternatives.length
                  });
                } else {
                  toggleButton.style.display = 'none';
                }
              });
            });
        })
        .catch(error => {
          console.error('Error fetching package alternatives:', error);
          renderError(container);
        });
    }
  
    function createCircularScoreElement(score) {
      const scoreClass = getScoreClass(score);
      return `
        <div class="package-score-container" title="Quality Score: ${score}/100">
          <svg viewBox="0 0 36 36" class="circular-chart">
            <path class="circle-bg"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path class="circle circle-${scoreClass}"
              stroke-dasharray="${score}, 100"
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <text x="18" y="20.35" class="score-text">${score}</text>
          </svg>
        </div>
      `;
    }
  
    function formatDownloads(downloads) {
      if (downloads >= 1000000) {
        return `${(downloads / 1000000).toFixed(1)}M`;
      } else if (downloads >= 1000) {
        return `${(downloads / 1000).toFixed(1)}K`;
      }
      return downloads.toString();
    }
  
    function renderCornerSuggestions(alternatives, container) {
      const content = container.querySelector('.corner-content');
      if (alternatives.length === 0) {
        renderNoSuggestions(container);
        return;
      }
  
      let html = '';
      alternatives.forEach((alt, index) => {
        const pkg = alt.package;
        const score = (alt.score.final * 100).toFixed(0);
        const scoreClass = getScoreClass(score);
  
        html += `
          <div class="corner-suggestion-item" style="--item-index: ${index}">
            <div class="suggestion-header">
              <div class="package-info">
                <a href="/package/${pkg.name}" class="package-name">${pkg.name}</a>
                <div class="package-score-container">
                  <div class="score-progress">
                    <div class="score-bar score-${scoreClass}" style="width: ${score}%"></div>
                  </div>
                  <span class="score-label">${score}%</span>
                </div>
              </div>
            </div>
            <div class="package-description">${pkg.description || 'No description'}</div>
          </div>
        `;
      });
  
      content.innerHTML = html;
    }
  
    function renderNoSuggestions(container) {
      const content = container.querySelector('.corner-content');
      content.innerHTML = `
        <div class="no-suggestions">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>No alternatives found</p>
        </div>
      `;
    }
  
    function renderError(container) {
      const content = container.querySelector('.corner-content');
      content.innerHTML = `
        <div class="error-message">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>Failed to load suggestions</p>
          <button class="retry-button">Retry</button>
        </div>
      `;
  
      const retryButton = content.querySelector('.retry-button');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          content.innerHTML = `
            <div class="suggestions-loading">
              <div class="loading-spinner"></div>
              <p>Analyzing alternatives...</p>
            </div>
          `;
          const packageName = window.location.pathname.split('/package/')[1];
          if (packageName) {
            setTimeout(() => fetchAlternatives(packageName, container), 500);
          }
        });
      }
    }
  
    function getScoreClass(score) {
      const numScore = Number(score);
      if (numScore >= 80) {
        return 'high';
      } else if (numScore >= 50) {
        return 'medium';
      } else {
        return 'low';
      }
    }

   
})();