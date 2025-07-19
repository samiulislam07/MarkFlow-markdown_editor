import { useState, useEffect, useCallback, RefObject } from 'react';
import { CommentPosition, CommentUIState } from '@/types/comment';

interface UseCommentSelectionReturn {
  isCommentButtonVisible: boolean;
  selectedText: string;
  buttonPosition: { x: number; y: number };
  selectionPosition: CommentPosition | null;
  dismissCommentButton: () => void;
}

export function useCommentSelection(
  editorRef: RefObject<HTMLElement>,
  isEnabled: boolean = true
): UseCommentSelectionReturn {
  const [uiState, setUiState] = useState<CommentUIState>({
    isCommentButtonVisible: false,
    selectedText: '',
    buttonPosition: { x: 0, y: 0 },
    selectionPosition: null,
  });

  const dismissCommentButton = useCallback(() => {
    setUiState(prev => ({
      ...prev,
      isCommentButtonVisible: false,
      selectedText: '',
      selectionPosition: null,
    }));
  }, []);

  const calculateSelectionPosition = useCallback((selection: Selection): CommentPosition | null => {
    if (!editorRef.current || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const selectedText = range.toString().trim();
    
    if (!selectedText) return null;

    // Get the position relative to the editor
    const editorElement = editorRef.current;
    const editorRect = editorElement.getBoundingClientRect();
    
    // Find the CodeMirror content element
    const cmContent = editorElement.querySelector('.cm-content');
    if (!cmContent) return null;

    const contentRect = cmContent.getBoundingClientRect();
    
    // Calculate line and character position
    const startContainer = range.startContainer;
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;

    // For CodeMirror, we need to approximate the line and character position
    // This is a simplified calculation - in a real implementation, you might want
    // to use CodeMirror's API to get more accurate positions
    const textBeforeSelection = cmContent.textContent?.substring(0, 
      getTextOffset(cmContent, startContainer, startOffset)) || '';
    
    const lines = textBeforeSelection.split('\n');
    const line = lines.length - 1;
    const character = lines[lines.length - 1].length;

    return {
      line,
      character,
      selection: {
        start: startOffset,
        end: endOffset,
      },
      selectedText,
    };
  }, [editorRef]);

  const getTextOffset = (container: Element, node: Node, offset: number): number => {
    let textOffset = 0;
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let currentNode;
    while (currentNode = walker.nextNode()) {
      if (currentNode === node) {
        return textOffset + offset;
      }
      textOffset += currentNode.textContent?.length || 0;
    }
    return textOffset;
  };

  const handleSelectionChange = useCallback(() => {
    if (!isEnabled || !editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      dismissCommentButton();
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length < 3) {
      dismissCommentButton();
      return;
    }

    // Check if selection is within the editor
    const range = selection.getRangeAt(0);
    const editorElement = editorRef.current;
    
    if (!editorElement.contains(range.commonAncestorContainer)) {
      dismissCommentButton();
      return;
    }

    // Calculate button position
    const rect = range.getBoundingClientRect();
    const editorRect = editorElement.getBoundingClientRect();
    
    // Position the button near the end of the selection
    const buttonPosition = {
      x: rect.right + 10,
      y: rect.top + (rect.height / 2) - 15, // Center vertically
    };

    // Make sure button stays within editor bounds
    if (buttonPosition.x > editorRect.right - 100) {
      buttonPosition.x = rect.left - 100;
    }

    const selectionPosition = calculateSelectionPosition(selection);

    setUiState({
      isCommentButtonVisible: true,
      selectedText,
      buttonPosition,
      selectionPosition,
    });
  }, [isEnabled, editorRef, calculateSelectionPosition, dismissCommentButton]);

  useEffect(() => {
    if (!isEnabled) return;

    // Add event listeners for selection changes
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mouseup', handleSelectionChange);
    document.addEventListener('keyup', handleSelectionChange);

    // Dismiss comment button when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (uiState.isCommentButtonVisible && editorRef.current) {
        const target = event.target as Node;
        if (!editorRef.current.contains(target)) {
          dismissCommentButton();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mouseup', handleSelectionChange);
      document.removeEventListener('keyup', handleSelectionChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEnabled, editorRef, handleSelectionChange, uiState.isCommentButtonVisible, dismissCommentButton]);

  // Dismiss comment button when editor content changes
  useEffect(() => {
    if (!isEnabled || !editorRef.current) return;

    const editorElement = editorRef.current;
    const observer = new MutationObserver(() => {
      // Small delay to allow for selection to settle
      setTimeout(() => {
        const selection = window.getSelection();
        if (!selection || !selection.toString().trim()) {
          dismissCommentButton();
        }
      }, 100);
    });

    observer.observe(editorElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [isEnabled, editorRef, dismissCommentButton]);

  return {
    isCommentButtonVisible: uiState.isCommentButtonVisible,
    selectedText: uiState.selectedText,
    buttonPosition: uiState.buttonPosition,
    selectionPosition: uiState.selectionPosition,
    dismissCommentButton,
  };
} 