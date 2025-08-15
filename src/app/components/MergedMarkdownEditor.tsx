'use client';
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  Bold, Italic, Code, Link, List, ListOrdered, Quote, Minus,
  Copy, Download, Eye, Maximize, Minimize, Save,
  Check, AlertCircle, Loader2, Edit3,
  LucideIcon, Moon, Sun, Palette, MessageSquare, Play,
  Table, Hash, Strikethrough, Subscript, Superscript,
  Wand,
  ImageIcon,
  MicIcon,
  X,
  CheckCircle,
  RefreshCw,
  MicOff,
  Mic,
  PanelLeft,
  PanelLeftClose,
  LayoutDashboard
} from 'lucide-react';

import { EditorState, StateField, StateEffect } from '@codemirror/state';
import { EditorView, keymap, Decoration, DecorationSet, lineNumbers } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap, selectAll } from '@codemirror/commands';
import { Subscript as MathIcon } from 'lucide-react';

// --- ENHANCED MARKDOWN PARSING IMPORTS ---
import MarkdownIt from 'markdown-it';
import mathjax from 'markdown-it-mathjax3';
import footnote from 'markdown-it-footnote';
import sub from 'markdown-it-sub';
import sup from 'markdown-it-sup';
import abbr from 'markdown-it-abbr';

// --- NEW IMPORTS for Collaboration ---
import * as Y from 'yjs';
import { yCollab, yUndoManagerKeymap } from 'y-codemirror.next';
import YPartyKitProvider from 'y-partykit/provider';
import { nanoid } from 'nanoid';
//changes
import { useLLMImprove } from '@/hooks/useLLMImprove';
import { useImproveSelection } from '@/hooks/useImproveSelection';
import { useTheme } from '@/hooks/useTheme';

// --- ENHANCED MARKDOWN PARSING IMPORTS ---
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeKatex from 'rehype-katex'; // <-- Make sure this import is here
import 'katex/dist/katex.min.css'; // Import KaTeX CSS
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';

// --- UPDATED COMMENTING SYSTEM IMPORTS ---
import CommentButton from './CommentButton';
import CommentSidebar from './CommentSidebar';
import { useCommentSelection } from '@/hooks/useCommentSelection';
import { CommentData } from '@/types/comment'; // This type is now imported from your types file

interface MarkdownEditorProps {
  documentId?: string;
  workspaceId?: string;
  doc: Y.Doc;
  provider: YPartyKitProvider;
  onDocumentSaved?: (newDocumentId: string) => void;
  isDocumentSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

// Helper function to recursively find a comment by its ID
const findCommentById = (comments: CommentData[], id: string): CommentData | null => {
  for (const comment of comments) {
    if (comment._id === id) return comment;
    if (comment.replies) {
      const foundInReply = findCommentById(comment.replies, id);
      if (foundInReply) return foundInReply;
    }
  }
  return null;
};

const MergedMarkdownEditor: React.FC<MarkdownEditorProps> = ({ 
  documentId, 
  workspaceId, 
  doc, 
  provider, 
  onDocumentSaved,
  isDocumentSidebarOpen = false,
  onToggleSidebar 
}) => {
  const { user } = useUser();
  const router = useRouter();

  // --- YJS-POWERED STATE ---
  const ytext = useMemo(() => doc.getText('codemirror'), [doc]);
  const ytitle = useMemo(() => doc.getText('title'), [doc]);
  const ycomments = useMemo(() => doc.getArray<Y.Map<any>>('comments'), [doc]);

  // --- REACT UI STATE (DERIVED FROM YJS) ---
  const [title, setTitle] = useState(ytitle.toString() || 'Untitled Document');
  const [markdownContent, setMarkdownContent] = useState(ytext.toString());
  const [comments, setComments] = useState<CommentData[]>([]);

  // --- UI-ONLY STATE ---
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const { darkMode, toggleDarkMode } = useTheme();
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<
    "saved" | "saving" | "unsaved" | "error"
  >("saved");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showThemePicker, setShowThemePicker] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("connecting");
  const [connectedUsers, setConnectedUsers] = useState<
    Map<
      string,
      {
        name?: string;
        color?: string;
        email?: string;
        id?: string;
        isCurrentUser?: boolean;
      }
    >
  >(new Map());
  const [autoCompile, setAutoCompile] = useState<boolean>(false);
  const [compiledContent, setCompiledContent] = useState<string>("");
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [processedContent, setProcessedContent] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // --- COMMENTING SYSTEM STATE ---
  const [isCommentSidebarOpen, setIsCommentSidebarOpen] = useState<boolean>(false);
  const refreshDecorations = StateEffect.define<{ ydoc: Y.Doc; activeId: string | null }>();
  const [isWritingToEditor, setIsWritingToEditor] = useState(false);


  // --- IMPROVE FEATURE STATE ---
  const [improveMode, setImproveMode] = useState(false);
  const [improvedText, setImprovedText] = useState<string>("");
  const [isImproving, setIsImproving] = useState(false);
  const [showImprovePopup, setShowImprovePopup] = useState(false);

  // --- VOICE FEATURE STATE ---
  const [listening, setListening] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [voiceMarkdown, setVoiceMarkdown] = useState("");
  const [showVoicePopup, setShowVoicePopup] = useState(false);


  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const themePickerRef = useRef<HTMLDivElement>(null);
  const commentWebSocketRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<any>(null);

  const {
    improveButtonState,
    showImproveButton,
    dismissImproveButton,
    replaceSelectedText,
  } = useImproveSelection();

  const [processing, setProcessing] = useState(false);
  const [isSelectingAll, setIsSelectingAll] = useState(false);


  const { commentButtonState, showCommentButton, dismissCommentButton } = useCommentSelection();
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  // --- START: CORRECTED AUTO-SAVE LOGIC ---
  useEffect(() => {
    const handleDocUpdate = () => {
      // When the document changes, immediately mark it as "unsaved"
      setSaveStatus("unsaved");

      // Clear any previously scheduled save to reset the timer
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Schedule a new save to run after 3 seconds
      saveTimeoutRef.current = setTimeout(async () => {
        if (!user) return; // Don't save if there's no user

        setSaveStatus("saving");
        try {
          const payload = {
            title: ytitle.toString() || "Untitled Document",
            content: ytext.toString(),
            workspaceId: workspaceId || null,
          };

          const response = documentId
            ? await fetch(`/api/notes/${documentId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              })
            : await fetch("/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });

          if (response.ok) {
            const savedDoc = await response.json();
            setSaveStatus("saved");
            setLastSaved(new Date());
            if (!documentId && savedDoc._id) {
              onDocumentSaved?.(savedDoc._id);
            }
          } else {
            setSaveStatus("error");
          }
        } catch (error) {
          console.error("Auto-save error:", error);
          setSaveStatus("error");
        }
      }, 3000); // 3-second delay
    };

    // Listen for changes in the Yjs document
    ytext.observe(handleDocUpdate);
    ytitle.observe(handleDocUpdate);

    // Cleanup function
    return () => {
      ytext.unobserve(handleDocUpdate);
      ytitle.unobserve(handleDocUpdate);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [user, documentId, workspaceId, onDocumentSaved, ytext, ytitle]);
  // --- END: CORRECTED AUTO-SAVE LOGIC ---

  // Update React state when Yjs state changes (for UI display)
  useEffect(() => {
    const syncUI = () => {
        setMarkdownContent(ytext.toString());
        setTitle(ytitle.toString());
    };
    ytext.observe(syncUI);
    ytitle.observe(syncUI);
    return () => {
        ytext.unobserve(syncUI);
        ytitle.unobserve(syncUI);
    };
  }, [ytext, ytitle]);

  // Effect to set the active highlight range
  const setActiveHighlight = StateEffect.define<{ from: number; to: number } | null>();

  // Field to store and draw the active highlight decoration
  const activeHighlightField = StateField.define<DecorationSet>({
    create() {
      return Decoration.none;
    },
    update(decorations, tr) {
      for (const effect of tr.effects) {
        if (effect.is(setActiveHighlight)) {
          if (effect.value) {
            const { from, to } = effect.value;
            const highlightMark = Decoration.mark({
              class: 'cm-active-comment-scroll-highlight',
            });
            return Decoration.set([highlightMark.range(from, to)]);
          } else {
            return Decoration.none;
          }
        }
      }
      return decorations.map(tr.changes);
    },
    provide: f => EditorView.decorations.from(f),
  });

  // This handler now finds the comment in the local state and highlights its position
  const handleSetActiveComment = useCallback((commentId: string | null) => {
    setActiveCommentId(commentId);
    const view = editorViewRef.current;
    if (!view) return;

    if (!commentId) {
      view.dispatch({ effects: setActiveHighlight.of(null) });
      return;
    }

    const comment = findCommentById(comments, commentId);

    if (comment && comment.position && typeof comment.position.from === 'number') {
      const { from, to } = comment.position;
      view.dispatch({
        effects: [
          setActiveHighlight.of({ from, to }),
          EditorView.scrollIntoView(from, { y: 'center' })
        ]
      });
    } else {
      view.dispatch({ effects: setActiveHighlight.of(null) });
    }
  }, [comments]); // Depends on the `comments` state

  // Fetch comments from API to be used for highlighting
  useEffect(() => {
    const fetchComments = async () => {
      if (!documentId) return;
      try {
        const response = await fetch(`/api/comments?noteId=${documentId}&includeResolved=true`);
        if (response.ok) {
          const data = await response.json();
          setComments(data);
        }
      } catch (error) {
        console.error("Failed to fetch comments for editor:", error);
      }
    };
    fetchComments();
  }, [documentId, isCommentSidebarOpen]); // Refetch when sidebar opens to get latest

  useEffect(() => {
    if (editorViewRef.current) {
        editorViewRef.current.dispatch({
            effects: [refreshDecorations.of({ ydoc: doc, activeId: activeCommentId })]
        });
    }
  }, [comments, activeCommentId, doc]);

  const scrollSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggleDarkMode = () => {
    toggleDarkMode();
    setShowThemePicker(false);
  };

  // --- START: UPDATED MARKDOWN PROCESSING PIPELINE ---
  const processMarkdown = useCallback(async (markdown: string): Promise<string> => {
    try {
      const file = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath) // Parses math syntax
        .use(remarkRehype)
        .use(rehypeKatex) // Renders math syntax into HTML with KaTeX
        .use(rehypeHighlight)
        .use(rehypeSanitize, {
          // KaTeX adds its own classes, so we need to allow them
          attributes: {
            '*': ['className', 'style', 'aria-hidden', 'role', 'title'],
            'a': ['href', 'target', 'rel', 'id'],
            'img': ['src', 'alt', 'title'],
            'input': ['type', 'checked', 'disabled'],
            'span': ['data*', 'className', 'style', 'aria-hidden'],
            'div': ['id', 'className', 'style'],
            'svg': ['aria-hidden', 'focusable', 'role', 'viewBox', 'width', 'height', 'xmlns'],
            'path': ['d', 'fill'],
            'use': ['href'],
            'g': ['fill'],
            'rect': ['width', 'height', 'fill'],
            'text': ['x', 'y', 'fill'],
            'defs': [],
            'clipPath': ['id'],
            'foreignObject': ['width', 'height'],
            'math': ['xmlns'],
            'semantics': [],
            'mrow': [],
            'mi': ['mathvariant'],
            'mo': ['fence', 'separator', 'stretchy', 'symmetric'],
            'mn': [],
            'msup': [],
            'msub': [],
            'mfrac': ['linethickness'],
            'mtext': [],
            'annotation': ['encoding']
          },
          tagNames: [
            'div', 'span', 'p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img',
            'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'del', 'ins',
            'svg', 'path', 'g', 'rect', 'text', 'defs', 'clipPath', 'use', 'foreignObject',
            'math', 'semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mtext', 'annotation'
          ]
        })
        .use(rehypeStringify)
        .process(markdown);

      return String(file);
    } catch (error) {
      console.error('Markdown processing error:', error);
      return `<div class="markdown-error">Error rendering markdown</div>`;
    }
  }, []);
  // --- END: UPDATED MARKDOWN PROCESSING PIPELINE ---

  const processContent = useCallback(async (content: string) => {
    setIsProcessing(true);
    try {
      const result = await processMarkdown(content);
      setProcessedContent(result);
    } catch (error) {
      console.error("Markdown processing error:", error);
      setProcessedContent("<div>Error rendering markdown</div>");
    } finally {
      setIsProcessing(false);
    }
  }, [processMarkdown]);

  const compileMarkdown = useCallback(async () => {
    if (isCompiling) return;

    setIsCompiling(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      // Process the entire document at once and store the resulting HTML
      const compiled = await processMarkdown(markdownContent);
      setCompiledContent(compiled);
      console.log("Markdown compiled successfully");
    } catch (error) {
      console.error("Compilation error:", error);
    } finally {
      setIsCompiling(false);
    }
  }, [markdownContent, isCompiling, processMarkdown, processContent]);

  const toggleAutoCompile = () => {
    setAutoCompile(!autoCompile);
    if (!autoCompile) {
      compileMarkdown();
    }
  };

  useEffect(() => {
    if (markdownContent && !compiledContent) {
      compileMarkdown();
    }
  }, [markdownContent, compiledContent, compileMarkdown]);

  useEffect(() => {
    if (autoCompile || showPreview) {
      processContent(markdownContent);
    }
  }, [markdownContent, autoCompile, showPreview, processContent]);

  const refreshEditor = useCallback(() => {
    if (editorViewRef.current) {
      editorViewRef.current.requestMeasure();
      editorViewRef.current.dispatch({
        effects: [],
      });
    }
  }, []);

  const syncScrollFromEditor = useCallback(() => {
    if (!editorViewRef.current || !previewRef.current || !showPreview) return;

    if (scrollSyncTimeoutRef.current) {
      clearTimeout(scrollSyncTimeoutRef.current);
    }

    scrollSyncTimeoutRef.current = setTimeout(() => {
      const editor = editorViewRef.current;
      const preview = previewRef.current;
      if (!editor || !preview) return;

      const editorScrollElement = editor.scrollDOM;
      const scrollTop = editorScrollElement.scrollTop;
      const scrollHeight =
        editorScrollElement.scrollHeight - editorScrollElement.clientHeight;

      if (scrollHeight > 0) {
        const scrollRatio = scrollTop / scrollHeight;
        const previewScrollHeight = preview.scrollHeight - preview.clientHeight;
        preview.scrollTop = scrollRatio * previewScrollHeight;
      }

      refreshEditor();
    }, 50);
  }, [showPreview, refreshEditor]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        themePickerRef.current &&
        !themePickerRef.current.contains(event.target as Node)
      ) {
        setShowThemePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const updateConnectionStatus = () => {
      if (provider.ws?.readyState === WebSocket.OPEN) {
        setConnectionStatus("connected");
      } else if (provider.ws?.readyState === WebSocket.CONNECTING) {
        setConnectionStatus("connecting");
      } else {
        setConnectionStatus("disconnected");
      }
    };

    const updateConnectedUsers = () => {
      const users = new Map();
      const seenUserIds = new Set();
      const currentUserId = user?.id;

      if (user && currentUserId) {
        const currentUserInfo = {
          name:
            user.firstName || user.emailAddresses?.[0]?.emailAddress || "You",
          email: user.emailAddresses?.[0]?.emailAddress,
          color: "#60a5fa",
          id: currentUserId,
          isCurrentUser: true,
        };
        users.set(currentUserId, currentUserInfo);
        seenUserIds.add(currentUserId);
      }

      provider.awareness.getStates().forEach((state, clientId) => {
        if (
          state.user &&
          clientId !== provider.awareness.clientID &&
          state.user.id !== currentUserId &&
          state.user.name &&
          !seenUserIds.has(state.user.id)
        ) {
          seenUserIds.add(state.user.id);
          users.set(state.user.id, { ...state.user, isCurrentUser: false });
        }
      });

      setConnectedUsers(users);
    };

    provider.on("status", updateConnectionStatus);
    provider.awareness.on("change", updateConnectedUsers);
    updateConnectionStatus();
    updateConnectedUsers();

    return () => {
      provider.off("status", updateConnectionStatus);
      provider.awareness.off("change", updateConnectedUsers);
    };
  }, [provider, user]);

  const generateUserAvatar = (
    userInfo: {
      name?: string;
      color?: string;
      email?: string;
      isCurrentUser?: boolean;
    },
    size: number = 8
  ) => {
    const initials = userInfo.name
      ? userInfo.name
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
      : "A";
    return (
      <div className="relative">
        <div
          className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white text-xs font-medium ${
            userInfo.isCurrentUser ? "ring-2 ring-blue-400 ring-offset-2" : ""
          }`}
          style={{ backgroundColor: userInfo.color }}
          title={
            userInfo.isCurrentUser
              ? `${userInfo.name || "You"} (You)`
              : userInfo.name || "Anonymous"
          }
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

   const exportRightPaneAsPdf = async () => {
      const previewEl = document.getElementById('pdf-content');
      if (!previewEl) return;

      const html = previewEl.innerHTML;

      const res = await fetch('/api/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html }),
      });

      if (!res.ok) {
        alert('PDF generation failed');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    };

  const getConnectionStatusDisplay = () => {
    const statusConfig = {
      connected: {
        color: "text-green-600",
        bg: "bg-green-100",
        text: "Connected",
        dot: "bg-green-500",
      },
      connecting: {
        color: "text-yellow-600",
        bg: "bg-yellow-100",
        text: "Connecting...",
        dot: "bg-yellow-500",
      },
      disconnected: {
        color: "text-red-600",
        bg: "bg-red-100",
        text: "Disconnected",
        dot: "bg-red-500",
      },
    };

    const config = statusConfig[connectionStatus];

    return (
      <div
        className={`flex items-center px-2 py-1 rounded-full text-xs ${config.bg} ${config.color}`}
      >
        <div
          className={`w-2 h-2 rounded-full ${config.dot} mr-2 ${connectionStatus === "connecting" ? "animate-pulse" : ""}`}
        ></div>
        {config.text}
        {connectedUsers.size > 0 && (
          <span className="ml-2 font-medium">
            {connectedUsers.size} user{connectedUsers.size > 1 ? "s" : ""}{" "}
            active
          </span>
        )}
      </div>
    );
  };

  const saveDocument = useCallback(async () => {
    if (!user || saveStatus === "saving") return;
    setSaveStatus("saving");

    try {
      const currentContent = ytext.toString();
      const currentTitle = ytitle.toString() || "Untitled Document";

      const payload = {
        title: currentTitle,
        content: currentContent,
        workspaceId: workspaceId || null,
      };

      let response;
      if (documentId) {
        response = await fetch(`/api/notes/${documentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        const savedDoc = await response.json();
        setSaveStatus("saved");
        setLastSaved(new Date());

        if (!documentId && savedDoc._id) {
          onDocumentSaved?.(savedDoc._id);
        }
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error("Save error:", error);
      setSaveStatus("error");
    }
  }, [user, saveStatus, ytext, ytitle, workspaceId, documentId, onDocumentSaved]);

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
})
.use(mathjax)
.use(footnote)
.use(sub)
.use(sup)
.use(abbr);

// (Removed duplicate processMarkdown function)

  useEffect(() => {
    if (editorRef.current && !editorViewRef.current && user) {
      try {
        const userColors = [
          "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c",
          "#e67e22", "#34495e", "#f1c40f", "#e91e63", "#ff5722", "#795548",
          "#607d8b", "#ff9800", "#4caf50",
        ];
        const colorIndex = user.id
          ? user.id
              .split("")
              .reduce((acc, char) => acc + char.charCodeAt(0), 0) %
            userColors.length
          : 0;
        const userColor = userColors[colorIndex];

        const userAwarenessInfo = {
          name:
            user?.firstName ||
            user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
            "Anonymous",
          email: user?.emailAddresses?.[0]?.emailAddress,
          color: userColor,
          colorLight: userColor + "40",
          id: user?.id,

          avatar: user?.imageUrl || null,
        };

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.selectionSet) {
          const selection = update.state.selection.main;
          if (selection.empty) {
            dismissCommentButton();
          } else {
            const text = update.state.sliceDoc(selection.from, selection.to).trim();
            if (text.length > 2) {
              const domRect = editorViewRef.current?.coordsAtPos(selection.to);
              const editorRect = editorRef.current?.getBoundingClientRect();
              if (domRect && editorRect) {
                showCommentButton(
                  text,
                  {
                    x: domRect.right + 5,
                    y: domRect.top + (domRect.bottom - domRect.top) / 2
                  },
                  { from: selection.from, to: selection.to }
                );
              }
            } else {
              dismissCommentButton();
            }
          }
        }
      });

      const startState = EditorState.create({
        doc: ytext.toString(),
        extensions: [
          keymap.of([
            { 
              key: "Ctrl-a", 
              run: (view) => {
                // Set flag to prevent selection handler interference
                setIsSelectingAll(true);
                // Dismiss buttons
                dismissCommentButton();
                dismissImproveButton();
                // Select all
                const result = selectAll(view);
                // Reset flag after a short delay
                setTimeout(() => setIsSelectingAll(false), 100);
                return result;
              }
            },
            { 
              key: "Cmd-a", 
              run: (view) => {
                // Set flag to prevent selection handler interference
                setIsSelectingAll(true);
                // Dismiss buttons
                dismissCommentButton();
                dismissImproveButton();
                // Select all
                const result = selectAll(view);
                // Reset flag after a short delay
                setTimeout(() => setIsSelectingAll(false), 100);
                return result;
              }
            },
            ...defaultKeymap, 
            ...historyKeymap, 
            ...yUndoManagerKeymap
          ]),
          history(),
          markdown(),
          EditorView.lineWrapping,
          lineNumbers({
            formatNumber: (lineNo, state) => {
              // Prevent problematic line numbers from appearing out of order
              const totalLines = state ? state.doc.lines : 1;
              
              // Ensure line number is valid and in range
              if (lineNo < 1 || lineNo > totalLines) {
                return '';
              }
              
              // Special handling for problematic numbers that tend to appear out of order
              const problematicNumbers = [9, 99, 999, 9999];
              
              // If this is a problematic number and it's greater than total lines,
              // don't display it (this prevents out-of-order display)
              if (problematicNumbers.includes(lineNo) && lineNo > totalLines) {
                return '';
              }
              
              // For valid line numbers, ensure proper formatting
              return String(lineNo).padStart(String(totalLines).length, ' ');
            }
          }),
          darkMode ? oneDark : [],
          yCollab(ytext, provider.awareness, { undoManager: new Y.UndoManager(ytext) }),
          updateListener,
          activeHighlightField,
          EditorView.updateListener.of((update) => {
            if (update.selectionSet) {
              const selection = update.state.selection.main;
              if (!selection.empty) {
                const text = update.state.sliceDoc(selection.from, selection.to).trim();
                // Don't show comment button for very large selections (like select all)
                const docLength = update.state.doc.length;
                const selectionLength = selection.to - selection.from;
                const isLargeSelection = selectionLength > docLength * 0.8; // If selection is >80% of document
                
                if (text.length > 2 && text.length < 500 && !isLargeSelection) {
                  const domRect = editorViewRef.current?.coordsAtPos(selection.to);
                  const editorRect = editorRef.current?.getBoundingClientRect();
                  if (domRect && editorRect) {
                    showCommentButton(text, { x: domRect.right + 5, y: domRect.top }, { from: selection.from, to: selection.to });
                  }
                } else {
                  dismissCommentButton();
                }
              } else {
                dismissCommentButton();
              }
            }
          }),
          EditorView.theme({
            "&": { backgroundColor: darkMode ? "#1a202c" : "white", color: darkMode ? "#e2e8f0" : "#1a202c" },
            ".cm-content": { caretColor: darkMode ? "#60a5fa" : "#2563eb" },
            ".cm-gutters": { backgroundColor: darkMode ? "#2d3748" : "#f7fafc", color: darkMode ? "#a0aec0" : "#718096" },
          })
        ]
      });

        provider.awareness.setLocalState(null);
        provider.awareness.setLocalStateField("user", userAwarenessInfo);
        provider.awareness.setLocalState({ user: userAwarenessInfo });

        editorViewRef.current = new EditorView({
          state: startState,
          parent: editorRef.current,
        });

        const yTextObserver = () => {
          if (editorViewRef.current) {
            requestAnimationFrame(() => {
              editorViewRef.current?.requestMeasure();
              editorViewRef.current?.dispatch({ effects: [] });
            });
          }
        };
        ytext.observe(yTextObserver);

        return () => {
          ytext.unobserve(yTextObserver);
          provider.awareness.setLocalState(null);
          editorViewRef.current?.destroy();
          editorViewRef.current = null;
        };
      } catch (error) {
        console.error("CodeMirror initialization error:", error);
        if (editorRef.current) {
          const fallbackTextarea = document.createElement("textarea");
          fallbackTextarea.value = ytext.toString();
          fallbackTextarea.style.width = "100%";
          fallbackTextarea.style.height = "100%";
          fallbackTextarea.style.border = "none";
          fallbackTextarea.style.outline = "none";
          fallbackTextarea.style.resize = "none";
          fallbackTextarea.style.fontFamily = "monospace";
          fallbackTextarea.style.fontSize = "14px";
          fallbackTextarea.style.padding = "1rem";
          fallbackTextarea.addEventListener("input", (e) => {
            const target = e.target as HTMLTextAreaElement;
            doc.transact(() => {
              ytext.delete(0, ytext.length);
              ytext.insert(0, target.value);
            });
          });
          editorRef.current.appendChild(fallbackTextarea);
        }
      }
    }
  }, [darkMode, ytext, provider, user, doc]);

  useEffect(() => {
    if (editorViewRef.current && showPreview) {
      const scrollElement = editorViewRef.current.scrollDOM;
      scrollElement.addEventListener("scroll", syncScrollFromEditor);
      return () => {
        scrollElement.removeEventListener("scroll", syncScrollFromEditor);
        if (scrollSyncTimeoutRef.current) {
          clearTimeout(scrollSyncTimeoutRef.current);
        }
      };
    }
  }, [showPreview, syncScrollFromEditor]);

  const insertTextAtCursor = (text: string, cursorOffset: number = 0) => {
    if (!editorViewRef.current) return;
    const state = editorViewRef.current.state;
    const selection = state.selection;
    const from = selection.main.from;
    const to = selection.main.to;
    editorViewRef.current.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + cursorOffset },
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdownContent);
      alert("Markdown copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("Failed to copy markdown to clipboard.");
    }
  };

  const handleDownload = () => {
    try {
      const element = document.createElement("a");
      const file = new Blob([markdownContent], { type: "text/markdown" });
      element.href = URL.createObjectURL(file);
      element.download = `${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);
    } catch (err) {
      console.error("Failed to download:", err);
      alert("Failed to download markdown file.");
    }
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case "saving":
        return (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
        );
      case "saved":
        return <Check className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case "error":
        return (
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
        );
      default:
        return <Save className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case "saving":
        return "Saving...";
      case "saved":
        return lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : "Saved";
      case "error":
        return "Save failed";
      default:
        return "Unsaved changes";
    }
  };

  const EditorToolbarButton: React.FC<{ onClick: () => void; icon: LucideIcon; label: string; disabled?: boolean; }> = ({ onClick, icon: Icon, label, disabled = false }) => (
    <button onClick={onClick} disabled={disabled} className={`p-2 rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
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

  const improve = useLLMImprove();
  
  
  const handleImproveText = async () => {
    setIsImproving(true);
    setShowImprovePopup(true);
    try {
      const result = await improve(improveButtonState.selectedText);
      setImprovedText(result);
    } catch (error) {
      console.error("Error improving text:", error);
      setImprovedText("Error improving text. Please try again.");
    } finally {
      setIsImproving(false);
    }
  };
  const handleReplaceImprovedText = () => {
      if (editorViewRef.current) {
        let improveMarkdown = improvedText
        .trim()
        .replace(/^```(?:markdown)?\s*/i, "") // remove start
        .replace(/```$/, "") // remove end
        .trim();

      if (improveMarkdown.length === 0) {
        alert("No voice input detected.");
        return;
      }
      const { from, to } = improveButtonState.selection;
      editorViewRef.current.dispatch({
        changes: { from, to, insert: improveMarkdown },
        selection: { anchor: from + improveMarkdown.length }
      });
      
      doc.transact(() => {
        const ytext = doc.getText("codemirror");
        ytext.delete(from, to - from);
        ytext.insert(from, improveMarkdown);
      });
    }
    setShowImprovePopup(false);
    dismissImproveButton();
  };

  const handleRegenerateImprovedText = async () => {
    setIsImproving(true);
    try {
      const result = await improve(improveButtonState.selectedText);
      setImprovedText(result);
    } catch (error) {
      console.error("Error improving text:", error);
      setImprovedText("Error improving text. Please try again.");
    } finally {
      setIsImproving(false);
    }
  };

const ImproveButton = ({
  isVisible,
  position,
  onClick,
  onDismiss,
}: {
  isVisible: boolean;
  position: { x: number; y: number };
  onClick: () => void;
  onDismiss: () => void;
}) => {
  if (!isVisible) return null;

  return (
    <div
      className="fixed z-50 transition-all"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className={`flex items-center rounded-md shadow-lg border ${
        darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <button
          onClick={onClick}
          className={`px-3 py-1.5 text-sm font-medium rounded-l-md flex items-center ${
            darkMode 
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
        >
          <Wand className="w-4 h-4 mr-1" />
          Improve
        </button>
        <button
          onClick={onDismiss}
          className={`px-2 py-1.5 ${
            darkMode 
              ? "text-gray-300 hover:text-gray-100" 
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          ×
        </button>
      </div>
    </div>
  );
};

useEffect(() => {
  const handleSelectionChange = () => {
    // Skip processing if we're in the middle of a select-all operation
    if (isSelectingAll) return;
    
    if (!editorRef.current || !editorViewRef.current || !user || !documentId) return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      //dismissCommentButton();
      dismissImproveButton();
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length === 0) return;

    // Get the position of the selection
    const range = selection.getRangeAt(0);
    
    // Check if the selection is within the editor
    const editorElement = editorRef.current;
    if (!editorElement.contains(range.commonAncestorContainer)) {
      // Selection is outside the editor, dismiss buttons
      dismissCommentButton();
      dismissImproveButton();
      return;
    }

    const rect = range.getBoundingClientRect();
    
    const buttonPosition = {
      x: rect.right + window.scrollX + 1,
      y: rect.top + window.scrollY - 10
    };

    // Get the absolute positions within the editor with error handling
    const editor = editorViewRef.current;
    
    try {
      const from = editor.posAtDOM(range.startContainer) + range.startOffset;
      const to = editor.posAtDOM(range.endContainer) + range.endOffset;
      
      // Validate positions are within document bounds
      const docLength = editor.state.doc.length;
      if (from < 0 || to < 0 || from > docLength || to > docLength) {
        dismissCommentButton();
        dismissImproveButton();
        return;
      }

      // Don't show comment button for very large selections (like select all)
      const selectionLength = to - from;
      const isLargeSelection = selectionLength > docLength * 0.9;
      
      if (selectedText.length > 2 && selectedText.length < 2000 ) { //&& !isLargeSelection) {
        const selectionPosition = { from, to };
        // Show buttons for reasonable selections
        showCommentButton(selectedText, buttonPosition, selectionPosition);
        showImproveButton(selectedText, buttonPosition, selectionPosition);
      } else {
        // Dismiss buttons for large or inappropriate selections
        dismissCommentButton();
        dismissImproveButton();
      }
    } catch (error) {
      // If there's an error getting positions, dismiss buttons
      console.warn('Error getting selection positions:', error);
      //dismissCommentButton();
      dismissImproveButton();
    }
  };

  document.addEventListener('selectionchange', handleSelectionChange);
  return () => document.removeEventListener('selectionchange', handleSelectionChange);
}, [user, documentId, isSelectingAll, showCommentButton, showImproveButton, dismissCommentButton, dismissImproveButton]);

console.log('Selection positions:', {
  from: improveButtonState.selection.from,
  to: improveButtonState.selection.to,
  selectedText: improveButtonState.selectedText,
  editorText: editorViewRef.current?.state.doc.toString().slice(
    improveButtonState.selection.from,
    improveButtonState.selection.to
  )
});

const handleVoiceInput = () => {
    setShowVoicePopup(true);
  };

// const startVoiceRecording = () => {
//       if (recognitionRef.current) {
//         recognitionRef.current.stop(); // Clean up any existing instance
//       }
//     const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
//     if (!SpeechRecognition) {
//       alert("Speech recognition is not supported in this browser.");
//       return;
//     }

//     recognitionRef.current = new SpeechRecognition();
//     recognitionRef.current.lang = 'en-US';
//     recognitionRef.current.interimResults = false;
//     recognitionRef.current.continuous = false;
//     recognitionRef.current.maxAlternatives = 1;

//     setListening(true);
//     setVoiceMarkdown("");
//     recognitionRef.current.onresult = async (event: any) => {
//       const transcript = event.results[0][0].transcript;
//       setListening(false);
//       setVoiceProcessing(true);

//       try {
//         const res = await fetch('/api/voice-to-md', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({ text: transcript })
//         });

//         if (!res.ok) throw new Error('Failed to fetch from API');

//         const { markdown } = await res.json();
//         setVoiceMarkdown(markdown);
//       } catch (err) {
//         console.error('Error handling voice input:', err);
//         setVoiceMarkdown("Error processing voice input. Please try again.");
//       } finally {
//         setVoiceProcessing(false);
//       }
//     };

//     recognitionRef.current.onerror = (event: any) => {
//       console.error('Speech recognition error:', event.error);
//       setListening(false);
//       setVoiceProcessing(false);
//       setVoiceMarkdown("Error: " + event.error);
//     };

//     recognitionRef.current.start();
//   };

//   const stopVoiceRecording = () => {
//     if (recognitionRef.current) {
//       recognitionRef.current.stop();
//       setListening(false);
//     }
//   };

const startVoiceRecording = () => {
  if (recognitionRef.current) {
    recognitionRef.current.stop();
  }

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech recognition is not supported in this browser.");
    return;
  }

  recognitionRef.current = new SpeechRecognition();
  recognitionRef.current.lang = "en-US";
  recognitionRef.current.interimResults = false;
  recognitionRef.current.continuous = true; // allow long speech until stop
  recognitionRef.current.maxAlternatives = 1;

  let tempTranscript = ""; // store transcript until stop

  setListening(true);
  setVoiceMarkdown("");

  recognitionRef.current.onresult = (event: any) => {
    // Append each result until stop is called
    for (let i = event.resultIndex; i < event.results.length; i++) {
      tempTranscript += event.results[i][0].transcript + " ";
    }
  };

  // Save transcript for use when stopping
  recognitionRef.current.onend = () => {
    // When user clicks stop, this will be called
    if (tempTranscript.trim()) {
      processVoiceText(tempTranscript.trim());
    } else {
      setVoiceMarkdown("No speech detected.");
    }
    setListening(false);
  };

  recognitionRef.current.onerror = (event: any) => {
    console.error("Speech recognition error:", event.error);
    setListening(false);
    setVoiceProcessing(false);
    setVoiceMarkdown("Error: " + event.error);
  };

  recognitionRef.current.start();
};

// Function to send to backend
const processVoiceText = async (text: string) => {
  setVoiceProcessing(true);
  try {
    const res = await fetch("/api/voice-to-md", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) throw new Error("Failed to fetch from API");

    const { markdown } = await res.json();
    setVoiceMarkdown(markdown);
  } catch (err) {
    console.error("Error processing voice input:", err);
    setVoiceMarkdown("Error processing voice input. Please try again.");
  } finally {
    setVoiceProcessing(false);
  }
};

const stopVoiceRecording = () => {
  if (recognitionRef.current) {
    recognitionRef.current.stop();
    setListening(false);
  }
};

 useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const handlePlaceVoiceText = () => {
    if (voiceMarkdown && editorViewRef.current) {
      let cleanMarkdown = voiceMarkdown
      .trim()
      .replace(/^```(?:markdown)?\s*/i, "") // remove start
      .replace(/```$/, "") // remove end
      .trim();

    if (cleanMarkdown.length === 0) {
      alert("No voice input detected.");
      return;
    }
      // Insert the voice markdown at the current cursor position
      const view = editorViewRef.current;
      const pos = view.state.selection.main.head;
      view.dispatch({
        changes: { from: pos, insert: cleanMarkdown + " " },
        selection: { anchor: pos + cleanMarkdown.length + 1 }
      });
    }
    setShowVoicePopup(false);
    setVoiceMarkdown("");
  };

  const handleRecordAgain = () => {
    setVoiceMarkdown("");
    setListening(false);
    setVoiceProcessing(false);
  };


  const ImprovePopup = React.memo(() => {
  if (!showImprovePopup) return null;

  return (
    <div
      className={`fixed z-50 top-1/2 right-2 transform -translate-y-1/2 w-80 p-4 rounded-lg shadow-xl border ${
        darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}
      style={{ maxHeight: "80vh" }} // CHANGE: limit popup height
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium flex items-center">
          <Wand className="w-4 h-4 mr-2" />
          Improved Text
        </h3>
        <button
          onClick={() => setShowImprovePopup(false)}
          className={`p-1 rounded-full ${
            darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isImproving ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <>
          {/* CHANGE: wrap content in a scrollable div */}
          <div
            className="overflow-y-auto pr-1 mb-4" // CHANGE
            style={{ maxHeight: "50vh" }} // CHANGE: scroll area height
          >
            <div
              className={`p-3 rounded ${
                darkMode ? "bg-gray-700" : "bg-gray-100"
              }`}
            >
              <h4 className="text-xs font-medium mb-1">Original:</h4>
              <p className="text-sm mb-3">{improveButtonState.selectedText}</p>
              <h4 className="text-xs font-medium mb-1">Improved:</h4>
              <p className="text-sm">{improvedText}</p>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleReplaceImprovedText}
              className={`flex-1 flex items-center justify-center py-2 px-3 rounded ${
                darkMode
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Replace
            </button>
            <button
              onClick={handleRegenerateImprovedText}
              className={`flex-1 flex items-center justify-center py-2 px-3 rounded ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate
            </button>
          </div>
        </>
      )}
    </div>
  );
});

  const VoicePopup = React.memo(() => {
  if (!showVoicePopup) return null;

  return (
    <div
      className={`fixed z-50 top-1/2 right-4 transform -translate-y-1/2 w-80 p-4 rounded-lg shadow-xl border ${
        darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}
      style={{ maxHeight: "80vh" }} // CHANGE: limit popup height
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium flex items-center">
          <MicIcon className="w-4 h-4 mr-2" />
          Voice to Markdown
        </h3>
        <button
          onClick={() => {
            setShowVoicePopup(false);
            stopVoiceRecording();
          }}
          className={`p-1 rounded-full ${
            darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* CHANGE: wrap main content in scrollable area */}
      <div
        className="overflow-y-auto pr-1 mb-4" // CHANGE
        style={{ maxHeight: "50vh" }} // CHANGE: scroll area height
      >
        {!voiceMarkdown ? (
          <>
            <div className="mb-4 text-center">
              {listening ? (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-2">
                    <button>
                      <MicOff
                        className="w-8 h-8 text-red-600 dark:text-red-300 cursor-pointer"
                        onClick={stopVoiceRecording}
                      />
                    </button>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-300 animate-pulse">
                    Listening... Click to stop
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-2">
                    <button>
                      <Mic
                        className="w-8 h-8 text-blue-600 dark:text-blue-300 cursor-pointer"
                        onClick={startVoiceRecording}
                      />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {voiceProcessing
                      ? "Processing..."
                      : "Click to start recording"}
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div
              className={`p-3 rounded ${
                darkMode ? "bg-gray-700" : "bg-gray-100"
              }`}
            >
              <h4 className="text-xs font-medium mb-1">Generated Markdown:</h4>
              <pre className="text-sm whitespace-pre-wrap">
                {voiceMarkdown}
              </pre>
            </div>
          </>
        )}
      </div>

      {/* Buttons stay fixed below the scroll area */}
      {voiceMarkdown && (
        <div className="flex space-x-2">
          <button
            onClick={handlePlaceVoiceText}
            className={`flex-1 flex items-center justify-center py-2 px-3 rounded ${
              darkMode
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Place in Editor
          </button>
          <button
            onClick={handleRecordAgain}
            className={`flex-1 flex items-center justify-center py-2 px-3 rounded ${
              darkMode
                ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                : "bg-gray-200 hover:bg-gray-300 text-gray-700"
            }`}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Record Again
          </button>
        </div>
      )}
    </div>
  );
});


  ImprovePopup.displayName = "ImprovePopup";
  VoicePopup.displayName = "VoicePopup";

const handleDescribeClick = async (imageUrl: string) => {
  const res = await fetch('/api/image-description', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  });

  const data = await res.json();
  console.log('Image Description:', data.description);
  alert(`Image Description:\n\n${data.description}`);
};

const writeToEditorWithAnimation = useCallback(async (content: string) => {
  if (!editorViewRef.current || isWritingToEditor) return;
  
  setIsWritingToEditor(true);
  
  try {
    const view = editorViewRef.current;
    const startPos = view.state.selection.main.head;
    
    // Clean the content first
    const cleanContent = content
      .trim()
      .replace(/^```(?:markdown)?\s*/i, "")
      .replace(/```$/, "")
      .trim();
    
    if (!cleanContent) {
      setIsWritingToEditor(false);
      return;
    }
    //

    const normalizedContent = cleanContent
      .replace(/\r\n/g, '\n')           // Convert Windows line endings
      .replace(/\r/g, '\n')             // Convert old Mac line endings
      .replace(/\n{3,}/g, '\n\n')       // Replace 3+ consecutive newlines with 2
      .replace(/\n\s*\n/g, '\n\n');     // Remove whitespace between paragraphs

    const fullContent = '\n' + normalizedContent + '\n';

    // **CRITICAL FIX**: Disable Yjs observer temporarily to prevent interference
    const ytext = doc.getText("codemirror");
    let yjsObserverDisabled = true;
    
    // Insert all content at once in Yjs (silently)
    // doc.transact(() => {
    //   ytext.insert(startPos, fullContent);
    // });
    
    // Now animate character by character in the editor view only
    let currentPos = startPos;
    
    for (let i = 0; i < fullContent.length; i++) {
      const char = fullContent[i];
      
      // Validate position is still within bounds
      const docLength = view.state.doc.length;
      if (currentPos > docLength) break;
      
      // **CRITICAL FIX**: Use a single dispatch with the exact character position
      view.dispatch({
        changes: { from: currentPos, insert: char },
        selection: { anchor: currentPos + 1 }
      });
      

      if (i % 10 === 0 || i === fullContent.length - 1) {
        doc.transact(() => {
          const ytext = doc.getText("codemirror");
          const currentContent = view.state.doc.toString();
          ytext.delete(0, ytext.length);
          ytext.insert(0, currentContent);
        });
      }

      currentPos += 1;
      
      // **CRITICAL FIX**: Use requestAnimationFrame for smooth rendering
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 10); // Adjust speed here (25ms = smooth, 50ms = slower)
        });
      });
    }
    
    // Re-enable Yjs observer
    yjsObserverDisabled = false;

    // doc.transact(() => {
    //   ytext.insert(startPos, fullContent);
    // });
    
  } catch (error) {
    console.error('Error in writeToEditorWithAnimation:', error);
  } finally {
    setIsWritingToEditor(false);
  }
}, [doc, isWritingToEditor]);

useEffect(() => {
  // Expose function globally but prevent multiple calls
  if (!isWritingToEditor) {
    (window as any).writeToEditor = writeToEditorWithAnimation;
  }
  
  return () => {
    delete (window as any).writeToEditor;
  };
}, [writeToEditorWithAnimation, isWritingToEditor]);


useEffect(() => {
  (window as any).writeToEditor = writeToEditorWithAnimation;
  
  return () => {
    delete (window as any).writeToEditor;
  };
}, []); 

  return (
    <div
      className={`markflow-editor flex flex-col h-screen max-w-full overflow-hidden ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-800"
      } ${isFullScreen ? "fixed inset-0 z-50" : "relative"}`}
    >
      <div
        className={`${
          darkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        } border-b px-4 py-3`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            {getConnectionStatusDisplay()}
            {connectedUsers.size > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Active Users:</span>
                <div className="flex -space-x-1">
                  {Array.from(connectedUsers.entries())
                    .slice(0, 5)
                    .map(([userId, user]) => (
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
          <div className="flex items-center space-x-1">
           
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className={`p-2 rounded transition-colors ${
                  darkMode
                    ? "text-gray-300 hover:text-white hover:bg-gray-700"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
                title={isDocumentSidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
              >
                {isDocumentSidebarOpen ? (
                  <PanelLeftClose className="w-5 h-5" />
                ) : (
                  <PanelLeft className="w-5 h-5" />
                )}
              </button>
            )}
             <button
              onClick={() => router.push("/dashboard")}
              className={`p-2 rounded transition-colors ${
                darkMode
                  ? "text-gray-300 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
              }`}
              title="Back to Dashboard"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => {
                const newTitle = e.target.value;
                setTitle(newTitle);
                doc.transact(() => {
                  if (ytitle.toString() !== newTitle) {
                    ytitle.delete(0, ytitle.length);
                    ytitle.insert(0, newTitle);
                  }
                });
              }}
              className={`text-xl font-semibold border-none outline-none rounded px-2 py-1 flex-1 max-w-sm ${
                darkMode
                  ? "bg-gray-800 text-white focus:bg-gray-700"
                  : "bg-transparent text-gray-800 focus:bg-gray-50"
              }`}
              placeholder="Document title..."
            />
            <div
              className={`flex items-center pr-2 space-x-2 text-sm ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {getSaveStatusIcon()}
              <span>{getSaveStatusText()}</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <div className="relative" ref={themePickerRef}>
              <button
                onClick={() => setShowThemePicker(!showThemePicker)}
                className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                  darkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Palette className="w-4 h-4 mr-2" />
                Theme
              </button>
              {showThemePicker && (
                <div
                  className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg z-10 ${
                    darkMode
                      ? "bg-gray-800 border border-gray-700"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div className="p-2">
                    <button
                      onClick={handleToggleDarkMode}
                      className={`flex items-center w-full px-3 py-2 text-sm rounded ${
                        darkMode
                          ? "hover:bg-gray-700 text-gray-300"
                          : "hover:bg-gray-100 text-gray-700"
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
                  ? "bg-blue-900 text-blue-200 hover:bg-blue-800"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
              disabled={saveStatus === "saving"}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </button>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                darkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {showPreview ? (
                <Edit3 className="w-4 h-4 mr-2" />
              ) : (
                <Eye className="w-4 h-4 mr-2" />
              )}
              {showPreview ? "Edit Only" : "Preview"}
            </button>
            {showPreview && (
              <button
                onClick={compileMarkdown}
                disabled={isCompiling}
                className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                  isCompiling ? "opacity-50 cursor-not-allowed" : ""
                } ${
                  darkMode
                    ? "bg-purple-900 text-purple-200 hover:bg-purple-800"
                    : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                }`}
                title="Compile markdown to preview"
              >
                {isCompiling ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                {isCompiling ? "Compiling..." : "Compile"}
              </button>
            )}
            {/* <button
              onClick={toggleAutoCompile}
              className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                autoCompile
                  ? darkMode
                    ? "bg-green-900 text-green-200"
                    : "bg-green-100 text-green-700"
                  : darkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              title={
                autoCompile ? "Disable auto-compile" : "Enable auto-compile"
              }
            >
              <div
                className={`w-2 h-2 rounded-full mr-2 ${
                  autoCompile ? "bg-green-500" : "bg-gray-400"
                }`}
              ></div>
              Auto
            </button> */}
            <button
              onClick={handleCopy}
              className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                darkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </button>
            <button
               onClick={exportRightPaneAsPdf}
                className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                  darkMode
                    ? "bg-green-900 text-green-200 hover:bg-green-800"
                    : "bg-green-100 text-green-700 hover:bg-green-200"
                }`}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
            <button
              onClick={toggleFullScreen}
              className={`flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                darkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {isFullScreen ? (
                <Minimize className="w-4 h-4 mr-2" />
              ) : (
                <Maximize className="w-4 h-4 mr-2" />
              )}
              {isFullScreen ? "Exit Fullscreen" : "Full"}
            </button>
            {isWritingToEditor && (
              <span className="flex items-center text-blue-600 dark:text-blue-400">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2" />
                Writing to editor...
              </span>
            )}
          </div>
        </div>
      </div>
      <div
        className={`${
          darkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        } border-b px-4 py-2`}
      >
        <div className="flex items-center space-x-1">
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("**", 2)}
            icon={Bold}
            label="Bold"
          />
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("*", 1)}
            icon={Italic}
            label="Italic"
          />
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("`", 1)}
            icon={Code}
            label="Code"
          />
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("[text](url)", 1)}
            icon={Link}
            label="Link"
          />
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("- ", 2)}
            icon={List}
            label="Unordered List"
          />
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("1. ", 3)}
            icon={ListOrdered}
            label="Ordered List"
          />
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("$$\n\n$$", 3)}
            icon={MathIcon}
            label="Math Block"
          />
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("$", 1)}
            icon={Subscript}
            label="Inline Math"
          />
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("> ", 2)}
            icon={Quote}
            label="Blockquote"
          />
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("---\n", 4)}
            icon={Minus}
            label="Horizontal Rule"
          />
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("$$\n\n$$", 3)}
            icon={MathIcon}
            label="Math Block"
          />
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |", 2)}
            icon={Table}
            label="Table"
          />
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("[^1]", 3)}
            icon={Hash}
            label="Footnote"
          />
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("~~", 2)}
            icon={Strikethrough}
            label="Strikethrough"
          />
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("~", 1)}
            icon={Subscript}
            label="Subscript"
          />
          <EditorToolbarButton
            onClick={() => insertTextAtCursor("^", 1)}
            icon={Superscript}
            label="Superscript"
          />
           <EditorToolbarButton
              onClick={() => setImproveMode(!improveMode)}
              icon={Wand}
              label={improveMode ? "Exit Improve Mode" : "Improve Text"}
            />
            <EditorToolbarButton
              icon={MicIcon}
              label="Voice Input"
              onClick={handleVoiceInput}
            />
            {/* <EditorToolbarButton
              icon={ImageIcon}
              label="Describe Image"
              onClick={() => handleDescribeClick("https://audyvywtoxcbcnjttzji.supabase.co/storage/v1/object/public/uploads/uploads/Show%20of%20Power%20Baton.png")}
            /> */}
        </div>
      </div>

      <div className={`flex flex-1 overflow-hidden transition-all duration-300 ${
        isDocumentSidebarOpen ? 'pl-0' : ''
      } ${
        isCommentSidebarOpen ? 'pr-0' : ''
      }`}>
        <div
          className={`transition-all duration-300 ${
            showPreview ? "w-1/2" : "w-full"
          }`}
        >
          <div
            ref={editorRef}
            className={`h-full w-full font-mono text-sm leading-relaxed overflow-auto markflow-codemirror ${
              darkMode
                ? "bg-gray-900 text-gray-100"
                : "bg-white text-gray-800"
            }`}
            style={{
              WebkitUserSelect: "text",
              userSelect: "text",
              cursor: "text",
              wordWrap: "break-word",
              overflowWrap: "break-word",
              whiteSpace: "pre-wrap",
            }}
          />
        </div>

        {showPreview && (
          <div
            className={`markflow-preview w-1/2 h-full flex flex-col border-l transition-all duration-300 ${
              darkMode
                ? "bg-gray-800 border-gray-700"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div
              className={`flex-shrink-0 px-4 py-2 border-b ${
                darkMode
                  ? "bg-gray-700 border-gray-600 text-gray-200"
                  : "bg-gray-100 border-gray-200 text-gray-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Preview</span>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isProcessing
                        ? "bg-yellow-500"
                        : processedContent
                        ? "bg-green-500"
                        : "bg-gray-400"
                    }`}
                  ></div>
                  <span className="text-xs">
                    {isProcessing
                      ? "Processing..."
                      : processedContent
                      ? "Up to date"
                      : "Not compiled"}
                  </span>
                  <Eye className="w-4 h-4" />
                </div>
              </div>
            </div>
            <div
              ref={previewRef}
              className="flex-1 overflow-auto"
              onScroll={() => {
                if (scrollSyncTimeoutRef.current) {
                  clearTimeout(scrollSyncTimeoutRef.current);
                }
              }}
            >
              <div id="pdf-content" className="flex-1 p-6">
                {isProcessing ? (
                  <div className={`flex flex-col items-center justify-center h-64 ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-sm">Processing markdown...</p>
                  </div>
                ) : processedContent ? (
                  <div 
                    className={`prose prose-lg max-w-none ${
                      darkMode ? "prose-invert" : ""
                    }`}
                    style={{
                      fontSize: "16px",
                      lineHeight: "1.6",
                      wordWrap: "break-word",
                      overflowWrap: "break-word",
                    }}
                    dangerouslySetInnerHTML={{
                      __html: processedContent
                    }}
                  />
                ) : (
                  <div
                    className={`flex flex-col items-center justify-center h-64 ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    <Play className="w-12 h-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">
                      Preview not compiled
                    </p>
                    <p className="text-sm text-center">
                      Click the &quot;Compile&quot; button to render the
                      markdown preview,
                      <br />
                      or enable &quot;Auto&quot; for real-time compilation.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className={`border-t px-4 py-2 text-xs transition-colors duration-200 ${
          darkMode
            ? "bg-gray-800 border-gray-700 text-gray-400"
            : "bg-gray-100 border-gray-200 text-gray-500"
        }`}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span>Lines: {markdownContent.split("\n").length}</span>
            <span>Characters: {markdownContent.length}</span>
            <span>
              Words:{" "}
              {
                markdownContent.split(/\s+/).filter((word) => word.length > 0)
                  .length
              }
            </span>
            {showPreview && (
              <span className="flex items-center">
                <Eye className="w-3 h-3 mr-1" />
                {autoCompile ? "Auto Preview" : "Manual Preview"}
              </span>
            )}
            {showPreview && (
              <span
                className={`flex items-center text-xs ${
                  compiledContent === markdownContent
                    ? "text-green-600 dark:text-green-400"
                    : "text-yellow-600 dark:text-yellow-400"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mr-1 ${
                    compiledContent === markdownContent
                      ? "bg-green-500"
                      : "bg-yellow-500"
                  }`}
                ></div>
                {compiledContent === markdownContent
                  ? "Compiled"
                  : "Needs compile"}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <span>LaTeX & Math supported</span>
            <span>Auto-save enabled</span>
            {connectionStatus === "connected" && connectedUsers.size > 1 && (
              <span className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                {connectedUsers.size} collaborator
                {connectedUsers.size > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>
      <style jsx global>{`
        /* Container width constraints */
        .markflow-editor {
          max-width: 100vw !important;
          width: 100% !important;
          overflow-x: hidden !important;
        }
        
        /* Editor and preview width constraints */
        .markflow-codemirror {
          max-width: 100% !important;
          overflow-x: auto !important;
        }
        
        .markflow-preview {
          max-width: 50% !important;
          overflow-x: auto !important;
        }

        /* Text wrapping for CodeMirror editor */
        .cm-editor {
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
        
        .cm-line {
          white-space: pre-wrap !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }

        // /* Fix line number ordering bug - prevent 9, 99, 999 appearing before line 1 */
        // .cm-lineNumbers {
        //   font-variant-numeric: tabular-nums !important;
        //   text-align: right !important;
        //   direction: ltr !important;
        //   unicode-bidi: isolate !important;
        // }
        
        // .cm-lineNumbers .cm-gutterElement {
        //   text-align: right !important;
        //   direction: ltr !important;
        //   unicode-bidi: isolate !important;
        //   min-width: 100% !important;
        // }

        /* Comment sidebar layout adjustments */
        .pr-80 {
          padding-right: 20rem !important;
          transition: padding-right 0.3s ease !important;
        }
        
        /* Document sidebar layout adjustments */
        .pl-64 {
          padding-left: 16rem !important;
          transition: padding-left 0.3s ease !important;
        }
        
        /* Responsive width adjustments for comment sidebar */
        .pr-80 .markflow-codemirror,
        .pr-80 .markflow-preview {
          max-width: calc(50% - 10rem) !important;
        }
        
        /* Responsive width adjustments for document sidebar */
        .pl-64 .markflow-codemirror,
        .pl-64 .markflow-preview {
          max-width: calc(50% - 8rem) !important;
        }
        
        /* Combined sidebar adjustments */
        .pl-64.pr-80 .markflow-codemirror,
        .pl-64.pr-80 .markflow-preview {
          max-width: calc(50% - 18rem) !important;
        }
        
        /* Ensure proper text wrapping in narrow widths */
        @media (max-width: 1200px) {
          .pr-80 {
            padding-right: 16rem !important;
          }
          .pl-64 {
            padding-left: 14rem !important;
          }
        }
        
        @media (max-width: 1024px) {
          .pr-80 {
            padding-right: 14rem !important;
          }
          .pl-64 {
            padding-left: 12rem !important;
          }
        }

        /* Table styles for GitHub Flavored Markdown */
        .prose table {
          border-collapse: collapse !important;
          width: 100% !important;
          margin: 1.5rem 0 !important;
          border: 1px solid ${darkMode ? "#4a5568" : "#e5e7eb"} !important;
          border-radius: 0.5rem !important;
          overflow: hidden !important;
        }
        .prose thead {
          background-color: ${darkMode ? "#2d3748" : "#f9fafb"} !important;
        }
        .prose th {
          padding: 0.75rem 1rem !important;
          text-align: left !important;
          font-weight: 600 !important;
          border-bottom: 2px solid ${darkMode ? "#4a5568" : "#d1d5db"} !important;
          border-right: 1px solid ${darkMode ? "#4a5568" : "#e5e7eb"} !important;
          color: ${darkMode ? "#f7fafc" : "#374151"} !important;
        }
        .prose th:last-child {
          border-right: none !important;
        }
        .prose td {
          padding: 0.75rem 1rem !important;
          border-bottom: 1px solid ${darkMode ? "#4a5568" : "#e5e7eb"} !important;
          border-right: 1px solid ${darkMode ? "#4a5568" : "#e5e7eb"} !important;
          color: ${darkMode ? "#e2e8f0" : "#374151"} !important;
        }
        .prose td:last-child {
          border-right: none !important;
        }
        .prose tbody tr:hover {
          background-color: ${darkMode ? "rgba(74, 85, 104, 0.3)" : "rgba(249, 250, 251, 0.8)"} !important;
        }
        .prose tbody tr:last-child td {
          border-bottom: none !important;
        }

        /* Task list styles */
        .prose .task-list-item {
          list-style: none !important;
          margin-left: -1.5rem !important;
          padding-left: 0 !important;
          display: flex !important;
          align-items: flex-start !important;
          gap: 0.5rem !important;
        }
        .prose .task-list-item input[type="checkbox"] {
          margin: 0.25rem 0 0 0 !important;
          accent-color: ${darkMode ? "#63b3ed" : "#3b82f6"} !important;
          cursor: pointer !important;
        }
        .prose .task-list-item input[type="checkbox"]:checked + span {
          text-decoration: line-through !important;
          color: ${darkMode ? "#a0aec0" : "#6b7280"} !important;
        }

        /* Syntax highlighting styles */
        .prose .hljs {
          display: block !important;
          overflow-x: auto !important;
          padding: 1rem !important;
          background-color: ${darkMode ? "#2d3748" : "#f8fafc"} !important;
          color: ${darkMode ? "#e2e8f0" : "#334155"} !important;
          border-radius: 0.5rem !important;
          font-size: 0.875rem !important;
          line-height: 1.5 !important;
        }
        .prose .hljs-comment,
        .prose .hljs-quote {
          color: ${darkMode ? "#a0aec0" : "#64748b"} !important;
          font-style: italic !important;
        }
        .prose .hljs-keyword,
        .prose .hljs-selector-tag,
        .prose .hljs-subst {
          color: ${darkMode ? "#f687b3" : "#db2777"} !important;
          font-weight: 600 !important;
        }
        .prose .hljs-number,
        .prose .hljs-literal,
        .prose .hljs-variable,
        .prose .hljs-template-variable,
        .prose .hljs-tag .hljs-attr {
          color: ${darkMode ? "#fbb6ce" : "#be185d"} !important;
        }
        .prose .hljs-string,
        .prose .hljs-doctag {
          color: ${darkMode ? "#68d391" : "#059669"} !important;
        }
        .prose .hljs-title,
        .prose .hljs-section,
        .prose .hljs-selector-id {
          color: ${darkMode ? "#63b3ed" : "#3b82f6"} !important;
          font-weight: 600 !important;
        }
        .prose .hljs-subst {
          font-weight: normal !important;
        }
        .prose .hljs-type,
        .prose .hljs-class .hljs-title {
          color: ${darkMode ? "#fbb6ce" : "#be185d"} !important;
          font-weight: 600 !important;
        }
        .prose .hljs-tag,
        .prose .hljs-name,
        .prose .hljs-attribute {
          color: ${darkMode ? "#81e6d9" : "#0891b2"} !important;
          font-weight: normal !important;
        }
        .prose .hljs-regexp,
        .prose .hljs-link {
          color: ${darkMode ? "#f6ad55" : "#ea580c"} !important;
        }
        .prose .hljs-symbol,
        .prose .hljs-bullet {
          color: ${darkMode ? "#a78bfa" : "#7c3aed"} !important;
        }
        .prose .hljs-built_in,
        .prose .hljs-builtin-name {
          color: ${darkMode ? "#fbb6ce" : "#be185d"} !important;
        }
        .prose .hljs-meta {
          color: ${darkMode ? "#a0aec0" : "#64748b"} !important;
        }
        .prose .hljs-deletion {
          background-color: ${darkMode ? "rgba(252, 165, 165, 0.2)" : "rgba(254, 202, 202, 0.3)"} !important;
        }
        .prose .hljs-addition {
          background-color: ${darkMode ? "rgba(167, 243, 208, 0.2)" : "rgba(187, 247, 208, 0.3)"} !important;
        }
        .prose .hljs-emphasis {
          font-style: italic !important;
        }
        .prose .hljs-strong {
          font-weight: bold !important;
        }

        /* Enhanced list styles */
        .prose ul ul,
        .prose ul ol,
        .prose ol ul,
        .prose ol ol {
          margin-top: 0.5rem !important;
          margin-bottom: 0.5rem !important;
        }
        .prose ul li {
          position: relative !important;
        }
        .prose ul li::marker {
          color: ${darkMode ? "#63b3ed" : "#3b82f6"} !important;
        }
        .prose ol li::marker {
          color: ${darkMode ? "#63b3ed" : "#3b82f6"} !important;
          font-weight: 600 !important;
        }

        /* Enhanced inline code styles */
        .prose :not(pre) > code {
          font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace !important;
          font-weight: 500 !important;
        }

        /* Footnote styles */
        .prose .footnote-ref {
          color: ${darkMode ? "#63b3ed" : "#3b82f6"} !important;
          text-decoration: none !important;
          font-size: 0.75rem !important;
          vertical-align: super !important;
          font-weight: 600 !important;
        }
        .prose .footnote-ref:hover {
          text-decoration: underline !important;
        }
        .prose .footnotes {
          margin-top: 2rem !important;
          padding-top: 1rem !important;
          border-top: 1px solid ${darkMode ? "#4a5568" : "#e5e7eb"} !important;
          font-size: 0.875rem !important;
        }
        .prose .footnotes ol {
          padding-left: 1rem !important;
        }
        .prose .footnote-backref {
          color: ${darkMode ? "#63b3ed" : "#3b82f6"} !important;
          text-decoration: none !important;
          margin-left: 0.5rem !important;
        }

        .cm-editor .cm-cursor {
          border-left: 2px solid #60a5fa !important;
          margin-left: -1px !important;
          height: 1.2em !important;
          animation: cm-blink 1.2s infinite !important;
          display: block !important;
        }

        .cm-comment-highlight {
          background-color: rgba(99, 179, 237, 0.2);
          border-bottom: 2px solid rgba(99, 179, 237, 0.6);
          cursor: pointer;
        }
        
        .cm-comment-highlight-active {
          background-color: rgba(99, 179, 237, 0.4);
          border-bottom: 2px solid rgba(99, 179, 237, 0.9);
          cursor: pointer;
        }
        .cm-editor.cm-focused .cm-cursor {
          border-left: 2px solid #60a5fa !important;
          display: block !important;
        }
        .cm-editor .cm-content {
          caret-color: #60a5fa !important;
        }
        .cm-editor .cm-ySelectionInfo {
          position: absolute !important;
          top: -1.8em !important;
          left: -1px !important;
          font-size: 0.7em !important;
          font-family:
            system-ui,
            -apple-system,
            sans-serif !important;
          font-weight: 600 !important;
          line-height: 1.2 !important;
          padding: 0.2em 0.5em !important;
          color: white !important;
          white-space: nowrap !important;
          border-radius: 6px !important;
          z-index: 1000 !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
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
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes y-cursor-flash {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            opacity: 1;
          }
        }
        .markflow-codemirror .cm-editor {
          height: 100%;
          font-family:
            "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier,
            monospace;
          font-size: 0.875rem;
          line-height: 1.625;
          -webkit-user-select: text !important;
          user-select: text !important;
        }
        .markflow-codemirror .cm-content {
          padding: 1.5rem !important;
          min-height: calc(100vh - 200px) !important;
          max-width: 100% !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          white-space: pre-wrap !important;
          -webkit-user-select: text !important;
          user-select: text !important;
          cursor: text !important;
        }
        .markflow-codemirror .cm-editor.cm-focused {
          outline: none;
        }
        .markflow-preview {
          font-family:
            -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen",
            "Ubuntu", "Cantarell", sans-serif;
        }
        .markflow-preview .prose {
          max-width: none !important;
          width: 100% !important;
        }
        .preview-content {
          display: flex;
          flex-direction: column;
        }
        .preview-line {
          display: flex;
          align-items: flex-start;
          min-height: 1.5rem;
          line-height: 1.5;
          word-wrap: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
          margin: 0;
          padding: 0;
        }
        .preview-line span {
          width: 100%;
          display: inline-block;
          word-wrap: break-word;
          overflow-wrap: break-word;
          white-space: pre-wrap;
        }
        .preview-line:hover {
          background-color: ${darkMode
            ? "rgba(59, 130, 246, 0.1)"
            : "rgba(59, 130, 246, 0.05)"} !important;
        }
        .preview-content {
          width: 100%;
        }
        .prose {
          color: ${darkMode ? "#e2e8f0" : "#374151"};
          font-size: 16px !important;
          line-height: 1.5 !important;
        }
        .prose h1 {
          font-size: 2.25rem !important;
          font-weight: 700 !important;
          margin-top: 0 !important;
          margin-bottom: 1rem !important;
          border-bottom: 2px solid ${darkMode ? "#4a5568" : "#e5e7eb"};
          padding-bottom: 0.5rem !important;
          color: ${darkMode ? "#f7fafc" : "#111827"};
          line-height: 1.2 !important;
        }
        .prose h2 {
          font-size: 1.875rem !important;
          font-weight: 600 !important;
          margin-top: 2rem !important;
          margin-bottom: 1rem !important;
          border-bottom: 1px solid ${darkMode ? "#4a5568" : "#e5e7eb"};
          padding-bottom: 0.4rem !important;
          color: ${darkMode ? "#e2e8f0" : "#1f2937"};
          line-height: 1.3 !important;
        }
        .prose h3 {
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          margin-top: 1.5rem !important;
          margin-bottom: 0.75rem !important;
          color: ${darkMode ? "#cbd5e0" : "#374151"};
          line-height: 1.4 !important;
        }
        .prose p {
          margin-bottom: 1.25rem !important;
          line-height: 1.7 !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
        .prose ul,
        .prose ol {
          margin-left: 1.5rem !important;
          margin-bottom: 1.25rem !important;
          padding-left: 0.5rem !important;
        }
        .prose li {
          margin-bottom: 0.5rem !important;
          line-height: 1.6 !important;
        }
        .prose pre {
          background-color: ${darkMode ? "#2d3748" : "#f7fafc"} !important;
          padding: 1.25rem !important;
          border-radius: 0.5rem !important;
          overflow-x: auto !important;
          margin-bottom: 1.25rem !important;
          border: 1px solid ${darkMode ? "#4a5568" : "#e2e8f0"} !important;
          font-size: 0.875rem !important;
          line-height: 1.5 !important;
        }
        .prose code {
          background-color: ${darkMode ? "#2d3748" : "#f1f5f9"} !important;
          padding: 0.25rem 0.5rem !important;
          border-radius: 0.25rem !important;
          font-size: 0.875rem !important;
          color: ${darkMode ? "#f6ad55" : "#dc2626"} !important;
          border: 1px solid ${darkMode ? "#4a5568" : "#e2e8f0"} !important;
        }
        .prose pre code {
          background-color: transparent !important;
          padding: 0 !important;
          border: none !important;
          color: ${darkMode ? "#e2e8f0" : "#1f2937"} !important;
        }
        .prose blockquote {
          border-left: 0.25rem solid ${darkMode ? "#63b3ed" : "#3b82f6"} !important;
          padding-left: 1.5rem !important;
          padding-right: 1rem !important;
          padding-top: 0.5rem !important;
          padding-bottom: 0.5rem !important;
          color: ${darkMode ? "#a0aec0" : "#6b7280"} !important;
          margin-bottom: 1.25rem !important;
          font-style: italic !important;
          background-color: ${darkMode
            ? "rgba(99, 179, 237, 0.1)"
            : "rgba(59, 130, 246, 0.05)"} !important;
          border-radius: 0 0.25rem 0.25rem 0 !important;
          position: relative !important;
        }
        
        .prose blockquote::before {
          content: 'Reviewer Comment' !important;
          font-style: normal !important;
          font-weight: bold !important;
          display: block !important;
          margin-bottom: 0.5rem !important;
          color: ${darkMode ? "#63b3ed" : "#3b82f6"} !important;
          font-size: 0.875rem !important;
          text-transform: uppercase !important;
          letter-spacing: 0.05em !important;
        }
        
        .prose blockquote p {
          margin-bottom: 0.75rem !important;
        }
        
        .prose table {
          width: 100% !important;
          border-collapse: collapse !important;
          margin: 1.5rem 0 !important;
          font-size: 0.875rem !important;
        }
        
        .prose th {
          background-color: ${darkMode ? "#2d3748" : "#f8fafc"} !important;
          border: 1px solid ${darkMode ? "#4a5568" : "#e2e8f0"} !important;
          padding: 0.75rem !important;
          text-align: left !important;
          font-weight: 600 !important;
          color: ${darkMode ? "#e2e8f0" : "#374151"} !important;
        }
        
        .prose td {
          border: 1px solid ${darkMode ? "#4a5568" : "#e2e8f0"} !important;
          padding: 0.75rem !important;
          color: ${darkMode ? "#e2e8f0" : "#374151"} !important;
        }
        
        .prose tr:nth-child(even) {
          background-color: ${darkMode ? "rgba(45, 55, 72, 0.3)" : "rgba(248, 250, 252, 0.5)"} !important;
        }
        
        .prose .footnotes {
          margin-top: 2rem !important;
          padding-top: 1rem !important;
          border-top: 1px solid ${darkMode ? "#4a5568" : "#e2e8f0"} !important;
          font-size: 0.875rem !important;
          color: ${darkMode ? "#a0aec0" : "#6b7280"} !important;
        }
        
        .prose .footnotes ol {
          margin-left: 1rem !important;
        }
        
        .prose .footnotes li {
          margin-bottom: 0.25rem !important;
        }
        
        .prose sub {
          font-size: 0.75em !important;
          vertical-align: sub !important;
        }
        
        .prose sup {
          font-size: 0.75em !important;
          vertical-align: super !important;
        }
        
        .prose abbr {
          border-bottom: 1px dotted ${darkMode ? "#a0aec0" : "#6b7280"} !important;
          cursor: help !important;
        }
        .prose hr {
          border: none !important;
          border-top: 2px solid ${darkMode ? "#4a5568" : "#e5e7eb"} !important;
          margin: 2rem 0 !important;
        }
        .prose a {
          color: ${darkMode ? "#63b3ed" : "#3b82f6"} !important;
          text-decoration: underline !important;
          text-underline-offset: 2px !important;
          transition: color 0.2s ease !important;
        }
        .prose a:hover {
          color: ${darkMode ? "#4299e1" : "#2563eb"} !important;
          text-decoration: underline !important;
        }
        .prose del {
          text-decoration: line-through !important;
          color: ${darkMode ? "#a0aec0" : "#6b7280"} !important;
        }
        .prose strong {
          font-weight: 600 !important;
          color: ${darkMode ? "#f7fafc" : "#111827"} !important;
        }
        .prose em {
          font-style: italic !important;
          color: ${darkMode ? "#e2e8f0" : "#374151"} !important;
        }
        .math-block {
          display: block !important;
          overflow-x: auto !important;
          margin: 1.5rem 0 !important;
          padding: 1rem !important;
          border-radius: 0.5rem !important;
          text-align: center !important;
          background-color: ${darkMode
            ? "rgba(45, 55, 72, 0.8)"
            : "rgba(248, 250, 252, 0.8)"} !important;
          border: 1px solid ${darkMode ? "#4a5568" : "#e2e8f0"} !important;
          backdrop-filter: blur(4px) !important;
        }
        .math-inline {
          display: inline-block !important;
          white-space: nowrap !important;
          padding: 0.2rem 0.4rem !important;
          margin: 0 0.1rem !important;
          border-radius: 0.25rem !important;
          background-color: ${darkMode
            ? "rgba(45, 55, 72, 0.6)"
            : "rgba(248, 250, 252, 0.6)"} !important;
          border: 1px solid ${darkMode ? "#4a5568" : "#e2e8f0"} !important;
        }
        .markflow-preview .MathJax {
          margin: 1.5rem 0 !important;
          font-size: 1.1em !important;
        }
        .markflow-preview .MathJax_Display {
          margin: 1.5rem 0 !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          text-align: center !important;
        }

        /* KaTeX Math Rendering Styles */
        .katex {
          color: ${darkMode ? "#e2e8f0" : "#374151"} !important;
          font-size: 1.1em !important;
        }
        .katex-display {
          margin: 1.5rem 0 !important;
          text-align: center !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
        }
        .katex-display > .katex {
          display: inline-block !important;
          text-align: initial !important;
        }
        .katex .base {
          position: relative !important;
        }
        .katex .strut {
          display: inline-block !important;
        }
        .katex .frac-line {
          border-bottom-color: ${darkMode ? "#e2e8f0" : "#374151"} !important;
        }
        .katex .mord {
          color: ${darkMode ? "#e2e8f0" : "#374151"} !important;
        }
        .katex .mbin, .katex .mrel {
          color: ${darkMode ? "#a0aec0" : "#6b7280"} !important;
        }
        .katex .mopen, .katex .mclose {
          color: ${darkMode ? "#cbd5e0" : "#4a5568"} !important;
        }
        @media (max-width: 768px) {
          .markflow-preview {
            font-size: 14px !important;
          }
          .prose h1 {
            font-size: 1.875rem !important;
          }
          .prose h2 {
            font-size: 1.5rem !important;
          }
          .prose h3 {
            font-size: 1.25rem !important;
          }
        }
        .prose-invert {
          --tw-prose-body: ${darkMode ? "#e2e8f0" : "#374151"};
          --tw-prose-headings: ${darkMode ? "#f7fafc" : "#111827"};
          --tw-prose-lead: ${darkMode ? "#a0aec0" : "#4b5563"};
          --tw-prose-links: ${darkMode ? "#63b3ed" : "#3b82f6"};
          --tw-prose-bold: ${darkMode ? "#f7fafc" : "#111827"};
          --tw-prose-counters: ${darkMode ? "#a0aec0" : "#6b7280"};
          --tw-prose-bullets: ${darkMode ? "#a0aec0" : "#d1d5db"};
          --tw-prose-hr: ${darkMode ? "#4a5568" : "#e5e7eb"};
          --tw-prose-quotes: ${darkMode ? "#e2e8f0" : "#111827"};
          --tw-prose-quote-borders: ${darkMode ? "#4a5568" : "#e5e7eb"};
          --tw-prose-captions: ${darkMode ? "#a0aec0" : "#6b7280"};
          --tw-prose-code: ${darkMode ? "#f6ad55" : "#ef4444"};
          --tw-prose-pre-code: ${darkMode ? "#e2e8f0" : "#1f2937"};
          --tw-prose-pre-bg: ${darkMode ? "#2d3748" : "#f3f4f6"};
          --tw-prose-th-borders: ${darkMode ? "#4a5568" : "#d1d5db"};
          --tw-prose-td-borders: ${darkMode ? "#4a5568" : "#e5e7eb"};
        }
      `}</style>

      {/* {listening && (
        <div className="text-blue-600 animate-pulse mt-2">🎙️ Listening...</div>
      )}
      {processing && (
        <div className="text-green-600 animate-pulse mt-2">⚙️ Generating Markdown...</div>
      )}
      {improveMode && (
        <span className={`flex items-center ${
          darkMode ? 'text-blue-300' : 'text-blue-600'
        }`}>
          <Wand className="w-3 h-3 mr-1" />
          Improve Mode
        </span>
      )} */}

      <ImprovePopup />
      <VoicePopup />

      {/* <CommentButton
        isVisible={commentButtonState.isVisible}
        position={commentButtonState.position}
        onClick={() => setIsCommentSidebarOpen(true)}
      /> */}

      {!improveMode && commentButtonState.isVisible && (
        <CommentButton
          isVisible={commentButtonState.isVisible}
          position={commentButtonState.position}
          onClick={() => setIsCommentSidebarOpen(true)}
        />
      )}

      {improveMode && improveButtonState.isVisible && (
        <ImproveButton
          isVisible={improveButtonState.isVisible}
          position={improveButtonState.position}
          onClick={handleImproveText}
          onDismiss={dismissImproveButton}
        />
      )}

      <CommentSidebar
        isOpen={isCommentSidebarOpen}
        onClose={() => {
          setIsCommentSidebarOpen(false);
          dismissCommentButton();
        }}
        noteId={documentId}
        selectedText={commentButtonState.isVisible ? commentButtonState.selectedText : undefined}
        selection={commentButtonState.selection}
        darkMode={darkMode}
        activeCommentId={activeCommentId || undefined}
        setActiveCommentId={(id) => handleSetActiveComment(id || null)}
      />
    </div>
  );
};

export default MergedMarkdownEditor;