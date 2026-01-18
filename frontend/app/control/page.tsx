'use client';

import { useState } from 'react';
import Link from 'next/link';

import { SiteHeader } from '@/components/site-header';
import { StatusPill } from '@/components/status-pill';

const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

type RobotState = 'idle' | 'running' | 'stopped';

export default function ControlPage() {
  const [state, setState] = useState<RobotState>('idle');
  const [message, setMessage] = useState('Not connected');

  const postAction = async (path: string, nextState: RobotState) => {
    try {
      const response = await fetch(`${apiBase}${path}`, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Backend responded ${response.status}`);
      }
      setState(nextState);
      setMessage('Command accepted');
    } catch (err) {
      setMessage('Backend not available yet');
    }
  };

  const stateTone = state === 'running' ? 'good' : state === 'stopped' ? 'warn' : 'idle';

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="mx-auto w-full max-w-5xl px-6 pb-24 pt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Control Room</p>
            <h1 className="mt-2 text-4xl">Robot Mission Control</h1>
          </div>
          <StatusPill label={`State: ${state}`} tone={stateTone} />
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div className="glass rounded-3xl p-6">
            <h2 className="text-2xl">Actions</h2>
            <p className="mt-2 text-sm text-muted">
              Start and stop are wired for the future robot loop. They will call the backend
              once those endpoints exist.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => postAction('/robot/start', 'running')}
                className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:translate-y-[-1px]"
              >
                Start
              </button>
              <button
                type="button"
                onClick={() => postAction('/robot/stop', 'stopped')}
                className="rounded-full border border-ring/20 px-6 py-3 text-sm font-semibold text-ink transition hover:border-ring"
              >
                Stop
              </button>
              <button
                type="button"
                onClick={() => postAction('/capture', state)}
                className="rounded-full border border-accent/40 px-6 py-3 text-sm font-semibold text-accent transition hover:border-accent"
              >
                Capture Now
              </button>
            </div>
            <p className="mt-4 text-sm text-muted">{message}</p>
          </div>

          <div className="glass rounded-3xl p-6">
            <h2 className="text-2xl">Status</h2>
            <div className="mt-4 space-y-4 text-sm text-muted">
              <div className="flex items-center justify-between">
                <span>Backend</span>
                <span className="text-ink">Local dev</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Frames received</span>
                <span className="text-ink">--</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last detection</span>
                <span className="text-ink">--</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Last capture</span>
                <span className="text-ink">--</span>
              </div>
              <Link href="/gallery" className="inline-flex items-center gap-2 text-accent">
                View latest photos
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
