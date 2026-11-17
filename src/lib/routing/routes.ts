import type { Locale } from "@/i18n/routing";

export const ROUTE_KEYS = [
  "login",
  "dashboard",
  "vacancies",
  "newVacancy",
  "applications",
  "users",
  "participants",
  "pastEvents",
  "newPastEvent",
  "attendance",
  "activity",
] as const;

export type RouteKey = (typeof ROUTE_KEYS)[number];

export type RouteArea = "auth" | "portal" | "account";

export type RouteGuard = "guest" | "session";

export const HUBS = ["overview", "volunteering", "people"] as const;

export const NAV_COUNTS = [
  "changesRequested",
  "pendingReview",
  "attendanceDue",
] as const;

export type NavCount = (typeof NAV_COUNTS)[number];

export type Hub = (typeof HUBS)[number];

export const HUB_ICONS: Record<Hub, string> = {
  overview: "house",
  volunteering: "clipboard-list",
  people: "users",
};

export type AppRoute = {
  key: RouteKey;
  path: string;
  area: RouteArea;
  guard: RouteGuard;
  inNav: boolean;
  hub?: Hub;
  count?: NavCount;
  icon: string;
};

export const appRoutes: readonly AppRoute[] = [
  {
    key: "login",
    path: "/login",
    area: "auth",
    guard: "guest",
    inNav: false,
    icon: "log-in",
  },
  {
    key: "dashboard",
    hub: "overview",
    path: "/dashboard",
    area: "portal",
    guard: "session",
    inNav: true,
    icon: "layout-dashboard",
  },
  {
    key: "vacancies",
    hub: "volunteering",
    path: "/vacancies",
    area: "portal",
    guard: "session",
    inNav: true,
    count: "changesRequested",
    icon: "clipboard-list",
  },
  {
    key: "newVacancy",
    hub: "volunteering",
    path: "/vacancies/new",
    area: "portal",
    guard: "session",
    inNav: false,
    icon: "plus",
  },
  {
    key: "applications",
    hub: "volunteering",
    path: "/applications",
    area: "portal",
    guard: "session",
    inNav: false,
    count: "pendingReview",
    icon: "inbox",
  },
  {
    key: "attendance",
    hub: "volunteering",
    path: "/attendance",
    area: "portal",
    guard: "session",
    inNav: true,
    count: "attendanceDue",
    icon: "clipboard-check",
  },
  {
    key: "pastEvents",
    hub: "volunteering",
    path: "/past-events",
    area: "portal",
    guard: "session",
    inNav: true,
    icon: "calendar-clock",
  },
  {
    key: "users",
    hub: "people",
    path: "/users",
    area: "portal",
    guard: "session",
    inNav: true,
    icon: "users",
  },
  {
    key: "participants",
    hub: "people",
    path: "/participants",
    area: "portal",
    guard: "session",
    inNav: true,
    icon: "user-check",
  },
  {
    key: "activity",
    path: "/activity",
    area: "account",
    guard: "session",
    inNav: false,
    icon: "history",
  },
  {
    key: "newPastEvent",
    hub: "volunteering",
    path: "/past-events/new",
    area: "portal",
    guard: "session",
    inNav: false,
    icon: "plus",
  },
] as const;

export const ENTRY_ROUTE: RouteKey = "login";
export const HOME_ROUTE: RouteKey = "dashboard";

export const navRoutes = appRoutes.filter((route) => route.inNav);

export const ACCOUNT_ROUTES: readonly RouteKey[] = ["activity"];

export const JUMP_CREATE: readonly { key: RouteKey; label: string }[] = [
  { key: "newVacancy", label: "vacancies.new" },
  { key: "newPastEvent", label: "nav.newPastEvent" },
];

export const JUMP_SEARCH: readonly RouteKey[] = [
  "vacancies",
  "users",
  "participants",
  "pastEvents",
];

export function hubRoutes(hub: Hub): AppRoute[] {
  return navRoutes.filter((route) => route.hub === hub);
}

export function hubHref(hub: Hub): string {
  const first = hubRoutes(hub)[0];
  if (!first) throw new Error(`Empty portal hub: ${hub}`);
  return first.path;
}

export function hubFor(pathname: string): Hub | null {
  return routeFor(pathname)?.hub ?? null;
}

export function getRoute(key: RouteKey): AppRoute {
  const route = appRoutes.find((candidate) => candidate.key === key);
  if (!route) throw new Error(`Unknown portal route: ${key}`);
  return route;
}

export function navHref(key: RouteKey): string {
  return getRoute(key).path;
}

export function vacancyHref(id: string): string {
  return `${navHref("vacancies")}/${encodeURIComponent(id)}`;
}

export function vacancyEditHref(id: string): string {
  return `${vacancyHref(id)}/edit`;
}

export function applicationHref(id: string): string {
  return `${navHref("applications")}/${encodeURIComponent(id)}`;
}

export function userHref(id: string): string {
  return `${navHref("users")}/${encodeURIComponent(id)}`;
}

export function participantHref(id: string): string {
  return `${navHref("participants")}/${encodeURIComponent(id)}`;
}

export function pastEventRosterHref(id: string): string {
  return `${navHref("pastEvents")}/${encodeURIComponent(id)}`;
}

export function localePath(locale: Locale, key: RouteKey): string {
  return `/${locale}${getRoute(key).path}`;
}

export function isActivePath(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function pathWithoutLocale(pathname: string): string {
  const withoutLocale = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "");
  return withoutLocale === "" ? "/" : withoutLocale;
}

export function routeFor(pathname: string): AppRoute | null {
  const path = pathWithoutLocale(pathname);
  const matches = appRoutes.filter((route) => isActivePath(path, route.path));
  return matches.sort((a, b) => b.path.length - a.path.length)[0] ?? null;
}

export function guardFor(pathname: string): RouteGuard | null {
  return routeFor(pathname)?.guard ?? null;
}
