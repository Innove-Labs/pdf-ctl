export type InputType = 'single-pdf' | 'multiple-pdf' | 'multiple-image' | 'redirect'

// export type SplitMode = 'range' | 'every_n' | 'individual' | 'fixed_ranges';
export type SplitMode = 'pages' | 'n-pages' | 'all' | 'range';


export interface PageRange {
  from: number;
  to: number;
}

export interface SplitParams {
  mode: SplitMode;
  pages?: number[];
  n_pages?: number;
  ranges?: PageRange[];
}

export interface ConvertImageParams {
  orientation: 'portrait' | 'landscape';
  page_size: 'A4' | 'Letter' | 'Legal' | 'fit';
  merge_into_one: boolean;
}

export interface Redirectparams {
  path: string;
  title: string;
}

export type ToolParams =
  | { type: 'none' }
  | { type: 'password' }
  | { type: 'split'; defaults: SplitParams }
  | { type: 'convert-image'; defaults: ConvertImageParams }
  | { type: 'redirect'; target: Redirectparams  };

export interface HowToStep {
  step: number;
  title: string;
  description: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface ToolMeta {
  slug: string;
  title: string;
  tagline: string;
  metaDescription: string;
  operation: string;
  inputType: InputType;
  params: ToolParams;
  iconColor: string;
  iconStroke: string;
  iconSvgPath: string;
  howTo: HowToStep[];
  faq: FaqItem[];
  relatedSlugs: string[];
  actionLabel: string;
  processingMessage: string;
  completionMessage: string;
}

export const TOOLS: ToolMeta[] = [
  {
    slug: 'compress-pdf',
    title: 'Compress PDF',
    tagline: 'Shrink file size while keeping your content readable.',
    metaDescription:
      "Easily reduce PDF file size with pdfctl's Compress PDF tool. Upload your PDF and our service optimises it for a smaller size while maintaining quality. Perfect for email and storage.",
    operation: 'compress',
    inputType: 'single-pdf',
    params: { type: 'none' },
    iconColor: 'bg-orange-50',
    iconStroke: 'text-accent',
    iconSvgPath:
      '<polyline points="8 17 12 21 16 17"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29"/>',
    howTo: [
      {
        step: 1,
        title: 'Upload your PDF',
        description:
          'Drop your PDF into the upload area or click to browse. Files up to 50 MB are supported.',
      },
      {
        step: 2,
        title: 'Click Compress',
        description:
          'Hit the Compress PDF button. Our server processes the file using Ghostscript.',
      },
      {
        step: 3,
        title: 'Download the result',
        description:
          "When compression finishes, download the smaller file. The original is never stored permanently.",
      },
    ],
    faq: [
      {
        question: 'How much smaller will my PDF get?',
        answer:
          'Typical documents shrink by 40–70%. Scanned image PDFs compress the most; text-only PDFs may see modest gains.',
      },
      {
        question: 'Will quality degrade?',
        answer:
          "pdfctl uses Ghostscript's screen preset, which is tuned for on-screen reading. Very high-resolution print files may see slight visual reduction.",
      },
      {
        question: 'Is my file private?',
        answer:
          'Files are deleted automatically after 10 minutes. Nothing is shared or stored beyond the processing window.',
      },
      {
        question: 'What is the maximum file size?',
        answer: 'The upload limit is 50 MB.',
      },
    ],
    relatedSlugs: ['split-pdf', 'merge-pdf', 'lock-pdf'],
    actionLabel: 'Compress PDF',
    processingMessage: 'Compressing your PDF…',
    completionMessage: 'Compression complete',
  },
  {
    slug: 'split-pdf',
    title: 'Split PDF',
    tagline: 'Extract a page range or break a document into individual files.',
    metaDescription:
      'Split a PDF by page range, every N pages, at specific page numbers, or into individual pages. Free, private, no sign-up required.',
    operation: 'split',
    inputType: 'single-pdf',
    params: {
      type: 'split',
      defaults: { mode: 'range', ranges: [{ from: 1, to: 1 }], pages: [1] },
    },
    iconColor: 'bg-blue-50',
    iconStroke: 'text-blue-600',
    iconSvgPath:
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/><line x1="3" y1="12" x2="21" y2="12"/>',
    howTo: [
      {
        step: 1,
        title: 'Upload your PDF',
        description:
          'Drop or browse to upload the PDF you want to split.',
      },
      {
        step: 2,
        title: 'Choose a split mode',
        description:
          'Select Range (extract pages like "1-3,5"), Every N pages, Fixed ranges, or split into individual pages.',
      },
      {
        step: 3,
        title: 'Download the parts',
        description:
          'Each resulting file is listed separately. Download any or all of them.',
      },
    ],
    faq: [
      {
        question: 'Can I extract specific pages?',
        answer:
          'Yes. Use Range mode and enter a comma-separated list like "1-3,5,8-10".',
      },
      {
        question: 'What does Every N pages mean?',
        answer:
          'The document is cut into chunks of N pages each. Useful for dividing a 100-page report into 10-page sections.',
      },
      {
        question: 'How many output files can I get?',
        answer:
          'There is no hard limit on output files for a single split job.',
      },
      {
        question: 'Are the originals deleted?',
        answer:
          'All uploaded and generated files are automatically purged after 10 minutes.',
      },
    ],
    relatedSlugs: ['compress-pdf', 'merge-pdf', 'lock-pdf'],
    actionLabel: 'Split PDF',
    processingMessage: 'Splitting your PDF…',
    completionMessage: 'Split complete',
  },
  {
    slug: 'merge-pdf',
    title: 'Merge PDFs',
    tagline: 'Combine multiple PDF files into one cohesive document.',
    metaDescription:
      'Merge multiple PDF files into one document. Drag to reorder, then combine — free, private, no sign-up required.',
    operation: 'merge',
    inputType: 'multiple-pdf',
    params: { type: 'none' },
    iconColor: 'bg-green-50',
    iconStroke: 'text-green-600',
    iconSvgPath:
      '<path d="M8 6H5a2 2 0 0 0-2 2v3m0 4v3a2 2 0 0 0 2 2h3"/><path d="M16 6h3a2 2 0 0 1 2 2v3m0 4v3a2 2 0 0 1-2 2h-3"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
    howTo: [
      {
        step: 1,
        title: 'Upload your PDFs',
        description:
          'Add two or more PDF files. Each is uploaded immediately as you add it.',
      },
      {
        step: 2,
        title: 'Reorder if needed',
        description:
          'Use the up/down arrows to set the final page order.',
      },
      {
        step: 3,
        title: 'Merge and download',
        description:
          'Click Merge PDFs. A single combined file is ready in seconds.',
      },
    ],
    faq: [
      {
        question: 'How many PDFs can I merge at once?',
        answer:
          'Up to 10 files, with a combined size limit of 50 MB.',
      },
      {
        question: 'Does the order matter?',
        answer:
          'Yes. The files are merged in the order shown in the list. Reorder them before clicking Merge.',
      },
      {
        question: 'Are my files kept private?',
        answer: 'All files are purged automatically within 10 minutes.',
      },
    ],
    relatedSlugs: ['split-pdf', 'compress-pdf', 'lock-pdf'],
    actionLabel: 'Merge PDFs',
    processingMessage: 'Merging your PDFs…',
    completionMessage: 'Merge complete',
  },
  {
    slug: 'lock-pdf',
    title: 'Lock PDF',
    tagline: 'Add a password to restrict viewing or editing.',
    metaDescription:
      'Password-protect your PDF files. Free, private, no sign-up required.',
    operation: 'encrypt',
    inputType: 'multiple-pdf',
    params: { type: 'password' },
    iconColor: 'bg-teal-50',
    iconStroke: 'text-teal-600',
    iconSvgPath:
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    howTo: [
      {
        step: 1,
        title: 'Upload your PDF(s)',
        description: 'Add one or more PDF files to the upload area.',
      },
      {
        step: 2,
        title: 'Enter a password',
        description:
          'Type a strong password. Remember it — it cannot be recovered.',
      },
      {
        step: 3,
        title: 'Download the locked file',
        description:
          'Download the password-protected PDF. Only someone with the password can open it.',
      },
    ],
    faq: [
      {
        question: 'What encryption standard is used?',
        answer:
          'pdfctl uses 128-bit RC4 encryption via Ghostscript, compatible with all modern PDF readers.',
      },
      {
        question: 'Can I lock multiple PDFs at once?',
        answer:
          'Yes. Add up to 10 PDFs and they all receive the same password in one operation.',
      },
      {
        question: 'Can I recover the password if I forget it?',
        answer:
          'No. pdfctl does not store passwords. Keep it safe.',
      },
    ],
    relatedSlugs: ['unlock-pdf', 'compress-pdf', 'merge-pdf'],
    actionLabel: 'Lock PDF',
    processingMessage: 'Locking your PDF…',
    completionMessage: 'PDF locked',
  },
  {
    slug: 'unlock-pdf',
    title: 'Unlock PDF',
    tagline: 'Remove password protection from a PDF.',
    metaDescription:
      'Remove password protection from your PDF files. Free, private, no sign-up required.',
    operation: 'decrypt',
    inputType: 'multiple-pdf',
    params: { type: 'password' },
    iconColor: 'bg-blue-50',
    iconStroke: 'text-blue-600',
    iconSvgPath:
      '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 8-4.95"/>',
    howTo: [
      {
        step: 1,
        title: 'Upload your PDF(s)',
        description: 'Add the password-protected PDF(s).',
      },
      {
        step: 2,
        title: 'Enter the current password',
        description:
          'Type the password that protects the file. Without it, decryption is not possible.',
      },
      {
        step: 3,
        title: 'Download the unlocked file',
        description:
          'Download the PDF — now freely openable by anyone.',
      },
    ],
    faq: [
      {
        question: 'What if I enter the wrong password?',
        answer:
          'The job will fail and an error message will appear. Check the password and try again.',
      },
      {
        question: "Can pdfctl crack a password I've forgotten?",
        answer:
          'No. You must know the current password. pdfctl only removes protection when given valid credentials.',
      },
      {
        question: 'Are my files stored?',
        answer: 'Files are automatically purged after 10 minutes.',
      },
    ],
    relatedSlugs: ['lock-pdf', 'compress-pdf', 'split-pdf'],
    actionLabel: 'Unlock PDF',
    processingMessage: 'Unlocking your PDF…',
    completionMessage: 'PDF unlocked',
  },
  {
    slug: 'convert-image-to-pdf',
    title: 'Convert Images to PDF',
    tagline: 'Turn JPG, PNG or WebP images into a clean, portable PDF.',
    metaDescription:
      'Convert JPG, PNG and other images into a PDF. Control order, orientation and page size. Free, private, no sign-up required.',
    operation: 'convert-image-pdf',
    inputType: 'multiple-image',
    params: {
      type: 'convert-image',
      defaults: {
        orientation: 'portrait',
        page_size: 'A4',
        merge_into_one: true,
      },
    },
    iconColor: 'bg-purple-50',
    iconStroke: 'text-purple-600',
    iconSvgPath:
      '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    howTo: [
      {
        step: 1,
        title: 'Upload your images',
        description:
          'Add JPG, PNG, WebP or GIF files. Up to 10 images, 50 MB total.',
      },
      {
        step: 2,
        title: 'Set page options',
        description:
          'Choose portrait or landscape orientation, a page size (A4, Letter, etc.), and whether to merge into one PDF or create separate files.',
      },
      {
        step: 3,
        title: 'Convert and download',
        description:
          'Download your PDF(s) instantly once conversion finishes.',
      },
    ],
    faq: [
      {
        question: 'Which image formats are supported?',
        answer: 'JPEG, PNG, WebP, GIF and BMP.',
      },
      {
        question: 'Can I control the page size?',
        answer:
          'Yes. Choose A4, Letter, Legal, or "Fit" (each page matches the image dimensions).',
      },
      {
        question: 'What does "Merge into one" mean?',
        answer:
          'When enabled, all images become pages in a single PDF. When disabled, each image produces its own PDF file.',
      },
      {
        question: 'How many images can I upload?',
        answer: 'Up to 10 images with a combined size of 50 MB.',
      },
    ],
    relatedSlugs: ['compress-pdf', 'merge-pdf', 'split-pdf'],
    actionLabel: 'Convert to PDF',
    processingMessage: 'Converting your images…',
    completionMessage: 'Conversion complete',
  },
  {
    slug: 'edit-pdf',
    title: 'Edit PDF',
    tagline: 'Add Images, Texts etc to the PDF',
    metaDescription:
      'Add Images, Texts etc to the PDF',
    operation: 'edit-pdf',
    inputType: 'redirect',
    params: {
      type: 'redirect',
      target: {
        path: "/edit-pdf-worker",
        title: "Go to Edit PDF"
      }
    },
    iconColor: 'bg-purple-50',
    iconStroke: 'text-purple-600',
    iconSvgPath:
      '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    howTo: [
      {
        step: 1,
        title: 'Click on the Edit PDF button',
        description:
          'Yes, the big red button',
      },
      {
        step: 2,
        title: 'You will be redirected to the pdf editor in a new tab',
        description:
          'Here you can upload your pdf and perform actions like reorder, rotate, add text, image etc',
      },
      {
        step: 3,
        title: 'Click on download',
        description:
          'After you are done with editing, click on the download button',
      },
    ],
    faq: [
      {
        question: 'Will my file be saved in the server?',
        answer: 'No. Pdf editor runs on your browser. It does not send any data to the server',
      },
      {
        question: 'Is the pdf editor limited?',
        answer:
          'No, all the pdf editor features are free.',
      },
      {
        question: 'Can I download the edited pdf?',
        answer:
          'Yes, you can download the edited pdf whenever you want.',
      }
    ],
    relatedSlugs: ['compress-pdf', 'merge-pdf', 'split-pdf'],
    actionLabel: 'Edit PDF',
    processingMessage: '',
    completionMessage: '',

  }
];

export function getToolBySlug(slug: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.slug === slug);
}
