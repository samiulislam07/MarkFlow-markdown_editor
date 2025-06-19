"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { 
  Eye, Edit3, Download, Copy, Save, Bold, Italic, Code, Link, 
  List, ListOrdered, Quote, Minus, FileText, ArrowLeft, 
  Check, AlertCircle, Loader2 
} from 'lucide-react';
import LatexRenderer from './LatexRenderer';

interface EnhancedMarkdownEditorProps {
  documentId?: string;
  initialTitle?: string;
  initialContent?: string;
}

const EnhancedMarkdownEditor: React.FC<EnhancedMarkdownEditorProps> = ({
  documentId,
  initialTitle = '',
  initialContent = ''
}) => {
  const { user } = useUser();
  const router = useRouter();
  
  // Check if this is a new document (no documentId)
  const isNewDocument = !documentId;
  
  // For new documents, start with empty content
  const defaultContent = isNewDocument ? '' : initialContent;
  const defaultTitle = isNewDocument ? '' : (initialTitle || 'Untitled Document');
  
  // Document state
  const [title, setTitle] = useState(defaultTitle);
  const [markdown, setMarkdown] = useState(defaultContent);
  const [hasUserEdited, setHasUserEdited] = useState(!isNewDocument); // Existing docs are considered "edited"

  // UI state
  const [showPreview, setShowPreview] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>(isNewDocument ? 'unsaved' : 'saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-save functionality
  const saveDocument = async (isManual = false) => {
    if (!user) return;

    // Don't save empty new documents unless it's a manual save
    if (isNewDocument && !hasUserEdited && !isManual) {
      return;
    }

    // Don't save completely empty content unless it's manual
    if (!isManual && !markdown.trim() && !title.trim()) {
      return;
    }

    setSaveStatus('saving');
    
    try {
      const payload = {
        title: title || 'Untitled Document',
        content: markdown,
        workspaceId: null, // We'll need to create a default workspace
      };

      let response;
      if (documentId) {
        // Update existing document
        response = await fetch(`/api/notes/${documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new document
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
        setHasUserEdited(true); // Mark as edited once saved
        
        // If this was a new document, redirect to the document URL
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

  // Auto-save effect - only save when user has made edits
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Check if content has changed from initial values
    const hasContentChanged = markdown !== defaultContent || title !== defaultTitle;
    
    // Only proceed if user has made changes and either:
    // 1. This is an existing document, OR
    // 2. This is a new document AND user has actually typed something (not just empty)
    if (hasContentChanged && (hasUserEdited || (isNewDocument && (markdown.trim() || title.trim())))) {
      setSaveStatus('unsaved');
      
      // Mark as user edited if content has changed
      if (!hasUserEdited && (markdown.trim() || title.trim())) {
        setHasUserEdited(true);
      }
      
      // Auto-save after 3 seconds of inactivity
      saveTimeoutRef.current = setTimeout(() => {
        saveDocument(false);
      }, 3000);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [markdown, title, defaultContent, defaultTitle, hasUserEdited, isNewDocument]);

  // Markdown processing with proper LaTeX handling
  const processMarkdown = (text: string) => {
    let processed = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headers
    processed = processed.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    processed = processed.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    processed = processed.replace(/^# (.*$)/gm, '<h1>$1</h1>');

    // Code blocks (process before LaTeX to avoid conflicts)
    processed = processed.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'text';
      return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
    });

    // Inline code (process before LaTeX to avoid conflicts)
    processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Text formatting
    processed = processed.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');
    processed = processed.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // Links
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Lists
    processed = processed.replace(/^\d+\.\s(.+)/gm, '<li>$1</li>');
    processed = processed.replace(/(<li>.*<\/li>\s*)+/g, '<ol>$&</ol>');
    processed = processed.replace(/^[-*+]\s(.+)/gm, '<li>$1</li>');
    processed = processed.replace(/(<li>.*<\/li>\s*)+/g, (match) => {
      if (match.includes('<ol>')) return match;
      return `<ul>${match}</ul>`;
    });

    // Blockquotes
    processed = processed.replace(/^>\s(.+)/gm, '<blockquote>$1</blockquote>');

    // Horizontal rules
    processed = processed.replace(/^---$/gm, '<hr>');

    // Paragraphs
    processed = processed.replace(/\n\n/g, '</p><p>');
    processed = `<p>${processed}</p>`;

    // Cleanup
    processed = processed.replace(/<p><\/p>/g, '');
    processed = processed.replace(/<p>(<h[1-6]>)/g, '$1');
    processed = processed.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    processed = processed.replace(/<p>(<[ou]l>)/g, '$1');
    processed = processed.replace(/(<\/[ou]l>)<\/p>/g, '$1');

    return processed;
  };



  const insertText = (before: string, after = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end);
    const newText = markdown.substring(0, start) + before + selectedText + after + markdown.substring(end);
    setMarkdown(newText);
    
    // Mark as user edited
    if (!hasUserEdited) {
      setHasUserEdited(true);
    }
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const toolbarButtons = [
    { icon: Bold, action: () => insertText('**', '**'), title: 'Bold' },
    { icon: Italic, action: () => insertText('*', '*'), title: 'Italic' },
    { icon: Code, action: () => insertText('`', '`'), title: 'Inline Code' },
    { icon: Link, action: () => insertText('[', '](url)'), title: 'Link' },
    { icon: List, action: () => insertText('- '), title: 'Bullet List' },
    { icon: ListOrdered, action: () => insertText('1. '), title: 'Numbered List' },
    { icon: Quote, action: () => insertText('> '), title: 'Quote' },
    { icon: Minus, action: () => insertText('---\n'), title: 'Horizontal Rule' },
    { icon: FileText, action: () => insertText('$$\n', '\n$$'), title: 'Math Block' },
  ];

  const getSaveStatusIcon = () => {
    switch (saveStatus) {
      case 'saving':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'saved':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Save className="w-4 h-4 text-gray-600" />;
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

  const exportMarkdown = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdown);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header with Document Title */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!hasUserEdited && e.target.value.trim()) {
                  setHasUserEdited(true);
                }
              }}
              className="text-xl font-semibold text-gray-800 bg-transparent border-none outline-none focus:bg-gray-50 rounded px-2 py-1 flex-1 max-w-md"
              placeholder="Document title..."
            />
            
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {getSaveStatusIcon()}
              <span>{getSaveStatusText()}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => saveDocument(true)}
              className="flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
              disabled={saveStatus === 'saving'}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </button>
            
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {showPreview ? <Edit3 className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showPreview ? 'Edit Only' : 'Preview'}
            </button>
            
            <button
              onClick={copyToClipboard}
              className="flex items-center px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </button>
            
            <button
              onClick={exportMarkdown}
              className="flex items-center px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center space-x-1">
          {toolbarButtons.map((button, index) => (
            <button
              key={index}
              onClick={button.action}
              title={button.title}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            >
              <button.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor Pane */}
        <div className={`${showPreview ? 'w-1/2' : 'w-full'} flex flex-col border-r border-gray-200`}>
          <div className="bg-gray-100 px-4 py-2 text-sm text-gray-600 border-b border-gray-200">
            Editor
          </div>
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(e) => {
              setMarkdown(e.target.value);
              if (!hasUserEdited && e.target.value.trim()) {
                setHasUserEdited(true);
              }
            }}
            className="flex-1 p-4 font-mono text-sm resize-none outline-none bg-white"
            placeholder="Start writing your markdown with LaTeX support..."
            spellCheck={false}
          />
        </div>

        {/* Preview Pane */}
        {showPreview && (
          <div className="w-1/2 flex flex-col">
            <div className="bg-gray-100 px-4 py-2 text-sm text-gray-600 border-b border-gray-200">
              Preview
            </div>
            <LatexRenderer 
              content={markdown}
              className="flex-1 p-4 overflow-auto bg-white"
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
        <div className="flex justify-between items-center">
          <span>Lines: {markdown.split('\n').length} | Characters: {markdown.length} | Words: {markdown.split(/\s+/).filter(word => word.length > 0).length}</span>
          <span>LaTeX supported • Auto-save enabled</span>
        </div>
      </div>

      <style jsx>{`
        .prose h1 { font-size: 2em; font-weight: bold; margin: 1em 0 0.5em 0; color: #1f2937; }
        .prose h2 { font-size: 1.5em; font-weight: bold; margin: 1em 0 0.5em 0; color: #374151; }
        .prose h3 { font-size: 1.25em; font-weight: bold; margin: 1em 0 0.5em 0; color: #4b5563; }
        .prose p { margin: 0.75em 0; line-height: 1.6; color: #374151; }
        .prose pre { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 1em; margin: 1em 0; overflow-x: auto; }
        .prose code { background: #f1f5f9; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.875em; color: #dc2626; }
        .prose pre code { background: none; padding: 0; color: #1f2937; }
        .prose blockquote { border-left: 4px solid #3b82f6; padding-left: 1em; margin: 1em 0; font-style: italic; color: #6b7280; }
        .prose ul, .prose ol { margin: 1em 0; padding-left: 2em; }
        .prose li { margin: 0.25em 0; }
        .prose a { color: #3b82f6; text-decoration: underline; }
        .prose a:hover { color: #1d4ed8; }
        .prose hr { border: none; border-top: 2px solid #e5e7eb; margin: 2em 0; }
        .prose del { text-decoration: line-through; color: #6b7280; }
        .math-display { background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); }
      `}</style>
    </div>
  );
};

export default EnhancedMarkdownEditor; 