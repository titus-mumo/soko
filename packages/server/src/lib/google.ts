import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(
  Bun.env.GOOGLE_CLIENT_ID!,
  Bun.env.GOOGLE_CLIENT_SECRET!,
  Bun.env.GOOGLE_REDIRECT_URI!,
);

export interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  picture: string;
}

// Generates the Google OAuth consent screen URL.
// Redirect the user to this URL to begin the OAuth flow.
export function getGoogleAuthUrl(): string {
  return client.generateAuthUrl({
    access_type: "offline",
    scope: ["profile", "email"],
    prompt: "consent",
  });
}

// Exchanges the authorization code from Google's callback for user info.
export async function getGoogleUser(
  code: string,
): Promise<GoogleUserInfo | null> {
  try {
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: Bun.env.GOOGLE_CLIENT_ID!,
    });

    const payload = ticket.getPayload();
    if (!payload) return null;

    return {
      googleId: payload.sub,
      email: payload.email!,
      name: payload.name!,
      picture: payload.picture!,
    };
  } catch (error) {
    console.error("Google OAuth error:", error);
    return null;
  }
}
