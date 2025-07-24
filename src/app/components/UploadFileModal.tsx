'use client'

import { useState, useRef } from 'react';
import { X, FileUp, CheckCircle, AlertTriangle } from 'lucide-react';

interface UploadFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  workspaceId: string;
  parentId: string | null;
}

export default function UploadFileModal({ isOpen, onClose, onUpload, workspaceId, parentId }: UploadFileModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setError(null);
      setUploadSuccess(false);
    }
  };
  
  const resetState = () => {
    setSelectedFile(null);
    setIsUploading(false);
    setError(null);
    setUploadSuccess(false);
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  }

  const handleClose = () => {
    resetState();
    onClose();
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadSuccess(false);

    try {
      await onUpload(selectedFile);
      setUploadSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500); // Close modal after a short delay on success
    } catch (err: any) {
      setError(err.message || 'Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center">
            <FileUp className="w-6 h-6 text-green-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-800">Upload File</h2>
          </div>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-200">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              {selectedFile ? (
                <div>
                  <p className="font-medium text-gray-800">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                </div>
              ) : (
                <div>
                  <FileUp className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-indigo-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Any file type up to 10MB</p>
                </div>
              )}
            </div>
            
            {error && (
              <div className="mt-4 flex items-center text-red-600">
                <AlertTriangle className="w-4 h-4 mr-2" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            {uploadSuccess && (
              <div className="mt-4 flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-2" />
                <p className="text-sm">File uploaded successfully!</p>
              </div>
            )}
          </div>
          <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-green-700 disabled:bg-green-400"
              disabled={!selectedFile || isUploading || uploadSuccess}
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
