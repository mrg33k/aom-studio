import { useState, useEffect } from 'react';

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);

    // Set initial value
    setMatches(mq.matches);

    // Handle changes
    const handleChange = (e) => {
      setMatches(e.matches);
    };

    // Modern API
    if (mq.addEventListener) {
      mq.addEventListener('change', handleChange);
      return () => mq.removeEventListener('change', handleChange);
    }
    // Legacy API fallback
    mq.addListener(handleChange);
    return () => mq.removeListener(handleChange);
  }, [query]);

  return matches;
}
