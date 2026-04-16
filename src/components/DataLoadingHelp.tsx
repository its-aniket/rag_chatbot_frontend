'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface DataLoadingHelpProps {
  type: 'chats' | 'documents';
  isEmpty: boolean;
}

export default function DataLoadingHelp({ type, isEmpty }: DataLoadingHelpProps) {
  const { user } = useAuth();

  if (!isEmpty) return null;

  if (!user) {
    return (
      <div className="text-center text-slate-400 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
        <div className="mb-2">
          <svg className="w-8 h-8 mx-auto text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <p className="text-sm font-medium mb-1">Sign in required</p>
        <p className="text-xs text-slate-500">
          Please sign in to access your {type}
        </p>
      </div>
    );
  }

  return (
    <div className="text-center text-slate-400 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
      <div className="mb-2">
        <svg className="w-8 h-8 mx-auto text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <p className="text-sm font-medium mb-1">No {type} found</p>
      <p className="text-xs text-slate-500 mb-3">
        {type === 'chats' 
          ? 'Start a new conversation to see your chat history here'
          : 'Upload a PDF document to begin chatting with your files'
        }
      </p>
      <div className="text-xs text-blue-400">
        <p className="font-medium mb-1">💡 Using a different device?</p>
        <p className="text-slate-500">
          Make sure you&apos;re signed in with the same account to see your {type} across devices.
        </p>
      </div>
    </div>
  );
}