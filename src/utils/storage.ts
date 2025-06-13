import { ApiKeys, SavedArticle } from '../types';

const STORAGE_KEYS = {
  API_KEYS: 'youtube_generator_api_keys',
  SAVED_ARTICLES: 'youtube_generator_saved_articles',
};

// Simple encryption for API keys (in production, use proper encryption)
const encryptKey = (key: string): string => {
  return btoa(key);
};

const decryptKey = (encryptedKey: string): string => {
  try {
    return atob(encryptedKey);
  } catch {
    return '';
  }
};

export const saveApiKeys = (keys: ApiKeys): void => {
  const encrypted = {
    openai: encryptKey(keys.openai),
    youtube: encryptKey(keys.youtube),
  };
  localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(encrypted));
};

export const loadApiKeys = (): ApiKeys => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.API_KEYS);
    if (!stored) return { openai: '', youtube: '' };
    
    const encrypted = JSON.parse(stored);
    return {
      openai: decryptKey(encrypted.openai || ''),
      youtube: decryptKey(encrypted.youtube || ''),
    };
  } catch {
    return { openai: '', youtube: '' };
  }
};

export const saveArticle = (article: SavedArticle): void => {
  try {
    const articles = loadSavedArticles();
    const updated = [article, ...articles.filter(a => a.id !== article.id)];
    localStorage.setItem(STORAGE_KEYS.SAVED_ARTICLES, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save article:', error);
  }
};

export const loadSavedArticles = (): SavedArticle[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SAVED_ARTICLES);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const deleteArticle = (id: string): void => {
  try {
    const articles = loadSavedArticles();
    const filtered = articles.filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.SAVED_ARTICLES, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete article:', error);
  }
};