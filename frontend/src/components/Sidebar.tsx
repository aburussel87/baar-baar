import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, LogOut, MessageSquare, Users, X, Loader2, Settings } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { decryptMessageWithPrivateKey } from '../utils/crypto';
import type { Conversation, User } from '../types';

const DecryptedSnippet = ({ body, user }: { body: string; user: any }) => {
  const [decryptedBody, setDecryptedBody] = useState<string>('Decrypting...');

  React.useEffect(() => {
    let isMounted = true;
    const decrypt = async () => {
      if (body.startsWith('{"v":1')) {
        if (!user?.privateKey || !user?.publicKey) {
          if (isMounted) setDecryptedBody("[Encrypted Message]");
          return;
        }
        try {
          const decrypted = await decryptMessageWithPrivateKey(body, user.publicKey, user.privateKey);
          if (isMounted) setDecryptedBody(decrypted);
        } catch (e) {
          if (isMounted) setDecryptedBody("[Decryption Failed]");
        }
      } else {
        if (isMounted) setDecryptedBody(body);
      }
    };
    decrypt();
    return () => { isMounted = false; };
  }, [body, user]);

  return <>{decryptedBody}</>;
};

interface SidebarProps {
  activeConversation: Conversation | null;
  setActiveConversation: (c: Conversation | null) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeConversation, setActiveConversation }) => {
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  const [settingsName, setSettingsName] = useState(user?.name || '');
  //const [settingsAvatar, setSettingsAvatar] = useState(user?.avatar || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);

  const { data: conversationsData, isLoading: convLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get('/api/conversations');
      return res.data.data as Conversation[];
    },
  });

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['users', 'search', searchQuery],
    queryFn: async () => {
      if (!searchQuery) return [];
      const res = await api.get(`/api/users/search?q=${searchQuery}`);
      return res.data.data as User[];
    },
    enabled: searchQuery.length > 0,
  });

  const createConversation = useMutation({
    mutationFn: async (participantId: string) => {
      const res = await api.post('/api/conversations', { participantId });
      return res.data.data as Conversation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConversation(data);
      setSearchQuery('');
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post('/api/conversations/group', {
        name: groupName,
        participantIds: selectedUsers,
      });
      return res.data.data as Conversation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConversation(data);
      setShowGroupModal(false);
      setGroupName('');
      setSelectedUsers([]);
      setSearchQuery('');
    },
  });

  const handleStartChat = (participantId: string) => {
    createConversation.mutate(participantId);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');
    setSettingsLoading(true);
    try {
      //const res = await api.put('/api/users/profile', { name: settingsName, avatar: settingsAvatar });
      //updateUser(res.data.data);
      //setSettingsSuccess('Profile updated successfully');
    } catch (err: any) {
      setSettingsError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');
    setSettingsLoading(true);
    try {
      await api.put('/api/users/password', { currentPassword, newPassword });
      setSettingsSuccess('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      setSettingsError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="w-full md:w-80 border-r border-gray-200 bg-white flex flex-col h-full shrink-0 relative">
      {/* Header Profile */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setShowSettingsModal(true)}>
          <img src={user?.avatar} alt={user?.name} className="w-10 h-10 rounded-full bg-gray-200 hover:opacity-80 transition-opacity" />
          <div className="font-semibold text-gray-800 hover:text-blue-600 transition-colors">{user?.name}</div>
        </div>
        <div className="flex items-center space-x-1">
          <button onClick={() => setShowGroupModal(true)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Create Group">
            <Users className="w-5 h-5" />
          </button>
          <button onClick={() => setShowSettingsModal(true)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
          <button onClick={logout} className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Logout">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="absolute inset-0 z-30 bg-white flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
            <h2 className="font-semibold text-gray-800">Settings</h2>
            <button onClick={() => setShowSettingsModal(false)} className="p-1 text-gray-500 hover:bg-gray-200 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-6 flex-1">
            {settingsError && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{settingsError}</div>}
            {settingsSuccess && <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg">{settingsSuccess}</div>}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <h3 className="font-medium text-gray-800 border-b pb-2">Profile</h3>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Name</label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={e => setSettingsName(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              {/* <div>
                <label className="block text-xs text-gray-500 mb-1">Avatar URL</label>
                <input
                  type="url"
                  value={settingsAvatar}
                  onChange={e => setSettingsAvatar(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-blue-500 outline-none"
                />
              </div> */}
              <button disabled={settingsLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                Update Profile
              </button>
            </form>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <h3 className="font-medium text-gray-800 border-b pb-2">Change Password</h3>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:ring-blue-500 outline-none"
                  required
                  minLength={6}
                />
              </div>
              <button disabled={settingsLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
                Update Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Group Modal */}
      {showGroupModal && (
        <div className="absolute inset-0 z-20 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="font-semibold text-gray-800">Create Group Chat</h2>
            <button onClick={() => setShowGroupModal(false)} className="p-1 text-gray-500 hover:bg-gray-200 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 flex-1 flex flex-col overflow-hidden">
            <input
              type="text"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl mb-4 outline-none focus:border-blue-500 transition-colors"
            />
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search users to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-colors"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            
            <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl p-2">
              {searchLoading && <div className="text-center text-gray-400 text-sm py-4">Searching...</div>}
              {searchData?.map(u => (
                <div key={u.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={() => toggleUserSelection(u.id)}>
                  <div className="flex items-center space-x-3">
                    <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full" />
                    <span className="text-sm font-medium text-gray-800">{u.name}</span>
                  </div>
                  <input type="checkbox" checked={selectedUsers.includes(u.id)} readOnly className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                </div>
              ))}
              {!searchQuery && selectedUsers.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-4">Search to add participants</div>
              )}
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              disabled={selectedUsers.length < 2 || !groupName.trim() || createGroupMutation.isPending}
              onClick={() => createGroupMutation.mutate()}
              className="w-full py-2 bg-blue-600 text-white rounded-xl font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors flex justify-center items-center"
            >
              {createGroupMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Group'}
            </button>
            <p className="text-xs text-center text-gray-500 mt-2">Requires a name and at least 2 other people.</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm transition-all"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery && !showGroupModal ? (
          <div>
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Search Results</div>
            {searchLoading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Searching...</div>
            ) : searchData?.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">No users found</div>
            ) : (
              searchData?.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleStartChat(u.id)}
                  className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer transition-colors mx-2 rounded-xl"
                >
                  <div className="relative">
                    <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-full" />
                    {onlineUsers.includes(u.id) && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{u.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{u.email}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div>
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Conversations</div>
            {convLoading ? (
              <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>
            ) : conversationsData?.length === 0 ? (
              <div className="p-8 text-center text-gray-400 flex flex-col items-center">
                <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No conversations yet.<br/>Search users to start chatting!</p>
              </div>
            ) : (
              conversationsData?.map((conv) => {
                const isGroup = conv.isGroup;
                const otherParticipant = isGroup ? null : conv.participants.find(p => p.userId !== user?.id)?.user;
                if (!isGroup && !otherParticipant) return null;
                
                const isOnline = !isGroup && otherParticipant && onlineUsers.includes(otherParticipant.id);
                const lastMessage = conv.messages?.[0];
                const isActive = activeConversation?.id === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversation(conv)}
                    className={`flex items-center space-x-3 p-3 cursor-pointer transition-colors border-b border-gray-100 ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <div className="relative">
                      {isGroup ? (
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                          {conv.name?.charAt(0).toUpperCase() || 'G'}
                        </div>
                      ) : (
                        <img src={otherParticipant?.avatar} alt={otherParticipant?.name} className="w-12 h-12 rounded-full" />
                      )}
                      
                      {isOnline && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-medium text-gray-900 truncate">
                          {isGroup ? conv.name : otherParticipant?.name}
                        </h3>
                        {lastMessage && (
                          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                            {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p className={`text-sm truncate ${lastMessage?.status !== 'READ' && lastMessage?.senderId !== user?.id ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                        {lastMessage?.body ? <DecryptedSnippet body={lastMessage.body} user={user} /> : (isGroup ? 'Group created' : 'Started a conversation')}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
