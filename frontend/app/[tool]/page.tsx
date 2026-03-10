import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/Layout';
import ToolUploader from '@/components/ToolUploader';
import { TOOLS, getToolBySlug } from '@/tools/tools';

interface Props {
  params: { tool: string };
}

export function generateStaticParams() {
  return TOOLS.map((t) => ({ tool: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = getToolBySlug(params.tool);
  if (!tool) return {};
  return {
    title: tool.title,
    description: tool.metaDescription,
  };
}

export default function ToolPage({ params }: Props) {
  const tool = getToolBySlug(params.tool);
  if (!tool) notFound();

  const relatedTools = TOOLS.filter((t) => tool.relatedSlugs.includes(t.slug));

  return (
    <Layout>
      <div className="max-w-content w-full mx-auto px-6 pt-12 pb-20">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-text-muted mb-8">
          <Link href="/" className="hover:text-text-primary transition-colors no-underline">
            Home
          </Link>
          <span>/</span>
          <span className="text-text-secondary">{tool.title}</span>
        </nav>

        {/* Page header */}
        <div className="flex items-start gap-4 mb-8">
          <div
            className={`w-12 h-12 ${tool.iconColor} rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              className={tool.iconStroke}
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              dangerouslySetInnerHTML={{ __html: tool.iconSvgPath }}
            />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight leading-tight">
              {tool.title}
            </h1>
            <p className="text-sm text-text-secondary mt-1">{tool.tagline}</p>
          </div>
        </div>

        {/* Interactive uploader — client component island */}
        <ToolUploader tool={tool} />

        {/* How-to section */}
        <section className="mt-12">
          <h2 className="text-lg font-bold tracking-tight mb-5">
            How to {tool.title.toLowerCase()}
          </h2>
          <ol className="flex flex-col gap-4 list-none m-0 p-0">
            {tool.howTo.map((step) => (
              <li key={step.step} className="flex gap-4">
                <span className="w-7 h-7 rounded-full bg-accent-soft text-accent text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {step.step}
                </span>
                <div>
                  <p className="text-sm font-semibold mb-0.5">{step.title}</p>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ section */}
        <section className="mt-12">
          <h2 className="text-lg font-bold tracking-tight mb-5">
            Frequently asked questions
          </h2>
          <div className="flex flex-col gap-5">
            {tool.faq.map((item) => (
              <div key={item.question}>
                <h3 className="text-sm font-semibold mb-1">{item.question}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Related tools */}
        {relatedTools.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold tracking-tight mb-5">
              Related tools
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {relatedTools.map((rt) => (
                <Link
                  key={rt.slug}
                  href={`/${rt.slug}/`}
                  className="bg-surface border border-border rounded-card p-5 block no-underline text-inherit hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div
                    className={`w-8 h-8 ${rt.iconColor} rounded-[8px] flex items-center justify-center mb-3`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      className={rt.iconStroke}
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      dangerouslySetInnerHTML={{ __html: rt.iconSvgPath }}
                    />
                  </div>
                  <p className="text-sm font-bold mb-1">{rt.title}</p>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {rt.tagline}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
