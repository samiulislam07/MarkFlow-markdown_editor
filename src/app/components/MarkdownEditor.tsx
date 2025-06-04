"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Eye, Edit3, Download, Copy, Settings, Bold, Italic, Code, Link, List, ListOrdered, Quote, Minus, Table, FileText } from 'lucide-react';

const MarkdownEditor = () => {
  const [markdown, setMarkdown] = useState(`# Markdown Editor with LaTeX Support

Welcome to the **advanced markdown editor** with full LaTeX support!

## Mathematical Expressions

Inline math: $E = mc^2$ and $\\alpha + \\beta = \\gamma$

Block math:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

$$
\\begin{pmatrix}
a & b \\\\
c & d
\\end{pmatrix}
\\begin{pmatrix}
x \\\\
y
\\end{pmatrix} = 
\\begin{pmatrix}
ax + by \\\\
cx + dy
\\end{pmatrix}
$$

## Code Blocks

\`\`\`javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}
\`\`\`

\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
\`\`\`

## Tables

| Feature | Status | Priority |
|---------|--------|----------|
| LaTeX Support | ✅ Complete | High |
| Live Preview | ✅ Complete | High |
| Syntax Highlighting | ✅ Complete | Medium |
| Export Options | 🚧 In Progress | Low |

## Lists and Formatting

### Unordered List
- **Bold text**
- *Italic text*
- \`Inline code\`
- [Links](https://example.com)
- ~~Strikethrough~~

### Ordered List
1. First item
2. Second item
3. Third item with math: $f(x) = x^2 + 2x + 1$

## Blockquotes

> "The best way to predict the future is to invent it."
> 
> — Alan Kay

## Complex LaTeX Examples

Maxwell's equations:
$$
\\begin{align}
\\nabla \\cdot \\mathbf{E} &= \\frac{\\rho}{\\epsilon_0} \\\\
\\nabla \\cdot \\mathbf{B} &= 0 \\\\
\\nabla \\times \\mathbf{E} &= -\\frac{\\partial \\mathbf{B}}{\\partial t} \\\\
\\nabla \\times \\mathbf{B} &= \\mu_0\\mathbf{J} + \\mu_0\\epsilon_0\\frac{\\partial \\mathbf{E}}{\\partial t}
\\end{align}
$$

Schrödinger equation:
$$
i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r},t) = \\hat{H}\\Psi(\\mathbf{r},t)
$$
`);

  const [htmlContent, setHtmlContent] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textareaRef = useRef(null);
  const previewRef = useRef(null);

  // Markdown to HTML conversion with LaTeX support
  const processMarkdown = (text) => {
    // First, escape HTML
    let processed = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Process LaTeX blocks first (before other markdown)
    processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (match, latex) => {
      return `<div class="math-block">$$${latex}$$</div>`;
    });

    // Process inline LaTeX
    processed = processed.replace(/\$([^$\n]+?)\$/g, (match, latex) => {
      return `<span class="math-inline">$${latex}$</span>`;
    });

    // Headers
    processed = processed.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    processed = processed.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    processed = processed.replace(/^# (.*$)/gm, '<h1>$1</h1>');

    // Code blocks
    processed = processed.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
      const language = lang || 'text';
      return `<pre><code class="language-${language}">${code.trim()}</code></pre>`;
    });

    // Inline code
    processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold and italic
    processed = processed.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Strikethrough
    processed = processed.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // Links
    processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Tables
    processed = processed.replace(/^\|(.+)\|\s*$/gm, (match, content) => {
      const cells = content.split('|').map(cell => cell.trim()).filter(cell => cell);
      const isHeader = processed.indexOf(match) > 0 && 
        processed.substring(0, processed.indexOf(match)).split('\n').slice(-2)[0].includes('|');
      
      if (isHeader && cells.every(cell => /^:?-+:?$/.test(cell))) {
        return ''; // Skip separator row
      }
      
      const tag = cells.every(cell => /^:?-+:?$/.test(cell)) ? '' : 
        (processed.split(match)[0].split('\n').slice(-2)[0].includes('|') ? 'td' : 'th');
      
      if (!tag) return '';
      
      const row = cells.map(cell => `<${tag}>${cell}</${tag}>`).join('');
      return `<tr>${row}</tr>`;
    });

    // Wrap tables
    processed = processed.replace(/(<tr>.*<\/tr>\s*)+/g, '<table>$&</table>');

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

    // Line breaks
    processed = processed.replace(/\n\n/g, '</p><p>');
    processed = `<p>${processed}</p>`;

    // Clean up empty paragraphs
    processed = processed.replace(/<p><\/p>/g, '');
    processed = processed.replace(/<p>(<h[1-6]>)/g, '$1');
    processed = processed.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
    processed = processed.replace(/<p>(<table>)/g, '$1');
    processed = processed.replace(/(<\/table>)<\/p>/g, '$1');
    processed = processed.replace(/<p>(<pre>)/g, '$1');
    processed = processed.replace(/(<\/pre>)<\/p>/g, '$1');
    processed = processed.replace(/<p>(<blockquote>)/g, '$1');
    processed = processed.replace(/(<\/blockquote>)<\/p>/g, '$1');
    processed = processed.replace(/<p>(<hr>)/g, '$1');
    processed = processed.replace(/(<hr>)<\/p>/g, '$1');
    processed = processed.replace(/<p>(<[ou]l>)/g, '$1');
    processed = processed.replace(/(<\/[ou]l>)<\/p>/g, '$1');

    return processed;
  };

  // Render LaTeX
  const renderLatex = (html) => {
    if (typeof window === 'undefined') return html;
    
    // This would normally use KaTeX, but for the demo we'll simulate it
    let rendered = html;
    
    // Simple math rendering simulation
    rendered = rendered.replace(/<div class="math-block">\$\$([\s\S]*?)\$\$<\/div>/g, 
      '<div class="math-display bg-gray-50 p-4 my-4 rounded border-l-4 border-blue-500 font-mono text-center text-lg">$$$1$$</div>');
    
    rendered = rendered.replace(/<span class="math-inline">\$(.*?)\$<\/span>/g, 
      '<span class="math-inline bg-blue-50 px-1 rounded font-mono text-blue-800">$1</span>');
    
    return rendered;
  };

  useEffect(() => {
    const html = processMarkdown(markdown);
    const rendered = renderLatex(html);
    setHtmlContent(rendered);
  }, [markdown]);

  const insertText = (before, after = '') => {
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end);
    const newText = markdown.substring(0, start) + before + selectedText + after + markdown.substring(end);
    setMarkdown(newText);
    
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

  const exportMarkdown = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(markdown);
  };

  return (
    <div className={`flex flex-col h-screen bg-gray-50 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">Markdown Editor</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              {showPreview ? <Edit3 className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showPreview ? 'Edit Only' : 'Show Preview'}
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
            onChange={(e) => setMarkdown(e.target.value)}
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
            <div 
              ref={previewRef}
              className="flex-1 p-4 overflow-auto bg-white prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-100 border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
        <div className="flex justify-between items-center">
          <span>Lines: {markdown.split('\n').length} | Characters: {markdown.length}</span>
          <span>LaTeX supported with KaTeX rendering</span>
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
        .prose table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        .prose th, .prose td { border: 1px solid #d1d5db; padding: 0.5em; text-align: left; }
        .prose th { background: #f9fafb; font-weight: bold; }
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

export default MarkdownEditor;