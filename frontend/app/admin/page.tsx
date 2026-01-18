'use client';

import { useEffect, useMemo, useState } from 'react';

import { SiteHeader } from '@/components/site-header';

const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

type PhotoItem = {
  id: string;
  storage_path: string;
  score: number | null;
  url?: string | null;
};

type AdminResponse = {
  items: PhotoItem[];
  limit: number;
  offset: number;
  threshold: number;
};

export default function AdminPage() {
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [threshold, setThreshold] = useState(0.75);
  const [draftThreshold, setDraftThreshold] = useState('0.75');
  const [draftScores, setDraftScores] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const loadAdminData = async () => {
    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch(`${apiBase}/admin/photos`);
      if (!response.ok) {
        throw new Error(`Backend responded ${response.status}`);
      }
      const payload = (await response.json()) as AdminResponse;
      setItems(payload.items || []);
      const nextThreshold = Number(payload.threshold ?? 0.75);
      setThreshold(nextThreshold);
      setDraftThreshold(nextThreshold.toFixed(2));
      const nextDraftScores: Record<string, string> = {};
      (payload.items || []).forEach((item) => {
        nextDraftScores[item.id] = item.score === null || item.score === undefined ? '' : item.score.toFixed(2);
      });
      setDraftScores(nextDraftScores);
      setStatus('idle');
    } catch (err) {
      setStatus('error');
      setMessage('Unable to load admin data');
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const approvedCount = useMemo(() => {
    return items.filter((item) => item.score !== null && item.score >= threshold).length;
  }, [items, threshold]);

  const handleThresholdSave = async () => {
    const parsed = Number(draftThreshold);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
      setMessage('Threshold must be between 0 and 1');
      return;
    }
    setStatus('saving');
    setMessage('');
    try {
      const response = await fetch(`${apiBase}/admin/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threshold: parsed })
      });
      if (!response.ok) {
        throw new Error(`Backend responded ${response.status}`);
      }
      const payload = (await response.json()) as { threshold: number };
      setThreshold(payload.threshold);
      setDraftThreshold(payload.threshold.toFixed(2));
      setStatus('idle');
      setMessage('Threshold updated');
    } catch (err) {
      setStatus('error');
      setMessage('Unable to update threshold');
    }
  };

  const handleScoreSave = async (photoId: string) => {
    const raw = draftScores[photoId];
    const parsed = Number(raw);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
      setMessage('Score must be between 0 and 1');
      return;
    }
    setStatus('saving');
    setMessage('');
    try {
      const response = await fetch(`${apiBase}/admin/photos/${photoId}/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: parsed })
      });
      if (!response.ok) {
        throw new Error(`Backend responded ${response.status}`);
      }
      const payload = (await response.json()) as PhotoItem;
      setItems((prev) => prev.map((item) => (item.id === payload.id ? payload : item)));
      setStatus('idle');
      setMessage('Score updated');
    } catch (err) {
      setStatus('error');
      setMessage('Unable to update score');
    }
  };

  const handleDelete = async (photoId: string) => {
    setStatus('saving');
    setMessage('');
    try {
      const response = await fetch(`${apiBase}/admin/photos/${photoId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error(`Backend responded ${response.status}`);
      }
      setItems((prev) => prev.filter((item) => item.id !== photoId));
      setStatus('idle');
      setMessage('Photo deleted');
    } catch (err) {
      setStatus('error');
      setMessage('Unable to delete photo');
    }
  };

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto w-full max-w-6xl px-6 pb-24 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Admin</p>
            <h1 className="mt-2 text-4xl">Quality Gate</h1>
          </div>
          <div className="text-sm text-muted">
            {status === 'loading' && 'Loading...'}
            {status === 'saving' && 'Saving...'}
            {status === 'error' && (message || 'Something went wrong')}
            {status === 'idle' && message}
          </div>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-[1fr_1fr]">
          <div className="glass rounded-3xl p-6">
            <h2 className="text-2xl">Threshold</h2>
            <p className="mt-2 text-sm text-muted">
              Only photos with score at or above this threshold appear in the public gallery.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={draftThreshold}
                onChange={(event) => setDraftThreshold(event.target.value)}
                className="w-full accent-ink"
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={draftThreshold}
                onChange={(event) => setDraftThreshold(event.target.value)}
                className="w-28 rounded-full border border-ring/20 bg-transparent px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={handleThresholdSave}
                className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-white"
              >
                Save threshold
              </button>
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <h2 className="text-2xl">Stats</h2>
            <div className="mt-4 grid gap-3 text-sm text-muted">
              <div className="flex items-center justify-between">
                <span>Total photos</span>
                <span className="text-ink font-semibold">{items.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Approved</span>
                <span className="text-ink font-semibold">{approvedCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Threshold</span>
                <span className="text-ink font-semibold">{threshold.toFixed(2)}</span>
              </div>
              <button
                type="button"
                onClick={loadAdminData}
                className="mt-3 inline-flex items-center justify-center rounded-full border border-ring/20 px-5 py-2 text-sm font-semibold text-ink"
              >
                Refresh list
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {items.map((item) => (
            <div key={item.id} className="glass rounded-3xl p-4">
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-ink/90">
                {item.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt={item.storage_path}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-white/70">
                    No preview
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold text-ink">{item.storage_path}</p>
                  <p className="text-muted">Score: {item.score ?? '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={draftScores[item.id] ?? ''}
                    onChange={(event) =>
                      setDraftScores((prev) => ({ ...prev, [item.id]: event.target.value }))
                    }
                    className="w-24 rounded-full border border-ring/20 bg-transparent px-3 py-2 text-xs"
                    placeholder="0.75"
                  />
                  <button
                    type="button"
                    onClick={() => handleScoreSave(item.id)}
                    className="rounded-full border border-ink/20 px-3 py-2 text-xs font-semibold text-ink"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-full border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
