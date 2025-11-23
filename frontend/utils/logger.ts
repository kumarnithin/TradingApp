const DEBUG = process.env.NEXT_PUBLIC_DEBUG === 'true';

function safeLog(method: 'debug' | 'info' | 'warn' | 'error', ...args: any[]) {
  if (!DEBUG) return;
  // eslint-disable-next-line no-console
  ;(console as any)[method](...args);
}

const logger = {
  debug: (...args: any[]) => safeLog('debug', ...args),
  info: (...args: any[]) => safeLog('info', ...args),
  warn: (...args: any[]) => safeLog('warn', ...args),
  error: (...args: any[]) => safeLog('error', ...args),
};

export default logger
