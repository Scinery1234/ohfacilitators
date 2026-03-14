import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  getConversations,
  getConversation,
  sendMessage,
  startDm,
  startContact,
  markAsRead,
} from '@/api/messages';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const isThisYear = d.getFullYear() === now.getFullYear();
  if (isToday) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (isThisYear) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const composeFromState = location.state?.compose;
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const messagesEndRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    getConversations()
      .then((data) => {
        setConversations(data.conversations || []);
        if (composeFromState && data.conversations?.length > 0) {
          const existing = data.conversations.find(
            (c) =>
              c.otherUser?.id === (composeFromState.otherUserId || composeFromState.recipientUserId)
          );
          if (existing) setSelectedId(existing.id);
        }
      })
      .catch(() => setConversations([]))
      .finally(() => setLoading(false));
  }, [user, composeFromState]);

  useEffect(() => {
    if (!selectedId || !user) return;
    getConversation(selectedId)
      .then((data) => {
        setThread(data);
        markAsRead(selectedId).catch(() => {});
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedId ? { ...c, unreadCount: 0 } : c
          )
        );
      })
      .catch(() => setThread(null));
  }, [selectedId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages]);

  const handleSend = async () => {
    if (!composeMessage.trim() || sending) return;
    setComposeError('');
    setSending(true);
    try {
      if (composeFromState) {
        const isDm = composeFromState.type === 'dm';
        const firstMessage = composeMessage.trim();
        if (isDm) {
          const { conversation, message } = await startDm(
            composeFromState.otherUserId,
            firstMessage
          );
          setConversations((prev) => {
            const updated = prev.filter((c) => c.id !== conversation.id);
            return [
              {
                id: conversation.id,
                type: 'dm',
                otherUser: { id: composeFromState.otherUserId, fullName: composeFromState.otherUserName || 'User' },
                lastMessage: { content: firstMessage, createdAt: message.createdAt, senderId: user.id },
                unreadCount: 0,
                updatedAt: message.createdAt,
              },
              ...updated,
            ];
          });
          setSelectedId(conversation.id);
          setThread({
            conversation: { id: conversation.id, type: 'dm' },
            otherUser: { id: composeFromState.otherUserId, fullName: composeFromState.otherUserName || 'User' },
            messages: [message],
          });
        } else {
          const { conversation, message } = await startContact({
            recipientUserId: composeFromState.recipientUserId,
            contextType: composeFromState.contextType || null,
            contextId: composeFromState.contextId || null,
            contextTitle: composeFromState.contextTitle || null,
            firstMessage,
          });
          setConversations((prev) => {
            const updated = prev.filter((c) => c.id !== conversation.id);
            return [
              {
                id: conversation.id,
                type: 'contact',
                contextTitle: composeFromState.contextTitle,
                otherUser: { id: composeFromState.recipientUserId, fullName: composeFromState.recipientUserName || 'Host' },
                lastMessage: { content: firstMessage, createdAt: message.createdAt, senderId: user.id },
                unreadCount: 0,
                updatedAt: message.createdAt,
              },
              ...updated,
            ];
          });
          setSelectedId(conversation.id);
          setThread({
            conversation: { id: conversation.id, type: 'contact' },
            otherUser: { id: composeFromState.recipientUserId, fullName: composeFromState.recipientUserName || 'Host' },
            messages: [message],
          });
        }
        setComposeMessage('');
        navigate('/messages', { replace: true, state: {} });
      } else if (selectedId) {
        const { message } = await sendMessage(selectedId, composeMessage.trim());
        setThread((prev) =>
          prev ? { ...prev, messages: [...(prev.messages || []), message] } : prev
        );
        setComposeMessage('');
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedId
              ? {
                  ...c,
                  lastMessage: { content: message.content, createdAt: message.createdAt, senderId: user.id },
                  updatedAt: message.createdAt,
                }
              : c
          )
        );
      }
    } catch (err) {
      setComposeError(err?.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const totalUnread = conversations.reduce((s, c) => s + (c.unreadCount || 0), 0);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-stone-600">Sign in to view your messages.</p>
        <Link to="/login" state={{ from: '/messages' }}>
          <Button variant="primary" className="mt-4">Log in</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-2xl font-display font-semibold text-stone-900 tracking-tight">Messages</h1>
      <p className="mt-1 text-stone-600">Your conversations and contact inquiries</p>

      {loading ? (
        <div className="mt-8 animate-pulse space-y-4">
          <div className="h-20 bg-stone-100 rounded-xl" />
          <div className="h-20 bg-stone-100 rounded-xl" />
          <div className="h-20 bg-stone-100 rounded-xl" />
        </div>
      ) : (
        <div className="mt-8 flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Conversation list */}
          <div
            ref={listRef}
            className="w-full lg:w-80 xl:w-96 shrink-0 flex flex-col border border-stone-200 rounded-2xl bg-white overflow-hidden"
          >
            {composeFromState ? (
              <div className="p-4 border-b border-stone-200 bg-stone-50">
                <p className="text-sm font-medium text-stone-900">New message</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {composeFromState.type === 'dm'
                    ? `To ${composeFromState.otherUserName || 'community member'}`
                    : `Contact about ${composeFromState.contextTitle || 'inquiry'}`}
                </p>
              </div>
            ) : null}
            {conversations.length === 0 && !composeFromState ? (
              <div className="p-8 text-center text-stone-500">
                <p className="font-medium text-stone-700">No conversations yet</p>
                <p className="text-sm mt-2">
                  Message community members from event attendee lists, or contact hosts from event and venue pages.
                </p>
                <Link to="/explore" className="mt-4 inline-block">
                  <Button variant="secondary" className="text-sm">Browse events</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[400px] lg:max-h-[500px]">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                      navigate('/messages', { replace: true, state: {} });
                    }}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0 ${
                      selectedId === c.id ? 'bg-stone-100' : ''
                    }`}
                  >
                    <div className="shrink-0">
                      {c.otherUser?.avatarUrl ? (
                        <img
                          src={c.otherUser.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-stone-300 flex items-center justify-center text-stone-600 font-medium">
                          {(c.otherUser?.fullName || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-stone-900 truncate">
                          {c.otherUser?.fullName || 'Unknown'}
                        </span>
                        {c.lastMessage?.createdAt && (
                          <span className="text-xs text-stone-400 shrink-0">
                            {formatTime(c.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {c.type === 'contact' && c.contextTitle && (
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            {c.contextTitle}
                          </span>
                        )}
                        {c.type === 'dm' && (
                          <span className="text-xs px-2 py-0.5 rounded bg-stone-100 text-stone-600">
                            Community
                          </span>
                        )}
                      </div>
                      {c.lastMessage && (
                        <p className="text-sm text-stone-500 truncate mt-1">
                          {c.lastMessage.senderId === user.id ? 'You: ' : ''}
                          {c.lastMessage.content}
                        </p>
                      )}
                    </div>
                    {c.unreadCount > 0 && (
                      <span className="shrink-0 w-5 h-5 rounded-full bg-stone-900 text-white text-xs font-medium flex items-center justify-center">
                        {c.unreadCount > 9 ? '9+' : c.unreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Thread or compose */}
          <div className="flex-1 min-w-0">
            {composeFromState ? (
              <Card className="p-6">
                <h2 className="font-semibold text-stone-900">
                  {composeFromState.type === 'dm' ? 'Message' : 'Contact'}
                </h2>
                <p className="text-sm text-stone-500 mt-1">
                  {composeFromState.type === 'dm'
                    ? `Send a message to ${composeFromState.otherUserName || 'this community member'}`
                    : `Send a message about ${composeFromState.contextTitle || 'your inquiry'}`}
                </p>
                {composeFromState.suggestedMessage && (
                  <p className="text-sm text-stone-600 mt-2 p-3 rounded-lg bg-stone-50">
                    Suggested: {composeFromState.suggestedMessage}
                  </p>
                )}
                {composeError && (
                  <div className="mt-3 rounded-xl bg-red-50 border border-red-100 text-red-800 px-4 py-3 text-sm">
                    {composeError}
                  </div>
                )}
                <textarea
                  value={composeMessage}
                  onChange={(e) => setComposeMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={4}
                  className="mt-4 w-full rounded-xl border border-stone-200 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
                  maxLength={2000}
                />
                <p className="text-xs text-stone-400 mt-1">{composeMessage.length}/2000</p>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={handleSend}
                  disabled={sending || !composeMessage.trim()}
                >
                  {sending ? 'Sending...' : 'Send message'}
                </Button>
              </Card>
            ) : selectedId && thread ? (
              <Card className="flex flex-col h-[500px] overflow-hidden">
                <div className="border-b border-stone-200 px-4 py-3 flex items-center gap-3">
                  {thread.otherUser?.avatarUrl ? (
                    <img
                      src={thread.otherUser.avatarUrl}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-stone-300 flex items-center justify-center text-stone-600 font-medium">
                      {(thread.otherUser?.fullName || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-stone-900">{thread.otherUser?.fullName || 'Unknown'}</p>
                    {thread.conversation?.contextTitle && (
                      <p className="text-xs text-stone-500">{thread.conversation.contextTitle}</p>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {thread.messages?.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          m.senderId === user.id
                            ? 'bg-stone-900 text-white'
                            : 'bg-stone-100 text-stone-900'
                        }`}
                      >
                        {m.senderId !== user.id && (
                          <p className="text-xs font-medium text-stone-500 mb-0.5">{m.senderName}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                        <p className="text-xs mt-1 opacity-70">{formatTime(m.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div className="border-t border-stone-200 p-4">
                  {composeError && (
                    <div className="mb-2 rounded-lg bg-red-50 text-red-800 px-3 py-2 text-sm">
                      {composeError}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <textarea
                      value={composeMessage}
                      onChange={(e) => setComposeMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder="Type a message..."
                      rows={2}
                      className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 resize-none"
                      maxLength={2000}
                    />
                    <Button
                      variant="primary"
                      onClick={handleSend}
                      disabled={sending || !composeMessage.trim()}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              </Card>
            ) : !composeFromState && conversations.length > 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-stone-500">
                <p>Select a conversation</p>
                <p className="text-sm mt-1">or start a new one from an event or venue page</p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
