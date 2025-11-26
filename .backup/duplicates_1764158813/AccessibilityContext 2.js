import React, { createContext, useContext, useEffect, useState } from 'react';
import { PixelRatio, Dimensions } from 'react-native';

const AccessibilityContext = createContext({
  largeText: false,
  fontScale: 1,
  highContrast: false,
  toggleLargeText: () => {},
  toggleHighContrast: () => {},
});

export const AccessibilityProvider = ({ children }) => {
  const [fontScale, setFontScale] = useState(PixelRatio.getFontScale());
  const [largeText, setLargeText] = useState(fontScale > 1.2);
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const fs = PixelRatio.getFontScale();
      setFontScale(fs);
      setLargeText(fs > 1.2);
    };

    // Listen for changes (works across RN versions)
    const sub = Dimensions.addEventListener ? Dimensions.addEventListener('change', onChange) : null;
    return () => {
      if (sub && typeof sub.remove === 'function') sub.remove();
    };
  }, []);

  const toggleLargeText = () => setLargeText(prev => !prev);
  const toggleHighContrast = () => setHighContrast(prev => !prev);

  return (
    <AccessibilityContext.Provider
      value={{
        largeText,
        fontScale,
        highContrast,
        toggleLargeText,
        toggleHighContrast,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => useContext(AccessibilityContext);
