"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  Bold,
  Italic,
  Code,
  Link,
  List,
  ListOrdered,
  Quote,
  Minus,
  Copy,
  Download,
  Eye,
  Maximize,
  Minimize,
  Save,
  ArrowLeft,
  Check,
  AlertCircle,
  Loader2,
  Edit3,
  LucideIcon,
  Moon,
  Sun,
  Palette,
  MessageSquare,
  Play,
} from "lucide-react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeSanitize from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { MathJaxContext, MathJax } from "better-react-mathjax";
import { Subscript as MathIcon } from "lucide-react";
import * as Y from "yjs";
import { yCollab, yUndoManagerKeymap } from "y-codemirror.next";
import YPartyKitProvider from "y-partykit/provider";

// --- COMMENTING SYSTEM IMPORTS ---
import CommentButton from './CommentButton';
import CommentSidebar, { type CommentPosition, type CommentData } from './CommentSidebar';
import { useCommentSelection } from '@/hooks/useCommentSelection';

interface MarkdownEditorProps {
  documentId?: string;
  workspaceId?: string;
  doc: Y.Doc;
  provider: YPartyKitProvider;
  onDocumentSaved?: (newDocumentId: string) => void;
}

const MergedMarkdownEditor: React.FC<MarkdownEditorProps> = ({
  documentId,
  workspaceId,
  doc,
  provider,
  onDocumentSaved,
}) => {
  const { user } = useUser();
  const router = useRouter();
  const ytext = doc.getText("codemirror");
  const ytitle = doc.getText("title");

  const [title, setTitle] = useState(ytitle.toString() || "Untitled Document");
  const [markdownContent, setMarkdownContent] = useState(ytext.toString());
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<
    "saved" | "saving" | "unsaved" | "error"
  >("saved");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
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
  const [selectedTextForComment, setSelectedTextForComment] = useState<{
    text: string;
    position: CommentPosition;
  } | undefined>(undefined);
  const [activeCommentId, setActiveCommentId] = useState<string | undefined>(undefined);

  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
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
  const scrollSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mathJaxConfig = {
    loader: { load: ["[tex]/ams", "[tex]/noerrors"] },
    tex: {
      inlineMath: [["$", "$"]],
      displayMath: [["$$", "$$"]],
      packages: { "[+]": ["ams", "noerrors"] },
      processEscapes: true,
      processEnvironments: true,
    },
    options: {
      skipHtmlTags: ["script", "noscript", "style", "textarea", "pre"],
      enableMenu: false,
    },
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    setShowThemePicker(false);
  };

  const processMarkdown = useCallback(async (markdown: string): Promise<string> => {
    try {
      const file = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkRehype)
        .use(rehypeHighlight)
        .use(rehypeSanitize, {
          tagNames: [
            'h1', 'h2', 'h3', 'p', 'a', 'ul', 'ol', 'li',
            'blockquote', 'code', 'pre', 'hr', 'strong',
            'em', 'div', 'span', 'del', 'img', 'table',
            'thead', 'tbody', 'tr', 'th', 'td', 'input',
            'sup', 'br'
          ],
          attributes: {
            '*': ['className'],
            'a': ['href', 'target', 'rel', 'id'],
            'img': ['src', 'alt', 'title'],
            'input': ['type', 'checked', 'disabled'],
            'span': ['data*'],
            'div': ['id']
          }
        })
        .use(rehypeStringify)
        .process(markdown);

      return String(file);
    } catch (error) {
      console.error('Markdown processing error:', error);
      return `<div class="markdown-error">Error rendering markdown</div>`;
    }
  }, []);

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
      setCompiledContent(markdownContent);
      await processContent(markdownContent);
    } catch (error) {
      console.error("Compilation error:", error);
    } finally {
      setIsCompiling(false);
    }
  }, [markdownContent, isCompiling, processContent]);

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
        effects: [], // Trigger a no-op update to force re-rendering
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
          // Use callback instead of router.replace to avoid page reload
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

  useEffect(() => {
    const handleDocUpdate = () => {
      try {
        setMarkdownContent(ytext.toString());
        setTitle(ytitle.toString());
        setSaveStatus("unsaved");
        refreshEditor();

        // Auto-compile if enabled
        if (autoCompile) {
          compileMarkdown();
        }

        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => saveDocument(), 3000);
      } catch (error) {
        console.warn("Document update error:", error);
      }
    };

    doc.on("update", handleDocUpdate);
    return () => {
      doc.off("update", handleDocUpdate);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    doc,
    ytext,
    ytitle,
    saveDocument,
    refreshEditor,
    autoCompile,
    compileMarkdown,
  ]);

  useEffect(() => {
    if (editorRef.current && !editorViewRef.current && user) {
      try {
        const userColors = [
          "#e74c3c",
          "#3498db",
          "#2ecc71",
          "#f39c12",
          "#9b59b6",
          "#1abc9c",
          "#e67e22",
          "#34495e",
          "#f1c40f",
          "#e91e63",
          "#ff5722",
          "#795548",
          "#607d8b",
          "#ff9800",
          "#4caf50",
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

        provider.awareness.setLocalState(null);
        provider.awareness.setLocalStateField("user", userAwarenessInfo);
        provider.awareness.setLocalState({ user: userAwarenessInfo });

        const startState = EditorState.create({
          doc: ytext.toString(),
          extensions: [
            keymap.of([
              ...defaultKeymap,
              ...historyKeymap,
              ...yUndoManagerKeymap,
            ]),
            history(),
            markdown({ codeLanguages: [] }),
            lineNumbers({
              formatNumber: (lineNo: number) => {
                // Debug log to see what line numbers are being requested
                console.log('Line number requested:', lineNo);
                // Ensure line numbers start from 1 and are sequential
                if (lineNo < 1 || !Number.isInteger(lineNo)) {
                  console.log('Invalid line number filtered out:', lineNo);
                  return '';
                }
                return String(lineNo);
              },
            }),
            EditorView.lineWrapping,
            darkMode ? oneDark : [],
            EditorView.updateListener.of((update) => {
              if (
                update.docChanged ||
                update.viewportChanged ||
                update.heightChanged
              ) {
                requestAnimationFrame(() => {
                  editorViewRef.current?.requestMeasure();
                });
              }
            }),
            EditorView.domEventHandlers({
              paste(event, view) {
                try {
                  const clipboardData = event.clipboardData;
                  if (!clipboardData) {
                    console.log("No clipboard data, allowing default behavior");
                    return false;
                  }
                  const text = clipboardData.getData("text/plain");
                  console.log("Paste text length:", text?.length);
                  if (!text || text.length === 0) {
                    console.log("Empty text, allowing default behavior");
                    return false;
                  }
                  // Check if it's markdown content by looking for markdown patterns
                  const hasMarkdownPatterns =
                    /```|#{1,6}\s|^\s*[-*+]\s|\*\*|\*|`|^\s*\d+\.\s|\[.*\]\(.*\)|^>\s/m.test(
                      text
                    );
                  const isLargeText = text.length > 1000; // Lowered threshold for better markdown handling

                  if (
                    isLargeText ||
                    (hasMarkdownPatterns && text.split("\n").length > 20)
                  ) {
                    console.log(
                      "Large or complex markdown detected, using safe direct Yjs insertion"
                    );
                    console.log(
                      "Text length:",
                      text.length,
                      "Lines:",
                      text.split("\n").length
                    );
                    console.log("Has markdown patterns:", hasMarkdownPatterns);

                    // Prevent default to avoid CodeMirror's built-in paste handling
                    event.preventDefault();

                    try {
                      if (!doc || typeof doc.getText !== "function") {
                        console.warn(
                          "Yjs doc not available, falling back to default behavior"
                        );
                        return false;
                      }
                      const currentYtext = doc.getText("codemirror");
                      if (
                        !currentYtext ||
                        typeof currentYtext.insert !== "function"
                      ) {
                        console.warn(
                          "Yjs text not available, falling back to default behavior"
                        );
                        return false;
                      }

                      const state = view.state;
                      const selection = state.selection.main;

                      // Clean the text while preserving markdown structure
                      const cleanText = text
                        .replace(/\r\n/g, "\n")
                        .replace(/\r/g, "\n")
                        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
                        .replace(/\uFEFF/g, "")
                        .replace(/[^\S\n]{3,}/g, "  "); // Collapse excessive spaces but preserve markdown formatting

                      if (
                        selection.from < 0 ||
                        selection.to < selection.from ||
                        selection.to > currentYtext.length
                      ) {
                        console.warn(
                          "Invalid selection bounds, inserting at end"
                        );
                        doc.transact(() => {
                          currentYtext.insert(
                            currentYtext.length,
                            "\n" + cleanText
                          );
                        });
                        return true;
                      }

                      // Direct Yjs insertion without state switching - preserves markdown rendering
                      doc.transact(() => {
                        try {
                          if (selection.to > selection.from) {
                            currentYtext.delete(
                              selection.from,
                              selection.to - selection.from
                            );
                          }
                          currentYtext.insert(selection.from, cleanText);
                          console.log(
                            "Markdown text inserted successfully via direct Yjs insertion"
                          );
                        } catch (yjsTransactionError) {
                          console.error(
                            "Yjs transaction error:",
                            yjsTransactionError
                          );
                          throw yjsTransactionError;
                        }
                      });

                      return true;
                    } catch (yjsError) {
                      console.error("Yjs paste error:", yjsError);
                      return false;
                    }
                  }
                  console.log("Normal text, allowing default behavior");
                  return false;
                } catch (error) {
                  console.error("Paste handler error:", error);
                  return false;
                }
              },
              copy() {
                return false;
              },
              cut() {
                return false;
              },
            }),
            yCollab(ytext, provider.awareness, {
              undoManager: new Y.UndoManager(ytext),
            }),
            EditorView.theme({
              "&": {
                backgroundColor: darkMode ? "#1a202c" : "white",
                color: darkMode ? "#e2e8f0" : "#1a202c",
                fontSize: "14px",
              },
              ".cm-content": {
                caretColor: darkMode ? "#60a5fa" : "#2563eb",
                padding: "1.5rem",
                minHeight: "calc(100vh - 240px)",
                fontSize: "14px",
                lineHeight: "1.6",
                maxWidth: "100%",
                wordWrap: "break-word",
                overflowWrap: "break-word",
              },
              ".cm-gutters": {
                backgroundColor: darkMode ? "#2d3748" : "#f7fafc",
                color: darkMode ? "#718096" : "#a0aec0",
                borderRight: darkMode
                  ? "1px solid #4a5568"
                  : "1px solid #e2e8f0",
                position: "relative",
              },
              ".cm-lineNumbers": {
                color: darkMode ? "#718096" : "#9ca3af",
                fontSize: "13px",
                fontFamily: "monospace",
                position: "relative",
              },
              ".cm-gutterElement": {
                display: "block !important",
                visibility: "visible !important",
                position: "relative",
              },
              ".cm-activeLineGutter": {
                backgroundColor: darkMode ? "#4a5568" : "#e5e7eb",
                color: darkMode ? "#e2e8f0" : "#374151",
                fontWeight: "500",
              },
              ".cm-focused": { outline: "none" },
              ".cm-cursor, .cm-dropCursor": {
                borderLeft: `2px solid ${darkMode ? "#60a5fa" : "#2563eb"}`,
                marginLeft: "-1px",
                height: "1.2em",
                animation: "cm-blink 1.2s infinite",
              },
              ".cm-ySelectionInfo": {
                position: "absolute",
                top: "-2.2em",
                left: "-2px",
                fontSize: "11px",
                fontFamily:
                  "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                fontWeight: "500",
                lineHeight: "1.3",
                padding: "4px 8px",
                color: "white",
                whiteSpace: "nowrap",
                borderRadius: "6px",
                zIndex: "1000",
                boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.2)",
                backdropFilter: "blur(4px)",
                pointerEvents: "none",
              },
              ".cm-yCursor": {
                position: "relative",
                borderLeft: "2px solid",
                marginLeft: "-1px",
                marginRight: "-1px",
                boxSizing: "border-box",
                zIndex: "100",
                height: "1.2em",
                animation: "y-cursor-blink 1.2s ease-in-out infinite",
              },
              ".cm-ySelection": {
                borderRadius: "2px",
                opacity: "0.3",
                pointerEvents: "none",
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
            }),
          ],
        });

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
          ? "text-gray-300 hover:bg-gray-700"
          : "text-gray-700 hover:bg-gray-200"
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
      <div
        className={`markflow-editor flex flex-col h-screen ${
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
            <div className="flex items-center space-x-4 flex-1">
              <button
                onClick={() => router.push("/dashboard")}
                className={`p-2 rounded transition-colors ${
                  darkMode
                    ? "text-gray-300 hover:text-white hover:bg-gray-700"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
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
                  setTitle(newTitle);
                  doc.transact(() => {
                    if (ytitle.toString() !== newTitle) {
                      ytitle.delete(0, ytitle.length);
                      ytitle.insert(0, newTitle);
                    }
                  });
                }}
                className={`text-xl font-semibold border-none outline-none rounded px-2 py-1 flex-1 max-w-md ${
                  darkMode
                    ? "bg-gray-800 text-white focus:bg-gray-700"
                    : "bg-transparent text-gray-800 focus:bg-gray-50"
                }`}
                placeholder="Document title..."
              />
              <div
                className={`flex items-center space-x-2 text-sm ${
                  darkMode ? "text-gray-400" : "text-gray-500"
                }`}
              >
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
                        onClick={toggleDarkMode}
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
              <button
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
              </button>
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
                onClick={handleDownload}
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
                {isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
              </button>
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
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div
            className={`markflow-editor-pane transition-all duration-300 overflow-hidden ${
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
                <div className="flex-1 p-6">
                  {isProcessing ? (
                    <div className={`flex flex-col items-center justify-center h-64 ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
                      <p className="text-sm">Processing markdown...</p>
                    </div>
                  ) : processedContent ? (
                    <MathJaxContext config={mathJaxConfig}>
                      <MathJax>
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
                      </MathJax>
                    </MathJaxContext>
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
      </div>
      <style jsx global>{`
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
