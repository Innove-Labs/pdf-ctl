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
          Every PDF operation you need,{' '}
          <em className="not-italic text-accent">without the bloat.</em>
        </h1>
        <p className="text-lg text-text-secondary max-w-lg mx-auto mb-9 leading-relaxed">
          Compress, split, merge and convert PDFs in seconds. No account, no
          watermarks, no data sharing.
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

      {/* CTA */}
      <div className="max-w-wide mx-auto px-6 mb-20">
        <div className="bg-text-primary rounded-card px-10 py-14 flex items-center justify-between gap-8 flex-wrap">
          <h2 className="text-2xl font-extrabold text-white tracking-tight max-w-lg leading-snug">
            This is an open-source project.{' '}
            <span className="text-orange-300">You can self-host it.</span>
          </h2>
          <a
            href="https://github.com/Innove-Labs/pdf-ctl"
            className="inline-flex items-center gap-2 bg-white text-text-primary text-sm font-bold px-6 py-3 rounded-sm hover:opacity-90 transition-opacity no-underline flex-shrink-0"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </Layout>
  );
}
