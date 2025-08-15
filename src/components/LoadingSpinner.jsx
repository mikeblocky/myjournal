import React from 'react';

export default function LoadingSpinner({ 
  text = "Loading", 
  variant = "default", // "default", "compact", "inline"
  className = "",
  showDots = true 
}) {
  const baseClass = `loading-spinner ${variant !== "default" ? variant : ""}`;
  const finalClass = className ? `${baseClass} ${className}` : baseClass;

  return (
    <div className={finalClass}>
      <div className="spinner"></div>
      {text && <div className="text">{text}</div>}
      {showDots && (
        <div className="dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}
    </div>
  );
}
