import React from 'react';
import Sidebar from '../../components/common/Sidebar';
import ChatList from '../../components/chat/ChatList';
import ChatWindow from '../../components/chat/ChatWindow';
import { ChatProvider } from '../../context/ChatContext';

const ChatPage = () => {
  return (
    <ChatProvider>
      <div className="app-layout">
        <Sidebar />
        <ChatList />
        <ChatWindow />
      </div>
    </ChatProvider>
  );
};

export default ChatPage;
