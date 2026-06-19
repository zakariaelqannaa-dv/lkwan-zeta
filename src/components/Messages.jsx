import { useNavigate, Link } from 'react-router-dom';
import { Send, Image as ImageIcon, Search, ChevronLeft, CheckCheck, Check, MessageCircle, Globe, X, UserPlus } from 'lucide-react';
import useMessaging from '../hooks/useMessaging';
import VerificationBadge from './VerificationBadge';

const Messages = ({ user }) => {
  const navigate = useNavigate();

  const {
    contacts, allConnections, selectedContact, setSelectedContact,
    messages, newMessage, setNewMessage,
    newImagePreview,
    loading, sending,
    searchQuery, setSearchQuery,
    showNewMessage, setShowNewMessage, newMsgSearch, setNewMsgSearch,
    messagesEndRef, imageInputRef, inputRef,
    fetchAllConnections,
    handleSendMessage, handleKeyDown,
    handleImageSelect, cancelImage,
    handleSelectContact, handleBack,
    filteredContacts,
  } = useMessaging(user);

  if (loading) return (
    <div className="h-screen flex items-center justify-center animate-pulse text-sm text-[#71767b]">
      Loading...
    </div>
  );

  return (
    <div className="flex h-screen-safe bg-black text-[#e7e9ea] overflow-hidden">
      {/* Sidebar */}
      <div className={`flex-col border-r border-[#2f3336] w-full sm:w-[320px] lg:w-[360px] bg-black ${selectedContact ? 'hidden sm:flex' : 'flex'}`}>
        <header className="shrink-0">
          <div className="flex items-center justify-between px-4 h-[53px] border-b border-[#2f3336]">
            <div className="flex items-center gap-1 sm:gap-0">
              <button type="button" onClick={() => navigate('/')} className="sm:hidden p-1.5 -ml-1.5 rounded-full hover:bg-[#16181c] transition text-[#e7e9ea]">
                <ChevronLeft size={20} />
              </button>
              <h2 className="text-xl font-bold">Messages</h2>
            </div>
            <div className="flex items-center gap-1">
              <Link to="/chat" className="sm:hidden flex items-center gap-1.5 p-2 hover:bg-[#16181c] rounded-full transition text-[#e7e9ea]">
                <Globe size={16} />
                <span className="text-xs font-medium">Chat</span>
              </Link>
              <button type="button" onClick={() => { setShowNewMessage(true); fetchAllConnections(); }}
                className="p-2 hover:bg-[#16181c] rounded-full transition text-[#e7e9ea]">
                <UserPlus size={18} />
              </button>
            </div>
          </div>

          <div className="p-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71767b]" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search messages..."
                className="w-full bg-transparent border border-[#2f3336] rounded-full pl-9 pr-3 py-2 text-sm outline-none focus:border-[#1d9bf0] transition-colors text-[#e7e9ea] placeholder-[#71767b]"
                style={{ fontSize: '16px' }} />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 && (
            <div className="p-8 text-center text-[#71767b] text-sm">No messages yet</div>
          )}
          {filteredContacts.map(contact => (
            <div key={contact.id} onClick={() => handleSelectContact(contact)}
              className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                selectedContact?.id === contact.id ? 'bg-[#16181c]' : 'hover:bg-[#080808]'
              }`}>
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-[#2f3336] overflow-hidden flex items-center justify-center text-sm font-bold text-[#71767b]">
                  {contact.avatar_url
                    ? <img src={contact.avatar_url} className="w-full h-full object-cover" alt={contact.username} />
                    : (contact.username || '?').charAt(0).toUpperCase()}
                </div>
                {contact.unreadCount > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#1d9bf0] rounded-full border-2 border-black flex items-center justify-center px-1">
                    <span className="text-[10px] text-white font-bold">{contact.unreadCount > 9 ? '9+' : contact.unreadCount}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm truncate ${contact.unreadCount > 0 ? 'font-bold text-[#e7e9ea]' : 'text-[#e7e9ea]'} inline-flex items-center gap-1`}>
                    {contact.display_name || contact.username}
                    <VerificationBadge user={contact} size="sm" />
                  </p>
                  {contact.lastMessage && (
                    <span className="text-[11px] text-[#71767b] ml-2 shrink-0">
                      {new Date(contact.lastMessage.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate ${contact.unreadCount > 0 ? 'text-[#e7e9ea] font-medium' : 'text-[#71767b]'}`}>
                  {contact.lastMessage?.image_url ? 'Photo' : contact.lastMessage?.content || 'Start a conversation'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${selectedContact ? 'flex' : 'hidden sm:flex'} bg-black`}>
        {selectedContact ? (
          <>
            <header className="sticky top-0 z-10 px-4 h-[53px] border-b border-[#2f3336] flex items-center justify-between bg-black shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={handleBack} className="p-1.5 -ml-1.5 rounded-full hover:bg-[#16181c] sm:hidden transition text-[#e7e9ea]">
                  <ChevronLeft size={20} />
                </button>
                <div className="w-8 h-8 rounded-full bg-[#2f3336] overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-[#71767b]">
                  {selectedContact.avatar_url
                    ? <img src={selectedContact.avatar_url} className="w-full h-full object-cover" alt={selectedContact.username} />
                    : (selectedContact.username || '?').charAt(0).toUpperCase()}
                </div>
                <h3 className="font-bold text-sm text-[#e7e9ea] inline-flex items-center gap-1">
                  {selectedContact.display_name || selectedContact.username}
                  <VerificationBadge user={selectedContact} size="sm" />
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={handleBack}
                  className="p-1.5 rounded-full hover:bg-[#16181c] text-[#71767b] transition" title="Exit chat">
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 pb-[60px] sm:pb-4">
              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === user.id;
                const nextMsg = messages[idx + 1];
                const nextIsMe = nextMsg?.sender_id === msg.sender_id;
                const isTemp = msg.id?.toString().startsWith('temp-');
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${!nextIsMe ? 'mb-3' : 'mb-0.5'}`}>
                    <div className={`flex items-end gap-2 max-w-[85%] sm:max-w-[70%] min-w-0 ${isMe ? 'flex-row-reverse' : ''}`}>
                      {!isMe && !nextIsMe && (
                        <div className="w-5 h-5 rounded-full bg-[#2f3336] overflow-hidden shrink-0 flex items-center justify-center text-[8px] font-bold text-[#71767b]">
                          {selectedContact.avatar_url
                            ? <img src={selectedContact.avatar_url} className="w-full h-full object-cover" alt={selectedContact?.username || 'Avatar'} />
                            : (selectedContact.username || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      {!isMe && nextIsMe && <div className="w-5 h-5 shrink-0" />}
                      <div className={`px-3 py-2 text-sm leading-snug ${
                        isMe
                          ? `bg-[#1d9bf0] text-white rounded-[18px] ${!nextIsMe ? 'rounded-br-md' : ''} ${isTemp ? 'opacity-60' : ''}`
                          : `bg-[#16181c] text-[#e7e9ea] rounded-[18px] ${!nextIsMe ? 'rounded-bl-md' : ''}`
                      }`}>
                        {msg.image_url && (
                          <div className="mb-1.5 rounded-xl overflow-hidden -mt-0.5 -mx-0.5">
                            <img src={msg.image_url} alt="Shared" className="w-full max-h-64 object-cover rounded-xl" />
                          </div>
                        )}
                        {msg.content && <span className="break-words">{msg.content}</span>}
                      </div>
                      {isMe && !nextIsMe && (
                        <div className="text-[10px] text-[#71767b] mt-1 flex items-center gap-0.5">
                          {isTemp ? <span className="animate-pulse">...</span>
                            : msg.is_read ? <CheckCheck size={14} className="text-[#1d9bf0]" />
                            : <Check size={14} />}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {newImagePreview && (
                <div className="flex justify-end mb-3">
                  <div className="bg-[#16181c] rounded-[18px] rounded-br-md px-3 py-2 max-w-[70%]">
                    <div className="relative inline-block">
                      <img src={newImagePreview} alt="Preview" className="h-24 rounded-lg object-cover" />
                      <button type="button" onClick={cancelImage}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-[#f91880] text-white rounded-full flex items-center justify-center hover:bg-[#c4156a] transition text-xs">
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <footer className="bg-black border-t border-[#2f3336] px-3 py-3 fixed bottom-0 left-0 right-0 z-20 sm:static sm:z-auto"
              style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => imageInputRef.current?.click()}
                  className="p-2 rounded-full hover:bg-[#16181c] text-[#71767b] transition shrink-0">
                  <ImageIcon size={18} />
                </button>
                <div className="flex-1 relative min-w-0">
                  <input ref={inputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown} placeholder="Send a message..."
                    className="w-full bg-transparent border border-[#2f3336] rounded-full pl-4 pr-10 py-2 text-sm outline-none focus:border-[#1d9bf0] transition-colors text-[#e7e9ea] placeholder-[#71767b]"
                    autoComplete="off" inputMode="text" enterKeyHint="send" style={{ fontSize: '16px' }} />
                  {newMessage.length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#71767b]">
                      {newMessage.length}
                    </div>
                  )}
                </div>
                {(newMessage.trim() || newImagePreview) && (
                  <button onClick={handleSendMessage} disabled={sending}
                    className="p-2 rounded-full bg-[#1d9bf0] text-white disabled:opacity-40 transition shrink-0">
                    <Send size={18} />
                  </button>
                )}
              </div>
            </footer>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <MessageCircle size={36} className="text-[#2f3336] mb-4" strokeWidth={1.5} />
            <h3 className="text-xl font-bold mb-1">Your Messages</h3>
            <p className="text-sm text-[#71767b] max-w-sm mb-6">
              Send private messages to your friends and connections.
            </p>
            <button type="button" onClick={() => { setShowNewMessage(true); fetchAllConnections(); }}
              className="bg-[#e7e9ea] text-black px-5 py-2 rounded-full font-bold text-sm hover:bg-[#d6d9db] transition">
              New Message
            </button>
          </div>
        )}
      </div>

      {showNewMessage && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-black border border-[#2f3336] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 h-[53px] border-b border-[#2f3336]">
              <button type="button" onClick={() => { setShowNewMessage(false); setNewMsgSearch(''); }}
                className="p-1.5 rounded-full hover:bg-[#16181c] text-[#71767b]">
                <X size={20} />
              </button>
              <h3 className="font-bold text-[#e7e9ea]">New Message</h3>
              <div className="w-8" />
            </div>
            <div className="px-4 py-3 border-b border-[#2f3336]">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71767b]" />
                <input type="text" value={newMsgSearch} onChange={(e) => setNewMsgSearch(e.target.value)}
                  placeholder="Search people..."
                  className="w-full bg-transparent border border-[#2f3336] rounded-full pl-9 pr-3 py-2 text-sm outline-none focus:border-[#1d9bf0] transition-colors text-[#e7e9ea] placeholder-[#71767b]"
                  style={{ fontSize: '16px' }} autoFocus />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {allConnections.filter(c => !newMsgSearch || (c.display_name || c.username || '').toLowerCase().includes(newMsgSearch.toLowerCase()))
                .map(conn => (
                  <button key={conn.id} type="button" onClick={() => { handleSelectContact(conn); setShowNewMessage(false); setNewMsgSearch(''); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#080808] transition text-left">
                    <div className="w-10 h-10 rounded-full bg-[#2f3336] overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold text-[#71767b]">
                      {conn.avatar_url ? <img src={conn.avatar_url} className="w-full h-full object-cover" alt={conn.username} />
                        : (conn.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-[#e7e9ea] truncate inline-flex items-center gap-1">
                        {conn.display_name || conn.username}<VerificationBadge user={conn} size="sm" />
                      </p>
                      <p className="text-xs text-[#71767b] truncate">@{conn.username}</p>
                    </div>
                  </button>
                ))}
              {allConnections.filter(c => !newMsgSearch || (c.display_name || c.username || '').toLowerCase().includes(newMsgSearch.toLowerCase())).length === 0 && (
                <div className="p-8 text-center text-[#71767b] text-sm">
                  {newMsgSearch ? 'No matching people found' : 'No connections yet. Follow people to message them!'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
    </div>
  );
};

export default Messages;
