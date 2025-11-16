'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Sidebar from '../../components/Sidebar';
import ChatInterface from '../../components/ChatInterface';
import DocumentUpload from '../../components/DocumentUpload';
import { Message, Document, Source, chatAPI, documentAPI, setAuthTokenGetter } from '../../services/api';

export default function ChatPage() {
  const { user, signOut, getToken } = useAuth();
  const router = useRouter();
  
  // Set up auth token getter for API calls
  useEffect(() => {
    setAuthTokenGetter(getToken);
  }, [getToken]);
  
  // Helper function to extract username from email
  const getUsernameFromEmail = (email: string) => {
    const username = email.split('@')[0];
    // Convert to readable format (capitalize first letter, replace dots/underscores with spaces)
    return username
      .replace(/[._]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [currentChatTitle, setCurrentChatTitle] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  // Don't render anything if user is not authenticated
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

  const handleNewChat = async () => {
    try {
      const newChat = await chatAPI.createSession();
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
      console.log('Loaded chat session:', session);
      console.log('Loaded chat messages:', chatMessages);
      
      // Set the chat title
      setCurrentChatTitle(session.title || '');
      
      // Auto-select documents from session context
      if (session.document_ids && session.document_ids.length > 0) {
        try {
          // Get all available documents
          const allDocuments = await documentAPI.listDocuments();
          // Filter to get only the documents that were used in this session
          const sessionDocuments = allDocuments.filter(doc => 
            session.document_ids?.includes(doc.file_id) || false
          );
          console.log('Auto-selecting documents for session:', sessionDocuments.length);
          setSelectedDocuments(sessionDocuments);
        } catch (error) {
          console.error('Error loading session documents:', error);
        }
      } else {
        // Clear document selection if session has no documents
        setSelectedDocuments([]);
      }
      
      // Ensure messages is always an array with valid message objects
      const validMessages = Array.isArray(chatMessages) 
        ? chatMessages.filter(msg => msg && msg.id && msg.content !== undefined)
        : [];
      
      setMessages(validMessages);
    } catch (error) {
      console.error('Error loading chat:', error);
      setMessages([]); // Set empty array on error
      setCurrentChatTitle('');
    }
  };

  const handleSendMessage = async (messageContent: string) => {
    let currentChatId = selectedChatId;
    
    // If no chat is selected, create a new one first
    if (!currentChatId) {
      try {
        const newChat = await chatAPI.createSession();
        currentChatId = newChat.session_id;
        setSelectedChatId(currentChatId);
        setMessages([]);
      } catch (error) {
        console.error('Error creating new chat:', error);
        return;
      }
    }

    // Add user message to UI immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      console.log('Sending message with integrated RAG and documents:', selectedDocuments);
      
      // Use the new integrated sendMessage method with selected document IDs
      const selectedDocumentIds = selectedDocuments.map(doc => doc.file_id);
      const result = await chatAPI.sendMessage(currentChatId, messageContent, selectedDocumentIds);
      
      console.log('Integrated message result:', result);
      
      // Check if this is the first user message and update session title
      const isFirstMessage = messages.length === 0;
      if (isFirstMessage && result.ragResponse) {
        try {
          console.log('First message - updating session title');
          const titleFromMessage = generateTitleFromMessage(messageContent);
          await chatAPI.updateSessionTitle(currentChatId, titleFromMessage);
          setCurrentChatTitle(titleFromMessage);
          console.log('Session title updated to:', titleFromMessage);
        } catch (titleError) {
          console.error('Failed to update session title:', titleError);
        }
      }
      
      // Add AI response to UI
      if (result.ragResponse) {
        const ragResponse = result.ragResponse as { response: string; sources?: Source[] };
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: ragResponse.response,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          sources: ragResponse.sources || []
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      } else if (result.aiMessage) {
        // Fallback response
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: result.aiMessage.content,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          sources: result.aiMessage.sources || []
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
      
    } catch (error) {
      console.error('Error in chat flow:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error. Please try again.',
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTitleFromMessage = (message: string): string => {
    // Remove extra whitespace and clean the message
    const cleanMessage = message.trim();
    
    // If message is short (under 50 chars), use it as is
    if (cleanMessage.length <= 50) {
      return cleanMessage;
    }
    
    // For longer messages, take first few words up to ~40 characters
    const words = cleanMessage.split(' ');
    let title = '';
    
    for (const word of words) {
      if ((title + ' ' + word).length > 40) {
        break;
      }
      title += (title ? ' ' : '') + word;
    }
    
    // Add ellipsis if we truncated
    if (title.length < cleanMessage.length) {
      title += '...';
    }
    
    return title || 'New Chat';
  };

  const handleDocumentUpload = async (file: File) => {
    try {
      await documentAPI.uploadPDF(file);
      // Process document through document API
      await documentAPI.uploadPDF(file);
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  const handleDocumentsSelect = async (documents: Document[]) => {
    setSelectedDocuments(documents);
    console.log('Selected documents:', documents);
    
    // Update session document context if a chat is selected
    if (selectedChatId && documents.length > 0) {
      try {
        const documentIds = documents.map(doc => doc.file_id);
        await chatAPI.updateSessionDocuments(selectedChatId, documentIds);
        console.log('Updated session documents:', documentIds);
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
          <div className="w-80 h-full" onClick={(e) => e.stopPropagation()}>
            <Sidebar
              onChatSelect={handleChatSelect}
              onNewChat={handleNewChat}
              selectedChatId={selectedChatId || undefined}
              onDocumentUpload={handleDocumentUpload}
              onDocumentsSelect={handleDocumentsSelect}
            />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          onChatSelect={handleChatSelect}
          onNewChat={handleNewChat}
          selectedChatId={selectedChatId || undefined}
          onDocumentUpload={handleDocumentUpload}
          onDocumentsSelect={handleDocumentsSelect}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              className="md:hidden btn-secondary p-3 rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h2 className="text-xl font-bold gradient-text">
                {selectedChatId ? (currentChatTitle || 'Chat Session') : 'RAG Chatbot'}
              </h2>
              <p className="text-slate-400 text-sm">
                {selectedChatId ? 'AI-powered document chat' : 'Welcome back, ' + getUsernameFromEmail(user.email || '')}
                {selectedDocuments.length > 0 && (
                  <span className="ml-2 text-blue-400">
                    • {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDocumentUpload(!showDocumentUpload)}
              className={`${showDocumentUpload ? 'btn-secondary' : 'btn-primary'} px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 group`}
            >
              {showDocumentUpload ? (
                <>
                  <svg className="w-5 h-5 icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.001 8.001 0 01-7.025-4.09c-.203-.389-.155-.854.121-1.21L10.5 9.75l1.5-1.5L18 2.25l3-3-3 3z" />
                  </svg>
                  Back to Chat
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Document
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
            <DocumentUpload onUploadComplete={() => setShowDocumentUpload(false)} />
          ) : (
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}