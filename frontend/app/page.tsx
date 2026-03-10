import type { Metadata } from 'next';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { TOOLS } from '@/tools/tools';

export const metadata: Metadata = {
  title: 'pdfctl: Privacy focused PDF tools',
  description:
    'Compress, split, merge and convert PDFs in seconds. No account, no watermarks, no data sharing.',
};

export default function Home() {
  return (
    <Layout>
      {/* Hero */}
      <section className="max-w-wide mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-1.5 bg-accent-soft text-accent text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-accent rounded-full" />
          Open source &amp; self-hostable
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight max-w-2xl mx-auto mb-5">
          All the PDF Tools you need{' '}
        </h1>
        <p className="text-lg text-text-secondary max-w-lg mx-auto mb-9 leading-relaxed">
          Compress, split, merge, convert, lock and unlock PDFs in seconds. No account, no
          watermarks, no data sharing, FREE forever.
        </p>
        <Link
          href="#tools"
          className="inline-flex items-center gap-2 bg-accent text-white text-sm font-semibold px-6 py-3 rounded-sm shadow-md hover:bg-accent-hover transition-colors no-underline"
        >
          Browse tools
        </Link>
      </section>

      {/* Tools grid */}
      <div id="tools" className="max-w-wide mx-auto px-6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
          Tools
        </p>
        <p className="text-2xl font-bold tracking-tight max-w-sm leading-snug">
          Pick a tool and get to work.
        </p>
      </div>

      <div className="max-w-wide mx-auto px-6 pb-20 mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map((tool) => (
          <Link
            key={tool.slug}
            href={`/${tool.slug}/`}
            className="bg-surface border border-border rounded-card p-7 block no-underline text-inherit shadow-sm hover:shadow-hover hover:-translate-y-0.5 hover:border-[#d0d0cc] transition-all"
          >
            <div
              className={`w-11 h-11 ${tool.iconColor} rounded-[10px] flex items-center justify-center mb-4`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                className={tool.iconStroke}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                stroke="currentColor"
                dangerouslySetInnerHTML={{ __html: tool.iconSvgPath }}
              />
            </div>
            <h3 className="text-base font-bold tracking-tight mb-1.5">
              {tool.title}
            </h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              {tool.tagline}
            </p>
          </Link>
        ))}
      </div>

      {/* Features */}
      <div className="max-w-wide mx-auto px-6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
          Why pdfctl
        </p>
        <p className="text-2xl font-bold tracking-tight max-w-sm leading-snug">
          Built with privacy first.
        </p>
      </div>

      <div className="max-w-wide mx-auto px-6 pb-20 mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
        {[
          {
            title: 'Free Forever',
            description: 'No hidden fees, no subscriptions, no limits. Every tool is free to use for everyone, always.',
            iconColor: 'bg-emerald-50',
            iconStroke: 'text-emerald-600',
            iconPath: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="currentColor"/><path d="M9 8h2v8H9zm4 0h2v8h-2z" fill="none"/><circle cx="12" cy="12" r="10" stroke="currentColor" fill="none"/><path d="M8 12l3 3 5-5" stroke="currentColor" fill="none"/>',
          },
          {
            title: 'Privacy Guaranteed',
            description: 'Your files are automatically deleted after 10 minutes. We never read, store, or share your documents.',
            iconColor: 'bg-blue-50',
            iconStroke: 'text-blue-600',
            iconPath: '<path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"/>',
          },
          {
            title: 'Open Source',
            description: 'The entire codebase is public. Audit the code yourself, self-host it, or contribute improvements.',
            iconColor: 'bg-violet-50',
            iconStroke: 'text-violet-600',
            iconPath: '<path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>',
          },
          {
            title: 'No Account Needed',
            description: 'Jump straight in. No sign-up, no email, no tracking. Just upload and process your PDF.',
            iconColor: 'bg-orange-50',
            iconStroke: 'text-orange-600',
            iconPath: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="18" y1="8" x2="23" y2="13"/><line x1="23" y1="8" x2="18" y2="13"/>',
          },
          {
            title: 'No Watermarks',
            description: 'Your output is clean and unmodified. We don\'t brand your documents or degrade their quality.',
            iconColor: 'bg-rose-50',
            iconStroke: 'text-rose-600',
            iconPath: '<polyline points="20 6 9 17 4 12"/>',
          },
          {
            title: 'Self-Hostable',
            description: 'Run your own instance with full control. Docker support included for easy deployment anywhere.',
            iconColor: 'bg-cyan-50',
            iconStroke: 'text-cyan-600',
            iconPath: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="bg-surface border border-border rounded-card p-7 shadow-sm"
          >
            <div
              className={`w-11 h-11 ${feature.iconColor} rounded-[10px] flex items-center justify-center mb-4`}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                className={feature.iconStroke}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                stroke="currentColor"
                dangerouslySetInnerHTML={{ __html: feature.iconPath }}
              />
            </div>
            <h3 className="text-base font-bold tracking-tight mb-1.5">{feature.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
