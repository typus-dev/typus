import { QueueDriver } from '../interfaces/IQueueAdapter';

type QueueType = 'mail' | 'messages' | 'system' | 'unknown';

interface KnownQueueDefinition {
  configKey: string;
  fallback: string;
  type: QueueType;
}

// Driver-agnostic queue definitions (queue.* configs in database)
const KNOWN_QUEUES: KnownQueueDefinition[] = [
  { configKey: 'queue.notification', fallback: 'notification_queue', type: 'messages' },
  { configKey: 'queue.telegram', fallback: 'telegram_queue', type: 'messages' },
  { configKey: 'queue.email', fallback: 'email_queue', type: 'mail' },
  { configKey: 'queue.system', fallback: 'system_queue', type: 'system' },
  { configKey: 'queue.reports', fallback: 'reports_queue', type: 'system' },
  { configKey: 'queue.cache', fallback: 'cache_queue', type: 'system' },
  { configKey: 'queue.backup', fallback: 'backup_queue', type: 'system' },
  { configKey: 'queue.social_media', fallback: 'social_media_queue', type: 'messages' },
  { configKey: 'queue.flux_generation', fallback: 'flux_generation_queue', type: 'system' }
];

/**
 * Get known queue keys
 * Note: This returns fallback values. Actual queue names should be read from database (queue.*)
 *
 * @param driver - Queue driver type
 * @param configValues - Optional map of config values from database (queue.* → queue name)
 */
export const getKnownQueueKeys = (
  driver: QueueDriver,
  configValues?: Map<string, string>
): Array<{ key: string; type: QueueType }> => {
  return KNOWN_QUEUES.map(({ configKey, fallback, type }) => {
    // If config values provided, use them
    if (configValues && configValues.has(configKey)) {
      const value = configValues.get(configKey);
      if (value && value.trim().length > 0) {
        return { key: value.trim(), type };
      }
    }

    // Otherwise use fallback
    return { key: fallback, type };
  });
};

export const formatQueueName = (key: string): string => {
  return key
    .replace(/^redis_/, '')
    .replace(/^dispatcher_/, '')
    .replace(/_queue$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, letter => letter.toUpperCase());
};

export const determineQueueType = (key: string): QueueType => {
  const lowerKey = key.toLowerCase();

  if (lowerKey.includes('email') || lowerKey.includes('mail')) {
    return 'mail';
  }

  if (lowerKey.includes('telegram') || lowerKey.includes('notification') || lowerKey.includes('message') || lowerKey.includes('social')) {
    return 'messages';
  }

  if (lowerKey.includes('cache') || lowerKey.includes('system') || lowerKey.includes('report') || lowerKey.includes('backup')) {
    return 'system';
  }

  return 'unknown';
};

export const getQueueColor = (key: string): string => {
  const lowerKey = key.toLowerCase();

  if (lowerKey.includes('email')) return '#2563eb';
  if (lowerKey.includes('telegram')) return '#0ea5e9';
  if (lowerKey.includes('notification')) return '#475569';
  if (lowerKey.includes('cache')) return '#16a34a';
  if (lowerKey.includes('backup')) return '#10b981';
  if (lowerKey.includes('report')) return '#f59e0b';
  if (lowerKey.includes('system')) return '#8b5cf6';

  const type = determineQueueType(key);
  switch (type) {
    case 'mail':
      return '#3b82f6';
    case 'messages':
      return '#06b6d4';
    case 'system':
      return '#6366f1';
    default:
      return '#64748b';
  }
};

export const isQueueKeyCandidate = (key: string): boolean => {
  if (!key) {
    return false;
  }

  const lowerKey = key.toLowerCase();

  if (lowerKey.includes(':errors') ||
      lowerKey.includes(':paused') ||
      lowerKey.includes(':last_activity') ||
      lowerKey.includes(':worker') ||
      lowerKey.includes(':heartbeat') ||
      lowerKey.includes(':lock')) {
    return false;
  }

  return true;
};
