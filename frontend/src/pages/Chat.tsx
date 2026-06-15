import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import type { Conversation } from '../types';

const Chat = () => {
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  return (
    <div className="h-screen w-full flex overflow-hidden bg-white">
      <div className={`w-full md:w-80 md:flex flex-shrink-0 ${activeConversation ? 'hidden' : 'flex'}`}>
        <Sidebar 
          activeConversation={activeConversation} 
          setActiveConversation={setActiveConversation} 
        />
      </div>
      <div className={`flex-1 min-w-0 md:flex ${activeConversation ? 'flex' : 'hidden'}`}>
        <ChatWindow 
          conversation={activeConversation} 
          onBack={() => setActiveConversation(null)} 
        />
      </div>
    </div>
  );
};

export default Chat;
