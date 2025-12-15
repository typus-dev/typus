// src/shared/utils/format.ts
export const formatUtils = {
 currency: (value: number, currency = 'USD', locale = 'en-US'): string => {
   if (!value && value !== 0) return '-';
   return new Intl.NumberFormat(locale, {
     style: 'currency',
     currency
   }).format(value);
 },

 number: (value: number, locale = 'en-US'): string => {
   if (!value && value !== 0) return '-';
   return new Intl.NumberFormat(locale).format(value);
 },

 fileSize: (bytes: number): string => {
   if (!bytes && bytes !== 0) return '-';
   const units = ['B', 'KB', 'MB', 'GB', 'TB'];
   let size = bytes;
   let unitIndex = 0;

   while (size >= 1024 && unitIndex < units.length - 1) {
     size /= 1024;
     unitIndex++;
   }

   return `${size.toFixed(2)} ${units[unitIndex]}`;
 },

 timeAgo: (date: string | Date): string => {
   if (!date) return '-';
   const now = new Date();
   const past = new Date(date);
   const diffMs = now.getTime() - past.getTime();
   
   const minutes = Math.floor(diffMs / (1000 * 60));
   const hours = Math.floor(diffMs / (1000 * 60 * 60));
   const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
   const weeks = Math.floor(days / 7);
   const months = Math.floor(days / 30);
   
   if (diffMs < 0) return 'In the future';
   if (minutes < 1) return 'Just now';
   if (minutes < 60) return `${minutes} min ago`;
   if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
   if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
   if (weeks < 4) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
   if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
   return past.toLocaleDateString();
 },

 duration: (milliseconds: number): string => {
   if (!milliseconds && milliseconds !== 0) return '-';
   
   if (milliseconds < 1000) return `${milliseconds}ms`;
   if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
   if (milliseconds < 3600000) return `${(milliseconds / 60000).toFixed(1)}min`;
   return `${(milliseconds / 3600000).toFixed(1)}h`;
 },

 status: (status: string): string => {
   const statusMap: Record<string, string> = {
     'completed': '✅ Completed',
     'failed': '❌ Failed', 
     'running': '🔄 Running',
     'pending': '⏳ Pending',
     'cancelled': '⛔ Cancelled',
     'success': '✅ Success',
     'error': '❌ Error',
     'warning': '⚠️ Warning',
     'info': 'ℹ️ Info',
     'active': '🟢 Active',
     'inactive': '🔴 Inactive',
     'draft': '📝 Draft',
     'published': '🚀 Published'
   };
   return statusMap[status?.toLowerCase()] || status || '-';
 },

 percentage: (value: number, decimals = 1): string => {
   if (!value && value !== 0) return '-';
   return `${(value * 100).toFixed(decimals)}%`;
 },

 date: (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
   if (!date) return '-';
   const defaultOptions: Intl.DateTimeFormatOptions = {
     year: 'numeric',
     month: 'short',
     day: 'numeric'
   };
   return new Date(date).toLocaleDateString('en-US', options || defaultOptions);
 },

 datetime: (date: string | Date, options?: Intl.DateTimeFormatOptions): string => {
   if (!date) return '-';
   const d = new Date(date);
   const year = d.getFullYear();
   const month = String(d.getMonth() + 1).padStart(2, '0');
   const day = String(d.getDate()).padStart(2, '0');

   let hours = d.getHours();
   const minutes = String(d.getMinutes()).padStart(2, '0');
   const ampm = hours >= 12 ? 'PM' : 'AM';
   hours = hours % 12 || 12; // Convert to 12-hour format
   const hoursStr = String(hours).padStart(2, '0');

   return `${year}-${month}-${day} ${hoursStr}:${minutes} ${ampm}`;
 },

 boolean: (value: boolean, trueText = 'Yes', falseText = 'No'): string => {
   if (value === null || value === undefined) return '-';
   return value ? trueText : falseText;
 },

 truncate: (text: string, maxLength = 50, suffix = '...'): string => {
   if (!text) return '-';
   return text.length > maxLength ? text.slice(0, maxLength) + suffix : text;
 },

 period: (seconds: number): string => {
   if (!seconds && seconds !== 0) return '-';
   if (seconds === 0) return 'Manual';

   const hours = Math.floor(seconds / 3600);
   const days = Math.floor(hours / 24);
   const weeks = Math.floor(days / 7);
   const months = Math.floor(days / 30);

   if (months > 0) return `${months} month${months > 1 ? 's' : ''}`;
   if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''}`;
   if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
   if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;

   const minutes = Math.floor(seconds / 60);
   if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''}`;

   return `${seconds} sec${seconds > 1 ? 's' : ''}`;
 }
};