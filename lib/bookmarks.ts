import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';

const BOOKMARKS_KEY = 'rgpv_bookmarks';

interface BookmarksContextValue {
  bookmarks: string[];
  toggleBookmark: (subjectId: string) => void;
  isBookmarked: (subjectId: string) => boolean;
  isLoading: boolean;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

export function BookmarksProvider({ children }: { children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(BOOKMARKS_KEY).then(data => {
      if (data) {
        setBookmarks(JSON.parse(data));
      }
      setIsLoading(false);
    });
  }, []);

  const toggleBookmark = useCallback((subjectId: string) => {
    setBookmarks(prev => {
      const next = prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId];
      AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isBookmarked = useCallback((subjectId: string) => {
    return bookmarks.includes(subjectId);
  }, [bookmarks]);

  const value = useMemo(() => ({
    bookmarks,
    toggleBookmark,
    isBookmarked,
    isLoading,
  }), [bookmarks, toggleBookmark, isBookmarked, isLoading]);

  return React.createElement(BookmarksContext.Provider, { value }, children);
}

export function useBookmarks() {
  const context = useContext(BookmarksContext);
  if (!context) {
    throw new Error('useBookmarks must be used within a BookmarksProvider');
  }
  return context;
}
