import React from 'react';
import { MobileHomeKit } from './cv6kit/MobileHomeKit.jsx';
import './cv6kit/kit.css';

/**
 * CV6 Kit Test Route — isolated rendering of the kit's mobile Home screen
 * to verify pixel-perfect component rendering before wiring real data.
 * Located at /cv6kit; does NOT modify existing routes or the live home.
 */
export default function CV6KitTest() {
  return (
    <div data-cv6kit data-theme="glass" style={{
      minHeight: '100dvh',
      background: 'var(--ground)',
    }}>
      <MobileHomeKit />
    </div>
  );
}
