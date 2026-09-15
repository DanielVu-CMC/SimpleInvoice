export class ApiError extends Error {
  constructor(
    public status: number,
    public messages: string[],
  ) {
    super(messages.join('. '));
    this.name = 'ApiError';
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL || '/api'}${path}`,
    {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'SimpleInvoice',
        ...options.headers,
      },
    },
  );
  if (!response.ok) {
    let message: string | string[] =
      'The request could not be completed. Please try again.';
    try {
      const body = (await response.json()) as { message?: string | string[] };
      if (body.message) message = body.message;
    } catch {
      /* Network proxy errors may not contain JSON. */
    }
    if (response.status === 401 && !['/auth/login', '/auth/me'].includes(path))
      window.dispatchEvent(new Event('session-expired'));
    throw new ApiError(
      response.status,
      Array.isArray(message) ? message : [message],
    );
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}
export const errorMessage = (error: unknown) =>
  error instanceof ApiError
    ? error.message
    : 'Unable to connect. Check that the API is running and try again.';
