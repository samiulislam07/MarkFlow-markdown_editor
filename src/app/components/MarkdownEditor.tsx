'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bold, Italic, Code, Link, List, ListOrdered, Quote, Minus, 
  Copy, Download, Eye, EyeOff, Maximize, Minimize,
  LucideIcon
} from 'lucide-react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import sanitizeHtml from 'sanitize-html';
import { MathJaxContext, MathJax } from 'better-react-mathjax';

// Fix for MathIcon - importing from a different package since it's not in lucide-react
import { Subscript as MathIcon } from 'lucide-react';

interface MarkdownEditorProps {
  initialContent?: string;
  onContentChange: (content: string) => void;
}

const MarkFlowMarkdownEditor: React.FC<MarkdownEditorProps> = ({ initialContent = '', onContentChange }) => {
  const [markdownContent, setMarkdownContent] = useState<string>(initialContent);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);

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

  const processMarkdown = (markdown: string): string => {
    // Process LaTeX blocks first
    let processed = markdown.replace(/\$\$([\s\S]*?)\$\$/g, (_, content) => {
      const trimmed = content.trim();
      return `<div class="math-block">$$${trimmed}$$</div>`;
    });

    // Process inline LaTeX
    processed = processed.replace(/\$([^\$]+?)\$/g, (_, content) => {
      const trimmed = content.trim();
      return `<span class="math-inline">$${trimmed}$</span>`;
    });

    // Process code blocks
    processed = processed.replace(/```([\s\S]*?)```/g, (_, content) => {
      return `<pre><code>${content.trim()}</code></pre>`;
    });

    // Process inline code
    processed = processed.replace(/`([^`]+?)`/g, (_, content) => {
      return `<code>${content.trim()}</code>`;
    });

    // Process headings
    processed = processed.replace(/^# (.*$)/gm, '<h1>$1</h1>');
    processed = processed.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    processed = processed.replace(/^### (.*$)/gm, '<h3>$1</h3>');

    // Process bold and italic
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Process lists
    processed = processed.replace(/^\s*[-*+]\s+(.*$)/gm, '<li>$1</li>');
    processed = processed.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    processed = processed.replace(/^\s*\d+\.\s+(.*$)/gm, '<li>$1</li>');
    processed = processed.replace(/(<li>.*<\/li>)/gs, '<ol>$1</ol>');

    // Process blockquotes
    processed = processed.replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>');

    // Process horizontal rules
    processed = processed.replace(/^---$/gm, '<hr>');

    // Process links
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Process paragraphs
    processed = processed.replace(/^(?!<[a-z])(.*$)/gm, '<p>$1</p>');

    // Sanitize HTML
    return sanitizeHtml(processed, {
      allowedTags: ['h1', 'h2', 'h3', 'p', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr', 'strong', 'em', 'div', 'span'],
      allowedAttributes: {
        a: ['href'],
        div: ['class'],
        span: ['class']
      }
    });
  };

  useEffect(() => {
    if (editorRef.current && !editorViewRef.current) {
      const startState = EditorState.create({
        doc: markdownContent,
        extensions: [
          keymap.of([...defaultKeymap, ...historyKeymap]),
          history(),
          markdown(),
          oneDark,
          EditorView.updateListener.of(update => {
            if (update.docChanged) {
              const newContent = update.state.doc.toString();
              setMarkdownContent(newContent);
              onContentChange(newContent);
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
  }, []);

  useEffect(() => {
    const processed = processMarkdown(markdownContent);
    setHtmlContent(processed);
  }, [markdownContent]);

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
      element.download = 'my-note.md';
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

  const EditorToolbarButton: React.FC<{ 
    onClick: () => void; 
    icon: LucideIcon; 
    label: string;
    disabled?: boolean;
  }> = ({ onClick, icon: Icon, label, disabled = false }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="p-2 rounded hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      title={label}
      aria-label={label}
      tabIndex={0}
      role="button"
    >
      <Icon className="w-5 h-5 text-gray-400" />
    </button>
  );

  return (
    <MathJaxContext config={mathJaxConfig}>
      <div className={`markflow-editor flex flex-col h-screen bg-gray-800 text-white ${isFullScreen ? 'fixed inset-0 z-50' : 'relative'}`}>
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700">
          <h1 className="text-xl font-bold">MarkFlow Editor</h1>
          <div className="flex space-x-2">
            <EditorToolbarButton onClick={() => insertTextAtCursor('**')} icon={Bold} label="Bold" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('*')} icon={Italic} label="Italic" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('`')} icon={Code} label="Code" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('[text](url)', 1)} icon={Link} label="Link" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('- ', 2)} icon={List} label="Unordered List" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('1. ', 3)} icon={ListOrdered} label="Ordered List" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('> ', 2)} icon={Quote} label="Blockquote" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('---', 3)} icon={Minus} label="Horizontal Rule" />
            <EditorToolbarButton onClick={() => insertTextAtCursor('$$\n\n$$', 1)} icon={MathIcon} label="Math Block" />
            <div className="h-full w-px bg-gray-700 mx-2"></div>
            <EditorToolbarButton onClick={handleCopy} icon={Copy} label="Copy Markdown" />
            <EditorToolbarButton onClick={handleDownload} icon={Download} label="Download Markdown" />
            <div className="h-full w-px bg-gray-700 mx-2"></div>
            <EditorToolbarButton 
              onClick={() => setShowPreview(!showPreview)} 
              icon={showPreview ? EyeOff : Eye} 
              label={showPreview ? "Hide Preview" : "Show Preview"} 
            />
            <EditorToolbarButton 
              onClick={toggleFullScreen} 
              icon={isFullScreen ? Minimize : Maximize} 
              label={isFullScreen ? "Exit Fullscreen" : "Fullscreen"} 
            />
          </div>
        </div>

        {/* Editor and Preview Panes */}
        <div className="flex flex-1 overflow-hidden">
          {/* Editor Pane */}
          <div className={`markflow-editor-pane flex-1 ${showPreview ? 'w-1/2' : 'w-full'} overflow-hidden`}>
            <div ref={editorRef} className="h-full w-full bg-gray-800 text-white p-4 font-mono text-sm leading-relaxed overflow-auto markflow-codemirror" />
          </div>

          {/* Preview Pane */}
          {showPreview && (
            <div className="markflow-preview flex-1 w-1/2 overflow-auto bg-gray-700 text-white p-4">
              <MathJaxContext config={mathJaxConfig}>
                <MathJax>
                  <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
                </MathJax>
              </MathJaxContext>
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="flex justify-between items-center p-2 bg-gray-900 border-t border-gray-700 text-xs text-gray-400">
          <span>
            Lines: {markdownContent.split('\n').length} | Chars: {markdownContent.length}
          </span>
          <span>Powered by CodeMirror & MathJax</span>
        </div>
      </div>
      <style jsx global>{`
        .markflow-codemirror .cm-editor {
          height: 100%;
          font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
          font-size: 0.875rem;
          line-height: 1.625;
          background-color: #2d3748;
        }
        .markflow-codemirror .cm-editor.cm-focused {
          outline: none;
        }
        .markflow-preview h1 {
          font-size: 2em;
          margin-bottom: 0.5em;
          border-bottom: 1px solid #4a5568;
          padding-bottom: 0.3em;
        }
        .markflow-preview h2 {
          font-size: 1.5em;
          margin-bottom: 0.5em;
          border-bottom: 1px solid #4a5568;
          padding-bottom: 0.3em;
        }
        .markflow-preview h3 {
          font-size: 1.25em;
          margin-bottom: 0.5em;
        }
        .markflow-preview p {
          margin-bottom: 1em;
        }
        .markflow-preview ul, .markflow-preview ol {
          margin-left: 1.5em;
          margin-bottom: 1em;
        }
        .markflow-preview li {
          margin-bottom: 0.5em;
        }
        .markflow-preview pre {
          background-color: #1a202c;
          padding: 1em;
          border-radius: 0.25rem;
          overflow-x: auto;
          margin-bottom: 1em;
        }
        .markflow-preview code {
          background-color: #4a5568;
          padding: 0.2em 0.4em;
          border-radius: 0.2rem;
          font-size: 85%;
        }
        .markflow-preview blockquote {
          border-left: 0.25em solid #4a5568;
          padding-left: 1em;
          color: #a0aec0;
          margin-bottom: 1em;
        }
        .markflow-preview hr {
          border: none;
          border-top: 1px solid #4a5568;
          margin: 1em 0;
        }
        .markflow-preview table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1em;
        }
        .markflow-preview th, .markflow-preview td {
          border: 1px solid #4a5568;
          padding: 0.5em 0.8em;
          text-align: left;
        }
        .markflow-preview th {
          background-color: #1a202c;
        }
        .markflow-preview a {
          color: #63b3ed;
          text-decoration: underline;
        }
        .math-block {
          display: block;
          overflow-x: auto;
          margin: 1em 0;
          padding: 0.5em;
          background-color: #2d3748;
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
      `}</style>
    </MathJaxContext>
  );
};

export default MarkFlowMarkdownEditor;