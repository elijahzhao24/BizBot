'use client';

import { useEffect, useState } from 'react';

import { SiteHeader } from '@/components/site-header';

const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

type GalleryItem = {
  name: string;
  created_at?: string | null;
  url: string;
};

const placeholders = Array.from({ length: 9 }, (_, index) => ({
  name: `placeholder-${index + 1}`,
  created_at: null,
  url: ''
}));

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    const loadImages = async () => {
      setStatus('loading');
      try {
        const response = await fetch(`${apiBase}/images`);
        if (!response.ok) {
          throw new Error('Failed to fetch');
        }
        const payload = await response.json();
        setItems(payload.items || []);
        setStatus('idle');
      } catch (err) {
        setItems([]);
        setStatus('error');
      }
    };

    loadImages();
  }, []);

  const galleryItems = items.length > 0 ? items : placeholders;

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Gallery</p>
            <h1 className="mt-2 text-4xl">Captured Moments</h1>
          </div>
          <div className="text-sm text-muted">
            {status === 'loading' && 'Loading...'}
            {status === 'error' && 'Backend not available yet'}
            {status === 'idle' && items.length > 0 && `${items.length} photos`}
          </div>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {galleryItems.map((item) => (
            <div key={item.name} className="glass group rounded-3xl p-4">
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-ink/90">
                {item.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-end bg-gradient-to-br from-ink via-ink/90 to-ink/70 p-4 text-white">
                    <p className="text-sm">Awaiting real photos</p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-ink">{item.name}</p>
                  <p className="text-muted">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : 'Coming soon'}
                  </p>
                </div>
                <span className="rounded-full border border-ring/10 px-3 py-1 text-xs text-muted">
                  Gallery
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
