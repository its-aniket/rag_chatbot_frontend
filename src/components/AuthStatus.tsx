'use client';

import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthStatusProps {
  className?: string;
}

export default function AuthStatus({ className = '' }: AuthStatusProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-xs text-slate-400 ${className}`}>
        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
        <span>Checking authentication...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`flex items-center gap-2 text-xs text-red-400 ${className}`}>
        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
        <span>Not signed in</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 text-xs text-green-400 ${className}`}>
      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
      <span>Signed in as {user.email}</span>
    </div>
  );
}