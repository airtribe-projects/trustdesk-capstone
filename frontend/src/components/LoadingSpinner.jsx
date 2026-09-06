// src/components/LoadingSpinner.jsx
import React from 'react';
import './LoadingSpinner.css';

export default function LoadingSpinner() {
  return (
    <div className="spinner-overlay">
      <div className="spinner" />
    </div>
  );
}
