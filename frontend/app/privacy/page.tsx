import type { Metadata } from 'next';
import Layout from '@/components/Layout';

export const metadata: Metadata = {
  title: 'Privacy Policy — pdfctl',
  description: 'How pdfctl handles your files and data.',
};

const sections = [
  {
    title: 'Overview',
    content:
      'pdfctl is a privacy-first PDF tool. We designed it from the ground up to process your files without storing, reading, or sharing them. This policy explains exactly what happens to your data when you use pdfctl.',
  },
  {
    title: 'Files You Upload',
    content:
      'Files uploaded to pdfctl are stored temporarily on our servers solely for the purpose of completing the requested operation (e.g. compression, splitting, merging). All uploaded files and their processed outputs are automatically and permanently deleted after 10 minutes. We do not read, inspect, index, or analyse the contents of your files at any point.',
  },
  {
    title: 'No Account Required',
    content:
      'pdfctl does not require you to create an account, provide an email address, or submit any personal information. There is no login, no profile, and no user database.',
  },
  {
    title: 'Data We Do Not Collect',
    content:
      'We do not collect, sell, or share personal data. We do not use advertising trackers, third-party analytics scripts, fingerprinting, or cookies for tracking purposes. We do not store IP addresses linked to file uploads.',
  },
  {
    title: 'Cookies & Local Storage',
    content:
      'pdfctl does not use cookies or local storage for tracking. Any session-related browser state (such as temporary job IDs) exists only for the duration of your session and is not persisted or shared.',
  },
  {
    title: 'Open Source Verification',
    content:
      'The full source code for pdfctl — including the server, worker, and this frontend — is publicly available on GitHub. You are welcome to audit the code yourself to verify our privacy claims. If you identify any discrepancy, please open an issue.',
  },
  {
    title: 'Self-Hosting',
    content:
      'If you require complete control over your data, you can self-host pdfctl on your own infrastructure. Self-hosting gives you full ownership of your files, configuration, and processing environment.',
  },
  {
    title: 'Security',
    content:
      'Files are stored using randomised keys that are not guessable. Processed output files are only accessible via the unique job ID returned to you at the time of the request. All communication between your browser and the server takes place over HTTPS.',
  },
  {
    title: 'Changes to This Policy',
    content:
      'If we make material changes to this privacy policy, we will update this page. As an open-source project, all changes are also visible in the public git history.',
  },
  {
    title: 'Contact',
    content:
      'If you have questions or concerns about privacy, please open an issue on our GitHub repository at github.com/Innove-Labs/pdf-ctl.',
  },
];

export default function PrivacyPage() {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-6 pt-16 pb-24">
        {/* Header */}
        <p className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">
          Legal
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">Privacy Policy</h1>
        <p className="text-sm text-text-muted mb-12">Last updated: March 2026</p>

        {/* Highlight banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-card p-5 mb-12 flex gap-4 items-start">
          <div className="w-9 h-9 bg-emerald-100 rounded-[8px] flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
              <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800 mb-1">Your files are never stored longer than 10 minutes.</p>
            <p className="text-sm text-emerald-700 leading-relaxed">
              No account. No tracking. No watermarks. pdfctl processes your PDF and deletes it automatically — nothing is kept.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map((section, i) => (
            <div key={section.title}>
              <h2 className="text-base font-bold tracking-tight mb-2">
                <span className="text-text-muted font-normal mr-2">{String(i + 1).padStart(2, '0')}.</span>
                {section.title}
              </h2>
              <p className="text-sm text-text-secondary leading-relaxed">{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
