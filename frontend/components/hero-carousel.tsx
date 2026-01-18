'use client';

import { useEffect, useState } from 'react';
import Image, { StaticImageData } from 'next/image';

import demo1 from '@/demo1.png';
import demo2 from '@/demo2.png';
import demo3 from '@/demo3.png';

type DemoShot = {
  src: StaticImageData;
  alt: string;
  label: string;
};

const shots: DemoShot[] = [
  {
    src: demo1,
    alt: 'BizBot demo capture one',
    label: 'Workshop table'
  },
  {
    src: demo2,
    alt: 'BizBot demo capture two',
    label: 'Focused build'
  },
  {
    src: demo3,
    alt: 'BizBot demo capture three',
    label: 'Team collaboration'
  }
];

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setActiveIndex((current) => (current + 1) % shots.length);
    }, 3500);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-ink/90">
      {shots.map((shot, index) => (
        <Image
          key={shot.alt}
          src={shot.src}
          alt={shot.alt}
          fill
          priority={index === 0}
          sizes="(min-width: 1024px) 40vw, (min-width: 768px) 45vw, 90vw"
          className={`object-cover transition-opacity duration-700 ${
            index === activeIndex ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-4 text-white">
        <p className="text-xs uppercase tracking-[0.2em] text-white/70">NwHacks 2026</p>
        <p className="text-lg font-semibold">{shots[activeIndex].label}</p>
      </div>
    </div>
  );
}
