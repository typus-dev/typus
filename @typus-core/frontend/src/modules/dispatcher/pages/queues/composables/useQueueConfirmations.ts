export function useQueueConfirmations(confirmFn: (message: string) => Promise<boolean>) {
  const confirmQueueClear = (queueKey: string) =>
    confirmFn(`Are you sure you want to clear the queue ${queueKey}? This action cannot be undone.`)

  const confirmAllQueuesClear = () =>
    confirmFn('Are you sure you want to clear all queues and tasks? This action cannot be undone.')

  return {
    confirmQueueClear,
    confirmAllQueuesClear
  }
}
