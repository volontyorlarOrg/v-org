import "server-only";

import { cache } from "react";

import { read } from "@/lib/api/gateway.server";
import {
  organizationListSchema,
  vacancyListSchema,
  vacancySchema,
} from "@/lib/api/schemas";
import type { Loaded } from "@/lib/api/load";
import type { Organization, Vacancy, VacancyListItem } from "@/lib/api/schemas";

// One request renders metadata, layout and page; each of them asks for the
// same records, so every read is shared within the request.

export const loadVacancies = cache((): Promise<Loaded<VacancyListItem[]>> =>
  read("vacancies", { schema: vacancyListSchema }),
);

export const loadVacancy = cache((id: string): Promise<Loaded<Vacancy>> =>
  read("vacancy", { schema: vacancySchema, params: { id } }),
);

export const loadOrganizations = cache((): Promise<Loaded<Organization[]>> =>
  read("organizations", { schema: organizationListSchema }),
);
