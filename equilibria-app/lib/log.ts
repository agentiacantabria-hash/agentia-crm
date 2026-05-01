/**
 * Log estructurado para errores en runtime de servidor.
 * Vercel captura todo lo que va a stderr (console.error) en sus runtime
 * logs, así que con esto basta para tener trazabilidad mínima sin
 * añadir dependencias (Sentry, Datadog, etc).
 */
export function logServerError(scope: string, err: unknown, ctx?: Record<string, unknown>) {
  const msg = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  // eslint-disable-next-line no-console
  console.error(JSON.stringify({
    ts: new Date().toISOString(),
    level: 'error',
    scope,
    msg,
    stack,
    ...ctx,
  }))
}
