'use client'
//import { useEffect, useRef } from 'react';
import React,{ useEffect, useRef } from 'react';
import 'katex/dist/katex.min.css';

interface LatexRendererProps {
  content: string;
  className?: string;
}

interface DocumentState {
  sectionCounter: number;
  subsectionCounter: number;
  subsubsectionCounter: number;
  equationCounter: number;
  figureCounter: number;
  tableCounter: number;
  title: string;
  author: string;
  date: string;
  labels: { [key: string]: number };
}

export default function LatexRenderer({ content, className = '' }: LatexRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderLatex = async () => {
      try {
        // Dynamic import to avoid SSR issues
        const katex = await import('katex');

        if (containerRef.current) {
          let processedContent = content;
          
          // Initialize document state for numbering
          const docState: DocumentState = {
            sectionCounter: 0,
            subsectionCounter: 0,
            subsubsectionCounter: 0,
            equationCounter: 0,
            figureCounter: 0,
            tableCounter: 0,
            title: '',
            author: '',
            date: '',
            labels: {}
          };

          // Enhanced KaTeX configuration with minimal necessary macros
          const katexConfig = {
            displayMode: false,
            throwOnError: false,
            strict: false,
            trust: true,
            fleqn: false,
            macros: {
              // Only custom macros that aren't built into KaTeX
              "\\RR": "\\mathbb{R}",
              "\\NN": "\\mathbb{N}",
              "\\ZZ": "\\mathbb{Z}",
              "\\QQ": "\\mathbb{Q}",
              "\\CC": "\\mathbb{C}",
              "\\HH": "\\mathbb{H}",
              // Common physics/math shortcuts
              "\\bra": "\\langle",
              "\\ket": "\\rangle",
              "\\braket": "\\langle #1 \\rangle",
              "\\norm": "\\left\\| #1 \\right\\|"
            }
          };

          // First, protect code blocks and inline code from LaTeX processing
          const codeBlocks: string[] = [];
          processedContent = processedContent.replace(/```[\s\S]*?```/g, (match) => {
            const placeholder = `__CODEBLOCK_${codeBlocks.length}__`;
            codeBlocks.push(match);
            return placeholder;
          });
          
          const inlineCodes: string[] = [];
          processedContent = processedContent.replace(/`[^`\n]+`/g, (match) => {
            const placeholder = `__INLINECODE_${inlineCodes.length}__`;
            inlineCodes.push(match);
            return placeholder;
          });

          // CRITICAL: Remove LaTeX comments FIRST (lines starting with %)
          processedContent = processedContent.replace(/^%.*$/gm, '');
          processedContent = processedContent.replace(/(?<!\\)%.*$/gm, ''); // Remove inline comments but not escaped %

          // Extract and process document metadata
          const titleMatch = processedContent.match(/\\title\{([^}]+)\}/);
          if (titleMatch) docState.title = titleMatch[1];
          
          const authorMatch = processedContent.match(/\\author\{([^}]+)\}/);
          if (authorMatch) docState.author = authorMatch[1];
          
          const dateMatch = processedContent.match(/\\date\{([^}]+)\}/);
          if (dateMatch) docState.date = dateMatch[1];

          // Remove LaTeX document structure commands
          processedContent = processedContent.replace(/\\documentclass(\[[^\]]*\])?\{[^}]+\}/g, '');
          processedContent = processedContent.replace(/\\usepackage(\[[^\]]*\])?\{[^}]+\}/g, '');
          processedContent = processedContent.replace(/\\begin\{document\}/g, '');
          processedContent = processedContent.replace(/\\end\{document\}/g, '');

          // Process title block
          let titleBlock = '';
          if (docState.title) {
            titleBlock += `<div class="latex-title">${docState.title}</div>\n`;
          }
          if (docState.author) {
            titleBlock += `<div class="latex-author">${docState.author}</div>\n`;
          }
          if (docState.date) {
            const dateValue = docState.date === '\\today' ? 
              new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 
              docState.date;
            titleBlock += `<div class="latex-date">${dateValue}</div>\n`;
          }
          
          // Remove title commands and replace \maketitle
          processedContent = processedContent.replace(/\\title\{[^}]+\}/g, '');
          processedContent = processedContent.replace(/\\author\{[^}]+\}/g, '');
          processedContent = processedContent.replace(/\\date\{[^}]+\}/g, '');
          processedContent = processedContent.replace(/\\maketitle/g, titleBlock);

          // CRITICAL: Process all mathematical expressions FIRST before any other text processing

          // Process numbered equation environments with proper labeling
          processedContent = processedContent.replace(/\\begin\{equation\}\s*([\s\S]*?)\s*\\end\{equation\}/g, (match, latex) => {
            try {
              docState.equationCounter++;
              
              // Handle labels for cross-referencing
              const labelMatch = latex.match(/\\label\{([^}]+)\}/);
              if (labelMatch) {
                docState.labels[labelMatch[1]] = docState.equationCounter;
              }
              const cleanLatex = latex.replace(/\\label\{[^}]+\}/g, '').trim();
              
              const rendered = katex.default.renderToString(cleanLatex, {
                ...katexConfig,
                displayMode: true
              });
              
              return `<div class="latex-equation-container">
                <div class="latex-equation-content">${rendered}</div>
                <div class="latex-equation-number">(${docState.equationCounter})</div>
              </div>\n`;
            } catch (error) {
              console.error('Equation rendering error:', error);
              return `<div class="latex-error">Error rendering equation: ${latex.trim()}</div>\n`;
            }
          });

          // Process align environments with proper multi-line numbering - FIXED
          processedContent = processedContent.replace(/\\begin\{align\*?\}\s*([\s\S]*?)\s*\\end\{align\*?\}/g, (match, latex) => {
            try {
              const cleanLatex = latex.replace(/\\label\{[^}]+\}/g, '').trim();
              const isStarred = match.includes('align*');
              
              if (!isStarred) {
                const lines = cleanLatex.split('\\\\').filter((line: string) => line.trim() !== '');
                const startNum = docState.equationCounter + 1;
                docState.equationCounter += lines.length;
                
                const rendered = katex.default.renderToString(`\\begin{aligned}${cleanLatex}\\end{aligned}`, {
                  ...katexConfig,
                  displayMode: true
                });
                
                let numbers = '';
                for (let i = 0; i < lines.length; i++) {
                  numbers += `<div class="latex-align-number">(${startNum + i})</div>`;
                }
                
                return `<div class="latex-align-container">
                  <div class="latex-align-content">${rendered}</div>
                  <div class="latex-align-numbers">${numbers}</div>
                </div>\n`;
              } else {
                // Starred version (no numbering)
                const rendered = katex.default.renderToString(`\\begin{aligned}${cleanLatex}\\end{aligned}`, {
                  ...katexConfig,
                  displayMode: true
                });
                return `<div class="latex-display-math">${rendered}</div>\n`;
              }
            } catch (error) {
              console.error('Align rendering error:', error);
              return `<div class="latex-error">Error rendering align: ${latex.trim()}</div>\n`;
            }
          });

          // Process display math \[ \] (unnumbered)
          processedContent = processedContent.replace(/\\\[\s*([\s\S]*?)\s*\\\]/g, (match, latex) => {
            try {
              const cleanLatex = latex.trim();
              if (!cleanLatex) return match;
              
              const rendered = katex.default.renderToString(cleanLatex, {
                ...katexConfig,
                displayMode: true
              });
              return `<div class="latex-display-math">${rendered}</div>\n`;
            } catch (error) {
              console.error('Display math \\[ \\] error:', error);
              return `<div class="latex-error">Error rendering display math: ${latex.trim()}</div>\n`;
            }
          });

          // Process display math $$ $$ (unnumbered)
          processedContent = processedContent.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (match, latex) => {
            try {
              const cleanLatex = latex.trim();
              if (!cleanLatex) return match;
              
              const rendered = katex.default.renderToString(cleanLatex, {
                ...katexConfig,
                displayMode: true
              });
              return `<div class="latex-display-math">${rendered}</div>\n`;
            } catch (error) {
              console.error('Display math $$ error:', error);
              return `<div class="latex-error">Error rendering display math: ${latex.trim()}</div>\n`;
            }
          });

          // Process matrix environments
          processedContent = processedContent.replace(/\\begin\{(pmatrix|bmatrix|vmatrix|Vmatrix|matrix)\}\s*([\s\S]*?)\s*\\end\{\1\}/g, (match, matrixType, content) => {
            try {
              const rendered = katex.default.renderToString(`\\begin{${matrixType}}${content}\\end{${matrixType}}`, {
                ...katexConfig,
                displayMode: true
              });
              return `<div class="latex-display-math">${rendered}</div>\n`;
            } catch (error) {
              console.error('Matrix rendering error:', error);
              return `<div class="latex-error">Error rendering matrix: ${content.trim()}</div>\n`;
            }
          });

          // Process inline math $ $ with improved pattern that handles complex expressions
          processedContent = processedContent.replace(/\$([^$\r\n]*(?:\{[^}]*\}[^$\r\n]*)*)\$/g, (match, latex) => {
            try {
              const cleanLatex = latex.trim();
              if (!cleanLatex) return match;
              
              const rendered = katex.default.renderToString(cleanLatex, {
                ...katexConfig,
                displayMode: false
              });
              return `<span class="latex-inline-math">${rendered}</span>`;
            } catch (error) {
              console.error('Inline math error:', error, 'Original LaTeX:', latex);
              return `<span class="latex-error">${latex.trim()}</span>`;
            }
          });

          // Process sections with automatic numbering - FIXED RESET ISSUE
          processedContent = processedContent.replace(/\\section\{([^}]+)\}/g, (match, title) => {
            docState.sectionCounter++;
            docState.subsectionCounter = 0;  // Reset subsection counter
            docState.subsubsectionCounter = 0;  // Reset subsubsection counter
            return `\n<h2 class="latex-section">${docState.sectionCounter}&nbsp;&nbsp;${title}</h2>\n`;
          });

          processedContent = processedContent.replace(/\\subsection\{([^}]+)\}/g, (match, title) => {
            docState.subsectionCounter++;
            docState.subsubsectionCounter = 0;  // Reset subsubsection counter
            return `\n<h3 class="latex-subsection">${docState.sectionCounter}.${docState.subsectionCounter}&nbsp;&nbsp;${title}</h3>\n`;
          });

          processedContent = processedContent.replace(/\\subsubsection\{([^}]+)\}/g, (match, title) => {
            docState.subsubsectionCounter++;
            return `\n<h4 class="latex-subsubsection">${docState.sectionCounter}.${docState.subsectionCounter}.${docState.subsubsectionCounter}&nbsp;&nbsp;${title}</h4>\n`;
          });

          // Process text formatting - FIXED BACKTICKS
          processedContent = processedContent.replace(/\\textbf\{([^}]+)\}/g, '<strong class="latex-textbf">$1</strong>');
          processedContent = processedContent.replace(/\\textit\{([^}]+)\}/g, '<em class="latex-textit">$1</em>');
          processedContent = processedContent.replace(/\\texttt\{([^}]+)\}/g, '<code class="latex-texttt">$1</code>');
          processedContent = processedContent.replace(/\\emph\{([^}]+)\}/g, '<em class="latex-emph">$1</em>');

          // Process lists - FIXED ENUMERATE WITH MATH SUPPORT
          processedContent = processedContent.replace(/\\begin\{itemize\}\s*([\s\S]*?)\s*\\end\{itemize\}/g, (match, content) => {
            // First process inline math within list items
            const processedContent = content.replace(/\$([^$\r\n]*(?:\{[^}]*\}[^$\r\n]*)*)\$/g, (mathMatch: string, latex: string) => {
              try {
                const cleanLatex = latex.trim();
                if (!cleanLatex) return mathMatch;
                
                const rendered = katex.default.renderToString(cleanLatex, {
                  ...katexConfig,
                  displayMode: false
                });
                return `<span class="latex-inline-math">${rendered}</span>`;
              } catch (error) {
                console.error('List item math error:', error);
                return `<span class="latex-error">${latex.trim()}</span>`;
              }
            });
            
            let items = processedContent.replace(/\\item\s*/g, '<li class="latex-item">');
            items = items.replace(/\n\s*(?=<li>)/g, '</li>\n');
            return `\n<ul class="latex-itemize">${items}</li></ul>\n`;
          });
          
          processedContent = processedContent.replace(/\\begin\{enumerate\}\s*([\s\S]*?)\s*\\end\{enumerate\}/g, (match, content) => {
            // First process inline math within list items
            const processedContent = content.replace(/\$([^$\r\n]*(?:\{[^}]*\}[^$\r\n]*)*)\$/g, (mathMatch: string, latex: string) => {
              try {
                const cleanLatex = latex.trim();
                if (!cleanLatex) return mathMatch;
                
                const rendered = katex.default.renderToString(cleanLatex, {
                  ...katexConfig,
                  displayMode: false
                });
                return `<span class="latex-inline-math">${rendered}</span>`;
              } catch (error) {
                console.error('List item math error:', error);
                return `<span class="latex-error">${latex.trim()}</span>`;
              }
            });
            
            let items = processedContent.replace(/\\item\s*/g, '<li class="latex-enum-item">');
            items = items.replace(/\n\s*(?=<li>)/g, '</li>\n');
            return `\n<ol class="latex-enumerate">${items}</li></ol>\n`;
          });

          // Process table environments - FIXED HLINE REMOVAL
          processedContent = processedContent.replace(/\\begin\{center\}\s*([\s\S]*?)\s*\\end\{center\}/g, (match, content) => {
            return `\n<div class="latex-center">${content}</div>\n`;
          });

          processedContent = processedContent.replace(/\\begin\{tabular\}\{([^}]+)\}\s*([\s\S]*?)\s*\\end\{tabular\}/g, (match, spec, content) => {
            try {
              // Remove table commands like \hline
              let cleanContent = content.replace(/\\hline/g, '');
              cleanContent = cleanContent.replace(/\\toprule|\\midrule|\\bottomrule/g, '');
              
              const rows = cleanContent.split('\\\\').filter((row: string) => row.trim() !== '');
              let tableHtml = '<table class="latex-table"><tbody>';
              
              rows.forEach((row: string) => {
                const cells = row.split('&').map((cell: string) => {
                  let cellContent = cell.trim();
                  
                  // Process inline math within table cells
                  cellContent = cellContent.replace(/\$([^$\r\n]*(?:\{[^}]*\}[^$\r\n]*)*)\$/g, (mathMatch, latex) => {
                    try {
                      const cleanLatex = latex.trim();
                      if (!cleanLatex) return mathMatch;
                      
                      const rendered = katex.default.renderToString(cleanLatex, {
                        ...katexConfig,
                        displayMode: false
                      });
                      return `<span class="latex-inline-math">${rendered}</span>`;
                    } catch (error) {
                      console.error('Table cell math error:', error);
                      return `<span class="latex-error">${latex.trim()}</span>`;
                    }
                  });
                  
                  // Process text formatting within table cells
                  cellContent = cellContent.replace(/\\textbf\{([^}]+)\}/g, '<strong class="latex-textbf">$1</strong>');
                  cellContent = cellContent.replace(/\\textit\{([^}]+)\}/g, '<em class="latex-textit">$1</em>');
                  cellContent = cellContent.replace(/\\texttt\{([^}]+)\}/g, '<code class="latex-texttt">$1</code>');
                  
                  return cellContent;
                });
                tableHtml += '<tr>';
                cells.forEach((cell: string) => {
                  tableHtml += `<td class="latex-table-cell">${cell}</td>`;
                });
                tableHtml += '</tr>';
              });
              
              tableHtml += '</tbody></table>';
              return `\n${tableHtml}\n`;
            } catch (error) {
              console.error('Table rendering error:', error);
              return `<div class="latex-error">Error rendering table: ${content.trim()}</div>\n`;
            }
          });

          // Process cross-references
          processedContent = processedContent.replace(/\\ref\{([^}]+)\}/g, (match, label) => {
            const refNumber = docState.labels[label];
            return refNumber ? `(${refNumber})` : `(${label})`;
          });

          // Clean up remaining LaTeX commands
          processedContent = processedContent.replace(/\\today/g, new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
          processedContent = processedContent.replace(/\\label\{[^}]+\}/g, '');

          // Fix backtick to single quote conversion
          processedContent = processedContent.replace(/``/g, '"').replace(/''/g, '"').replace(/`([^`]*)`/g, "'$1'");

          // Convert paragraphs with proper LaTeX spacing (ONLY AFTER all LaTeX processing is complete)
          const paragraphs = processedContent.split(/\n\s*\n/).filter(p => p.trim() !== '');
          processedContent = paragraphs.map((para, index) => {
            const trimmed = para.trim();
            if (trimmed.startsWith('<') || trimmed === '') return trimmed;
            
            // Check if this paragraph follows a heading
            const isAfterHeading = index > 0 && 
              (paragraphs[index - 1].includes('<h1') || 
               paragraphs[index - 1].includes('<h2') || 
               paragraphs[index - 1].includes('<h3') || 
               paragraphs[index - 1].includes('<h4'));
            
            const className = isAfterHeading ? 'latex-paragraph-first' : 'latex-paragraph';
            return `<p class="${className}">${trimmed}</p>`;
          }).join('\n');

          // Restore protected code blocks and inline codes
          codeBlocks.forEach((code, index) => {
            processedContent = processedContent.replace(`__CODEBLOCK_${index}__`, code);
          });
          
          inlineCodes.forEach((code, index) => {
            processedContent = processedContent.replace(`__INLINECODE_${index}__`, code);
          });
          
          // Set the processed content
          containerRef.current.innerHTML = processedContent;
        }
      } catch (error) {
        console.error('Failed to load KaTeX:', error);
        if (containerRef.current) {
          containerRef.current.innerHTML = content;
        }
      }
    };

    renderLatex();
  }, [content]);

  return (
    <>
      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/npm/computer-modern@0.1.2/cmun-serif.css');
        @import url('https://fonts.googleapis.com/css2?family=Latin+Modern+Roman:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        
        /* Core LaTeX Document Styling */
        .latex-content {
          font-family: "Computer Modern Serif", "Latin Modern Roman", "CMU Serif", "Times New Roman", serif;
          font-size: 11pt;
          line-height: 1.2;
          color: #000000;
          background: #ffffff;
          max-width: none;
          margin: 0;
          padding: 72pt 72pt 72pt 72pt;
          text-align: justify;
          hyphens: auto;
          -webkit-hyphens: auto;
          -moz-hyphens: auto;
          -ms-hyphens: auto;
        }

        /* LaTeX Title Elements */
        .latex-title {
          font-family: "Computer Modern Serif", "Latin Modern Roman", "CMU Serif", "Times New Roman", serif;
          font-size: 17pt;
          font-weight: bold;
          text-align: center;
          margin: 0 0 14pt 0;
          line-height: 1.2;
        }
        
        .latex-author {
          font-family: "Computer Modern Serif", "Latin Modern Roman", "CMU Serif", "Times New Roman", serif;
          font-size: 12pt;
          text-align: center;
          margin: 14pt 0 7pt 0;
          line-height: 1.2;
        }
        
        .latex-date {
          font-family: "Computer Modern Serif", "Latin Modern Roman", "CMU Serif", "Times New Roman", serif;
          font-size: 12pt;
          text-align: center;
          margin: 7pt 0 28pt 0;
          line-height: 1.2;
        }

        /* LaTeX Section Headings */
        .latex-section {
          font-family: "Computer Modern Serif", "Latin Modern Roman", "CMU Serif", "Times New Roman", serif;
          font-size: 14pt;
          font-weight: bold;
          margin: 25pt 0 12pt 0;
          line-height: 1.2;
          text-align: left;
          page-break-after: avoid;
        }
        
        .latex-subsection {
          font-family: "Computer Modern Serif", "Latin Modern Roman", "CMU Serif", "Times New Roman", serif;
          font-size: 12pt;
          font-weight: bold;
          margin: 20pt 0 10pt 0;
          line-height: 1.2;
          text-align: left;
          page-break-after: avoid;
        }
        
        .latex-subsubsection {
          font-family: "Computer Modern Serif", "Latin Modern Roman", "CMU Serif", "Times New Roman", serif;
          font-size: 11pt;
          font-weight: bold;
          margin: 16pt 0 8pt 0;
          line-height: 1.2;
          text-align: left;
          page-break-after: avoid;
        }

        /* LaTeX Paragraph Formatting */
        .latex-paragraph {
          font-family: "Computer Modern Serif", "Latin Modern Roman", "CMU Serif", "Times New Roman", serif;
          font-size: 11pt;
          line-height: 1.2;
          margin: 0 0 12pt 0;
          text-indent: 1.5em;
          text-align: justify;
          orphans: 2;
          widows: 2;
        }
        
        .latex-paragraph-first {
          font-family: "Computer Modern Serif", "Latin Modern Roman", "CMU Serif", "Times New Roman", serif;
          font-size: 11pt;
          line-height: 1.2;
          margin: 0 0 12pt 0;
          text-indent: 0;
          text-align: justify;
          orphans: 2;
          widows: 2;
        }

        /* LaTeX Text Formatting */
        .latex-textbf {
          font-weight: bold;
        }
        
        .latex-textit {
          font-style: italic;
        }
        
        .latex-emph {
          font-style: italic;
        }
        
        .latex-texttt {
          font-family: "Courier New", "Lucida Console", monospace;
          font-size: 10pt;
        }

        /* LaTeX Math Environments */
        .latex-equation-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 18pt 0;
          width: 100%;
        }
        
        .latex-equation-content {
          flex: 1;
          text-align: center;
        }
        
        .latex-equation-number {
          font-family: "Computer Modern Serif", "Latin Modern Roman", "CMU Serif", "Times New Roman", serif;
          font-size: 11pt;
          margin-left: 20pt;
          min-width: 40pt;
          text-align: right;
        }

        .latex-align-container {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin: 18pt 0;
          width: 100%;
        }
        
        .latex-align-content {
          flex: 1;
          text-align: center;
        }
        
        .latex-align-numbers {
          margin-left: 20pt;
          min-width: 40pt;
          display: flex;
          flex-direction: column;
          justify-content: space-around;
          text-align: right;
        }
        
        .latex-align-number {
          font-family: "Computer Modern Serif", "Latin Modern Roman", "CMU Serif", "Times New Roman", serif;
          font-size: 11pt;
          margin: 0.5em 0;
        }

        .latex-display-math {
          text-align: center;
          margin: 18pt 0;
        }
        
        .latex-inline-math {
          vertical-align: baseline;
        }

        /* LaTeX Lists */
        .latex-itemize {
          margin: 12pt 0;
          padding-left: 24pt;
        }
        
        .latex-enumerate {
          margin: 12pt 0;
          padding-left: 24pt;
        }
        
        .latex-item,
        .latex-enum-item {
          font-family: "Computer Modern Serif", "Latin Modern Roman", "CMU Serif", "Times New Roman", serif;
          font-size: 11pt;
          line-height: 1.2;
          margin: 6pt 0;
          text-align: justify;
        }

        /* LaTeX Tables */
        .latex-center {
          text-align: center;
          margin: 18pt 0;
        }

        .latex-table {
          border-collapse: collapse;
          margin: 0 auto;
          font-family: "Computer Modern Serif", "Latin Modern Roman", "CMU Serif", "Times New Roman", serif;
          font-size: 11pt;
        }

        .latex-table-cell {
          border: 1px solid #000000;
          padding: 6pt 8pt;
          text-align: left;
          vertical-align: top;
        }

        /* KaTeX Customization for LaTeX Look */
        .katex {
          font-size: 1.0em !important;
          font-family: "KaTeX_Main", "Computer Modern", "CMU Serif", serif !important;
        }
        
        .katex-display {
          margin: 0 !important;
        }
        
        .katex .base {
          font-size: 1.0em !important;
        }

        /* Error Styling */
        .latex-error {
          font-family: "Courier New", monospace;
          font-size: 10pt;
          color: #cc0000;
          background-color: #ffeeee;
          border: 1px solid #ff9999;
          padding: 4pt 6pt;
          border-radius: 2pt;
          display: inline-block;
          margin: 2pt;
        }

        /* Code Block Styling */
        .latex-content pre {
          font-family: "Courier New", "Lucida Console", monospace;
          font-size: 9pt;
          background-color: #f8f8f8;
          border: 1px solid #cccccc;
          padding: 8pt;
          margin: 12pt 0;
          overflow-x: auto;
          line-height: 1.2;
        }

        .latex-content code {
          font-family: "Courier New", "Lucida Console", monospace;
          font-size: 9pt;
          background-color: #f8f8f8;
          padding: 1pt 2pt;
          border-radius: 2pt;
        }

        /* Override any conflicting styles */
        .latex-content * {
          box-sizing: content-box;
        }
      `}</style>
      <div 
        ref={containerRef}
        className={`latex-content ${className}`}
      />
    </>
  );
} 