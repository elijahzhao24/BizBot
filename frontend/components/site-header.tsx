import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/" className="font-display text-2xl">
        BizBot
      </Link>
      <nav className="flex items-center gap-6 text-sm font-medium text-muted">
        <Link className="hover:text-ink transition" href="/photobooth">
          Photobooth
        </Link>
        <Link className="hover:text-ink transition" href="/control">
          Control
        </Link>
        <Link className="hover:text-ink transition" href="/gallery">
          Gallery
        </Link>
        <Link className="hover:text-ink transition" href="/admin">
          Admin
        </Link>
      </nav>
    </header>
  );
}
