const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || (
  process.env.NODE_ENV === 'production' 
    ? 'https://your-vercel-app.vercel.app/api'  // Replace with your actual Vercel domain
    : 'http://localhost:8000'
);

console.log('API Base URL:', API_BASE_URL);

// Global auth token getter - will be set by the app
let getAuthToken: (() => Promise<string | null>) | null = null;

export const setAuthTokenGetter = (tokenGetter: () => Promise<string | null>) => {
  getAuthToken = tokenGetter;
};

// Helper function to create authenticated headers
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  try {
    if (getAuthToken) {
      const token = await getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🔐 Using authentication token');
      } else {
        console.log('⚠️ No authentication token available');
      }
    } else {
      console.log('⚠️ No auth token getter configured, using unauthenticated request');
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
    // Continue with request even if auth fails
  }
  
  return headers;
};

export interface Document {
  file_id: string;
  filename: string;
  file_type: string;
  size_bytes: number;
  upload_time: string;
}

export interface Chat {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  message_count?: number;
  document_ids?: string[];
  last_used_documents?: string[];
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  sources?: Source[];
}

export interface Source {
  chunk_id: string;
  text: string;
  similarity_score: number;
  metadata: {
    filename: string;
    page?: number;
    chunk_index: number;
  };
}

export interface SearchResponse {
  response: string;  // Changed from 'answer' to 'response' to match backend
  sources: Source[];
  metadata?: {
    query: string;
    total_chunks_found: number;
    processing_time: number;
  };
  model_used?: string;
  timestamp?: string;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  query?: string;
}

// Document Management API (User-Isolated)
export const documentAPI = {
  uploadPDF: async (file: File): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Get auth headers but exclude Content-Type for FormData
    const authHeaders = await getAuthHeaders();
    const headers: Record<string, string> = {};
    if (authHeaders['Authorization']) {
      headers['Authorization'] = authHeaders['Authorization'];
    }
    
    const response = await fetch(`${API_BASE_URL}/rag/process-document`, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to upload document: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    // Convert the RAG response to Document format
    return {
      file_id: result.document_id || '',
      filename: file.name,
      file_type: 'pdf',
      size_bytes: file.size,
      upload_time: new Date().toISOString()
    };
  },

  listDocuments: async (): Promise<Document[]> => {
    try {
      console.log('Fetching user documents from:', `${API_BASE_URL}/documents/list`);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/documents/list`, { headers });
      console.log('Documents response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('List documents error:', errorText);
        throw new Error(`Failed to fetch documents: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('User documents result:', result);
      
      // Backend returns { documents: [...], total: number }
      if (result && result.documents && Array.isArray(result.documents)) {
        console.log('User documents found:', result.documents.length);
        return result.documents.map((doc: {
          file_id?: string;
          filename: string;
          size_bytes: number;
          uploaded_at: number;
        }) => ({
          file_id: doc.file_id || '',
          filename: doc.filename,
          file_type: 'pdf',
          size_bytes: doc.size_bytes,
          upload_time: new Date(doc.uploaded_at * 1000).toISOString() // Convert from timestamp
        }));
      } else {
        console.log('No user documents found, returning empty array');
        return [];
      }
    } catch (error) {
      console.error('Error in listDocuments:', error);
      return []; // Return empty array on error
    }
  },

  deleteDocument: async (documentId: string): Promise<void> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/documents/delete/${documentId}`, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete document: ${response.status} - ${errorText}`);
    }
  },
};

// RAG Pipeline API (User-Isolated)
export const ragAPI = {
  processDocument: async (file: File): Promise<Document> => {
    // This is now handled by documentAPI.uploadPDF
    return documentAPI.uploadPDF(file);
  },

  search: async (query: string, documentIds?: string[], topK: number = 5) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/rag/search`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        document_ids: documentIds,
        top_k: topK,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to search: ${response.status} - ${errorText}`);
    }
    return response.json();
  },

  searchLLM: async (query: string, documentIds?: string[], topK: number = 5): Promise<SearchResponse> => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/rag/search-llm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query,
        document_ids: documentIds,
        top_k: topK,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to search with LLM: ${response.status} - ${errorText}`);
    }
    return response.json();
  },

  health: async (): Promise<{ status: string; message?: string }> => {
    const response = await fetch(`${API_BASE_URL}/rag/health`);
    if (!response.ok) throw new Error('RAG health check failed');
    return response.json();
  },
};

// Chat Session API (User-Isolated via Local Storage)
export const chatAPI = {
  createSession: async (title?: string): Promise<Chat> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ title: title || 'New Chat' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create session: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const sessionData = await response.json();
      
      // Convert API response to Chat interface format
      const newSession: Chat = {
        session_id: sessionData.session_id,
        title: sessionData.title,
        created_at: sessionData.created_at,
        updated_at: sessionData.updated_at,
        is_active: sessionData.is_active,
        message_count: sessionData.message_count
      };
      
      console.log('Created new session:', newSession);
      return newSession;
    } catch (error) {
      console.error('Error in createSession:', error);
      throw error;
    }
  },

  getSessions: async (): Promise<Chat[]> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/chat/sessions`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to get sessions: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const sessions = await response.json();
      
      // Convert API response to Chat interface format
      const chatSessions: Chat[] = sessions.map((session: { session_id: string; title: string; created_at: string; updated_at: string; is_active: boolean; message_count: number }) => ({
        session_id: session.session_id,
        title: session.title,
        created_at: session.created_at,
        updated_at: session.updated_at,
        is_active: session.is_active,
        message_count: session.message_count
      }));
      
      console.log('Retrieved sessions:', chatSessions);
      return chatSessions;
    } catch (error) {
      console.error('Error getting sessions:', error);
      // Return empty array as fallback
      return [];
    }
  },

  getSession: async (sessionId: string): Promise<{ session: Chat; messages: Message[] }> => {
    try {
      console.log('Fetching session:', sessionId);
      
      const headers = await getAuthHeaders();
      
      // Get session details
      const sessions = await chatAPI.getSessions();
      const session = sessions.find(s => s.session_id === sessionId);
      
      if (!session) {
        throw new Error('Session not found');
      }

      // Get messages for session
      const messagesResponse = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
        method: 'GET',
        headers,
      });

      let messages: Message[] = [];
      if (messagesResponse.ok) {
        const sessionData = await messagesResponse.json();
        messages = sessionData.messages.map((msg: { id: number; type: string; content: string; timestamp: string; sources?: Source[] }) => ({
          id: msg.id.toString(),
          role: msg.type as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.timestamp,
          sources: msg.sources || []
        }));
      }
      
      return { session, messages };
    } catch (error) {
      console.error('Error fetching session:', error);
      throw error;
    }
  },

  sendMessage: async (sessionId: string, message: string, documentIds?: string[]): Promise<{ userMessage: Message; aiMessage: Message; ragResponse?: unknown; error?: string }> => {
    try {
      const headers = await getAuthHeaders();
      
      // First, add the user message to the session
      const userMessageResponse = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ content: message, message_type: 'user' }),
      });

      if (!userMessageResponse.ok) {
        const errorData = await userMessageResponse.json();
        throw new Error(`Failed to send user message: ${userMessageResponse.status} - ${JSON.stringify(errorData)}`);
      }

      const userMessage = await userMessageResponse.json();
      console.log('User message added:', userMessage);

      // Then, generate AI response using RAG
      try {
        const ragResponse = await ragAPI.searchLLM(message, documentIds);
        
        // Add the AI response to the session
        const aiMessageResponse = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            content: ragResponse.response, 
            message_type: 'assistant',
            sources: ragResponse.sources 
          }),
        });

        if (!aiMessageResponse.ok) {
          console.error('Failed to add AI response to session');
        }

        const aiMessage = await aiMessageResponse.json();
        console.log('AI response added:', aiMessage);

        return {
          userMessage,
          aiMessage,
          ragResponse
        };
      } catch (ragError) {
        console.error('RAG error, falling back to simple response:', ragError);
        
        // Fallback to a simple response if RAG fails
        const fallbackResponse = `I apologize, but I'm having trouble accessing my knowledge base right now. Could you please try again?`;
        
        const fallbackMessageResponse = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            content: fallbackResponse, 
            message_type: 'assistant'
          }),
        });

        const fallbackMessage = fallbackMessageResponse.ok ? await fallbackMessageResponse.json() : null;

        return {
          userMessage,
          aiMessage: fallbackMessage,
          error: ragError?.toString()
        };
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to delete session: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      console.log('Session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  },

  updateSessionTitle: async (sessionId: string, title: string): Promise<void> => {
    try {
      console.log('Updating session title:', sessionId, title);
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/title`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to update session title: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      console.log('Session title updated successfully');
    } catch (error) {
      console.error('Error in updateSessionTitle:', error);
      throw error;
    }
  },

  updateSessionDocuments: async (sessionId: string, documentIds: string[]): Promise<void> => {
    // This can be implemented later when we have proper session-document association
    console.log('Update session documents:', sessionId, documentIds);
  },

  // Legacy method for compatibility - now uses the backend
  addMessage: async (sessionId: string, message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
    try {
      console.log('Adding message to session:', sessionId, message);
      
      if (message.role === 'user') {
        // Send user message and get AI response
        await chatAPI.sendMessage(sessionId, message.content);
        
        // Return the user message (the AI response is automatically added by the backend)
        return {
          id: `msg_${Date.now()}_user`,
          content: message.content,
          role: 'user',
          timestamp: new Date().toISOString(),
          sources: []
        };
      } else {
        // For assistant messages, just create a mock response since they're handled by sendMessage
        return {
          id: `msg_${Date.now()}_assistant`,
          content: message.content,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          sources: message.sources || []
        };
      }
    } catch (error) {
      console.error('Error in addMessage:', error);
      throw error;
    }
  }
};