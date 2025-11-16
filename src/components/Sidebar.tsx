'use client';

import React, { useState, useEffect } from 'react';
import { Chat, Document, chatAPI, documentAPI } from '../services/api';

interface SidebarProps {
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  selectedChatId?: string;
  onDocumentUpload: (file: File) => void;
  onDocumentsSelect: (selectedDocuments: Document[]) => void;
}

export default function Sidebar({ onChatSelect, onNewChat, selectedChatId, onDocumentUpload, onDocumentsSelect }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Delay loading slightly to ensure auth is set up
    const timer = setTimeout(() => {
      loadData();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const loadData = async () => {
    try {
      console.log('🔄 Sidebar: Starting to load data...');
      
      // Load data with individual error handling
      let chatsData: Chat[] = [];
      let documentsData: Document[] = [];
      
      try {
        chatsData = await chatAPI.getSessions();
        console.log('📊 Sidebar - Chats data:', chatsData);
      } catch (chatError) {
        console.error('❌ Failed to load chats:', chatError);
      }
      
      try {
        documentsData = await documentAPI.listDocuments();
        console.log('📄 Sidebar - Documents data:', documentsData);
      } catch (docError) {
        console.error('❌ Failed to load documents:', docError);
      }
      
      // Ensure data is always an array
      const validChats = Array.isArray(chatsData) ? chatsData : [];
      const validDocuments = Array.isArray(documentsData) ? documentsData : [];
      
      console.log('✅ Sidebar - Setting chats:', validChats.length, 'items');
      console.log('✅ Sidebar - Setting documents:', validDocuments.length, 'items');
      
      setChats(validChats);
      setDocuments(validDocuments);
      
      console.log('🏁 Sidebar - Data loading completed');
    } catch (error) {
      console.error('❌ Sidebar - Unexpected error loading data:', error);
      // Set empty arrays on error
      setChats([]);
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentSelect = (documentId: string) => {
    console.log('🔘 Document select clicked:', documentId);
    console.log('🔘 Current selected:', Array.from(selectedDocuments));
    
    const newSelected = new Set(selectedDocuments);
    if (newSelected.has(documentId)) {
      console.log('🔘 Removing document from selection');
      newSelected.delete(documentId);
    } else {
      console.log('🔘 Adding document to selection');
      newSelected.add(documentId);
    }
    
    console.log('🔘 New selected:', Array.from(newSelected));
    setSelectedDocuments(newSelected);
    
    // Pass selected documents to parent
    const selectedDocs = documents.filter(doc => newSelected.has(doc.file_id));
    console.log('🔘 Sending to parent:', selectedDocs.length, 'documents');
    onDocumentsSelect(selectedDocs);
  };

  const selectAllDocuments = () => {
    console.log('🔄 Select All clicked! Current selection size:', selectedDocuments.size, 'Total docs:', documents.length);
    
    if (selectedDocuments.size === documents.length) {
      // Deselect all
      console.log('🔄 Deselecting all documents');
      setSelectedDocuments(new Set());
      onDocumentsSelect([]);
    } else {
      // Select all
      console.log('🔄 Selecting all documents');
      const allIds = new Set(documents.map(doc => doc.file_id));
      setSelectedDocuments(allIds);
      onDocumentsSelect(documents);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onDocumentUpload(file);
      setTimeout(loadData, 1000);
    }
  };

  const handleDeleteDocument = async (fileId: string) => {
    try {
      await documentAPI.deleteDocument(fileId);
      setDocuments(documents.filter(doc => doc.file_id !== fileId));
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleDeleteChat = async (sessionId: string) => {
    try {
      await chatAPI.deleteSession(sessionId);
      setChats(chats.filter(chat => chat.session_id !== sessionId));
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="w-80 bg-gradient-to-b from-slate-900 to-slate-800 text-white h-screen flex items-center justify-center">
        <div className="flex space-x-1">
          <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    );
  }

  console.log('🎨 Sidebar - Rendering with documents:', documents);
  console.log('🎨 Sidebar - Documents count:', documents.length);
  console.log('🎨 Sidebar - Selected documents:', selectedDocuments.size);

  return (
    <div className="w-80 bg-gradient-to-b from-slate-900 to-slate-800 text-white h-screen hidden md:flex flex-col border-r border-slate-700/50 animate-slideInLeft">
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50 flex-shrink-0">
        <h1 className="text-2xl font-bold gradient-text mb-2">RAG Chatbot</h1>
        <p className="text-slate-400 text-sm mb-4">Intelligent document chat</p>
        <button
          onClick={onNewChat}
          className="w-full btn-primary text-white px-4 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2 group"
        >
          <svg 
            className="w-5 h-5 icon group-hover:rotate-90 transition-transform duration-300" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Content Area - Split between chats and documents */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Chats Section */}
        <div className="flex-1 min-h-0 px-4 py-4 overflow-hidden">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.001 8.001 0 01-7.025-4.09c-.203-.389-.155-.854.121-1.21L10.5 9.75l1.5-1.5L18 2.25l3-3-3 3z" />
            </svg>
            <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">Recent Chats</h3>
          </div>
          
          <div className="space-y-2 overflow-y-auto max-h-60">
            {Array.isArray(chats) && chats.length > 0 ? (
              chats.map((chat) => (
                <div
                  key={chat.session_id}
                  className={`group p-3 rounded-xl cursor-pointer transition-all duration-300 animate-fadeIn ${
                    selectedChatId === chat.session_id
                      ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300'
                      : 'card hover:bg-slate-700/50 text-slate-300 hover:text-white'
                  }`}
                  onClick={() => onChatSelect(chat.session_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-2 h-2 rounded-full transition-colors ${
                        selectedChatId === chat.session_id ? 'bg-blue-400' : 'bg-slate-500 group-hover:bg-slate-400'
                      }`} />
                      <span className="truncate text-sm font-medium">{chat.title}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteChat(chat.session_id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all duration-200"
                      title="Delete chat"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-500">
                <svg className="w-10 h-10 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.001 8.001 0 01-7.025-4.09c-.203-.389-.155-.854.121-1.21L10.5 9.75l1.5-1.5L18 2.25l3-3-3 3z" />
                </svg>
                <p className="text-sm">No chats yet</p>
                <p className="text-xs mt-1">Start a new conversation!</p>
              </div>
            )}
          </div>
        </div>

        {/* Documents Section */}
        <div className="border-t border-slate-700/50 bg-slate-900/50 backdrop-blur-sm flex-shrink-0">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wide">Documents</h3>
                {documents.length > 0 && (
                  <span className="text-xs text-slate-500">
                    ({selectedDocuments.size}/{documents.length} selected)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {documents.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      selectAllDocuments();
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {selectedDocuments.size === documents.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
            
                </label>
              </div>
            </div>
            
            <div className="space-y-2 max-h-52 overflow-y-auto documents-scroll pr-1">
              {Array.isArray(documents) && documents.length > 0 ? (
                documents.map((doc) => {
                  const isSelected = selectedDocuments.has(doc.file_id);
                  return (
                    <div
                      key={doc.file_id}
                      className={`document-card p-3 rounded-lg group animate-fadeIn cursor-pointer transition-all duration-300 ${
                        isSelected ? 'selected ring-1 ring-blue-500 bg-blue-500/10' : 'hover:bg-slate-700/50'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDocumentSelect(doc.file_id);
                      }}
                    >
                      <div className="flex items-center gap-2.5 w-full">
                        {/* Enhanced selection checkbox - only visible on hover or when selected */}
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                          isSelected 
                            ? 'opacity-100 bg-gradient-to-br from-blue-500 to-purple-600 border-blue-500' 
                            : 'opacity-0 group-hover:opacity-100 border-slate-400 group-hover:border-blue-400'
                        }`}>
                          {isSelected && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        
                        {/* Enhanced document icon */}
                        <div className={`w-8 h-8 bg-gradient-to-br rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                          isSelected 
                            ? 'from-blue-600 to-purple-700' 
                            : 'from-blue-500 to-purple-600 group-hover:shadow-sm group-hover:shadow-blue-500/20'
                        }`}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        
                        {/* Enhanced document info */}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate transition-colors text-sm ${
                            isSelected ? 'text-blue-300' : 'text-slate-200 group-hover:text-white'
                          }`}>
                            {doc.filename}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded font-mono">
                              PDF
                            </span>
                            <span className="text-xs text-slate-500">
                              {doc.size_bytes ? formatFileSize(doc.size_bytes) : 'Unknown'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Enhanced delete button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc.file_id);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded transition-all duration-200 flex-shrink-0"
                          title="Delete document"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 px-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-300 mb-1">No documents</p>
                  <p className="text-xs text-slate-500">Upload PDFs to start</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}