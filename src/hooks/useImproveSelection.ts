import { useState, useCallback } from 'react';

interface ImproveButtonState {
  isVisible: boolean;
  selectedText: string;
  position: { x: number; y: number };
  selection: { from: number; to: number };
}

export function useImproveSelection() {
  const [improveButtonState, setImproveButtonState] = useState<ImproveButtonState>({
    isVisible: false,
    selectedText: '',
    position: { x: 0, y: 0 },
    selection: { from: 0, to: 0 },
  });

  const showImproveButton = useCallback(
    (text: string, position: { x: number; y: number }, selection: { from: number; to: number }) => {
      setImproveButtonState({
        isVisible: true,
        selectedText: text,
        position,
        selection,
      });
    },
    []
  );

  const dismissImproveButton = useCallback(() => {
    setImproveButtonState(prev => ({ ...prev, isVisible: false }));
  }, []);

  const replaceSelectedText = useCallback(
    (fullText: string, improvedText: string) => {
      const { from, to } = improveButtonState.selection;
      return fullText.slice(0, from) + improvedText + fullText.slice(to);
    },
    [improveButtonState.selection]
  );

  return {
    improveButtonState,
    showImproveButton,
    dismissImproveButton,
    replaceSelectedText,
  };
}