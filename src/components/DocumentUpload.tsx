'use client';

import React, { useState } from 'react';
import { documentAPI, ragAPI } from '../services/api';

interface DocumentUploadProps {
  onUploadComplete: () => void;
}

export default function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      alert('Please select a PDF file');
      return;
    }

    setUploading(true);
    try {
      // Upload the document
      await documentAPI.uploadPDF(file);
      
      setUploading(false);
      setProcessing(true);
      
      // Process the document through RAG pipeline
      await ragAPI.processDocument(file);
      
      onUploadComplete();
      alert('Document uploaded and processed successfully!');
    } catch (error) {
      console.error('Error uploading/processing document:', error);
      alert('Error uploading document. Please try again.');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 min-h-screen flex items-center justify-center">
      <div className="max-w-2xl w-full animate-fadeIn">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold gradient-text mb-2">Upload Document</h2>
          <p className="text-slate-400">Add PDFs to your knowledge base</p>
        </div>

        <div
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
            dragOver
              ? 'border-blue-400 bg-blue-500/10 scale-105'
              : 'border-slate-600/50 hover:border-slate-500/70 card'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {uploading || processing ? (
            <div className="flex flex-col items-center animate-slideInUp">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
              <p className="text-slate-300 text-lg font-medium">
                {uploading ? 'Uploading document...' : 'Processing document...'}
              </p>
              <p className="text-slate-500 text-sm mt-2">
                {uploading ? 'Please wait while we upload your file' : 'Indexing content for search...'}
              </p>
            </div>
          ) : (
            <div className="animate-slideInUp">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Drop PDF files here
              </h3>
              <p className="text-slate-400 text-lg mb-6">
                or click to browse your computer
              </p>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <span className="btn-primary text-white px-8 py-4 rounded-xl font-medium transition-all inline-flex items-center gap-2 group">
                  <svg className="w-5 h-5 icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Browse Files
                </span>
              </label>
            </div>
          )}
        </div>
        
        <div className="mt-8 glass p-6 rounded-2xl">
          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Upload Guidelines
          </h4>
          <div className="space-y-3 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span>Only PDF files are supported</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span>Documents will be processed and indexed for search</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <span>Processing may take a few moments</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
              <span>Maximum file size: 50MB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}