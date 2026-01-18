import Link from 'next/link';

import { HeroCarousel } from '@/components/hero-carousel';
import { SiteHeader } from '@/components/site-header';
import { StatusPill } from '@/components/status-pill';

const flowSteps = [
  {
    title: 'Capture',
    description: 'Robot snaps moments as guests move through the event.'
  },
  {
    title: 'Select',
    description: 'Best frames get curated into a clean, modern gallery.'
  },
  {
    title: 'Deliver',
    description: 'Guests can grab photos instantly from the web.'
  }
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-32 right-[-10%] h-72 w-72 rounded-full bg-accent/20 blur-3xl animate-pulse-soft" />
      <div className="pointer-events-none absolute bottom-[-12%] left-[-8%] h-80 w-80 rounded-full bg-accent2/20 blur-3xl animate-float" />

      <SiteHeader />

      <section className="mx-auto grid w-full max-w-6xl gap-10 px-6 pb-16 pt-8 md:grid-cols-[1.2fr_0.8fr]">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <StatusPill label="System idle" tone="idle" />
            <span className="text-xs uppercase tracking-[0.3em] text-muted">Hackathon build</span>
          </div>
          <h1 className="text-4xl md:text-6xl">
            A roaming photo studio that keeps the dance floor alive.
          </h1>
          <p className="text-base md:text-lg text-muted">
            BizBot is your on-site camera crew. It captures moments, curates the best frames,
            and publishes them instantly so guests can relive the event in real time.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/control"
              className="rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 transition hover:translate-y-[-1px]"
            >
              Open Control Room
            </Link>
            <Link
              href="/gallery"
              className="rounded-full border border-ring/20 px-6 py-3 text-sm font-semibold text-ink transition hover:border-ring"
            >
              View Gallery
            </Link>
          </div>
          <div className="grid gap-4 pt-6 md:grid-cols-2">
            {['Realtime status', 'Cloud upload', 'Private by design', 'Fast setup'].map(
              (item, index) => (
                <div
                  key={item}
                  className="glass rounded-2xl px-4 py-3 text-sm text-muted opacity-0 animate-fade-up"
                  style={{ animationDelay: `${index * 120 + 200}ms` }}
                >
                  {item}
                </div>
              )
            )}
          </div>
        </div>
        <div className="relative">
          <div className="glass rounded-3xl p-6 opacity-0 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <p className="text-sm font-semibold text-muted">Demo Reel</p>
            <div className="mt-4">
              <HeroCarousel />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-muted">
              <div>
                <p className="text-ink font-semibold">98%</p>
                <p>Focus</p>
              </div>
              <div>
                <p className="text-ink font-semibold">320</p>
                <p>Frames</p>
              </div>
              <div>
                <p className="text-ink font-semibold">6</p>
                <p>Photos</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {flowSteps.map((step, index) => (
            <div
              key={step.title}
              className="glass rounded-2xl p-6 opacity-0 animate-fade-up"
              style={{ animationDelay: `${index * 140 + 300}ms` }}
            >
              <p className="text-xs uppercase tracking-[0.3em] text-muted">Step {index + 1}</p>
              <h2 className="mt-3 text-2xl">{step.title}</h2>
              <p className="mt-2 text-sm text-muted">{step.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
