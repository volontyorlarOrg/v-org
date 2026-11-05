import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.STUB_PORT ?? 3805);
const ACCESS_TOKEN_TTL_SECONDS = 172_800;
const DAY = 86_400_000;
const START = new Date(new Date().setUTCHours(6, 0, 0, 0)).getTime();

const at = (days, hour = 9) =>
  new Date(START + days * DAY + (hour - 6) * 3_600_000).toISOString();
const uuid = (series, number) =>
  `00000000-0000-4000-8000-${String(series).padStart(6, "0")}${String(number).padStart(6, "0")}`;

const PASSWORD = "stub-password";
const ACCOUNT = uuid(1, 1);
const ADMIN = uuid(1, 2);
const HANDLE = "chilonzor-reading-corners";

const ORGANIZATION = {
  id: uuid(2, 1),
  name: "Chilonzor Reading Corners",
  slug: HANDLE,
  logoUrl: null,
  verified: true,
};

const VOLUNTEERS = [
  ["Dilnoza Karimova", "dilnoza_k", "dilnoza@example.org"],
  ["Sardor Toshmatov", "sardor_t", "sardor@example.org"],
  ["Aziza Nazarova", "aziza_n", "aziza@example.org"],
  ["Jasur Qodirov", "jasur_q", "jasur@example.org"],
  ["Malika Sobirova", "malika_s", "malika@example.org"],
  ["Bekzod Rustamov", "bekzod_r", "bekzod@example.org"],
  ["Nodira Alimova", "nodira_a", "nodira@example.org"],
].map(([displayName, username, email], index) => ({
  id: uuid(3, index + 1),
  displayName,
  username,
  email,
  avatarUrl: null,
  createdAt: at(-200 + index * 7),
}));

const volunteer = (index) => VOLUNTEERS[index];

function vacancy(number, fields) {
  return {
    id: uuid(4, number),
    slug: `vacancy-${number}`,
    title: `Vacancy ${number}`,
    kind: "volunteering",
    description:
      "Volunteers help visitors find books, keep the shelves in order and run the reading hour with the children of the district.",
    requirements: [],
    region: "tashkent_city",
    city: "Tashkent",
    format: "onsite",
    status: "open",
    startsAt: at(21, 9),
    endsAt: at(21, 13),
    applicationDeadline: at(14, 18),
    locationName: "Chilonzor library",
    imageUrl: null,
    capacity: 20,
    estimatedTotalHours: 4,
    acceptanceMode: "manual",
    essayRequired: false,
    essayPrompt: null,
    schedule: null,
    allDaysRequired: true,
    approvalStatus: "draft",
    approvalSubmittedAt: null,
    approvalReviewedAt: null,
    approvalNote: null,
    approvalReviewedById: null,
    approvalReviewedBy: null,
    publishedAt: null,
    archivedAt: null,
    createdAt: at(-30 + number),
    updatedAt: at(-3),
    organizationId: ORGANIZATION.id,
    createdById: ACCOUNT,
    organization: ORGANIZATION,
    questions: [],
    xpPerHour: 10,
    xpWinner: 50,
    xpContributor: 30,
    xpAttendee: 10,
    xpNoShowPenalty: 10,
    saved: false,
    ...fields,
  };
}

const approved = (days, note = null) => ({
  approvalStatus: "approved",
  approvalSubmittedAt: at(days - 1),
  approvalReviewedAt: at(days),
  approvalNote: note,
  approvalReviewedById: ADMIN,
  approvalReviewedBy: { id: ADMIN, displayName: "Stub Administrator" },
  publishedAt: at(days),
});

function application(number, volunteerIndex, vacancyId, status, fields = {}) {
  const person = volunteer(volunteerIndex);
  return {
    id: uuid(5, number),
    status,
    essay: null,
    reviewerNote: null,
    stagedDecision: null,
    stagedAt: null,
    profileSnapshot: {
      username: person.username,
      fullName: person.displayName,
      region: "tashkent-city",
      city: "Chilonzor",
      school: "School 110",
      gradeYear: "10",
      languages: ["uz", "ru"],
      phone: "+998901234567",
      telegram: person.username,
    },
    submittedAt: at(-(number % 6) - 1),
    reviewedAt: null,
    reviewedById: null,
    withdrawnAt: null,
    createdAt: at(-(number % 6) - 2),
    updatedAt: at(-(number % 6) - 1),
    volunteerId: person.id,
    opportunityId: vacancyId,
    answers: [],
    attendanceRecord: null,
    ...fields,
  };
}

function accepted(number, volunteerIndex, vacancyId, attendance = {}) {
  return application(number, volunteerIndex, vacancyId, "accepted", {
    reviewedAt: at(-12),
    reviewedById: ACCOUNT,
    attendanceRecord: {
      id: uuid(6, number),
      outcome: "awaiting_confirmation",
      confirmedHours: null,
      placement: null,
      note: null,
      xpAwarded: 0,
      draft: null,
      reviewNote: null,
      resolvedAt: null,
      confirmedById: null,
      ...attendance,
    },
  });
}

const V = {
  draftReady: uuid(4, 1),
  draftEmpty: uuid(4, 2),
  returned: uuid(4, 3),
  pending: uuid(4, 4),
  live: uuid(4, 5),
  liveFull: uuid(4, 6),
  ended: uuid(4, 7),
  verifying: uuid(4, 8),
  returnedResults: uuid(4, 9),
  verified: uuid(4, 10),
  rejected: uuid(4, 11),
  archived: uuid(4, 12),
  competition: uuid(4, 13),
};

let state;

function reset() {
  ORGANIZATION.verified = true;
  const vacancies = [
    vacancy(1, {
      title: "Autumn book drive",
      updatedAt: at(-1),
      essayRequired: true,
      essayPrompt: "Why do you want to help with the book drive?",
    }),
    vacancy(2, {
      title: "Spring reading picnic",
      applicationDeadline: at(-2, 18),
      startsAt: at(-1, 9),
      endsAt: at(-1, 13),
      capacity: null,
      updatedAt: at(-5),
    }),
    vacancy(3, {
      title: "Photo archive week",
      approvalStatus: "changes_requested",
      approvalSubmittedAt: at(-4),
      approvalReviewedAt: at(-2),
      approvalNote: "Please say which days need the most volunteers.",
      approvalReviewedById: ADMIN,
      approvalReviewedBy: { id: ADMIN, displayName: "Stub Administrator" },
      updatedAt: at(-2),
    }),
    vacancy(4, {
      title: "Winter clothing drive",
      approvalStatus: "pending_review",
      approvalSubmittedAt: at(-1),
      updatedAt: at(-1),
    }),
    vacancy(5, {
      title: "Winter book fair",
      ...approved(-10),
      saved: true,
      essayRequired: true,
      essayPrompt: "What would you like to do at the fair?",
      imageUrl: null,
    }),
    vacancy(6, {
      title: "Reading room weekends",
      ...approved(-8),
      capacity: 2,
      startsAt: at(7, 9),
      endsAt: at(8, 13),
      applicationDeadline: at(5, 18),
      estimatedTotalHours: 8,
      schedule: [
        { date: at(7).slice(0, 10), startTime: "09:00", endTime: "13:00" },
        { date: at(8).slice(0, 10), startTime: "09:00", endTime: "13:00" },
      ],
    }),
    vacancy(7, {
      title: "City sports day",
      ...approved(-30),
      startsAt: at(-3, 9),
      endsAt: at(-3, 15),
      applicationDeadline: at(-6, 18),
      estimatedTotalHours: 6,
    }),
    vacancy(8, {
      title: "Library clean-up",
      ...approved(-40),
      startsAt: at(-10, 9),
      endsAt: at(-10, 12),
      applicationDeadline: at(-14, 18),
      estimatedTotalHours: 3,
    }),
    vacancy(9, {
      title: "Museum guide training",
      ...approved(-50),
      startsAt: at(-14, 9),
      endsAt: at(-14, 12),
      applicationDeadline: at(-18, 18),
      estimatedTotalHours: 3,
    }),
    vacancy(10, {
      title: "Park tree planting",
      ...approved(-70),
      startsAt: at(-30, 9),
      endsAt: at(-30, 14),
      applicationDeadline: at(-35, 18),
      estimatedTotalHours: 5,
    }),
    vacancy(11, {
      title: "Night shelter support",
      approvalStatus: "rejected",
      approvalSubmittedAt: at(-6),
      approvalReviewedAt: at(-5),
      approvalNote: "Volunteers under 18 cannot work overnight.",
      approvalReviewedById: ADMIN,
      approvalReviewedBy: { id: ADMIN, displayName: "Stub Administrator" },
    }),
    vacancy(12, {
      title: "Summer reading camp",
      ...approved(-120),
      archivedAt: at(-40),
      startsAt: at(-60, 9),
      endsAt: at(-60, 13),
      applicationDeadline: at(-70, 18),
    }),
    vacancy(13, {
      title: "Debate cup",
      kind: "competition",
      estimatedTotalHours: null,
      ...approved(-5),
      capacity: null,
      startsAt: at(30, 9),
      endsAt: at(30, 18),
      applicationDeadline: at(25, 18),
    }),
  ];

  const applications = [
    application(1, 0, V.live, "submitted", {
      essay: "I already help at the reading room on Saturdays and want to do more.",
      submittedAt: at(-6),
    }),
    application(2, 1, V.live, "submitted", {
      stagedDecision: "accept",
      stagedAt: at(-1),
      submittedAt: at(-4),
    }),
    application(3, 2, V.live, "under_review", { submittedAt: at(-3) }),
    accepted(4, 3, V.live),
    application(5, 4, V.live, "withdrawn", { withdrawnAt: at(-1) }),
    accepted(6, 0, V.liveFull),
    accepted(7, 1, V.liveFull),
    application(8, 2, V.liveFull, "submitted", { submittedAt: at(-2) }),
    accepted(9, 0, V.ended),
    accepted(10, 1, V.ended),
    accepted(11, 2, V.ended, {
      draft: { outcome: "attended", hours: 6, placement: null, note: null },
    }),
    accepted(12, 3, V.verifying, {
      draft: { outcome: "attended", hours: 3, placement: null, note: null },
    }),
    accepted(13, 4, V.verifying, {
      draft: { outcome: "excused", hours: null, placement: null, note: "Was ill" },
    }),
    accepted(14, 0, V.returnedResults, {
      draft: { outcome: "attended", hours: 12, placement: null, note: null },
      reviewNote: "Twelve hours looks wrong for a three-hour event.",
    }),
    accepted(15, 5, V.returnedResults, {
      draft: { outcome: "attended", hours: 3, placement: null, note: null },
    }),
    accepted(16, 0, V.verified, {
      outcome: "attended",
      confirmedHours: 5,
      xpAwarded: 50,
      resolvedAt: at(-27),
      confirmedById: ADMIN,
    }),
    accepted(17, 1, V.verified, {
      outcome: "attended",
      confirmedHours: 4,
      xpAwarded: 40,
      resolvedAt: at(-27),
      confirmedById: ADMIN,
    }),
    accepted(18, 2, V.verified, {
      outcome: "no_show",
      xpAwarded: -10,
      resolvedAt: at(-27),
      confirmedById: ADMIN,
    }),
    application(19, 3, V.competition, "submitted", { submittedAt: at(-1) }),
  ];

  const sheets = new Map([
    [
      V.verifying,
      {
        status: "submitted",
        correction: false,
        revision: 1,
        submittedAt: at(-2),
        reviewedAt: null,
        reviewNote: null,
        verifiedAt: null,
        history: [
          event("sheet.submitted", at(-2), "All present except one excused.", ACCOUNT),
        ],
      },
    ],
    [
      V.returnedResults,
      {
        status: "changes_requested",
        correction: false,
        revision: 2,
        submittedAt: at(-6),
        reviewedAt: at(-1),
        reviewNote: "One row needs another look.",
        verifiedAt: null,
        history: [
          event(
            "sheet.changes_requested",
            at(-1),
            "One row needs another look.",
            ADMIN,
          ),
          event("sheet.submitted", at(-6), null, ACCOUNT),
        ],
      },
    ],
    [
      V.verified,
      {
        status: "verified",
        correction: false,
        revision: 1,
        submittedAt: at(-28),
        reviewedAt: at(-27),
        reviewNote: null,
        verifiedAt: at(-27),
        history: [
          event("sheet.verified", at(-27), null, ADMIN),
          event("sheet.submitted", at(-28), null, ACCOUNT),
        ],
      },
    ],
  ]);

  const pastEvents = [
    {
      id: uuid(7, 1),
      volunteerId: volunteer(0).id,
      title: "Spring book swap",
      eventDate: at(-90).slice(0, 10),
      hours: 4,
      xpAwarded: 40,
      countsTowardProgress: true,
      live: true,
    },
  ];

  const rosters = [
    roster(1, "Library inventory day", at(-30).slice(0, 10), at(-3), "Two shifts.", [
      ["pending", 0, 3, 30],
      ["pending", 1, 3, 30],
    ]),
    roster(2, "Spring book swap", at(-90).slice(0, 10), at(-60), null, [
      ["approved", 0, 4, 40, { event: pastEvents[0] }],
      ["approved", 3, 4, 40],
    ]),
    roster(3, "New year concert", at(-300).slice(0, 10), at(-280), null, [
      ["approved", 1, 2, 20],
      ["rejected", 2, 2, 20, { reviewNote: "No record of this volunteer." }],
    ]),
  ];

  state = {
    sessions: new Map(),
    vacancies,
    applications,
    sheets,
    instructions: new Map([
      [
        V.liveFull,
        {
          message: "Bring your student card. We meet at the main entrance at 08:45.",
          groupLink: "https://t.me/+readingroom",
          version: 1,
          sentAt: at(-3),
          updatedAt: at(-3),
          delivery: { sent: 1, notConnected: 1, failed: 0, pending: 0 },
        },
      ],
    ]),
    pastEvents,
    rosters,
    requests: [
      standalone(1, "update", "pending", 0, pastEvents[0], {
        title: "Spring book swap",
        eventDate: pastEvents[0].eventDate,
        hours: 5,
        xpAwarded: 50,
        note: "She stayed for the second shift.",
      }),
    ],
    audit: [
      audit("opportunity.submitted_for_approval", "opportunity", V.pending, at(-1)),
      audit("application.accepted", "application", uuid(5, 4), at(-2)),
      audit("attendance.submitted", "opportunity", V.verifying, at(-2)),
      audit("opportunity.created", "opportunity", V.draftReady, at(-5)),
    ],
  };
}

function event(action, createdAt, note, actorId) {
  return {
    id: randomUUID(),
    action,
    note,
    revision: 1,
    createdAt,
    actor:
      actorId === ADMIN
        ? { id: ADMIN, name: "Stub Administrator" }
        : { id: ACCOUNT, name: ORGANIZATION.name },
  };
}

function audit(action, entityType, entityId, createdAt, metadata = null) {
  return {
    id: randomUUID(),
    action,
    entityType,
    entityId,
    metadata,
    actorUserId: ACCOUNT,
    createdAt,
  };
}

function requestRecord(id, rosterId, kind, status, person, fields, recorded = null) {
  return {
    id,
    rosterId,
    kind,
    status,
    title: fields.title ?? null,
    eventDate: fields.eventDate ?? null,
    hours: fields.hours ?? null,
    xpAwarded: fields.xpAwarded ?? null,
    note: fields.note ?? null,
    adjusted: false,
    reviewNote: fields.reviewNote ?? null,
    createdAt: fields.createdAt ?? at(-3),
    reviewedAt: status === "pending" ? null : at(-1),
    organization: { id: ORGANIZATION.id, name: ORGANIZATION.name },
    volunteer: {
      id: person.id,
      displayName: person.displayName,
      username: person.username,
      avatarUrl: null,
    },
    event: recorded,
  };
}

function roster(number, title, eventDate, createdAt, note, people) {
  const id = uuid(8, number);
  return {
    id,
    title,
    eventDate,
    note,
    createdAt,
    requests: people.map(([status, index, hours, xpAwarded, extra = {}], position) =>
      requestRecord(
        uuid(9, number * 100 + position),
        id,
        "create",
        status,
        volunteer(index),
        { title, eventDate, hours, xpAwarded, createdAt, ...extra },
        extra.event ?? null,
      ),
    ),
  };
}

function standalone(number, kind, status, index, recorded, fields) {
  return requestRecord(
    uuid(9, number),
    null,
    kind,
    status,
    volunteer(index),
    fields,
    recorded,
  );
}

function issue() {
  const accessToken = `access-${randomUUID()}`;
  const refreshToken = `refresh-${randomUUID()}`;
  state.sessions.set(accessToken, { refreshToken, userId: ACCOUNT });
  return {
    userId: ACCOUNT,
    accessToken,
    refreshToken,
    accessTokenExpiresAt: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
    displayName: ORGANIZATION.name,
    roles: ["partner"],
    passwordChangeRequired: false,
  };
}

function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

const fail = (response, status, code, extra = {}) =>
  send(response, status, { code, ...extra });

async function bodyOf(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

function presentAttendance(item) {
  const record = item.attendanceRecord;
  if (!record) return null;
  return {
    id: record.id,
    outcome: record.outcome,
    confirmedHours: record.confirmedHours,
    placement: record.placement,
    note: record.note,
    xpAwarded: record.xpAwarded,
    draftOutcome: record.draft?.outcome ?? null,
    draftHours: record.draft?.hours ?? null,
    draftPlacement: record.draft?.placement ?? null,
    draftNote: record.draft?.note ?? null,
    reviewNote: record.reviewNote,
    resolvedAt: record.resolvedAt,
    confirmedById: record.confirmedById,
    applicationId: item.id,
    volunteerId: item.volunteerId,
    opportunityId: item.opportunityId,
  };
}

function presentApplication(item) {
  const person = VOLUNTEERS.find((candidate) => candidate.id === item.volunteerId);
  const opportunity = state.vacancies.find((v) => v.id === item.opportunityId);
  const rest = { ...item };
  delete rest.attendanceRecord;
  return {
    ...rest,
    volunteer: {
      id: person.id,
      displayName: person.displayName,
      username: person.username,
      avatarUrl: null,
      profile: item.profileSnapshot,
      profileCompletion: { complete: true, missing: [] },
    },
    opportunity: opportunity
      ? {
          id: opportunity.id,
          slug: opportunity.slug,
          title: opportunity.title,
          format: opportunity.format,
          region: opportunity.region,
          city: opportunity.city,
          locationName: opportunity.locationName,
          startsAt: opportunity.startsAt,
          endsAt: opportunity.endsAt,
          applicationDeadline: opportunity.applicationDeadline,
          capacity: opportunity.capacity,
          estimatedTotalHours: opportunity.estimatedTotalHours,
          acceptanceMode: opportunity.acceptanceMode,
          essayRequired: opportunity.essayRequired,
        }
      : null,
    attendance: presentAttendance(item),
  };
}

function sheetSummary(id) {
  const sheet = state.sheets.get(id);
  return sheet
    ? {
        status: sheet.status,
        correction: sheet.correction,
        submittedAt: sheet.submittedAt,
        verifiedAt: sheet.verifiedAt,
      }
    : null;
}

function presentVacancy(item) {
  const rest = { ...item };
  delete rest.saved;
  return { ...rest, attendanceSheet: sheetSummary(item.id) };
}

function presentVacancyListItem(item) {
  const own = state.applications.filter((row) => row.opportunityId === item.id);
  const count = (statuses) => own.filter((row) => statuses.includes(row.status)).length;
  const acceptedRows = own.filter((row) => row.status === "accepted");
  return {
    ...presentVacancy(item),
    saved: item.saved,
    progress: {
      applications: own.filter((row) => row.status !== "draft").length,
      awaitingReview: count(["submitted", "under_review"]),
      accepted: acceptedRows.length,
      attended: acceptedRows.filter(
        (row) => row.attendanceRecord?.outcome === "attended",
      ).length,
      attendanceResolved: acceptedRows.filter(
        (row) => row.attendanceRecord?.outcome !== "awaiting_confirmation",
      ).length,
    },
  };
}

function statistics() {
  const acceptedRows = state.applications.filter((row) => row.status === "accepted");
  const resolved = acceptedRows.filter(
    (row) => row.attendanceRecord?.outcome === "attended",
  );
  const state_ = (name) =>
    state.vacancies.filter((row) => !row.archivedAt && row.approvalStatus === name)
      .length;
  const due = state.vacancies
    .filter(
      (row) =>
        !row.archivedAt &&
        row.approvalStatus === "approved" &&
        new Date(row.endsAt ?? row.startsAt) <= new Date(),
    )
    .reduce(
      (total, row) =>
        total +
        state.applications.filter(
          (item) =>
            item.opportunityId === row.id &&
            item.status === "accepted" &&
            item.attendanceRecord?.outcome === "awaiting_confirmation" &&
            !["submitted", "verified"].includes(state.sheets.get(row.id)?.status),
        ).length,
      0,
    );
  return {
    scope: "own",
    range: { from: at(-365), to: at(0) },
    totals: {
      vacancies: state.vacancies.length,
      publishedVacancies: state_("approved"),
      pendingApproval: state_("pending_review"),
      changesRequested: state_("changes_requested"),
      applications: state.applications.filter((row) => row.status !== "draft").length,
      pendingReview: state.applications.filter((row) =>
        ["submitted", "under_review"].includes(row.status),
      ).length,
      accepted: acceptedRows.length,
      awaitingAttendance: acceptedRows.filter(
        (row) => row.attendanceRecord?.outcome === "awaiting_confirmation",
      ).length,
      attendanceDue: due,
      attended: resolved.length,
      confirmedHours: resolved.reduce(
        (total, row) => total + (row.attendanceRecord?.confirmedHours ?? 0),
        0,
      ),
    },
  };
}

function presentSheet(item) {
  const sheet = state.sheets.get(item.id);
  const rows = state.applications.filter(
    (row) => row.opportunityId === item.id && row.status === "accepted",
  );
  const now = new Date();
  const started = new Date(item.startsAt) <= now;
  const ended = new Date(item.endsAt ?? item.startsAt) <= now;
  const status = sheet?.status ?? "draft";
  return {
    opportunityId: item.id,
    title: item.title,
    kind: item.kind,
    organization: { id: ORGANIZATION.id, name: ORGANIZATION.name },
    estimatedTotalHours: item.estimatedTotalHours,
    rules: {
      xpPerHour: item.xpPerHour,
      xpWinner: item.xpWinner,
      xpContributor: item.xpContributor,
      xpAttendee: item.xpAttendee,
      xpNoShowPenalty: item.xpNoShowPenalty,
    },
    status,
    correction: sheet?.correction ?? false,
    revision: sheet?.revision ?? 0,
    submittedAt: sheet?.submittedAt ?? null,
    reviewedAt: sheet?.reviewedAt ?? null,
    reviewNote: sheet?.reviewNote ?? null,
    verifiedAt: sheet?.verifiedAt ?? null,
    opensAt: item.startsAt,
    submittableAt: item.endsAt ?? item.startsAt,
    started,
    ended,
    requiresVerification: true,
    editable: started && !item.archivedAt && status !== "submitted",
    rows: rows.map((row) => {
      const person = VOLUNTEERS.find((candidate) => candidate.id === row.volunteerId);
      const record = row.attendanceRecord;
      return {
        applicationId: row.id,
        attendanceId: record.id,
        submittedAt: row.submittedAt,
        volunteer: {
          id: person.id,
          displayName: person.displayName,
          username: person.username,
          avatarUrl: null,
        },
        verified: {
          outcome: record.outcome,
          hours: record.confirmedHours,
          placement: record.placement,
          note: record.note,
          xpAwarded: record.xpAwarded,
          resolvedAt: record.resolvedAt,
        },
        draft: record.draft,
        reviewNote: record.reviewNote,
      };
    }),
    history: sheet?.history ?? [],
  };
}

function presentInstructions(item) {
  const stored = state.instructions.get(item.id);
  const recipients = state.applications.filter(
    (row) => row.opportunityId === item.id && row.status === "accepted",
  ).length;
  const delivery = stored?.delivery ?? {
    sent: 0,
    notConnected: 0,
    failed: 0,
    pending: 0,
  };
  const reached =
    delivery.sent + delivery.notConnected + delivery.failed + delivery.pending;
  return {
    message: stored?.message ?? null,
    groupLink: stored?.groupLink ?? null,
    version: stored?.version ?? 0,
    sentAt: stored?.sentAt ?? null,
    updatedAt: stored?.updatedAt ?? null,
    recipients,
    unsent: stored?.sentAt ? Math.max(0, recipients - reached) : recipients,
    delivery,
  };
}

function directoryPeople() {
  return VOLUNTEERS.filter((person) =>
    state.applications.some((row) => row.volunteerId === person.id),
  );
}

function presentRosterSummary(item) {
  const count = (status) =>
    item.requests.filter((request) => request.status === status).length;
  return {
    id: item.id,
    title: item.title,
    eventDate: item.eventDate,
    note: item.note,
    createdAt: item.createdAt,
    participants: item.requests.length,
    pending: count("pending"),
    approved: count("approved"),
    rejected: count("rejected"),
    cancelled: count("cancelled"),
  };
}

function participantsOf() {
  return VOLUNTEERS.flatMap((person) => {
    const attended = state.applications.filter(
      (row) =>
        row.volunteerId === person.id && row.attendanceRecord?.outcome === "attended",
    );
    const past = state.pastEvents.filter((row) => row.volunteerId === person.id);
    if (attended.length === 0 && past.length === 0) return [];
    const pendingRequests = state.requests.filter(
      (request) => request.volunteer.id === person.id && request.status === "pending",
    ).length;
    return [
      {
        id: person.id,
        displayName: person.displayName,
        username: person.username,
        avatarUrl: null,
        participation: {
          attendedEvents: attended.length,
          attendedHours: attended.reduce(
            (total, row) => total + (row.attendanceRecord.confirmedHours ?? 0),
            0,
          ),
          pastEvents: past.length,
        },
        pendingRequests,
      },
    ];
  });
}

function page(items, url) {
  const number = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Number(url.searchParams.get("pageSize") ?? 25);
  return {
    items: items.slice((number - 1) * pageSize, number * pageSize),
    page: number,
    pageSize,
    total: items.length,
  };
}

function matches(text, url) {
  const q = url.searchParams.get("q")?.toLowerCase();
  return !q || text.toLowerCase().includes(q);
}

function publishedOrFinal(item) {
  return item.archivedAt || item.approvalStatus === "pending_review";
}

const routes = [];
const route = (method, pattern, handler) =>
  routes.push({
    method,
    pattern: new RegExp(`^${pattern.replace(/:[a-zA-Z]+/g, "([^/]+)")}$`),
    handler,
  });

const vacancyOr404 = (response, id) => {
  const item = state.vacancies.find((candidate) => candidate.id === id);
  if (!item) fail(response, 404, "opportunityNotFound");
  return item;
};

route("GET", "/me", ({ response }) =>
  send(response, 200, {
    id: ACCOUNT,
    displayName: ORGANIZATION.name,
    roles: ["partner"],
  }),
);
route("GET", "/org/me", ({ response }) => send(response, 200, ORGANIZATION));
route("GET", "/org/organizations", ({ response }) =>
  send(response, 200, [ORGANIZATION]),
);
route("GET", "/org/statistics", ({ response }) => send(response, 200, statistics()));
route("GET", "/org/activity", ({ response }) => send(response, 200, state.audit));

route("GET", "/org/opportunities", ({ response }) =>
  send(response, 200, state.vacancies.map(presentVacancyListItem)),
);
route("POST", "/org/opportunities", async ({ response, body }) => {
  const number = state.vacancies.length + 100;
  const item = vacancy(number, {
    ...body,
    region: String(body.region ?? "tashkent-city").replaceAll("-", "_"),
    estimatedTotalHours: body.estimatedTotalHours ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  state.vacancies.push(item);
  state.audit.unshift(
    audit("opportunity.created", "opportunity", item.id, new Date().toISOString()),
  );
  send(response, 201, presentVacancy(item));
});
route("GET", "/org/opportunities/:id", ({ response, params }) => {
  const item = vacancyOr404(response, params[0]);
  if (item) send(response, 200, presentVacancy(item));
});
route("PATCH", "/org/opportunities/:id", ({ response, params, body }) => {
  const item = vacancyOr404(response, params[0]);
  if (!item) return;
  if (publishedOrFinal(item) || item.approvalStatus === "rejected")
    return fail(response, 409, "opportunityNotEditable");
  const rewards = [
    "xpPerHour",
    "xpWinner",
    "xpContributor",
    "xpAttendee",
    "xpNoShowPenalty",
  ];
  if (
    item.publishedAt &&
    rewards.some((key) => body[key] !== undefined && body[key] !== item[key])
  ) {
    return fail(response, 409, "opportunityRewardsLocked");
  }
  const next = { ...body };
  if (typeof next.region === "string") next.region = next.region.replaceAll("-", "_");
  Object.assign(item, next, { updatedAt: new Date().toISOString() });
  if (item.approvalStatus === "approved") {
    Object.assign(item, {
      approvalStatus: "draft",
      approvalNote: null,
      approvalSubmittedAt: null,
      approvalReviewedAt: null,
      approvalReviewedById: null,
      approvalReviewedBy: null,
    });
  }
  send(response, 200, presentVacancy(item));
});
route("PUT", "/org/opportunities/:id/image", ({ response, params }) => {
  const item = vacancyOr404(response, params[0]);
  if (!item) return;
  item.imageUrl = "https://images.example.org/vacancy.jpg";
  send(response, 200, { imageUrl: item.imageUrl });
});
route("DELETE", "/org/opportunities/:id/image", ({ response, params }) => {
  const item = vacancyOr404(response, params[0]);
  if (!item) return;
  item.imageUrl = null;
  send(response, 200, { imageUrl: null });
});
route("PUT", "/org/opportunities/:id/saved", ({ response, params }) => {
  const item = vacancyOr404(response, params[0]);
  if (!item) return;
  item.saved = true;
  send(response, 200, { saved: true });
});
route("DELETE", "/org/opportunities/:id/saved", ({ response, params }) => {
  const item = vacancyOr404(response, params[0]);
  if (!item) return;
  item.saved = false;
  send(response, 200, { saved: false });
});
route("POST", "/org/opportunities/:id/submit-for-approval", ({ response, params }) => {
  const item = vacancyOr404(response, params[0]);
  if (!item) return;
  if (
    item.archivedAt ||
    !["draft", "changes_requested"].includes(item.approvalStatus)
  ) {
    return fail(response, 409, "opportunityCannotBeSubmitted");
  }
  if (new Date(item.applicationDeadline) <= new Date()) {
    return fail(response, 409, "deadlinePassed");
  }
  Object.assign(item, {
    approvalStatus: "pending_review",
    approvalNote: null,
    approvalSubmittedAt: new Date().toISOString(),
    approvalReviewedAt: null,
    approvalReviewedById: null,
    approvalReviewedBy: null,
    updatedAt: new Date().toISOString(),
  });
  state.audit.unshift(
    audit(
      "opportunity.submitted_for_approval",
      "opportunity",
      item.id,
      new Date().toISOString(),
    ),
  );
  send(response, 200, presentVacancy(item));
});
route("POST", "/org/opportunities/:id/archive", ({ response, params }) => {
  const item = vacancyOr404(response, params[0]);
  if (!item) return;
  if (item.archivedAt) return fail(response, 409, "opportunityAlreadyArchived");
  item.archivedAt = new Date().toISOString();
  for (const row of state.applications) {
    if (
      row.opportunityId === item.id &&
      ["submitted", "under_review"].includes(row.status)
    ) {
      row.status = "closed";
      row.stagedDecision = null;
    }
  }
  send(response, 200, presentVacancy(item));
});

route("GET", "/org/applications", ({ response, url }) => {
  const status = url.searchParams.get("status");
  const opportunityId = url.searchParams.get("opportunityId");
  send(
    response,
    200,
    state.applications
      .filter(
        (row) =>
          (!status || row.status === status) &&
          (!opportunityId || row.opportunityId === opportunityId),
      )
      .map(presentApplication),
  );
});
route("GET", "/org/applications/:id", ({ response, params }) => {
  const item = state.applications.find((row) => row.id === params[0]);
  if (!item) return fail(response, 404, "applicationNotFound");
  send(response, 200, presentApplication(item));
});
route("PATCH", "/org/applications/:id/review", ({ response, params, body }) => {
  const item = state.applications.find((row) => row.id === params[0]);
  if (!item) return fail(response, 404, "applicationNotFound");
  item.status = body.status;
  item.reviewerNote = body.reviewerNote ?? item.reviewerNote;
  item.reviewedAt = new Date().toISOString();
  item.reviewedById = ACCOUNT;
  item.stagedDecision = null;
  send(response, 200, presentApplication(item));
});

route("PUT", "/org/opportunities/:id/decisions", ({ response, params, body }) => {
  const item = vacancyOr404(response, params[0]);
  if (!item) return;
  for (const entry of body.decisions ?? []) {
    const row = state.applications.find(
      (candidate) =>
        candidate.id === entry.applicationId && candidate.opportunityId === item.id,
    );
    if (!row) return fail(response, 404, "applicationNotFound");
    row.stagedDecision = entry.decision;
    row.stagedAt = entry.decision ? new Date().toISOString() : null;
  }
  const rows = state.applications.filter(
    (row) =>
      row.opportunityId === item.id &&
      ["submitted", "under_review"].includes(row.status),
  );
  const count = (decision) =>
    rows.filter((row) => row.stagedDecision === decision).length;
  send(response, 200, {
    accept: count("accept"),
    reject: count("reject"),
    hold: count("hold"),
    undecided: rows.filter((row) => !row.stagedDecision).length,
  });
});
route("POST", "/org/opportunities/:id/decisions/send", ({ response, params }) => {
  const item = vacancyOr404(response, params[0]);
  if (!item) return;
  if (item.archivedAt) return fail(response, 409, "opportunityArchived");
  const staged = state.applications.filter(
    (row) =>
      row.opportunityId === item.id &&
      ["submitted", "under_review"].includes(row.status) &&
      row.stagedDecision,
  );
  if (staged.length === 0) return fail(response, 409, "noDecisionsToSend");
  const taken = state.applications.filter(
    (row) => row.opportunityId === item.id && row.status === "accepted",
  ).length;
  const accepting = staged.filter((row) => row.stagedDecision === "accept").length;
  if (item.capacity !== null && taken + accepting > item.capacity) {
    return fail(response, 409, "opportunityAtCapacity");
  }
  const sent = { accepted: 0, rejected: 0, held: 0 };
  for (const row of staged) {
    if (row.stagedDecision === "accept") {
      row.status = "accepted";
      row.reviewedAt = new Date().toISOString();
      row.reviewedById = ACCOUNT;
      row.attendanceRecord = {
        id: randomUUID(),
        outcome: "awaiting_confirmation",
        confirmedHours: null,
        placement: null,
        note: null,
        xpAwarded: 0,
        draft: null,
        reviewNote: null,
        resolvedAt: null,
        confirmedById: null,
      };
      sent.accepted += 1;
    } else if (row.stagedDecision === "reject") {
      row.status = "rejected";
      row.reviewedAt = new Date().toISOString();
      row.reviewedById = ACCOUNT;
      sent.rejected += 1;
    } else {
      sent.held += 1;
    }
    row.stagedDecision = null;
    row.stagedAt = null;
  }
  send(response, 200, {
    ...sent,
    placesFilled: taken + sent.accepted,
    capacity: item.capacity,
  });
});

route("GET", "/org/opportunities/:id/instructions", ({ response, params }) => {
  const item = vacancyOr404(response, params[0]);
  if (item) send(response, 200, presentInstructions(item));
});
route("POST", "/org/opportunities/:id/instructions", ({ response, params, body }) => {
  const item = vacancyOr404(response, params[0]);
  if (!item) return;
  const recipients = state.applications.filter(
    (row) => row.opportunityId === item.id && row.status === "accepted",
  ).length;
  if (recipients === 0) return fail(response, 409, "noAcceptedApplicants");
  const stored = state.instructions.get(item.id);
  state.instructions.set(item.id, {
    message: body.message,
    groupLink: body.groupLink ?? null,
    version: (stored?.version ?? 0) + 1,
    sentAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    delivery: { sent: recipients, notConnected: 0, failed: 0, pending: 0 },
  });
  send(response, 200, presentInstructions(item));
});
route("POST", "/org/opportunities/:id/instructions/retry", ({ response, params }) => {
  const item = vacancyOr404(response, params[0]);
  if (item) send(response, 200, presentInstructions(item));
});

route("GET", "/org/opportunities/:id/attendance-sheet", ({ response, params }) => {
  const item = vacancyOr404(response, params[0]);
  if (item) send(response, 200, presentSheet(item));
});
route(
  "PUT",
  "/org/opportunities/:id/attendance-sheet",
  ({ response, params, body }) => {
    const item = vacancyOr404(response, params[0]);
    if (!item) return;
    const sheet = presentSheet(item);
    if (!sheet.started) return fail(response, 409, "attendanceNotOpen");
    if (sheet.status === "submitted")
      return fail(response, 409, "attendanceSheetSubmitted");
    for (const entry of body.entries ?? []) {
      const row = state.applications.find((row_) => row_.id === entry.applicationId);
      if (!row?.attendanceRecord) return fail(response, 404, "attendanceNotFound");
      row.attendanceRecord.draft = {
        outcome: entry.outcome,
        hours: entry.hours ?? null,
        placement: entry.placement ?? null,
        note: entry.note ?? null,
      };
    }
    if (!state.sheets.has(item.id)) {
      state.sheets.set(item.id, {
        status: "draft",
        correction: false,
        revision: 0,
        submittedAt: null,
        reviewedAt: null,
        reviewNote: null,
        verifiedAt: null,
        history: [],
      });
    }
    send(response, 200, presentSheet(item));
  },
);
route(
  "DELETE",
  "/org/opportunities/:id/attendance-sheet/draft",
  ({ response, params }) => {
    const item = vacancyOr404(response, params[0]);
    if (!item) return;
    for (const row of state.applications) {
      if (row.opportunityId === item.id && row.attendanceRecord) {
        row.attendanceRecord.draft = null;
      }
    }
    send(response, 200, presentSheet(item));
  },
);
route(
  "POST",
  "/org/opportunities/:id/attendance-sheet/submit",
  ({ response, params, body }) => {
    const item = vacancyOr404(response, params[0]);
    if (!item) return;
    const sheet = presentSheet(item);
    if (!sheet.ended) return fail(response, 409, "attendanceNotOpen");
    const unfinished = sheet.rows.filter(
      (row) => (row.draft ?? row.verified).outcome === "awaiting_confirmation",
    );
    if (unfinished.length > 0) {
      return fail(response, 409, "attendanceIncomplete", {
        problems: unfinished.map((row) => ({
          applicationId: row.applicationId,
          reason: "outcomeRequired",
        })),
      });
    }
    const stored = state.sheets.get(item.id) ?? { revision: 0, history: [] };
    state.sheets.set(item.id, {
      ...stored,
      status: "submitted",
      correction: stored.correction ?? false,
      revision: (stored.revision ?? 0) + 1,
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewNote: null,
      verifiedAt: stored.verifiedAt ?? null,
      history: [
        event("sheet.submitted", new Date().toISOString(), body.note ?? null, ACCOUNT),
        ...(stored.history ?? []),
      ],
    });
    send(response, 200, presentSheet(item));
  },
);

route("GET", "/org/users", ({ response, url }) => {
  const people = directoryPeople()
    .filter((person) => matches(`${person.displayName} ${person.email}`, url))
    .map((person) => {
      const own = state.applications.filter((row) => row.volunteerId === person.id);
      return {
        id: person.id,
        displayName: person.displayName,
        email: person.email,
        isActive: true,
        createdAt: person.createdAt,
        _count: {
          applications: own.length,
          attendanceRecords: own.filter((row) => row.attendanceRecord).length,
        },
      };
    });
  send(response, 200, page(people, url));
});
route("GET", "/org/users/:id", ({ response, params }) => {
  const person = VOLUNTEERS.find((candidate) => candidate.id === params[0]);
  if (!person) return fail(response, 404, "userNotFound");
  const own = state.applications.filter((row) => row.volunteerId === person.id);
  send(response, 200, {
    id: person.id,
    displayName: person.displayName,
    username: person.username,
    avatarUrl: null,
    email: person.email,
    emailVerifiedAt: person.createdAt,
    isActive: true,
    createdAt: person.createdAt,
    profile: own[0]?.profileSnapshot ?? null,
    profileCompletion: { complete: true, missing: [] },
    applications: own.map(presentApplication),
  });
});

route("GET", "/org/participants", ({ response, url }) => {
  const people = participantsOf().filter((person) =>
    matches(`${person.displayName} ${person.username}`, url),
  );
  send(response, 200, page(people, url));
});
route("GET", "/org/participants/:id", ({ response, params }) => {
  const person = participantsOf().find((candidate) => candidate.id === params[0]);
  if (!person) return fail(response, 404, "participantNotFound");
  send(response, 200, {
    ...person,
    attended: state.applications
      .filter(
        (row) =>
          row.volunteerId === person.id && row.attendanceRecord?.outcome === "attended",
      )
      .map((row) => {
        const item = state.vacancies.find((v) => v.id === row.opportunityId);
        return {
          id: row.attendanceRecord.id,
          opportunityId: item.id,
          title: item.title,
          kind: item.kind,
          eventDate: item.startsAt.slice(0, 10),
          hours: row.attendanceRecord.confirmedHours,
          placement: row.attendanceRecord.placement,
          xpAwarded: row.attendanceRecord.xpAwarded,
        };
      }),
    pastEvents: state.pastEvents
      .filter((row) => row.volunteerId === person.id)
      .map((row) => ({
        id: row.id,
        title: row.title,
        eventDate: row.eventDate,
        hours: row.hours,
        xpAwarded: row.xpAwarded,
        countsTowardProgress: row.countsTowardProgress,
        live: row.live,
        pendingRequestId:
          state.requests.find(
            (request) => request.event?.id === row.id && request.status === "pending",
          )?.id ?? null,
      })),
    requests: state.requests.filter((request) => request.volunteer.id === person.id),
  });
});
route("PUT", "/org/past-events/:eventId", ({ response, params, body }) => {
  const recorded = state.pastEvents.find((row) => row.id === params[0]);
  if (!recorded) return fail(response, 404, "pastEventNotFound");
  const person = VOLUNTEERS.find((candidate) => candidate.id === recorded.volunteerId);
  const request = requestRecord(
    randomUUID(),
    null,
    "update",
    "pending",
    person,
    body,
    recorded,
  );
  state.requests.unshift(request);
  send(response, 200, request);
});
route("POST", "/org/past-events/:eventId/removal", ({ response, params, body }) => {
  const recorded = state.pastEvents.find((row) => row.id === params[0]);
  if (!recorded) return fail(response, 404, "pastEventNotFound");
  const person = VOLUNTEERS.find((candidate) => candidate.id === recorded.volunteerId);
  const request = requestRecord(
    randomUUID(),
    null,
    "remove",
    "pending",
    person,
    body,
    recorded,
  );
  state.requests.unshift(request);
  send(response, 200, request);
});
route("GET", "/org/past-event-requests", ({ response, url }) => {
  const status = url.searchParams.get("status");
  const everyRequest = [
    ...state.requests,
    ...state.rosters.flatMap((item) => item.requests),
  ];
  const items = status
    ? everyRequest.filter((request) => request.status === status)
    : everyRequest;
  send(response, 200, {
    ...page(items, url),
    pending: everyRequest.filter((request) => request.status === "pending").length,
  });
});
route("POST", "/org/past-event-requests/:id/cancel", ({ response, params }) => {
  const request = [
    ...state.requests,
    ...state.rosters.flatMap((item) => item.requests),
  ].find((candidate) => candidate.id === params[0]);
  if (!request) return fail(response, 404, "pastEventRequestNotFound");
  request.status = "cancelled";
  send(response, 200, request);
});

route("GET", "/org/past-event-rosters/volunteer", ({ response, url }) => {
  const username = url.searchParams.get("username");
  const person = VOLUNTEERS.find((candidate) => candidate.username === username);
  if (!person) return fail(response, 404, "pastEventVolunteerNotFound");
  send(response, 200, {
    id: person.id,
    displayName: person.displayName,
    username: person.username,
    avatarUrl: null,
  });
});
route("GET", "/org/past-event-rosters", ({ response, url }) => {
  const items = state.rosters
    .filter((item) => matches(item.title, url))
    .map(presentRosterSummary);
  send(response, 200, page(items, url));
});
route("GET", "/org/past-event-rosters/:id", ({ response, params }) => {
  const item = state.rosters.find((candidate) => candidate.id === params[0]);
  if (!item) return fail(response, 404, "pastEventRosterNotFound");
  send(response, 200, item);
});
route("POST", "/org/past-event-rosters", ({ response, body }) => {
  const id = randomUUID();
  const item = {
    id,
    title: body.title,
    eventDate: body.eventDate,
    note: body.note || null,
    createdAt: new Date().toISOString(),
    requests: [],
  };
  item.requests = (body.participants ?? []).map((entry) =>
    requestRecord(
      randomUUID(),
      id,
      "create",
      "pending",
      VOLUNTEERS.find((candidate) => candidate.id === entry.volunteerId) ??
        VOLUNTEERS[0],
      {
        title: body.title,
        eventDate: body.eventDate,
        hours: entry.hours,
        xpAwarded: entry.xpAwarded,
        createdAt: item.createdAt,
      },
    ),
  );
  state.rosters.unshift(item);
  send(response, 201, item);
});
route(
  "POST",
  "/org/past-event-rosters/:id/participants",
  ({ response, params, body }) => {
    const item = state.rosters.find((candidate) => candidate.id === params[0]);
    if (!item) return fail(response, 404, "pastEventRosterNotFound");
    for (const entry of body.participants ?? []) {
      item.requests.push(
        requestRecord(
          randomUUID(),
          item.id,
          "create",
          "pending",
          VOLUNTEERS.find((candidate) => candidate.id === entry.volunteerId) ??
            VOLUNTEERS[0],
          {
            title: item.title,
            eventDate: item.eventDate,
            hours: entry.hours,
            xpAwarded: entry.xpAwarded,
            createdAt: new Date().toISOString(),
          },
        ),
      );
    }
    send(response, 200, item);
  },
);

const OPEN_ROUTES = new Set([
  "/health/live",
  "/__reset",
  "/__organization",
  "/auth/org/login",
  "/auth/refresh",
]);

const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://stub");
  const path = url.pathname;
  const method = request.method ?? "GET";
  const contentType = request.headers["content-type"] ?? "";
  const body = contentType.includes("application/json") ? await bodyOf(request) : {};
  if (!contentType.includes("application/json")) request.resume();

  if (path === "/health/live") return send(response, 200, { status: "ok" });

  if (path === "/__reset" && method === "POST") {
    reset();
    return send(response, 200, { ok: true });
  }

  if (path === "/__organization" && method === "POST") {
    ORGANIZATION.verified = body.verified !== false;
    return send(response, 200, { ok: true });
  }

  if (path === "/auth/org/login" && method === "POST") {
    if (body.password !== PASSWORD || body.handle !== HANDLE) {
      return fail(response, 401, "invalidCredentials");
    }
    return send(response, 200, issue());
  }

  if (path === "/auth/refresh" && method === "POST") {
    return send(response, 200, issue());
  }

  const token = (request.headers.authorization ?? "").replace(/^Bearer\s+/, "");
  if (!OPEN_ROUTES.has(path) && !state.sessions.has(token)) {
    return fail(response, 401, "unauthorized");
  }

  if (path === "/auth/logout" && method === "POST") {
    state.sessions.delete(token);
    return send(response, 200, { ok: true });
  }

  for (const candidate of routes) {
    if (candidate.method !== method) continue;
    const match = candidate.pattern.exec(path);
    if (!match) continue;
    return candidate.handler({
      request,
      response,
      url,
      body,
      params: match.slice(1),
    });
  }

  send(response, 404, { message: "not found" });
});

reset();
server.listen(PORT, "127.0.0.1", () => {
  console.log(`stub backend listening on ${PORT}`);
});
