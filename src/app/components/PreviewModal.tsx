import React from 'react';
import { X, Download } from 'lucide-react';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string | null;
  error: string | null;
  isLoading: boolean;
  onDownload?: () => void;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  error,
  isLoading,
  onDownload
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-11/12 h-5/6 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            PDF Preview
          </h2>
          <div className="flex items-center space-x-2">
            {pdfUrl && onDownload && (
              <button
                onClick={onDownload}
                className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                title="Download PDF"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative h-[calc(100%-4rem)]">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-800">
              <div className="p-4 text-red-600 dark:text-red-400">
                <p className="font-semibold">Compilation Error:</p>
                <pre className="mt-2 text-sm whitespace-pre-wrap">{error}</pre>
              </div>
            </div>
          )}

          {pdfUrl && !isLoading && !error && (
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="PDF Preview"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal; 