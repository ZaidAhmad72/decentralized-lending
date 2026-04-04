/**
 * useDebounce Hook
 * Delays updating a value until after a specified delay
 * Useful for preventing excessive API calls or calculations
 */

import { useState, useEffect } from 'react';

/**
 * Debounce a value
 * 
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    // Set up timeout to update debounced value
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    // Clean up timeout if value changes before delay expires
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}
