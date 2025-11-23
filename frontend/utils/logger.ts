const DEBUG = process.env.NEXT_PUBLIC_DEBUG === 'true'

function safeLog(method: 'debug' | 'info' | 'warn' | 'error', ...args: unknown[]) {
  if (!DEBUG) return
  const c = console as unknown as Record<string, (...a: unknown[]) => void>
  const fn = c[method]
  if (typeof fn === 'function') fn(...args)
}

const logger = {
  debug: (...args: unknown[]) => safeLog('debug', ...args),
  info: (...args: unknown[]) => safeLog('info', ...args),
  warn: (...args: unknown[]) => safeLog('warn', ...args),
  error: (...args: unknown[]) => safeLog('error', ...args),
}

export default logger
