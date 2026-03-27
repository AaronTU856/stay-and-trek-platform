/**
 * Universal High Contrast Mode Toggle
 * Works across all pages in the application
 * Saves preference to localStorage and applies on page load
 */

function initializeAccessibilityToggle() {
  // Find all possible toggle buttons (support multiple instances per page)
  const toggleCandidates = Array.from(document.querySelectorAll(
    '#high-contrast-toggle, .high-contrast-toggle, [data-accessibility="toggle"]'
  ));

  const toggles = toggleCandidates.filter((el, index, self) => self.indexOf(el) === index);

  if (toggles.length === 0) {
    console.warn('High contrast toggle button not found - accessibility features disabled');
    return;
  }
 // Function to update the toggle button label and ARIA attributes based on state
  function updateToggleLabel(toggle, isEnabled) {
    const label = isEnabled ? 'High Contrast: On' : 'High Contrast: Off';
    const helper = 'Improves text, buttons, and map controls for easier viewing.';
    const labelEl = toggle.querySelector('.contrast-toggle-label');

    if (labelEl) {
      labelEl.textContent = label;
    } else if (toggle.childElementCount === 0 || !toggle.querySelector('[aria-hidden="true"]')) {
      toggle.textContent = label;
    }

    if (toggle.setAttribute) {
      toggle.setAttribute('title', label);
      toggle.setAttribute('aria-label', `${label}. ${helper}`);
    }
  }

  /**
   * Enable high contrast mode
   */
  function enableHighContrast() {
    document.body.classList.add('high-contrast-mode');
    localStorage.setItem('highContrastMode', 'true');
    
    // Update all toggle button states
    toggles.forEach((toggle) => {
      if (toggle.setAttribute) {
        toggle.setAttribute('aria-pressed', 'true');
      }
      toggle.classList.add('active');
      toggle.classList.remove('inactive');
      updateToggleLabel(toggle, true);
    });
    
    console.log('High contrast mode enabled');
  }

  /**
   * Disable high contrast mode
   */
  function disableHighContrast() {
    document.body.classList.remove('high-contrast-mode');
    localStorage.setItem('highContrastMode', 'false');
    
    // Update all toggle button states
    toggles.forEach((toggle) => {
      if (toggle.setAttribute) {
        toggle.setAttribute('aria-pressed', 'false');
      }
      toggle.classList.remove('active');
      toggle.classList.add('inactive');
      updateToggleLabel(toggle, false);
    });
    
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

  // Attach handlers to all toggle buttons
  toggles.forEach((toggle) => {
    if (toggle.dataset && toggle.dataset.contrastInitialized === 'true') {
      return;
    }

    toggle.addEventListener('click', toggleHighContrast);

    // Also support keyboard activation (Enter or Space keys)
    toggle.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleHighContrast();
      }
    });

    if (toggle.dataset) {
      toggle.dataset.contrastInitialized = 'true';
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
