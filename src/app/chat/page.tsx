'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import ChatInterface from '../../components/ChatInterface';
import DocumentUpload from '../../components/DocumentUpload';
import { Message, Document, Chat, Source, chatAPI, documentAPI, ragAPI, setAuthTokenGetter } from '../../services/api';

export default function ChatPage() {
  const { user, signOut, getToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setAuthTokenGetter(getToken);
  }, [getToken]);

  const getUsernameFromEmail = (email: string) => {
    const username = email.split('@')[0];
    return username
      .replace(/[._]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // ── lifted sidebar state ────────────────────────────────────────────────────
  const [chats, setChats] = useState<Chat[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sidebarLoading, setSidebarLoading] = useState(true);

  // ── chat / message state ────────────────────────────────────────────────────
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [currentChatTitle, setCurrentChatTitle] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);

  // ── load sidebar data once on mount ────────────────────────────────────────
  const loadSidebarData = useCallback(async () => {
    try {
      const [chatsResult, docsResult] = await Promise.allSettled([
        chatAPI.getSessions(),
        documentAPI.listDocuments(),
      ]);
      setChats(chatsResult.status === 'fulfilled' ? chatsResult.value : []);
      setDocuments(docsResult.status === 'fulfilled' ? docsResult.value : []);
    } catch (e) {
      console.error('Failed to load sidebar data:', e);
    } finally {
      setSidebarLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(loadSidebarData, 100);
    return () => clearTimeout(t);
  }, [loadSidebarData]);

  useEffect(() => {
    if (!user) router.push('/');
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Redirecting to home...</p>
        </div>
      </div>
    );
  }

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleNewChat = async () => {
    try {
      const newChat = await chatAPI.createSession();
      setChats(prev => [newChat, ...prev]);
      setSelectedChatId(newChat.session_id);
      setCurrentChatTitle('');
      setMessages([]);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleChatSelect = async (chatId: string) => {
    try {
      setSelectedChatId(chatId);
      const { session, messages: chatMessages } = await chatAPI.getSession(chatId);
      setCurrentChatTitle(session.title || '');

      if (session.document_ids && session.document_ids.length > 0) {
        const sessionDocuments = documents.filter(doc =>
          session.document_ids?.includes(doc.file_id)
        );
        setSelectedDocuments(sessionDocuments);
      } else {
        setSelectedDocuments([]);
      }

      const validMessages = Array.isArray(chatMessages)
        ? chatMessages.filter(msg => msg && msg.id && msg.content !== undefined)
        : [];
      setMessages(validMessages);
    } catch (error) {
      console.error('Error loading chat:', error);
      setMessages([]);
      setCurrentChatTitle('');
    }
  };

  const handleDeleteChat = (sessionId: string) => {
    setChats(prev => prev.filter(c => c.session_id !== sessionId));
    if (selectedChatId === sessionId) {
      setSelectedChatId(null);
      setMessages([]);
      setCurrentChatTitle('');
    }
  };

  const handleDeleteDocument = (fileId: string) => {
    setDocuments(prev => prev.filter(d => d.file_id !== fileId));
    setSelectedDocuments(prev => prev.filter(d => d.file_id !== fileId));
  };

  const handleSendMessage = async (messageContent: string) => {
    let currentChatId = selectedChatId;

    if (!currentChatId) {
      try {
        const newChat = await chatAPI.createSession();
        setChats(prev => [newChat, ...prev]);
        currentChatId = newChat.session_id;
        setSelectedChatId(currentChatId);
        setMessages([]);
      } catch (error) {
        console.error('Error creating new chat:', error);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      role: 'user',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent('');

    try {
      const selectedDocumentIds = selectedDocuments.map(doc => doc.file_id);
      const result = await chatAPI.sendMessage(currentChatId, messageContent, selectedDocumentIds);

      const isFirstMessage = messages.length === 0;
      if (isFirstMessage && result.ragResponse) {
        try {
          const title = generateTitleFromMessage(messageContent);
          await chatAPI.updateSessionTitle(currentChatId, title);
          setCurrentChatTitle(title);
          setChats(prev =>
            prev.map(c => c.session_id === currentChatId ? { ...c, title } : c)
          );
        } catch (e) {
          console.error('Failed to update session title:', e);
        }
      }

      if (result.ragResponse) {
        const ragResponse = result.ragResponse as { response: string; sources?: Source[] };
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: ragResponse.response,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          sources: ragResponse.sources || [],
        }]);
      } else if (result.aiMessage) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          content: result.aiMessage.content,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          sources: result.aiMessage.sources || [],
        }]);
      }
    } catch (error) {
      console.error('Error in chat flow:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  const generateTitleFromMessage = (message: string): string => {
    const clean = message.trim();
    if (clean.length <= 50) return clean;
    const words = clean.split(' ');
    let title = '';
    for (const word of words) {
      if ((title + ' ' + word).length > 40) break;
      title += (title ? ' ' : '') + word;
    }
    return (title.length < clean.length ? title + '...' : title) || 'New Chat';
  };

  const handleDocumentUpload = async (file: File) => {
    try {
      const uploaded = await documentAPI.uploadPDF(file);
      setDocuments(prev => [uploaded, ...prev]);
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  const handleUploadComplete = async () => {
    setShowDocumentUpload(false);
    try {
      const fresh = await documentAPI.listDocuments();
      setDocuments(fresh);
    } catch (e) {
      console.error('Failed to refresh documents:', e);
    }
  };

  const handleDocumentsSelect = async (docs: Document[]) => {
    setSelectedDocuments(docs);
    if (selectedChatId && docs.length > 0) {
      try {
        await chatAPI.updateSessionDocuments(selectedChatId, docs.map(d => d.file_id));
      } catch (error) {
        console.error('Error updating session documents:', error);
      }
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setShowMobileSidebar(false)}>
          <div className="w-80 sm:w-72 h-full" onClick={(e) => e.stopPropagation()}>
            <Sidebar
              chats={chats}
              documents={documents}
              loading={sidebarLoading}
              selectedChatId={selectedChatId || undefined}
              onChatSelect={handleChatSelect}
              onNewChat={handleNewChat}
              onDeleteChat={handleDeleteChat}
              onDeleteDocument={handleDeleteDocument}
              onDocumentUpload={handleDocumentUpload}
              onDocumentsSelect={handleDocumentsSelect}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          chats={chats}
          documents={documents}
          loading={sidebarLoading}
          selectedChatId={selectedChatId || undefined}
          onChatSelect={handleChatSelect}
          onNewChat={handleNewChat}
          onDeleteChat={handleDeleteChat}
          onDeleteDocument={handleDeleteDocument}
          onDocumentUpload={handleDocumentUpload}
          onDocumentsSelect={handleDocumentsSelect}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <button
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              className="md:hidden btn-secondary p-2 sm:p-3 rounded-xl transition-all flex-shrink-0"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold gradient-text truncate">
                {selectedChatId ? (currentChatTitle || 'Chat Session') : 'RAG Chatbot'}
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm truncate">
                {selectedChatId
                  ? 'AI-powered document chat'
                  : 'Welcome back, ' + getUsernameFromEmail(user.email || '')}
                {selectedDocuments.length > 0 && (
                  <span className="ml-2 text-blue-400">
                    • {selectedDocuments.length} doc{selectedDocuments.length !== 1 ? 's' : ''}
                  </span>
                )}
                {user?.email && (
                  <span className="ml-2 text-green-400 text-xs">
                    • Signed in as {user.email}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              onClick={() => setShowDocumentUpload(!showDocumentUpload)}
              className={`${showDocumentUpload ? 'btn-secondary' : 'btn-primary'} px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all flex items-center gap-1 sm:gap-2 group text-sm sm:text-base`}
            >
              {showDocumentUpload ? (
                <>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.001 8.001 0 01-7.025-4.09c-.203-.389-.155-.854.121-1.21L10.5 9.75l1.5-1.5L18 2.25l3-3-3 3z" />
                  </svg>
                  <span className="hidden sm:inline">Back to Chat</span>
                  <span className="sm:hidden">Back</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="hidden sm:inline">Upload Document</span>
                  <span className="sm:hidden">Upload</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="text-sm text-slate-300 hidden sm:block">
                  {getUsernameFromEmail(user.email || '')}
                </span>
              </div>
              <button
                onClick={signOut}
                className="btn-secondary px-4 py-2 rounded-lg text-sm transition-all"
                title="Sign out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0">
          {showDocumentUpload ? (
            <DocumentUpload onUploadComplete={handleUploadComplete} />
          ) : (
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              streamingContent={streamingContent}
            />
          )}
        </div>
      </div>
    </div>
  );
}
