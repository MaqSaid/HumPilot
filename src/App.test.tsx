import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    // Clear localStorage to get predictable state
    localStorage.clear();
  });

  it('renders the calibration screen on first launch (no calibration)', () => {
    render(<App />);
    expect(screen.getByText('Calibration')).toBeInTheDocument();
  });

  it('renders the start screen when calibration exists', () => {
    // Simulate existing calibration data
    localStorage.setItem(
      'humpilot_calibration',
      JSON.stringify({ lowFrequency: 100, highFrequency: 300, timestamp: Date.now() })
    );
    render(<App />);
    expect(screen.getByText('HumPilot')).toBeInTheDocument();
    expect(screen.getByText('Start Game')).toBeInTheDocument();
  });
});
