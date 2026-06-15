import React, { useState, useEffect, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Check, CheckCheck, Loader2, ArrowLeft, Lock, MoreVertical, Trash2, UserMinus } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { encryptMessageForParticipants, decryptMessageWithPrivateKey } from '../utils/crypto';
import type { Conversation, Message } from '../types';

interface ChatWindowProps {
  conversation: Conversation | null;
  onBack?: () => void;
}

const MessageBubble = ({ 
  msg, 
  isMine, 
  showAvatar, 
  conversation, 
  otherParticipant, 
  user 
}: any) => {
  const [decryptedBody, setDecryptedBody] = useState<string>('Decrypting...');

  useEffect(() => {
    let isMounted = true;
    const decrypt = async () => {
      // Only attempt decryption if it looks like our JSON payload
      if (msg.body.startsWith('{"v":1')) {
        if (!user?.privateKey || !user?.publicKey) {
          if (isMounted) setDecryptedBody("[Encrypted Message]");
          return;
        }
        try {
          const decrypted = await decryptMessageWithPrivateKey(msg.body, user.publicKey, user.privateKey);
          if (isMounted) setDecryptedBody(decrypted);
        } catch (e) {
          if (isMounted) setDecryptedBody("[Decryption Failed]");
        }
      } else {
        // Plain text message (legacy or not encrypted)
        if (isMounted) setDecryptedBody(msg.body);
      }
    };
    decrypt();
    return () => { isMounted = false; };
  }, [msg.body, user]);

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex max-w-[70%] ${isMine ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
        
        {!isMine && showAvatar ? (
            <img src={msg.sender?.avatar || otherParticipant?.avatar} alt="" className="w-8 h-8 rounded-full shadow-sm mb-1" />
        ) : !isMine && !showAvatar ? (
            <div className="w-8" />
        ) : null}

        <div className="flex flex-col">
          {!isMine && showAvatar && conversation.isGroup && (
            <span className="text-xs text-gray-500 ml-1 mb-1">{msg.sender?.name}</span>
          )}
          <div
            className={`relative px-4 py-2 rounded-2xl shadow-sm ${
              isMine 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'
            }`}
          >
          <p className="text-[15px] leading-relaxed break-words">{decryptedBody}</p>
          <div className={`flex items-center justify-end gap-1 mt-1 ${isMine ? 'text-blue-100' : 'text-gray-400'}`}>
            <span className="text-[10px] uppercase">
              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isMine && (
              <span>
                {msg.status === 'READ' ? (
                  <CheckCheck className="w-3.5 h-3.5 text-blue-200" />
                ) : msg.status === 'DELIVERED' ? (
                  <CheckCheck className="w-3.5 h-3.5" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </span>
            )}
          </div>
        </div>
        </div>

      </div>
    </div>
  );
};

const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, onBack }) => {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const otherParticipant = conversation?.participants.find((p) => p.userId !== user?.id)?.user;
  const isOnline = otherParticipant && onlineUsers.includes(otherParticipant.id);

  const clearChatMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/conversations/${conversation?.id}/clear`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversation?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setShowMenu(false);
    }
  });

  const leaveGroupMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/api/conversations/${conversation?.id}/leave`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (onBack) onBack();
      setShowMenu(false);
    }
  });

  const { 
    data: messagesData, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ['messages', conversation?.id],
    queryFn: async ({ pageParam }) => {
      if (!conversation?.id) return { data: [], hasMore: false };
      const url = pageParam 
        ? `/api/messages/${conversation.id}?cursor=${pageParam}`
        : `/api/messages/${conversation.id}`;
      const res = await api.get(url);
      return res.data;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore && lastPage.data.length > 0) {
        return lastPage.data[0].id;
      }
      return undefined;
    },
    enabled: !!conversation?.id,
  });

  const messages = messagesData ? messagesData.pages.flatMap(page => page.data) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUser]);

  useEffect(() => {
    if (!socket || !conversation || !otherParticipant) return;

    const handleReceiveMessage = (msg: Message) => {
      if (msg.conversationId === conversation.id) {
        queryClient.setQueryData(['messages', conversation.id], (oldData: any) => {
          if (!oldData) return { pages: [{ data: [msg], hasMore: false }], pageParams: [undefined] };
          
          const newPages = [...oldData.pages];
          const lastPageIndex = newPages.length - 1;
          
          const exists = newPages.some(page => page.data.some((m: Message) => m.id === msg.id));
          if (exists) return oldData;
          
          newPages[lastPageIndex] = {
            ...newPages[lastPageIndex],
            data: [...newPages[lastPageIndex].data, msg]
          };
          
          return { ...oldData, pages: newPages };
        });

        // Mark as read if window is active
        if (msg.senderId !== user?.id) {
          socket.emit('message_read', {
            messageId: msg.id,
            conversationId: conversation.id,
            senderId: msg.senderId,
            receiverId: user?.id
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    };

    const handleTyping = (data: { conversationId: string, senderId: string }) => {
      if (data.conversationId === conversation.id && data.senderId !== user?.id) {
        setTypingUser(data.senderId);
      }
    };

    const handleStopTyping = (data: { conversationId: string, senderId: string }) => {
      if (data.conversationId === conversation.id && data.senderId !== user?.id) {
        setTypingUser(null);
      }
    };

    const handleMessageRead = (data: { messageId: string, conversationId: string }) => {
      if (data.conversationId === conversation.id) {
        queryClient.setQueryData(['messages', conversation.id], (oldData: any) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              data: page.data.map((m: Message) => m.id === data.messageId ? { ...m, status: 'READ' } : m)
            }))
          };
        });
      }
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);
    socket.on('message_read', handleMessageRead);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      socket.off('message_read', handleMessageRead);
    };
  }, [socket, conversation, queryClient, otherParticipant, user]);

  const sendMessageMutation = useMutation({
    mutationFn: async (body: string) => {
      const res = await api.post('/api/messages', {
        conversationId: conversation?.id,
        body,
      });
      return res.data.data as Message;
    },
    onSuccess: (newMsg) => {
      queryClient.setQueryData(['messages', conversation?.id], (oldData: any) => {
        if (!oldData) return { pages: [{ data: [newMsg], hasMore: false }], pageParams: [undefined] };
        
        const newPages = [...oldData.pages];
        const lastPageIndex = newPages.length - 1;
        newPages[lastPageIndex] = {
          ...newPages[lastPageIndex],
          data: [...newPages[lastPageIndex].data, newMsg]
        };
        return { ...oldData, pages: newPages };
      });
      
      if (socket && otherParticipant && conversation) {
        // Find all other participant IDs to notify them via socket
        const participantIds = conversation.participants
          .filter(p => p.userId !== user?.id)
          .map(p => p.userId);

        socket.emit('send_message', {
          message: newMsg,
          participantIds
        });
        socket.emit('stop_typing', {
          conversationId: conversation.id,
          senderId: user?.id,
          receiverId: otherParticipant.id
        });
      }
      
      setNewMessage('');
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversation) return;
    
    let bodyToSend = newMessage;

    // Encrypt the message using E2EE
    if (user?.publicKey) {
      // Gather all public keys including sender's
      const publicKeys = conversation.participants
        .map(p => p.user.publicKey)
        .filter(Boolean) as string[];

      if (!publicKeys.includes(user.publicKey)) {
        publicKeys.push(user.publicKey);
      }

      if (publicKeys.length > 0) {
        try {
          bodyToSend = await encryptMessageForParticipants(newMessage, publicKeys);
        } catch (error) {
          console.error("Encryption failed, sending as plain text", error);
        }
      }
    }

    sendMessageMutation.mutate(bodyToSend);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!isTyping && socket && otherParticipant && conversation) {
      setIsTyping(true);
      socket.emit('typing', {
        conversationId: conversation.id,
        senderId: user?.id,
        receiverId: otherParticipant.id
      });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (socket && otherParticipant && conversation) {
        socket.emit('stop_typing', {
          conversationId: conversation.id,
          senderId: user?.id,
          receiverId: otherParticipant.id
        });
      }
    }, 2000);
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/50">
        <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mb-4">
          <Send className="w-10 h-10 text-blue-500 ml-1" />
        </div>
        <h2 className="text-xl font-semibold text-gray-700">Your Messages</h2>
        <p className="text-gray-500 mt-2">Select a conversation or search for a user to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#E5E7EB] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative">
      {/* Header */}
      <div className="h-16 px-4 md:px-6 bg-white/90 backdrop-blur border-b border-gray-200 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-3">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="relative">
            {conversation.isGroup ? (
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                {conversation.name?.charAt(0).toUpperCase() || 'G'}
              </div>
            ) : (
              <img src={otherParticipant?.avatar} alt={otherParticipant?.name} className="w-10 h-10 rounded-full" />
            )}
            {isOnline && !conversation.isGroup && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          <div>
            <h2 className="font-semibold text-gray-800 flex items-center gap-1">
              {conversation.isGroup ? conversation.name : otherParticipant?.name}
            </h2>
            <p className="text-xs text-gray-500">
              {conversation.isGroup ? `${conversation.participants.length} members` : (isOnline ? 'Online' : 'Offline')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center text-xs text-gray-400" title="End-to-End Encrypted">
            <Lock className="w-3.5 h-3.5 mr-1" /> E2EE
          </div>

          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                <button 
                  onClick={() => clearChatMutation.mutate()}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4 text-gray-400" /> Clear Chat
                </button>
                {conversation.isGroup && (
                  <button 
                    onClick={() => leaveGroupMutation.mutate()}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <UserMinus className="w-4 h-4" /> Leave Group
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <>
            {hasNextPage && (
              <div className="flex justify-center my-4">
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="px-4 py-2 bg-white rounded-full text-sm font-medium text-blue-600 shadow-sm border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load older messages'}
                </button>
              </div>
            )}
            {messages?.map((msg, index) => {
              const isMine = msg.senderId === user?.id;
              const showAvatar = !isMine && (index === 0 || messages[index - 1].senderId !== msg.senderId);

              return (
                <MessageBubble 
                  key={msg.id} 
                  msg={msg} 
                  isMine={isMine} 
                  showAvatar={showAvatar} 
                  conversation={conversation}
                  otherParticipant={otherParticipant}
                  user={user}
                />
              );
            })}
          </>
        )}
        
        {typingUser && (
          <div className="flex items-center space-x-2 text-gray-500 text-sm italic ml-12">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{conversation.isGroup ? 'Someone' : otherParticipant?.name} is typing...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white/90 backdrop-blur border-t border-gray-200">
        <form onSubmit={handleSend} className="flex items-end gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 px-4 py-3 bg-gray-100 border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5 ml-0.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
