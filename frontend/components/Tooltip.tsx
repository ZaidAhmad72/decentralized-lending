/**
 * Tooltip Component
 * Displays helpful information on hover (desktop) or tap (mobile)
 */

"use client";

import { useState } from "react";

interface TooltipProps {
  text: string;
  className?: string;
}

export default function Tooltip({ text, className = "" }: TooltipProps) {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        onBlur={() => setShow(false)}
        className={`w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors ${className}`}
        aria-label="More information"
      >
        ?
      </button>
      {show && (
        <div 
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg p-3 z-50 shadow-lg"
          role="tooltip"
        >
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
        </div>
      )}
    </div>
  );
}
