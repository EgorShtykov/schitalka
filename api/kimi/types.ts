export type SessionPayload = {
  unionId: string;
  clientId: string;
  sessionVersion?: number;
};

export type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
};

export type UserProfile = {
  id: string;
  name: string;
  avatar_url?: string;
};
