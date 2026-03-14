import dynamic from 'next/dynamic';

const PdfEditor = dynamic(
  () => import('@/components/pdf-editor/PdfEditor'),
  { ssr: false },
);

export default function EditPdfWorkerPage() {
  return <PdfEditor />;
}
