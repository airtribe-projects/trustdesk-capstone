import React from 'react';

const LoadingSpinner = ({ size = '20px', color = 'primary', message }) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
      <div
        className={`spinner ${color === 'primary' ? 'spinner-primary' : ''}`}
        style={{ width: size, height: size }}
      ></div>
      {message && <span style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>{message}</span>}
    </div>
  );
};

export default LoadingSpinner;
