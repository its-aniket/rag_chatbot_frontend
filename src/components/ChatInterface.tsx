'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../services/api';

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

// Simple markdown parser for RAG responses
const parseMarkdown = (text: string) => {
  if (!text) return text;
  
  // Split text into lines for processing
  const lines = text.split('\n');
  const elements: React.ReactElement[] = [];
  let nestedCounter = 0; // Track nested items for numbering
  
  lines.forEach((line, index) => {
    const key = `line-${index}`;
    const trimmedLine = line.trim();
    
    // Skip empty lines but add spacing
    if (trimmedLine === '') {
      elements.push(<div key={key} className="mb-2"></div>);
      return;
    }
    
    // Handle different types of bullet points with proper indentation
    if (trimmedLine.match(/^[\*\•\-]\s*\*\*.*\*\*:?/)) {
      // Main bullet with bold heading (e.g., "* **Direct Answer**:")
      const content = trimmedLine.replace(/^[\*\•\-]\s*/, '');
      nestedCounter = 0; // Reset nested counter for new main bullet
      elements.push(
        <div key={key} className="mb-4 flex items-start">
          <span className="text-blue-400 mr-3 mt-1 text-lg font-bold">•</span>
          <div className="flex-1">{processBoldAndCitations(content)}</div>
        </div>
      );
    }
    else if (trimmedLine.match(/^[\*\•\-]\s+[\*\•\-]/)) {
      // Nested bullet points (e.g., "* * Agentic AI refers to...") - convert to numbered list
      const content = trimmedLine.replace(/^[\*\•\-]\s+[\*\•\-]\s*/, '');
      nestedCounter++; // Increment counter for nested items
      
      elements.push(
        <div key={key} className="mb-2 ml-6 flex items-start">
          <span className="text-green-400 mr-3 mt-1 font-bold min-w-[20px]">{nestedCounter}.</span>
          <div className="flex-1">{processBoldAndCitations(content)}</div>
        </div>
      );
    }
    else if (trimmedLine.match(/^[\*\•\-]\s/)) {
      // Regular bullet points
      const content = trimmedLine.replace(/^[\*\•\-]\s*/, '');
      elements.push(
        <div key={key} className="mb-2 flex items-start">
          <span className="text-blue-400 mr-3 mt-1">•</span>
          <div className="flex-1">{processBoldAndCitations(content)}</div>
        </div>
      );
    }
    else if (trimmedLine.match(/^\+\s/)) {
      // Plus bullet points
      const content = trimmedLine.replace(/^\+\s*/, '');
      elements.push(
        <div key={key} className="mb-2 flex items-start">
          <span className="text-green-400 mr-3 mt-1">+</span>
          <div className="flex-1">{processBoldAndCitations(content)}</div>
        </div>
      );
    }
    else if (trimmedLine.match(/^\d+\.\s/)) {
      // Numbered list items
      const content = trimmedLine.replace(/^\d+\.\s*/, '');
      const number = trimmedLine.match(/^(\d+)\./)?.[1] || '1';
      elements.push(
        <div key={key} className="mb-2 flex items-start">
          <span className="text-purple-400 mr-3 mt-1 font-bold min-w-[20px]">{number}.</span>
          <div className="flex-1">{processBoldAndCitations(content)}</div>
        </div>
      );
    }
    else if (trimmedLine.match(/^\*\*.*\*\*:?\s*$/)) {
      // Standalone bold headers
      elements.push(
        <div key={key} className="mb-3 mt-4">
          {processBoldAndCitations(trimmedLine)}
        </div>
      );
    }
    else {
      // Regular text with proper spacing
      elements.push(
        <div key={key} className="mb-2 leading-relaxed">
          {processBoldAndCitations(trimmedLine)}
        </div>
      );
    }
  });
  
  return <div className="space-y-1">{elements}</div>;
};

// Process bold text and citations within a line
const processBoldAndCitations = (text: string) => {
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  
  // Enhanced regex to handle bold text with optional colons
  const boldRegex = /\*\*(.*?)\*\*(:?)/g;
  let match;
  
  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the bold part
    if (match.index > lastIndex) {
      const beforeText = text.slice(lastIndex, match.index);
      const citationParts = processCitations(beforeText, parts.length);
      if (Array.isArray(citationParts)) {
        parts.push(...citationParts);
      } else {
        parts.push(citationParts);
      }
    }
    
    // Add bold text with colon if present
    const boldText = match[1];
    const colon = match[2];
    parts.push(
      <strong key={`bold-${parts.length}`} className="font-bold text-blue-300">
        {boldText}{colon}
      </strong>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    const citationParts = processCitations(remainingText, parts.length);
    if (Array.isArray(citationParts)) {
      parts.push(...citationParts);
    } else {
      parts.push(citationParts);
    }
  }
  
  return parts.length > 0 ? parts : text;
};

// Process citations [1], [2], etc.
const processCitations = (text: string, keyOffset: number) => {
  const citationRegex = /\[(\d+)\]/g;
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  let match;
  
  while ((match = citationRegex.exec(text)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    // Add citation
    parts.push(
      <span 
        key={`citation-${keyOffset}-${parts.length}`} 
        className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold bg-blue-600 text-white rounded-md mx-1 shadow-sm"
        title={`Source ${match[1]}`}
      >
        [{match[1]}]
      </span>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 1 ? parts : text;
};

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export default function ChatInterface({ messages, onSendMessage, isLoading }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    
    // Add safety checks
    if (!message) {
      console.error('Message is undefined');
      return null;
    }
    
    if (!message.content) {
      console.error('Message content is undefined:', message);
    }
    
    return (
      <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-slideInUp`}>
        <div className={`max-w-4xl ${isUser ? 'message-user' : 'message-assistant'} rounded-2xl px-6 py-4 shadow-lg`}>
          <div className="text-white leading-relaxed font-medium">
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.content || 'No content'}</div>
            ) : (
              <div className="markdown-content">
                {parseMarkdown(message.content || 'No content')}
              </div>
            )}
          </div>
          
          {/* Sources for assistant messages */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-600/50">
              <details className="text-sm">
                <summary className="cursor-pointer text-slate-300 hover:text-white transition-colors flex items-center gap-2 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Sources ({message.sources.length})
                </summary>
                <div className="mt-3 space-y-2">
                  {message.sources.map((source, index) => {
                    // Handle different source object structures
                    const sourceObj = source as { metadata?: { filename?: string; chunk_index?: number }; filename?: string; page?: number };
                    const filename = sourceObj?.metadata?.filename || sourceObj?.filename || 'Unknown';
                    const page = sourceObj?.metadata?.chunk_index || sourceObj?.page || 'N/A';
                    
                    return (
                      <div key={index} className="card p-3 rounded-lg border border-slate-600/30">
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="font-medium">{filename}</span>
                          <span>•</span>
                          <span>Chunk {page}</span>
                          <span>•</span>
                          <span className="text-green-400 font-medium">
                            {source?.similarity_score ? (source.similarity_score * 100).toFixed(1) : 'N/A'}% match
                          </span>
                        </div>
                        <div className="text-slate-300 text-xs leading-relaxed">
                          {source?.text?.substring(0, 200) || 'No text'}...
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            </div>
          )}
          
         
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-800 to-slate-900">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-400 max-w-2xl animate-fadeIn">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.001 8.001 0 01-7.025-4.09c-.203-.389-.155-.854.121-1.21L10.5 9.75l1.5-1.5L18 2.25l3-3-3 3z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-4 gradient-text">Welcome to RAG Chatbot</h2>
              <p className="text-lg mb-2">Start a conversation by typing a message below.</p>
              <p className="text-sm opacity-75">Upload documents to get AI-powered answers from your files.</p>
            </div>
          </div>
        ) : (
          <>
            {Array.isArray(messages) && messages.filter(msg => msg && msg.id).map(renderMessage)}
            {isLoading && (
              <div className="flex justify-start mb-6 animate-slideInUp">
                <div className="message-assistant rounded-2xl px-6 py-4 shadow-lg">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <span className="text-slate-300 text-sm ml-3">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm p-6">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex space-x-4 items-end">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder="Type your message... (Shift + Enter for new line)"
                disabled={isLoading}
                rows={1}
                className="w-full bg-slate-800/50 text-white border border-slate-600/50 rounded-2xl px-6 py-4 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 transition-all duration-200 resize-none backdrop-blur-sm placeholder-slate-400"
                style={{
                  minHeight: '56px',
                  maxHeight: '200px',
                }}
              />
              <div className="absolute right-2 bottom-3">
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="btn-primary rotate-90 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200 group disabled:opacity-50"
                >
                  <svg 
                    className="w-5 h-5 icon group-hover:scale-110 transition-transform" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span>Press Enter to send • Shift + Enter for new line</span>
            </div>
            {input.length > 0 && (
              <span className={`${input.length > 1000 ? 'text-yellow-400' : ''}`}>
                {input.length}/2000
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}