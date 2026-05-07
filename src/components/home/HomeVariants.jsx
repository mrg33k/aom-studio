import React, { useState, useEffect } from 'react';
import HomeClassic from './HomeClassic';
import HomeEditorial from './HomeEditorial';
import HomeCinema from './HomeCinema';

const STORAGE_KEY = 'aom_home_variant';

const VARIANTS = [
  { key: 'classic',   label: '01  Classic' },
  { key: 'editorial', label: '02  Editorial' },
  { key: 'cinema',    label: '03  Cinema' },
];

export default function HomeVariants({ openBrief }) {
  const [variant, setVariant] = useState(() => {
    if (typeof window === 'undefined') return 'classic';
    return localStorage.getItem(STORAGE_KEY) || 'classic';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY, variant);
  }, [variant]);

  const Active = {
    classic: HomeClassic,
    editorial: HomeEditorial,
    cinema: HomeCinema,
  }[variant] || HomeClassic;

  return <Active openBrief={openBrief} />;
}
