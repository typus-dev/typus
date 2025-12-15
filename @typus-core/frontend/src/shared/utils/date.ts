// src/shared/utils/date.ts

// Individual exports
export const format = (date: Date, locale = 'default'): string => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
  }

  
export const formatRelativeTime = (timestamp: number | string | Date): string => {
  const diff = new Date().getTime() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
      
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}, ${minutes % 60} min ago`;
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}, ${hours % 24} hour${hours % 24 === 1 ? '' : 's'} ago`;
      
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

export const fromNow = (date: Date | string | number): string => {
  const dateObj = date instanceof Date ? date : new Date(date);
  const diff = Date.now() - dateObj.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} days ago`;
  if (hours > 0) return `${hours} hours ago`;
  if (minutes > 0) return `${minutes} minutes ago`;
  return 'just now';
}

export const isToday = (date: Date): boolean => {
  const today = new Date()
  return date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
}

// Object export
export const dateUtils = {
  format,
  formatRelativeTime,
  fromNow,
  isToday
}