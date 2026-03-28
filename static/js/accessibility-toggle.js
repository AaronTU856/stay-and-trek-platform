// Manages the shared high-contrast toggle used across the site.
function initializeAccessibilityToggle() {
  // Finds every contrast toggle the current page might have.
  const toggleCandidates = Array.from(document.querySelectorAll(
    '#high-contrast-toggle, .high-contrast-toggle, [data-accessibility="toggle"]'
  ));

  const toggles = toggleCandidates.filter((el, index, self) => self.indexOf(el) === index);

  if (toggles.length === 0) {
    console.warn('High contrast toggle button not found - accessibility features disabled');
    return;
  }

  // Keeps the button text and ARIA labels in sync with the current state.
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

  // Turns high contrast mode on and updates every toggle button.
  function enableHighContrast() {
    document.body.classList.add('high-contrast-mode');
    localStorage.setItem('highContrastMode', 'true');
    
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

  // Turns high contrast mode off and resets every toggle button.
  function disableHighContrast() {
    document.body.classList.remove('high-contrast-mode');
    localStorage.setItem('highContrastMode', 'false');
    
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

  // Switches between the on and off states.
  function toggleHighContrast() {
    const isEnabled = document.body.classList.contains('high-contrast-mode');
    
    if (isEnabled) {
      disableHighContrast();
    } else {
      enableHighContrast();
    }
  }

  // Restores the saved preference when the page loads.
  const savedPreference = localStorage.getItem('highContrastMode');
  if (savedPreference === 'true') {
    enableHighContrast();
  } else {
    disableHighContrast();
  }

  // Hooks click and keyboard handlers into each toggle.
  toggles.forEach((toggle) => {
    if (toggle.dataset && toggle.dataset.contrastInitialized === 'true') {
      return;
    }

    toggle.addEventListener('click', toggleHighContrast);

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

// Starts the toggle once the page is ready.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAccessibilityToggle);
} else {
  initializeAccessibilityToggle();
}

// Re-runs the setup when the page is restored from browser cache.
window.addEventListener('pageshow', initializeAccessibilityToggle);

// Re-runs the setup for older AJAX-style page loads.
if (typeof jQuery !== 'undefined') {
  jQuery(document).on('page:load', initializeAccessibilityToggle);
}
