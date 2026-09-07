import { format, isToday, isYesterday } from 'date-fns';

export const formatLastSeen = (dateStr, fallback = 'Offline') => {
  if (!dateStr) return fallback;

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return fallback;

  const minutesAgo = Math.floor((Date.now() - date.getTime()) / 60000);

  if (minutesAgo < 1) return 'last seen just now';
  if (minutesAgo < 60) return `last seen ${minutesAgo} min ago`;
  if (isToday(date)) return `last seen today at ${format(date, 'h:mm a')}`;
  if (isYesterday(date)) return `last seen yesterday at ${format(date, 'h:mm a')}`;
  return `last seen ${format(date, 'EEE, MMM d')} at ${format(date, 'h:mm a')}`;
};