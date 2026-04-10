export type ApiResult<T> = { success: true; data: T } | { success: false; error: string };

export const requestJson = async <T>({
  input,
  init,
  parse,
  invalidMessage,
  fallbackError,
}: {
  input: RequestInfo | URL;
  init?: RequestInit;
  parse: (json: unknown) => { success: true; data: T } | { success: false };
  invalidMessage: string;
  fallbackError: string;
}): Promise<ApiResult<T>> => {
  try {
    const response = await fetch(input, init);
    const json = await response.json();
    const parsed = parse(json);
    if (!parsed.success) {
      return { success: false, error: invalidMessage };
    }
    if (!response.ok) {
      const maybeError = (parsed.data as { error?: string }).error;
      return { success: false, error: maybeError ?? fallbackError };
    }
    return { success: true, data: parsed.data };
  } catch {
    return { success: false, error: fallbackError };
  }
};
