export const CONTRACT_STATUSES = ["published", "announced", "requested"] as const;

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type Endpoint = {
  readonly method: HttpMethod;
  readonly path: string;
  readonly contract: ContractStatus;
};

export const endpoints = {
  logIn: { method: "POST", path: "/auth/org/login", contract: "published" },
  refresh: { method: "POST", path: "/auth/refresh", contract: "published" },
  logOut: { method: "POST", path: "/auth/logout", contract: "published" },
  currentUser: { method: "GET", path: "/me", contract: "published" },

  statistics: { method: "GET", path: "/org/statistics", contract: "published" },
  activity: { method: "GET", path: "/org/activity", contract: "published" },

  vacancies: { method: "GET", path: "/org/opportunities", contract: "published" },
  vacancy: {
    method: "GET",
    path: "/org/opportunities/{id}",
    contract: "published",
  },
  createVacancy: {
    method: "POST",
    path: "/org/opportunities",
    contract: "published",
  },
  updateVacancy: {
    method: "PATCH",
    path: "/org/opportunities/{id}",
    contract: "published",
  },
  uploadVacancyImage: {
    method: "PUT",
    path: "/org/opportunities/{id}/image",
    contract: "published",
  },
  removeVacancyImage: {
    method: "DELETE",
    path: "/org/opportunities/{id}/image",
    contract: "published",
  },
  submitVacancyForApproval: {
    method: "POST",
    path: "/org/opportunities/{id}/submit-for-approval",
    contract: "published",
  },
  archiveVacancy: {
    method: "POST",
    path: "/org/opportunities/{id}/archive",
    contract: "published",
  },

  applications: { method: "GET", path: "/org/applications", contract: "published" },
  application: {
    method: "GET",
    path: "/org/applications/{id}",
    contract: "published",
  },
  reviewApplication: {
    method: "PATCH",
    path: "/org/applications/{id}/review",
    contract: "published",
  },

  resolveAttendance: {
    method: "PUT",
    path: "/org/attendance/{applicationId}",
    contract: "published",
  },
  resolveVacancyAttendance: {
    method: "PUT",
    path: "/org/opportunities/{id}/attendance",
    contract: "published",
  },

  users: { method: "GET", path: "/org/users", contract: "published" },
  user: { method: "GET", path: "/org/users/{id}", contract: "published" },

  organizations: { method: "GET", path: "/org/organizations", contract: "published" },
} as const satisfies Record<string, Endpoint>;

export type EndpointName = keyof typeof endpoints;

export function pathFor(
  name: EndpointName,
  params: Record<string, string> = {},
): string {
  return endpoints[name].path.replace(/\{(\w+)\}/g, (_match, key: string) => {
    const value = params[key];
    if (!value) throw new Error(`Missing "${key}" for endpoint ${name}`);
    return encodeURIComponent(value);
  });
}

export function isPublished(name: EndpointName): boolean {
  return endpoints[name].contract === "published";
}
