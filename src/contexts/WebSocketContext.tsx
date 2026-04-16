'use client';

import React, { createContext, useContext } from 'react';

interface WebSocketContextType {
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({ isConnected: false });

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // WebSocket support is not yet implemented.
  // This provider is a placeholder for future real-time features.
  return (
    <WebSocketContext.Provider value={{ isConnected: false }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export default WebSocketContext;
