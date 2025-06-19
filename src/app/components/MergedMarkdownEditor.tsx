'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import {
  Bold, Italic, Code, Link, List, ListOrdered, Quote, Minus, 
  Copy, Download, Eye, EyeOff, Maximize, Minimize, Save,
  FileText, ArrowLeft, Check, AlertCircle, Loader2, Edit3,
  LucideIcon, Moon, Sun, Palette
} from 'lucide-react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import sanitizeHtml from 'sanitize-html';
import { MathJaxContext, MathJax } from 'better-react-mathjax';
import { Subscript as MathIcon } from 'lucide-react';

interface MarkdownEditorProps {
  documentId?: string;
  initialTitle?: string;
  initialContent?: string;
  workspaceId?: string;
  onContentChange?: (content: string) => void;
}

const MergedMarkdownEditor: React.FC<MarkdownEditorProps> = ({
  documentId,
  initialTitle = '',
  initialContent = '',
  workspaceId,
  onContentChange
}) => {
  const { user } = useUser();
  const router = useRouter();
  
  // Document state
  const [title, setTitle] = useState(initialTitle || 'Untitled Document');
  const [markdownContent, setMarkdownContent] = useState<string>(initialContent || `# Welcome to MarkFlow!

Start writing your document here. You can use **markdown** formatting and LaTeX math expressions.

## Mathematical Expressions

Inline math: $E = mc^2$ and $\\alpha + \\beta = \\gamma$

Block math:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

## Features

- **Bold** and *italic* text
- \`Code snippets\`
- [Links](https://example.com)
- Lists and tables
- LaTeX math support

Happy writing! 🚀
`);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [showThemePicker, setShowThemePicker] = useState<boolean>(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const themePickerRef = useRef<HTMLDivElement>(null);

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

  // Auto-save functionality
  const saveDocument = async (isManual = false) => {
    if (!user) return;

    setSaveStatus('saving');
    
    try {
      const payload = {
        title: title || 'Untitled Document',
        content: markdownContent,
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
  };

  // Auto-save effect
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (markdownContent !== initialContent || title !== initialTitle) {
      setSaveStatus('unsaved');
      
      saveTimeoutRef.current = setTimeout(() => {
        saveDocument(false);
      }, 3000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [markdownContent, title, initialContent, initialTitle]);

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

  const renderLatex = (html: string) => {
    let rendered = html;
    rendered = rendered.replace(/<div class="math-block">\$\$([\s\S]*?)\$\$<\/div>/g, 
      `<div class="math-display ${darkMode ? 'bg-gray-800 border-blue-700' : 'bg-blue-50 border-blue-500'} p-4 my-4 rounded border-l-4 font-mono text-center text-lg">$$$$1$$</div>`);
    rendered = rendered.replace(/<span class="math-inline">\$(.*?)\$<\/span>/g, 
      `<span class="math-inline ${darkMode ? 'bg-gray-800 text-blue-300' : 'bg-blue-50 text-blue-800'} px-1 rounded font-mono">$1</span>`);
    return rendered;
  };

  useEffect(() => {
    if (editorRef.current && !editorViewRef.current) {
      const startState = EditorState.create({
        doc: markdownContent,
        extensions: [
          keymap.of([...defaultKeymap, ...historyKeymap]),
          history(),
          markdown(),
          darkMode ? oneDark : [],
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              const newContent = update.state.doc.toString();
              setMarkdownContent(newContent);
              if (onContentChange) {
                onContentChange(newContent);
              }
            }
          }),
          EditorView.theme({
            "&": {
              backgroundColor: darkMode ? "#1a202c" : "white",
              color: darkMode ? "#e2e8f0" : "#1a202c",
            },
            ".cm-content": {
              caretColor: darkMode ? "#e2e8f0" : "#1a202c",
            },
            ".cm-gutters": {
              backgroundColor: darkMode ? "#2d3748" : "#f7fafc",
              color: darkMode ? "#a0aec0" : "#718096",
              borderRight: darkMode ? "1px solid #4a5568" : "1px solid #e2e8f0",
            }
          })
        ]
      });

      editorViewRef.current = new EditorView({
        state: startState,
        parent: editorRef.current
      });

      return () => {
        editorViewRef.current?.destroy();
        editorViewRef.current = null;
      };
    }
  }, [darkMode]);

  useEffect(() => {
    const html = processMarkdown(markdownContent);
    const rendered = renderLatex(html);
    setHtmlContent(rendered);
  }, [markdownContent, darkMode]);

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

  const exportMarkdown = () => {
    const blob = new Blob([markdownContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdownContent);
  };

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
                onChange={(e) => setTitle(e.target.value)}
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
              
              <button
                onClick={() => saveDocument(true)}
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
    </MathJaxContext>
  );
};

export default MergedMarkdownEditor;