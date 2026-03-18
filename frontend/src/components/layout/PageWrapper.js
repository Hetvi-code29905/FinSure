// src/components/layout/PageWrapper.js
import React from 'react';

export default function PageWrapper({ children }) {
  return (
    <main style={{
      flex:    1,
      padding: '1.75rem 1.5rem',
      maxWidth: 1400,
      width:   '100%',
      margin:  '0 auto',
      animation: 'fadeIn 0.25s ease both',
    }}>
      {children}
    </main>
  );
}