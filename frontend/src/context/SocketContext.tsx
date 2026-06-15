import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: string[];
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (user) {
      const envUrl = import.meta.env.VITE_SOCKET_URL;
      const socketUrl = (envUrl && !envUrl.includes('localhost')) ? envUrl : `http://${window.location.hostname}:5001`;
      
      const newSocket = io(socketUrl, {
        query: {
          userId: user.id,
        },
      });

      setSocket(newSocket);
      socketRef.current = newSocket;

      newSocket.on('initial_online_users', (userIds: string[]) => {
        setOnlineUsers(userIds);
      });

      newSocket.on('user_online', (userId: string) => {
        setOnlineUsers((prev) => {
          if (!prev.includes(userId)) return [...prev, userId];
          return prev;
        });
      });

      newSocket.on('user_offline', (userId: string) => {
        setOnlineUsers((prev) => prev.filter((id) => id !== userId));
      });

      return () => {
        newSocket.close();
      };
    } else {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
        setSocket(null);
      }
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
