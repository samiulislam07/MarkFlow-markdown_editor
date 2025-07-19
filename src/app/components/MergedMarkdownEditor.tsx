'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  Bold, Italic, Code, Link, List, ListOrdered, Quote, Minus, 
  Copy, Download, Eye, Maximize, Minimize, Save,
  ArrowLeft, Check, AlertCircle, Loader2, Edit3,
  LucideIcon, Moon, Sun, Palette, MessageSquare
} from 'lucide-react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import sanitizeHtml from 'sanitize-html';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import { Subscript as MathIcon } from 'lucide-react';

// --- NEW IMPORTS for Collaboration ---
import * as Y from 'yjs';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';
import YPartyKitProvider from 'y-partykit/provider';

// --- COMMENTING SYSTEM IMPORTS ---
import CommentButton from './CommentButton';
import CommentSidebar, { type CommentPosition, type CommentData } from './CommentSidebar';
import { useCommentSelection } from '@/hooks/useCommentSelection';

interface MarkdownEditorProps {
  documentId?: string;
  workspaceId?: string;
  doc: Y.Doc;
  provider: YPartyKitProvider;
}

const MergedMarkdownEditor: React.FC<MarkdownEditorProps> = ({
  documentId,
  workspaceId,
  doc,
  provider
}) => {
  const { user } = useUser();
  const router = useRouter();
  
  // --- STATE MANAGEMENT CHANGES ---
  // The document's source of truth is now the Y.Doc.
  // We'll use local React state for UI things like the preview pane.
  const ytext = doc.getText('codemirror');
  const ytitle = doc.getText('title');

  const [title, setTitle] = useState(ytitle.toString() || 'Untitled Document');
  const [markdownContent, setMarkdownContent] = useState(ytext.toString());
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showThemePicker, setShowThemePicker] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [connectedUsers, setConnectedUsers] = useState<Map<string, { name?: string; color?: string; email?: string; id?: string; isCurrentUser?: boolean }>>(new Map());

  // --- COMMENTING SYSTEM STATE ---
  const [isCommentSidebarOpen, setIsCommentSidebarOpen] = useState<boolean>(false);
  const [selectedTextForComment, setSelectedTextForComment] = useState<{
    text: string;
    position: CommentPosition;
  } | undefined>(undefined);
  const [activeCommentId, setActiveCommentId] = useState<string | undefined>(undefined);

  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const themePickerRef = useRef<HTMLDivElement>(null);
  const commentWebSocketRef = useRef<WebSocket | null>(null);

  // --- COMMENTING SYSTEM HOOKS ---
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);

  const {
    isCommentButtonVisible,
    selectedText,
    buttonPosition,
    selectionPosition,
    dismissCommentButton,
  } = useCommentSelection(editorRef as React.RefObject<HTMLElement>, !!user && !!documentId);

  // Handle adding a comment
  const handleAddComment = useCallback((text: string, position: CommentPosition) => {
    console.log('MergedMarkdownEditor: handleAddComment called with:', { text, position });
    setSelectedTextForComment({ text, position });
    setIsCommentSidebarOpen(true);
    dismissCommentButton();
  }, [dismissCommentButton]);

  // Handle comment creation callback
  const handleCommentCreate = useCallback((comment: CommentData) => {
    console.log('Comment created:', comment);
    
    // Add to local state
    setComments(prev => [...prev, comment]);
    
    // Broadcast to other users
    if (commentWebSocketRef.current && commentWebSocketRef.current.readyState === WebSocket.OPEN) {
      commentWebSocketRef.current.send(JSON.stringify({
        type: 'comment_added',
        comment
      }));
    }
    
    // Clear selected text after comment is created
    setSelectedTextForComment(undefined);
  }, []);

  // Handle comment update callback
  const handleCommentUpdate = useCallback((comment: CommentData) => {
    console.log('Comment updated:', comment);
    
    // Update local state
    setComments(prev => 
      prev.map(c => c._id === comment._id ? comment : c)
    );
    
    // Broadcast to other users
    if (commentWebSocketRef.current && commentWebSocketRef.current.readyState === WebSocket.OPEN) {
      commentWebSocketRef.current.send(JSON.stringify({
        type: 'comment_updated',
        comment
      }));
    }
  }, []);

  // Handle comment delete callback
  const handleCommentDelete = useCallback((commentId: string) => {
    console.log('Comment deleted:', commentId);
    
    // Remove from local state
    setComments(prev => prev.filter(c => c._id !== commentId));
    
    // Broadcast to other users
    if (commentWebSocketRef.current && commentWebSocketRef.current.readyState === WebSocket.OPEN) {
      commentWebSocketRef.current.send(JSON.stringify({
        type: 'comment_deleted',
        commentId
      }));
    }
  }, []);

  // Handle closing comment sidebar
  const handleCloseCommentSidebar = useCallback(() => {
    setIsCommentSidebarOpen(false);
    setSelectedTextForComment(undefined);
    setActiveCommentId(undefined);
  }, []);

  // Fetch comments for the document
  const fetchComments = useCallback(async () => {
    if (!documentId) return;
    
    setCommentsLoading(true);
    try {
      const response = await fetch(`/api/comments?noteId=${documentId}&includeResolved=true`);
      if (response.ok) {
        const commentsData = await response.json();
        setComments(commentsData);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  }, [documentId]);

  // Load comments when document ID changes
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Real-time comment synchronization
  useEffect(() => {
    if (!documentId) return;

    const commentRoomId = `comments-${documentId}`;
    const partyKitHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST || 'localhost:1999';
    const wsUrl = `ws://${partyKitHost}/parties/main/${commentRoomId}`;
    
    const ws = new WebSocket(wsUrl);
    commentWebSocketRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to comment room:', commentRoomId);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'comment_added':
            console.log('Real-time comment added:', message.comment);
            setComments(prev => [...prev, message.comment]);
            break;
          case 'comment_updated':
            console.log('Real-time comment updated:', message.comment);
            setComments(prev => 
              prev.map(comment => 
                comment._id === message.comment._id ? message.comment : comment
              )
            );
            break;
          case 'comment_deleted':
            console.log('Real-time comment deleted:', message.commentId);
            setComments(prev => 
              prev.filter(comment => comment._id !== message.commentId)
            );
            break;
        }
      } catch (error) {
        console.error('Error handling real-time comment message:', error);
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from comment room:', commentRoomId);
    };

    ws.onerror = (error) => {
      console.error('Comment WebSocket error:', error);
    };

    return () => {
      if (commentWebSocketRef.current) {
        commentWebSocketRef.current.close();
        commentWebSocketRef.current = null;
      }
    };
  }, [documentId]);

  const mathJaxConfig = {
    loader: { load: ['[tex]/ams', '[tex]/noerrors'] },
    tex: {
      inlineMath: [['$', '$']],
      displayMath: [['$$', '$$']],
      packages: { '[+]': ['ams', 'noerrors'] },
      processEscapes: true,
      processEnvironments: true
    },
    options: {
      skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
      enableMenu: false
    }
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    setShowThemePicker(false);
  };

  // Close theme picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themePickerRef.current && !themePickerRef.current.contains(event.target as Node)) {
        setShowThemePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Monitor connection status and user awareness
  useEffect(() => {
    const updateConnectionStatus = () => {
      if (provider.ws?.readyState === WebSocket.OPEN) {
        setConnectionStatus('connected');
      } else if (provider.ws?.readyState === WebSocket.CONNECTING) {
        setConnectionStatus('connecting');
      } else {
        setConnectionStatus('disconnected');
      }
    };

    const updateConnectedUsers = () => {
      const users = new Map();
      const seenUserIds = new Set();
      const currentUserId = user?.id;
      
      // Debug logs for awareness states
      console.log('All awareness states:', provider.awareness.getStates());
      console.log('Current user ID:', currentUserId);
      console.log('Provider awareness client ID:', provider.awareness.clientID);
      
      // Add current user first
      if (user && currentUserId) {
        const currentUserInfo = {
          name: user.firstName || user.emailAddresses?.[0]?.emailAddress || 'You',
          email: user.emailAddresses?.[0]?.emailAddress,
          color: '#60a5fa', // Blue for current user
          id: currentUserId,
          isCurrentUser: true,
        };
        users.set(currentUserId, currentUserInfo);
        seenUserIds.add(currentUserId);
      }
      
      // Add other connected users
      provider.awareness.getStates().forEach((state, clientId) => {
        console.log('Processing awareness state for client:', clientId, state);
        if (state.user && 
            clientId !== provider.awareness.clientID && 
            state.user.id !== currentUserId &&
            state.user.name &&
            !seenUserIds.has(state.user.id)) {
          
          console.log('Adding remote user:', state.user);
          seenUserIds.add(state.user.id);
          users.set(state.user.id, { ...state.user, isCurrentUser: false });
        }
      });
      
      setConnectedUsers(users);
      
      if (users.size > 1) { // More than just current user
        console.log('All active users:', Array.from(users.values()).map(u => `${u.name}${u.isCurrentUser ? ' (You)' : ''}`));
      }
    };

    // Set up connection monitoring
    provider.on('status', updateConnectionStatus);
    provider.awareness.on('change', updateConnectedUsers);

    // Initial status check
    updateConnectionStatus();
    updateConnectedUsers();

    return () => {
      provider.off('status', updateConnectionStatus);
      provider.awareness.off('change', updateConnectedUsers);
    };
  }, [provider, user]);

  // Generate user avatar component
  const generateUserAvatar = (userInfo: { name?: string; color?: string; email?: string; isCurrentUser?: boolean }, size: number = 8) => {
    const initials = userInfo.name ? userInfo.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'A';
    return (
      <div className="relative">
        <div 
          className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white text-xs font-medium ${
            userInfo.isCurrentUser ? 'ring-2 ring-blue-400 ring-offset-2' : ''
          }`}
          style={{ backgroundColor: userInfo.color }}
          title={userInfo.isCurrentUser ? `${userInfo.name || 'You'} (You)` : (userInfo.name || 'Anonymous')}
        >
          {initials}
        </div>
        {userInfo.isCurrentUser && (
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
            <div className="w-1 h-1 bg-white rounded-full"></div>
          </div>
        )}
      </div>
    );
  };

  // Generate connection status indicator
  const getConnectionStatusDisplay = () => {
    const statusConfig = {
      connected: { 
        color: 'text-green-600', 
        bg: 'bg-green-100', 
        text: 'Connected',
        dot: 'bg-green-500'
      },
      connecting: { 
        color: 'text-yellow-600', 
        bg: 'bg-yellow-100', 
        text: 'Connecting...',
        dot: 'bg-yellow-500'
      },
      disconnected: { 
        color: 'text-red-600', 
        bg: 'bg-red-100', 
        text: 'Disconnected',
        dot: 'bg-red-500'
      }
    };

    const config = statusConfig[connectionStatus];
    
    return (
      <div className={`flex items-center px-2 py-1 rounded-full text-xs ${config.bg} ${config.color}`}>
        <div className={`w-2 h-2 rounded-full ${config.dot} mr-2 ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`}></div>
        {config.text}
        {connectedUsers.size > 0 && (
          <span className="ml-2 font-medium">
            {connectedUsers.size} user{connectedUsers.size > 1 ? 's' : ''} active
          </span>
        )}
      </div>
    );
  };

  // --- MODIFIED: Auto-save functionality ---
  const saveDocument = useCallback(async () => {
    if (!user || saveStatus === 'saving') return;
    setSaveStatus('saving');
    
    try {
      // Get the latest content directly from the Yjs doc
      const currentContent = ytext.toString();
      const currentTitle = ytitle.toString() || 'Untitled Document';

      const payload = {
        title: currentTitle,
        content: currentContent,
        workspaceId: workspaceId || null,
      };

      let response;
      if (documentId) {
        response = await fetch(`/api/notes/${documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        const savedDoc = await response.json();
        setSaveStatus('saved');
        setLastSaved(new Date());
        
        if (!documentId && savedDoc._id) {
          router.replace(`/editor/${savedDoc._id}`);
        }
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
    }
  }, [user, saveStatus, ytext, ytitle, workspaceId, documentId, router]);

  // --- MODIFIED: Listen to Yjs doc changes for auto-saving and UI updates ---
  useEffect(() => {
    const handleDocUpdate = () => {
      setMarkdownContent(ytext.toString());
      setTitle(ytitle.toString());
      setSaveStatus('unsaved');
      
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveDocument(), 3000);
    };

    doc.on('update', handleDocUpdate);

    return () => {
      doc.off('update', handleDocUpdate);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [doc, ytext, ytitle, saveDocument]);

  const processMarkdown = (markdown: string): string => {
    let processed = markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    processed = processed.replace(/\$\$(([\s\S])*?)\$\$/g, (_, content) => {
      const trimmed = content.trim();
      return `<div class="math-block">$$${trimmed}$$</div>`;
    });

    processed = processed.replace(/\$([^\$\n]+?)\$/g, (_, content) => {
      const trimmed = content.trim();
      return `<span class="math-inline">$${trimmed}$</span>`;
    });

    processed = processed.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
      const language = lang || 'text';
      return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
    });

    processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');
    processed = processed.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    processed = processed.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    processed = processed.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    processed = processed.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    processed = processed.replace(/~~(.*?)~~/g, '<del>$1</del>');
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    processed = processed.replace(/^\d+\.\s(.+)/gm, '<li>$1</li>');
    processed = processed.replace(/(<li>.*<\/li>\s*)+/g, '<ol>$&</ol>');
    processed = processed.replace(/^[-*+]\s(.+)/gm, '<li>$1</li>');
    processed = processed.replace(/(<li>.*<\/li>\s*)+/g, (match) => {
      if (match.includes('<ol>')) return match;
      return `<ul>${match}</ul>`;
    });
    processed = processed.replace(/^>\s(.+)/gm, '<blockquote>$1</blockquote>');
    processed = processed.replace(/^---$/gm, '<hr>');
    processed = processed.replace(/\n\n/g, '</p><p>');
    processed = `<p>${processed}</p>`;

    processed = processed.replace(/<p><\/p>/g, '');
    processed = processed.replace(/<p>(<h[1-6]>)/g, '$1');
    processed = processed.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    processed = processed.replace(/<p>(<[ou]l>)/g, '$1');
    processed = processed.replace(/(<\/[ou]l>)<\/p>/g, '$1');

    return sanitizeHtml(processed, {
      allowedTags: ['h1', 'h2', 'h3', 'p', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr', 'strong', 'em', 'div', 'span', 'del'],
      allowedAttributes: {
        a: ['href', 'target', 'rel'],
        div: ['class'],
        span: ['class'],
        code: ['class'],
        pre: ['class']
      }
    });
  };

  const renderLatex = useCallback((html: string) => {
    let rendered = html;
    rendered = rendered.replace(/<div class="math-block">\$\$([\s\S]*?)\$\$<\/div>/g, 
      `<div class="math-display ${darkMode ? 'bg-gray-800 border-blue-700' : 'bg-blue-50 border-blue-500'} p-4 my-4 rounded border-l-4 font-mono text-center text-lg">$$$$1$$</div>`);
    rendered = rendered.replace(/<span class="math-inline">\$(.*?)\$<\/span>/g, 
      `<span class="math-inline ${darkMode ? 'bg-gray-800 text-blue-300' : 'bg-blue-50 text-blue-800'} px-1 rounded font-mono">$1</span>`);
    return rendered;
  }, [darkMode]);

  // --- CORE CHANGE: CodeMirror setup now uses Yjs ---
  useEffect(() => {
    if (editorRef.current && !editorViewRef.current && user) {
      // Generate a unique color for this user (consistent based on user ID)
      const userColors = [
        '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
        '#1abc9c', '#e67e22', '#34495e', '#f1c40f', '#e91e63',
        '#ff5722', '#795548', '#607d8b', '#ff9800', '#4caf50'
      ];
      
      // Generate a consistent color based on user ID
      const colorIndex = user.id ? 
        user.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % userColors.length : 
        0;
      const userColor = userColors[colorIndex];
      
      // Set up user awareness with unique color and info
      const userAwarenessInfo = {
        name: user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 'Anonymous',
        email: user?.emailAddresses?.[0]?.emailAddress,
        color: userColor,
        colorLight: userColor + '40', // Add transparency
        id: user?.id,
        avatar: user?.imageUrl || null,
      };
      
      // Clear any existing awareness data for this user first
      provider.awareness.setLocalState(null);
      
      // Set the new awareness data - yCollab expects 'user' field
      provider.awareness.setLocalStateField('user', userAwarenessInfo);
      
      // Also set it directly for immediate availability
      provider.awareness.setLocalState({
        user: userAwarenessInfo
      });
      
      // Debug log to verify awareness setup
      console.log('Setting up user awareness:', userAwarenessInfo);
      console.log('Awareness state after setup:', provider.awareness.getLocalState());

      const startState = EditorState.create({
        doc: ytext.toString(),
        extensions: [
          keymap.of([...defaultKeymap, ...historyKeymap, ...yUndoManagerKeymap]),
          history(),
          markdown(),
          darkMode ? oneDark : [],
          // The yCollab extension is the magic that connects CodeMirror to Yjs
          yCollab(ytext, provider.awareness, {
            undoManager: new Y.UndoManager(ytext)
          }),
          EditorView.theme({
            "&": {
              backgroundColor: darkMode ? "#1a202c" : "white",
              color: darkMode ? "#e2e8f0" : "#1a202c",
              fontSize: "14px",
            },
            ".cm-content": {
              caretColor: darkMode ? "#60a5fa" : "#2563eb",
              padding: "10px",
              minHeight: "200px",
            },
            ".cm-focused": {
              outline: "none",
            },
            ".cm-cursor, .cm-dropCursor": {
              borderLeft: `2px solid ${darkMode ? "#60a5fa" : "#2563eb"} !important`,
              marginLeft: "-1px !important",
              height: "1.2em !important",
              animation: "cm-blink 1.2s infinite !important",
            },
            ".cm-focused .cm-cursor": {
              borderLeft: `2px solid ${darkMode ? "#60a5fa" : "#2563eb"} !important`,
              display: "block !important",
            },
            ".cm-gutters": {
              backgroundColor: darkMode ? "#2d3748" : "#f7fafc",
              color: darkMode ? "#a0aec0" : "#718096",
              borderRight: darkMode ? "1px solid #4a5568" : "1px solid #e2e8f0",
            },
            // Enhanced styles for remote users' cursors and selections
            ".cm-ySelectionInfo": {
              position: "absolute !important",
              top: "-2.2em !important",
              left: "-2px !important",
              fontSize: "11px !important",
              fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important",
              fontStyle: "normal !important",
              fontWeight: "500 !important",
              lineHeight: "1.3 !important",
              padding: "4px 8px !important",
              color: "white !important",
              whiteSpace: "nowrap !important",
              borderRadius: "6px !important",
              zIndex: "1000 !important",
              boxShadow: "0 2px 8px rgba(0,0,0,0.25) !important",
              border: "1px solid rgba(255,255,255,0.2) !important",
              backdropFilter: "blur(4px) !important",
              pointerEvents: "none !important",
              opacity: "1 !important",
              transform: "translateX(-50%) !important",
              display: "block !important",
              visibility: "visible !important",
            },
            ".cm-yCursor": {
              position: "relative !important",
              borderLeft: "2px solid !important",
              marginLeft: "-1px !important",
              marginRight: "-1px !important",
              boxSizing: "border-box !important",
              zIndex: "100 !important",
              height: "1.2em !important",
              pointerEvents: "none !important",
              animation: "y-cursor-blink 1.2s ease-in-out infinite !important",
              display: "block !important",
              visibility: "visible !important",
            },
            ".cm-ySelection": {
              borderRadius: "2px !important",
              opacity: "0.3 !important",
              pointerEvents: "none !important",
              display: "block !important",
              visibility: "visible !important",
            },
            "@keyframes y-cursor-blink": {
              "0%, 50%": { opacity: "1" },
              "51%, 100%": { opacity: "0.3" },
            },
            "@keyframes cm-blink": {
              "0%": { opacity: "1" },
              "50%": { opacity: "0" },
              "100%": { opacity: "1" },
            },
          })
        ]
      });

      editorViewRef.current = new EditorView({
        state: startState,
        parent: editorRef.current
      });

      // Add awareness change listener for debugging
      provider.awareness.on('change', () => {
        console.log('Awareness changed');
        console.log('Current awareness states:', provider.awareness.getStates());
      });

      // Debug DOM elements after yCollab setup
      setTimeout(() => {
        console.log('CodeMirror DOM after yCollab setup:', editorRef.current?.querySelector('.cm-editor'));
        console.log('Looking for yCollab elements:', {
          cursors: editorRef.current?.querySelectorAll('.cm-yCursor'),
          selections: editorRef.current?.querySelectorAll('.cm-ySelection'),
          selectionInfo: editorRef.current?.querySelectorAll('.cm-ySelectionInfo')
        });
      }, 1000);

      return () => {
        // Clean up awareness when component unmounts
        provider.awareness.setLocalState(null);
        editorViewRef.current?.destroy();
        editorViewRef.current = null;
      };
    }
  }, [darkMode, ytext, provider, user]);

  useEffect(() => {
    const html = processMarkdown(markdownContent);
    const rendered = renderLatex(html);
    setHtmlContent(rendered);
  }, [markdownContent, darkMode, renderLatex]);

  const insertTextAtCursor = (text: string, cursorOffset: number = 0) => {
    if (!editorViewRef.current) return;

    const state = editorViewRef.current.state;
    const selection = state.selection;
    const from = selection.main.from;
    const to = selection.main.to;

    editorViewRef.current.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + cursorOffset }
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      alert('Markdown copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy markdown to clipboard.');
    }
  };

  const handleDownload = () => {
    try {
      const element = document.createElement('a');
      const file = new Blob([markdownContent], { type: 'text/markdown' });
      element.href = URL.createObjectURL(file);
      element.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);
    } catch (err) {
      console.error('Failed to download:', err);
      alert('Failed to download markdown file.');
    }
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />;
      case 'saved':
        return <Check className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <Save className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Saved';
      case 'error':
        return 'Save failed';
      default:
        return 'Unsaved changes';
    }
  };

  const EditorToolbarButton: React.FC<{ 
    onClick: () => void; 
    icon: LucideIcon; 
    label: string;
    disabled?: boolean;
  }> = ({ onClick, icon: Icon, label, disabled = false }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
        darkMode 
          ? 'text-gray-300 hover:bg-gray-700' 
          : 'text-gray-700 hover:bg-gray-200'
      }`}
      title={label}
      aria-label={label}
      tabIndex={0}
      role="button"
    >
      <Icon className="w-5 h-5" />
    </button>
  );

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className={`markflow-editor flex flex-col h-screen ${
        darkMode 
          ? 'bg-gray-900 text-gray-100' 
          : 'bg-white text-gray-800'
      } ${isFullScreen ? 'fixed inset-0 z-50' : 'relative'}`}>
        {/* Header with Document Title */}
        <div className={`${
          darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } border-b px-4 py-3`}>
          {/* Connection Status Bar */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              {getConnectionStatusDisplay()}
              {connectedUsers.size > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Active Users:</span>
                  <div className="flex -space-x-1">
                    {Array.from(connectedUsers.entries()).slice(0, 5).map(([userId, user]) => (
                      <div key={userId} className="relative">
                        {generateUserAvatar(user, 6)}
                      </div>
                    ))}
                    {connectedUsers.size > 5 && (
                      <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-medium">
                        +{connectedUsers.size - 5}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500">
              Real-time collaborative editing
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <button
                onClick={() => router.push('/dashboard')}
                className={`p-2 rounded transition-colors ${
                  darkMode 
                    ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  setTitle(newTitle); // Optimistic local update
                  // Update the shared Yjs state
                  doc.transact(() => {
                    if (ytitle.toString() !== newTitle) {
                      ytitle.delete(0, ytitle.length);
                      ytitle.insert(0, newTitle);
                    }
                  });
                }}
                className={`text-xl font-semibold border-none outline-none rounded px-2 py-1 flex-1 max-w-md ${
                  darkMode 
                    ? 'bg-gray-800 text-white focus:bg-gray-700' 
                    : 'bg-transparent text-gray-800 focus:bg-gray-50'
                }`}
                placeholder="Document title..."
              />
              
              <div className={`flex items-center space-x-2 text-sm ${
                darkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {getSaveStatusIcon()}
                <span>{getSaveStatusText()}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="relative" ref={themePickerRef}>
                <button
                  onClick={() => setShowThemePicker(!showThemePicker)}
                  className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Palette className="w-4 h-4 mr-2" />
                  Theme
                </button>
                
                {showThemePicker && (
                  <div className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-10 ${
                    darkMode 
                      ? 'bg-gray-800 border border-gray-700' 
                      : 'bg-white border border-gray-200'
                  }`}>
                    <div className="p-2">
                      <button
                        onClick={toggleDarkMode}
                        className={`flex items-center w-full px-3 py-2 text-sm rounded ${
                          darkMode 
                            ? 'hover:bg-gray-700 text-gray-300' 
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {darkMode ? (
                          <>
                            <Sun className="w-4 h-4 mr-2" />
                            Light Mode
                          </>
                        ) : (
                          <>
                            <Moon className="w-4 h-4 mr-2" />
                            Dark Mode
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Comment Toggle Button */}
              <button
                onClick={() => setIsCommentSidebarOpen(!isCommentSidebarOpen)}
                className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                  isCommentSidebarOpen
                    ? darkMode 
                      ? 'bg-blue-900 text-blue-200' 
                      : 'bg-blue-100 text-blue-700'
                    : darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title="Toggle Comments"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Comments
                {comments.length > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    darkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {comments.length}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => saveDocument()}
                className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-blue-900 text-blue-200 hover:bg-blue-800' 
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }`}
                disabled={saveStatus === 'saving'}
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </button>
              
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showPreview ? <Edit3 className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showPreview ? 'Edit Only' : 'Preview'}
              </button>
              
              <button
                onClick={handleCopy}
                className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </button>
              
              <button
                onClick={handleDownload}
                className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-green-900 text-green-200 hover:bg-green-800' 
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              
              <button
                onClick={toggleFullScreen}
                className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                  darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {isFullScreen ? <Minimize className="w-4 h-4 mr-2" /> : <Maximize className="w-4 h-4 mr-2" />}
                {isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className={`${
          darkMode 
            ? 'bg-gray-800 border-gray-700' 
            : 'bg-white border-gray-200'
        } border-b px-4 py-2`}>
          <div className="flex items-center space-x-1">
            <EditorToolbarButton onClick={() => insertTextAtCursor('**', 2)} icon={Bold} label="Bold" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('*', 1)} icon={Italic} label="Italic" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('`', 1)} icon={Code} label="Code" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('[text](url)', 1)} icon={Link} label="Link" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('- ', 2)} icon={List} label="Unordered List" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('1. ', 3)} icon={ListOrdered} label="Ordered List" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('> ', 2)} icon={Quote} label="Blockquote" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('---\n', 4)} icon={Minus} label="Horizontal Rule" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('$$\n\n$$', 3)} icon={MathIcon} label="Math Block" />
          </div>
        </div>

        {/* Editor and Preview Panes */}
        <div className="flex flex-1 overflow-hidden">
          {/* Editor Pane */}
          <div className={`markflow-editor-pane flex-1 ${showPreview ? 'w-1/2' : 'w-full'} overflow-hidden`}>
            <div 
              ref={editorRef} 
              className={`h-full w-full p-4 font-mono text-sm leading-relaxed overflow-auto markflow-codemirror ${
                darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-gray-800'
              }`} 
            />
          </div>

          {/* Preview Pane */}
          {showPreview && (
            <div className={`markflow-preview flex-1 w-1/2 overflow-auto p-4 border-l ${
              darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <MathJaxContext config={mathJaxConfig}>
                <MathJax>
                  <div 
                    className={`prose prose-sm max-w-none ${
                      darkMode ? 'prose-invert' : ''
                    }`}
                    dangerouslySetInnerHTML={{ __html: htmlContent }} 
                  />
                </MathJax>
              </MathJaxContext>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
          <div className="flex justify-between items-center">
            <span>Lines: {markdownContent.split('\n').length} | Characters: {markdownContent.length} | Words: {markdownContent.split(/\s+/).filter(word => word.length > 0).length}</span>
            <span>LaTeX supported • Auto-save enabled</span>
          </div>
        </div>
      </div>
      <style jsx global>{`
        /* Ensure cursor is always visible */
        .cm-editor .cm-cursor {
          border-left: 2px solid #60a5fa !important;
          margin-left: -1px !important;
          height: 1.2em !important;
          animation: cm-blink 1.2s infinite !important;
          display: block !important;
        }
        
        .cm-editor.cm-focused .cm-cursor {
          border-left: 2px solid #60a5fa !important;
          display: block !important;
        }
        
        .cm-editor .cm-content {
          caret-color: #60a5fa !important;
        }
        
        /* Enhanced collaborative cursor styles */
        .cm-editor .cm-ySelectionInfo {
          position: absolute !important;
          top: -1.8em !important;
          left: -1px !important;
          font-size: 0.7em !important;
          font-family: system-ui, -apple-system, sans-serif !important;
          font-weight: 600 !important;
          line-height: 1.2 !important;
          padding: 0.2em 0.5em !important;
          color: white !important;
          white-space: nowrap !important;
          border-radius: 6px !important;
          z-index: 1000 !important;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3) !important;
          border: 1px solid rgba(255,255,255,0.2) !important;
          backdrop-filter: blur(4px) !important;
          pointer-events: none !important;
        }
        
        .cm-editor .cm-yCursor {
          position: relative !important;
          border-left: 2px solid !important;
          margin-left: -1px !important;
          margin-right: -1px !important;
          box-sizing: border-box !important;
          z-index: 100 !important;
          height: 1.2em !important;
          animation: y-cursor-flash 1.2s infinite !important;
        }
        
        .cm-editor .cm-ySelection {
          border-radius: 3px !important;
          opacity: 0.25 !important;
          mix-blend-mode: multiply !important;
        }
        
        @keyframes cm-blink {
          0% { opacity: 1; }
          50% { opacity: 0; }
          100% { opacity: 1; }
        }
        
        @keyframes y-cursor-flash {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
        
        .markflow-codemirror .cm-editor {
          height: 100%;
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
          font-size: 0.875rem;
          line-height: 1.625;
        }
        .markflow-codemirror .cm-editor.cm-focused {
          outline: none;
        }
        .prose {
          color: ${darkMode ? '#e2e8f0' : '#374151'};
        }
        .prose h1 {
          font-size: 2em;
          margin-bottom: 0.5em;
          border-bottom: 1px solid ${darkMode ? '#4a5568' : '#e5e7eb'};
          padding-bottom: 0.3em;
          color: ${darkMode ? '#f7fafc' : '#111827'};
        }
        .prose h2 {
          font-size: 1.5em;
          margin-bottom: 0.5em;
          border-bottom: 1px solid ${darkMode ? '#4a5568' : '#e5e7eb'};
          padding-bottom: 0.3em;
          color: ${darkMode ? '#e2e8f0' : '#1f2937'};
        }
        .prose h3 {
          font-size: 1.25em;
          margin-bottom: 0.5em;
          color: ${darkMode ? '#cbd5e0' : '#374151'};
        }
        .prose p {
          margin-bottom: 1em;
          line-height: 1.6;
        }
        .prose ul, .prose ol {
          margin-left: 1.5em;
          margin-bottom: 1em;
        }
        .prose li {
          margin-bottom: 0.5em;
        }
        .prose pre {
          background-color: ${darkMode ? '#2d3748' : '#f3f4f6'};
          padding: 1em;
          border-radius: 0.25rem;
          overflow-x: auto;
          margin-bottom: 1em;
        }
        .prose code {
          background-color: ${darkMode ? '#2d3748' : '#f3f4f6'};
          padding: 0.2em 0.4em;
          border-radius: 0.2rem;
          font-size: 85%;
          color: ${darkMode ? '#f6ad55' : '#ef4444'};
        }
        .prose pre code {
          background-color: transparent;
          padding: 0;
          color: ${darkMode ? '#e2e8f0' : '#1f2937'};
        }
        .prose blockquote {
          border-left: 0.25em solid ${darkMode ? '#63b3ed' : '#3b82f6'};
          padding-left: 1em;
          color: ${darkMode ? '#a0aec0' : '#6b7280'};
          margin-bottom: 1em;
          font-style: italic;
        }
        .prose hr {
          border: none;
          border-top: 1px solid ${darkMode ? '#4a5568' : '#e5e7eb'};
          margin: 1em 0;
        }
        .prose a {
          color: ${darkMode ? '#63b3ed' : '#3b82f6'};
          text-decoration: underline;
        }
        .prose a:hover {
          color: ${darkMode ? '#4299e1' : '#2563eb'};
        }
        .prose del {
          text-decoration: line-through;
          color: ${darkMode ? '#a0aec0' : '#6b7280'};
        }
        .math-block {
          display: block;
          overflow-x: auto;
          margin: 1em 0;
          padding: 0.5em;
          border-radius: 4px;
          text-align: center;
        }
        .math-inline {
          display: inline-block;
          white-space: nowrap;
        }
        .markflow-preview .MathJax {
          margin: 1em 0;
        }
        .markflow-preview .MathJax_Display {
          margin: 1em 0;
          overflow-x: auto;
          overflow-y: hidden;
        }
        .prose-invert {
          --tw-prose-body: ${darkMode ? '#e2e8f0' : '#374151'};
          --tw-prose-headings: ${darkMode ? '#f7fafc' : '#111827'};
          --tw-prose-lead: ${darkMode ? '#a0aec0' : '#4b5563'};
          --tw-prose-links: ${darkMode ? '#63b3ed' : '#3b82f6'};
          --tw-prose-bold: ${darkMode ? '#f7fafc' : '#111827'};
          --tw-prose-counters: ${darkMode ? '#a0aec0' : '#6b7280'};
          --tw-prose-bullets: ${darkMode ? '#a0aec0' : '#d1d5db'};
          --tw-prose-hr: ${darkMode ? '#4a5568' : '#e5e7eb'};
          --tw-prose-quotes: ${darkMode ? '#e2e8f0' : '#111827'};
          --tw-prose-quote-borders: ${darkMode ? '#4a5568' : '#e5e7eb'};
          --tw-prose-captions: ${darkMode ? '#a0aec0' : '#6b7280'};
          --tw-prose-code: ${darkMode ? '#f6ad55' : '#ef4444'};
          --tw-prose-pre-code: ${darkMode ? '#e2e8f0' : '#1f2937'};
          --tw-prose-pre-bg: ${darkMode ? '#2d3748' : '#f3f4f6'};
          --tw-prose-th-borders: ${darkMode ? '#4a5568' : '#d1d5db'};
          --tw-prose-td-borders: ${darkMode ? '#4a5568' : '#e5e7eb'};
        }
      `}</style>

      {/* Comment Button - appears when text is selected */}
      <CommentButton
        isVisible={isCommentButtonVisible}
        position={buttonPosition}
        selectedText={selectedText}
        selectionPosition={selectionPosition}
        onAddComment={handleAddComment}
        onDismiss={dismissCommentButton}
      />

      {/* Comment Sidebar */}
      <CommentSidebar
        isOpen={isCommentSidebarOpen}
        onClose={handleCloseCommentSidebar}
        documentId={documentId}
        selectedText={selectedTextForComment}
        comments={comments}
        onCommentCreate={handleCommentCreate}
        onCommentUpdate={handleCommentUpdate}
        onCommentDelete={handleCommentDelete}
        onRefresh={fetchComments}
        darkMode={darkMode}
      />
    </MathJaxContext>
  );
};

export default MergedMarkdownEditor;