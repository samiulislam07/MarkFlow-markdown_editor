'use client'

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';

interface ItemContextMenuProps {
  onDelete: () => void;
  canEdit: boolean;
}

export default function ItemContextMenu({ onDelete, canEdit }: ItemContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!canEdit) {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering parent onClick (e.g., folder navigation)
          setIsOpen(!isOpen);
        }}
        className="p-1 rounded-full hover:bg-gray-200 text-gray-500 hover:text-gray-700"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg z-10 border border-gray-200">
          <ul className="py-1">
            <li>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setIsOpen(false);
                }}
                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </button>
            </li>
            {/* Add other actions like "Rename" or "Move" here in the future */}
          </ul>
        </div>
      )}
    </div>
  );
}
