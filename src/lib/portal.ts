export const PORTAL_ID = "org" as const;

export const PORTAL_ROLE = "partner" as const;

export const SESSION_COOKIE_NAME = "volontyorlar_org_session";

export const SESSION_SECRET_VARIABLE = "VOLONTYORLAR_ORG_SESSION_SECRET";

export const LOGIN_ENDPOINT = "/auth/org/login";

export const IS_ADMIN_PORTAL = false;

export const DEVELOPMENT_PORT = 3004;

export function rawSessionSecret(): string | undefined {
  return process.env.VOLONTYORLAR_ORG_SESSION_SECRET;
}
