const TOKEN_STORAGE_KEY = "pfm.auth.tokens";

export type StoredTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
};

export function getStoredTokens(): StoredTokens | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as StoredTokens;
  } catch {
    clearStoredTokens();
    return null;
  }
}

export function setStoredTokens({
  accessToken,
  refreshToken,
  expiresIn,
}: {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}): StoredTokens {
  const tokens = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
  }

  return tokens;
}

export function clearStoredTokens(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}
