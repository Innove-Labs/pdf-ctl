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
          <div className="flex items-center gap-4 flex-wrap">
            <a
              href="https://innovelabs.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-muted hover:text-text-primary transition-colors no-underline"
            >
              By Innove Labs
            </a>
            <Link
              href="/privacy"
              className="text-xs text-text-muted hover:text-text-primary transition-colors no-underline"
            >
              Privacy Policy
            </Link>
            <a
              href="https://github.com/Innove-Labs/pdf-ctl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-muted hover:text-text-primary transition-colors"
              aria-label="GitHub repository"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" stroke="currentColor" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
