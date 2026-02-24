import { useState, useCallback } from 'react';

export type CardDensity = 'comfortable' | 'compact';

export function useCardDensity() {
  const [density, setDensity] = useState<CardDensity>(() => {
    return (localStorage.getItem('inzone-card-density') as CardDensity) || 'comfortable';
  });

  const toggleDensity = useCallback(() => {
    setDensity(prev => {
      const next = prev === 'comfortable' ? 'compact' : 'comfortable';
      localStorage.setItem('inzone-card-density', next);
      return next;
    });
  }, []);

  return { density, toggleDensity };
}
