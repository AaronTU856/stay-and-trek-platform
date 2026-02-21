/**
 * Universal High Contrast Mode Toggle
 * Works across all pages in the application
 * Saves preference to localStorage and applies on page load
 */

function initializeAccessibilityToggle() {
  // Find the toggle button (multiple possible IDs/classes)
  const toggle = document.getElementById('high-contrast-toggle') ||
                 document.querySelector('.high-contrast-toggle') ||
                 document.querySelector('[data-accessibility="toggle"]');

  if (!toggle) {
    console.warn('High contrast toggle button not found - accessibility features disabled');
    return;
  }

  /**
   * Enable high contrast mode
   */
  function enableHighContrast() {
    document.body.classList.add('high-contrast-mode');
    localStorage.setItem('highContrastMode', 'true');
    
    // Update toggle button state
    if (toggle.setAttribute) {
      toggle.setAttribute('aria-pressed', 'true');
    }
    toggle.classList.add('active');
    toggle.classList.remove('inactive');
    
    console.log('High contrast mode enabled');
  }

  /**
   * Disable high contrast mode
   */
  function disableHighContrast() {
    document.body.classList.remove('high-contrast-mode');
    localStorage.setItem('highContrastMode', 'false');
    
    // Update toggle button state
    if (toggle.setAttribute) {
      toggle.setAttribute('aria-pressed', 'false');
    }
    toggle.classList.remove('active');
    toggle.classList.add('inactive');
    
    console.log('High contrast mode disabled');
  }

  /**
   * Toggle high contrast mode
   */
  function toggleHighContrast() {
    const isEnabled = document.body.classList.contains('high-contrast-mode');
    
    if (isEnabled) {
      disableHighContrast();
    } else {
      enableHighContrast();
    }
  }

  // Load saved preference from localStorage on page load
  const savedPreference = localStorage.getItem('highContrastMode');
  if (savedPreference === 'true') {
    enableHighContrast();
  } else {
    disableHighContrast();
  }

  // Attach click handler to toggle button
  toggle.addEventListener('click', toggleHighContrast);

  // Also support keyboard activation (Enter or Space keys)
  toggle.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleHighContrast();
    }
  });

  console.log('Accessibility toggle initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAccessibilityToggle);
} else {
  initializeAccessibilityToggle();
}

// Also hook into template loading (for dynamic page content)
window.addEventListener('pageshow', initializeAccessibilityToggle);

// Support for AJAX/dynamic page loads
if (typeof jQuery !== 'undefined') {
  jQuery(document).on('page:load', initializeAccessibilityToggle);
}
