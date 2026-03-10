import Link from 'next/link';

function LogoIcon() {
  return (
    <div className="w-[30px] h-[30px] bg-accent rounded-[7px] flex items-center justify-center flex-shrink-0">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-wide mx-auto px-6 h-[60px] flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 no-underline text-text-primary"
          >
            <LogoIcon />
            <span className="text-[17px] font-bold tracking-tight">
              pdf<span className="text-accent">ctl</span>
            </span>
          </Link>
          <ul className="hidden sm:flex items-center gap-1 list-none m-0 p-0">
            <li>
              <Link
                href="/#tools"
                className="text-text-secondary text-sm font-medium px-3 py-1.5 rounded-sm hover:text-text-primary hover:bg-bg transition-colors no-underline"
              >
                Tools
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border py-7 px-6">
        <div className="max-w-wide mx-auto flex items-center justify-between flex-wrap gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 no-underline text-text-primary"
          >
            <LogoIcon />
            <span className="text-[15px] font-bold tracking-tight">
              pdf<span className="text-accent">ctl</span>
            </span>
          </Link>
          <p className="text-xs text-text-muted m-0">
            Built with Go &mdash; open source, forever.
          </p>
        </div>
      </footer>
    </div>
  );
}
