import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import type { Conversation } from '../types';

const Chat = () => {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white">
      <Sidebar 
        activeConversation={activeConversation} 
        setActiveConversation={setActiveConversation} 
      />
      <ChatWindow conversation={activeConversation} />
    </div>
  );
};

export default Chat;
