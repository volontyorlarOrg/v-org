import { expect, test, type Page } from "@playwright/test";

const STUB = `http://127.0.0.1:${process.env.E2E_STUB_PORT ?? 3805}`;
const HANDLE = "chilonzor-reading-corners";
const PASSWORD = "stub-password";

const vacancy = (number: number) =>
  `00000000-0000-4000-8000-000004${String(number).padStart(6, "0")}`;

const AUTUMN_DRAFT = vacancy(1);
const INCOMPLETE_DRAFT = vacancy(2);
const WINTER_FAIR = vacancy(5);
const CITY_SPORTS_DAY = vacancy(7);
const MUSEUM_TRAINING = vacancy(9);

async function signIn(page: Page) {
  await page.goto("/en/login", { waitUntil: "networkidle" });
  await page.getByLabel("Login name").fill(HANDLE);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/en\/dashboard/);
}

async function openHub(page: Page, hub: string) {
  await page
    .getByRole("navigation", { name: "Portal sections" })
    .getByRole("link", { name: hub })
    .click();
  await page.waitForURL(/\/en\/(?!dashboard)/);
}

test.beforeEach(async ({ request }) => {
  await request.post(`${STUB}/__reset`);
});

test.describe("signing in", () => {
  test("says so when the password is wrong and stays on the form", async ({ page }) => {
    await page.goto("/en/login", { waitUntil: "networkidle" });
    await page.getByLabel("Login name").fill(HANDLE);
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").first()).toContainText(
      "do not match an active account",
    );
    await expect(page).toHaveURL(/\/en\/login/);
  });

  test("returns to the entry after signing out", async ({ page }) => {
    await signIn(page);
    await page.getByRole("button", { name: "Account and settings" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/en\/login\?session=signedOut/);
  });

  test("keeps a signed-out visitor away from every portal page", async ({ page }) => {
    await page.goto("/en/vacancies");
    await page.waitForURL(/\/en\/login/);
  });
});

test.describe("the shell", () => {
  test("reaches every section through three hubs and their tabs, as in the administrator portal", async ({
    page,
  }) => {
    await signIn(page);
    const hubs = page.getByRole("navigation", { name: "Portal sections" });
    for (const name of ["Home", "Volunteering", "People"]) {
      await expect(hubs.getByRole("link", { name, exact: false })).toBeVisible();
    }
    await expect(hubs.getByRole("link")).toHaveCount(3);

    await openHub(page, "Volunteering");
    await expect(page).toHaveURL(/\/en\/vacancies$/);
    const work = page.getByRole("navigation", { name: "Volunteering pages" });
    for (const name of ["Vacancies", "Attendance", "Past events"]) {
      await expect(work.getByRole("link", { name, exact: false })).toBeVisible();
    }
    await expect(
      work.getByRole("link", { name: "Applications", exact: true }),
    ).toHaveCount(0);

    await openHub(page, "People");
    await expect(page).toHaveURL(/\/en\/users$/);
    const people = page.getByRole("navigation", { name: "People pages" });
    for (const name of ["Applicants", "Participants"]) {
      await expect(people.getByRole("link", { name, exact: false })).toBeVisible();
    }

    const removed = await page.goto("/en/applications");
    expect(removed?.status()).toBe(404);
  });

  test("jumps to any page or search from the keyboard", async ({ page, isMobile }) => {
    test.skip(isMobile, "the shortcut needs a keyboard");
    await signIn(page);
    await page.keyboard.press("ControlOrMeta+k");
    const search = page.getByRole("combobox", {
      name: "Jump to a page, an action or a search",
    });
    await search.fill("partic");
    await expect(
      page.getByRole("option", { name: /Participants/ }).first(),
    ).toBeVisible();
    await search.press("Enter");
    await page.waitForURL(/\/en\/participants$/);

    await page.keyboard.press("ControlOrMeta+k");
    await search.fill("debate");
    await page.getByRole("option", { name: "Vacancies matching “debate”" }).click();
    await page.waitForURL(/\/en\/vacancies\?q=debate$/);
  });

  test("has dropped the terrain, the serif and the seals", async ({ page }) => {
    await signIn(page);
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.locator(".seal")).toHaveCount(0);
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveCSS("font-family", /Onest/i);
  });

  test("gives each language its own words, with no raw keys", async ({ page }) => {
    await signIn(page);
    for (const [locale, title] of [
      ["uz", "Vakansiyalar"],
      ["ru", "Вакансии"],
    ] as const) {
      await page.goto(`/${locale}/vacancies`, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
      await expect(page.locator("main")).not.toContainText(
        /vacancies\.|desk\.|journey\./,
      );
    }
  });
});

test.describe("the dashboard", () => {
  test("draws the journey with whose move each line is", async ({ page }) => {
    await signIn(page);
    const journey = page.getByRole("region", { name: "Volunteer journey" });
    await expect(journey.getByText("Published vacancies")).toBeVisible();
    await expect(journey.getByText("Confirmed hours", { exact: true })).toBeVisible();
    await expect(journey.getByText("5 applications to decide")).toBeVisible();
    await expect(journey.getByText("1 waits for approval")).toBeVisible();
  });

  test("counts in its heading exactly what its sections list", async ({ page }) => {
    await signIn(page);
    const desk = page.getByRole("region", { name: "Waiting on you" });
    const counts = await desk.locator("section header > span").allTextContents();
    const sum = counts.reduce((total, text) => total + Number.parseInt(text, 10), 0);
    const heading = await desk.locator("> header > span").first().textContent();
    expect(Number.parseInt(heading ?? "", 10)).toBe(sum);
    expect(sum).toBeGreaterThan(0);
  });

  test("says in its headline how much waits and for how long", async ({ page }) => {
    await signIn(page);
    await expect(
      page.getByRole("heading", { level: 1, name: /^\d+ things wait on you$/ }),
    ).toBeVisible();
    await expect(page.getByText(/^The oldest has waited \d+ days?\./)).toBeVisible();
    const desk = page.getByRole("region", { name: "Waiting on you" });
    await expect(desk.getByText(/^oldest \d+d$/).first()).toBeVisible();
  });

  test("links what is with the administrator to a list that is really filtered", async ({
    page,
  }) => {
    await signIn(page);
    await page
      .getByRole("region", { name: "Volunteer journey" })
      .getByRole("link", { name: /1 waits for approval/ })
      .click();
    await page.waitForURL(/state=pending_review/);
    await expect(
      page.getByRole("link", { name: "Winter clothing drive", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Winter book fair" })).toHaveCount(0);
  });

  test("refuses to send a draft the wizard would refuse, and says why", async ({
    page,
  }) => {
    await signIn(page);
    const drafts = page.locator("#drafts");
    const incomplete = drafts.getByRole("listitem").filter({
      has: page.getByRole("link", { name: "Spring reading picnic" }),
    });
    await expect(incomplete.getByText(/Needs how many places/)).toBeVisible();
    await expect(
      incomplete.getByRole("button", { name: "Send for approval" }),
    ).toBeDisabled();
  });

  test("moves a ready draft to the administrator when it is sent from the row", async ({
    page,
  }) => {
    await signIn(page);
    const ready = page
      .locator("#drafts")
      .getByRole("listitem")
      .filter({ has: page.getByRole("link", { name: "Autumn book drive" }) });
    await ready.getByRole("button", { name: "Send for approval" }).click();
    await ready.getByRole("button", { name: "Send", exact: true }).click();
    await expect(
      page
        .getByRole("region", { name: "With the administrator" })
        .getByRole("link", { name: "Autumn book drive" }),
    ).toBeVisible();
    await expect(
      page.locator("#drafts").getByRole("link", { name: "Autumn book drive" }),
    ).toHaveCount(0);
  });

  test("explains an unverified organization before anything is refused", async ({
    page,
    request,
  }) => {
    await request.post(`${STUB}/__organization`, { data: { verified: false } });
    await signIn(page);
    await expect(page.getByText("Your organization is not verified yet")).toBeVisible();
  });
});

test.describe("the vacancy list", () => {
  test("filters by tab and search through the URL, so a view can be shared", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/en/vacancies?state=draft", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("link", { name: "Autumn book drive" }).first(),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Debate cup" })).toHaveCount(0);

    await page.getByRole("searchbox").fill("autumn");
    await page.getByRole("button", { name: "Search" }).click();
    await page.waitForURL(/q=autumn/);
    await expect(page).toHaveURL(/state=draft/);
    await expect(page.getByRole("link", { name: "Spring reading picnic" })).toHaveCount(
      0,
    );
  });

  test("sorts the board by whose move each vacancy is, with the next step on every card", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/en/vacancies", { waitUntil: "networkidle" });
    const yours = page.getByRole("region", { name: "Your move" });
    const admin = page.getByRole("region", { name: "With the administrator" });
    await expect(
      yours.getByRole("link", { name: "Photo archive week", exact: true }),
    ).toBeVisible();
    await expect(
      yours.getByRole("link", { name: "Autumn book drive", exact: true }),
    ).toBeVisible();
    await expect(
      admin.getByRole("link", { name: "Winter clothing drive", exact: true }),
    ).toBeVisible();
    await expect(
      yours.getByRole("link", { name: "Winter clothing drive" }),
    ).toHaveCount(0);
    const card = yours.getByRole("listitem").filter({
      has: page.getByRole("link", { name: "City sports day", exact: true }),
    });
    await card.getByRole("link", { name: /Record attendance/ }).click();
    await page.waitForURL(new RegExp(`${CITY_SPORTS_DAY}\\?tab=attendance`));
  });

  test("offers the next step on each row", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/vacancies?view=list", { waitUntil: "networkidle" });
    const row = page.getByRole("row", { name: /City sports day/ });
    await row
      .getByRole("link", { name: /Record attendance/ })
      .filter({ visible: true })
      .click();
    await page.waitForURL(new RegExp(`${CITY_SPORTS_DAY}\\?tab=attendance`));
  });

  test("keeps a bookmark and lists it under Saved", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/vacancies", { waitUntil: "networkidle" });
    await page
      .getByRole("button", { name: "Save “Debate cup”" })
      .filter({ visible: true })
      .click();
    await expect(
      page
        .getByRole("button", { name: "Remove “Debate cup” from saved" })
        .filter({ visible: true }),
    ).toBeVisible();
    await page.goto("/en/vacancies?saved=1", { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: "Debate cup" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Park tree planting" })).toHaveCount(0);
  });
});

test.describe("a vacancy from draft to approval", () => {
  test("creates one through the wizard and promises only the XP the backend pays", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/en/vacancies/new", { waitUntil: "networkidle" });

    await page.locator("#wizard-title").fill("Riverbank clean-up");
    await page.locator("#wizard-description").fill("Volunteers tidy the riverbank.");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.locator("#wizard-region").selectOption("tashkent-city");
    await page.locator("#wizard-location").fill("Ankhor park");
    const inMonth = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    const inWeek = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    await page.locator("#wizard-start-date").fill(inMonth);
    await page.locator("#wizard-end-date").fill(inMonth);
    await page.locator("#wizard-capacity").fill("15");
    await page.locator("#wizard-deadline-date").fill(inWeek);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(
      page.getByText("10 XP per verified volunteer hour").first(),
    ).toBeVisible();
    await expect(page.getByText(/XP for attending/)).toHaveCount(0);

    await page.getByRole("button", { name: "Submit for approval" }).click();
    await page.waitForURL(/\/en\/vacancies\/[^/]+\?sent=1/);
    await expect(page.getByText("Submitted for approval.")).toBeVisible();
    await expect(page.locator("main")).toContainText("Waiting for approval");
  });

  test("has no applications or attendance tab before a vacancy has been public", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(`/en/vacancies/${AUTUMN_DRAFT}?tab=attendance`, {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("heading", { name: "Details", level: 2 }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Attendance results/ })).toHaveCount(0);
  });

  test("lists what a draft still needs and keeps its send disabled", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(`/en/vacancies/${INCOMPLETE_DRAFT}`, { waitUntil: "networkidle" });
    await expect(
      page.getByRole("button", { name: "Send for approval" }),
    ).toBeDisabled();
  });

  test("warns before an edit takes a live vacancy off the volunteer app", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(`/en/vacancies/${WINTER_FAIR}/edit`, { waitUntil: "networkidle" });
    await expect(page.getByText("This vacancy is live.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save and unpublish" }),
    ).toBeVisible();
  });

  test("offers no edit once an event has started, because it could not return", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(`/en/vacancies/${CITY_SPORTS_DAY}?tab=details`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByRole("link", { name: /Edit vacancy/ })).toHaveCount(0);
    await page.goto(`/en/vacancies/${CITY_SPORTS_DAY}/edit`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByText("The event has started.")).toBeVisible();
    await expect(page.locator("#wizard-title")).toHaveCount(0);
  });
});

test.describe("applicants and attendance", () => {
  test("searches attendance without losing edits and selects only matching volunteers", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(`/en/vacancies/${CITY_SPORTS_DAY}?tab=attendance`);
    const sheet = page.getByRole("region", { name: "3 volunteers" });
    const search = sheet.getByRole("searchbox", { name: "Search by name or username" });
    const first = sheet.getByRole("combobox", {
      name: "Attendance of Dilnoza Karimova",
    });
    const second = sheet.getByRole("combobox", {
      name: "Attendance of Sardor Toshmatov",
    });
    await first.selectOption("excused");
    await sheet
      .getByRole("checkbox", { name: "Select Dilnoza Karimova", exact: true })
      .check();
    await search.fill("  Sardor Toshmatov  ");
    await expect(first).toHaveCount(0);
    await expect(second).toBeVisible();
    await expect(sheet.getByRole("toolbar")).toHaveCount(0);
    await sheet
      .getByRole("checkbox", { name: "Select every matching volunteer" })
      .check();
    await sheet.getByRole("button", { name: "No-show", exact: true }).click();
    await search.fill("");
    await expect(first).toHaveValue("excused");
    await expect(second).toHaveValue("no_show");
    await search.fill("@dilnoza");
    await expect(first).toBeVisible();
    await expect(second).toHaveCount(0);
    await expect(sheet.getByRole("status")).toHaveText("Showing 1 of 3");
    await search.fill("no-matching-volunteer");
    await expect(sheet.getByText("No volunteers match this search.")).toBeVisible();
    await sheet.getByRole("button", { name: "Clear search" }).click();
    await expect(first).toHaveValue("excused");
    await expect(second).toHaveValue("no_show");
  });

  test("opens the submitted volunteer profile from attendance in a new tab", async ({
    page,
    context,
  }) => {
    await signIn(page);
    await page.goto(`/en/vacancies/${CITY_SPORTS_DAY}?tab=attendance`);
    const sheet = page.getByRole("region", { name: "3 volunteers" });
    const link = sheet.getByRole("link", {
      name: "View profile of Dilnoza Karimova (opens in a new tab)",
    });
    await expect(link).toHaveAttribute(
      "href",
      /\/en\/applications\/[0-9a-f-]+#profile$/,
    );
    const popupPromise = context.waitForEvent("page");
    await link.click();
    const profile = await popupPromise;
    await expect(
      profile.getByRole("heading", { name: "Profile as submitted" }),
    ).toBeVisible();
    await expect(profile.locator("#profile")).toContainText("Dilnoza Karimova");
    await expect(page.getByRole("searchbox")).toBeVisible();
    await profile.close();
  });

  test("stages a decision and sends it only through the review", async ({ page }) => {
    await signIn(page);
    await page.goto(`/en/vacancies/${WINTER_FAIR}?tab=applications`, {
      waitUntil: "networkidle",
    });
    await page
      .getByLabel("Decision for Dilnoza Karimova")
      .filter({ visible: true })
      .selectOption("accept");
    await expect(page.getByText("2 decisions ready")).toBeVisible();

    await page.getByRole("button", { name: "Review and send" }).click();
    await page.getByRole("button", { name: "Send 2 decisions" }).click();
    await expect(page.getByText("Sent: 2 accepted, 0 not accepted.")).toBeVisible();
  });

  test("records attendance, submits it, and hands it to the administrator", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(`/en/vacancies/${CITY_SPORTS_DAY}?tab=attendance`, {
      waitUntil: "networkidle",
    });
    for (const name of ["Dilnoza Karimova", "Sardor Toshmatov"]) {
      await page
        .getByLabel(`Attendance of ${name}`)
        .filter({ visible: true })
        .selectOption("excused");
    }
    await page.getByRole("button", { name: "Review and submit" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: /^(Submit|Send)/ }).click();
    await expect(page.locator("main")).toContainText("Awaiting verification");

    await page.goto("/en/attendance", { waitUntil: "networkidle" });
    await expect(
      page
        .getByRole("region", { name: "Awaiting verification" })
        .getByRole("link", { name: "City sports day", exact: true }),
    ).toBeVisible();
  });

  test("calls returned results what they are, on the queue and on the sheet", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/en/attendance", { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: /Correct results/ })).toBeVisible();
    await page.goto(`/en/vacancies/${MUSEUM_TRAINING}?tab=attendance`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByText("Twelve hours looks wrong")).toBeVisible();
  });
});

test.describe("past events and participants", () => {
  test("creates a past event from pasted usernames and waits for approval", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/en/past-events/new", { waitUntil: "networkidle" });
    await page.getByLabel("Event name").fill("Autumn fair");
    await page
      .getByLabel("Event date")
      .fill(new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByLabel("Volontyorlar usernames").fill("dilnoza_k sardor_t");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Dilnoza Karimova")).toBeVisible();

    await page.getByLabel("Hours").first().fill("3");
    await page.getByLabel("XP").first().fill("30");
    await page.getByRole("button", { name: "Apply to all" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByRole("button", { name: "Submit for approval" }).click();
    await page.waitForURL(/\/en\/past-events\/[^/]+$/);
    await expect(page.locator("main")).toContainText("Waiting for approval", {
      ignoreCase: true,
    });
  });

  test("lists participants first and leaves roster rows on their event", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto("/en/participants", { waitUntil: "networkidle" });
    const proposals = page.getByRole("region", { name: "Your proposals" });
    await expect(proposals.getByText("Spring book swap")).toBeVisible();
    await expect(proposals.getByText("Library inventory day")).toHaveCount(0);
    const order = await page
      .locator("main section[id]")
      .evaluateAll((sections) => sections.map((section) => section.id));
    expect(order.indexOf("participants")).toBeLessThan(order.indexOf("requests"));
  });
});

test.describe("my activity", () => {
  test("names every action in words, not in its code", async ({ page }) => {
    await signIn(page);
    await page.goto("/en/activity", { waitUntil: "networkidle" });
    await expect(page.locator("main")).toContainText(
      "Results submitted for verification",
    );
    await expect(page.locator("main")).not.toContainText("attendance.submitted");
  });
});

test("saves attendance and hours within one hour before the event starts", async ({
  page,
}) => {
  await signIn(page);
  const vacancyId = CITY_SPORTS_DAY;
  const attendanceUrl = `/en/vacancies/${vacancyId}?tab=attendance`;
  await page.request.post(`${STUB}/__stub/attendance-timing`, {
    data: { vacancyId, minutesUntilStart: 61 },
  });
  await page.goto(attendanceUrl);
  await expect(
    page.getByText("Attendance opens one hour before the event starts"),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save draft" })).toHaveCount(0);

  await page.request.post(`${STUB}/__stub/attendance-timing`, {
    data: { vacancyId, minutesUntilStart: 30 },
  });
  await page.goto("/en/attendance");
  const due = page.locator("#due");
  await due.locator(`a[href$="${vacancyId}?tab=attendance"]`).click();
  await page.goto(`/en/vacancies/${vacancyId}`);
  await page
    .getByLabel("Attendance of Sardor Toshmatov")
    .filter({ visible: true })
    .selectOption("attended");
  await page
    .getByLabel("Hours worked by Sardor Toshmatov")
    .filter({ visible: true })
    .fill("4");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft saved.", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Review and submit" })).toBeDisabled();
  await page.reload();
  await expect(
    page.getByLabel("Attendance of Sardor Toshmatov").filter({ visible: true }),
  ).toHaveValue("attended");
  await expect(
    page.getByLabel("Hours worked by Sardor Toshmatov").filter({ visible: true }),
  ).toHaveValue("4");
  for (const theme of ["light", "dark"]) {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page
      .context()
      .addCookies([{ name: "theme", value: theme, url: new URL(page.url()).origin }]);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(
      page.getByLabel("Hours worked by Sardor Toshmatov").filter({ visible: true }),
    ).toHaveValue("4");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`early-attendance-${theme}.png`),
      fullPage: true,
    });
  }
});

test.describe("manual attendance", () => {
  test("adds to an empty roster and keeps the event in the attendance queue", async ({
    page,
    request,
  }) => {
    await request.post(`${STUB}/__empty-attendance`, { data: { id: CITY_SPORTS_DAY } });
    await signIn(page);
    await page.goto(`/en/vacancies/${CITY_SPORTS_DAY}?tab=attendance`, {
      waitUntil: "networkidle",
    });
    await expect(page.getByText("No volunteers yet", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Add volunteer", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name or username").fill("Nodira");
    await dialog.getByRole("button", { name: "Search", exact: true }).click();
    await dialog.getByRole("radio").check();
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Manually added", { exact: true })).toBeVisible();
    // No application means no profile this organization may open.
    await expect(page.getByRole("link", { name: /^View profile of / })).toHaveCount(0);
    await page.goto("/en/attendance", { waitUntil: "networkidle" });
    await expect(
      page.locator("main").getByRole("link", { name: "City sports day", exact: true }),
    ).toBeVisible();
    await page.goto("/en/dashboard", { waitUntil: "networkidle" });
    await expect(
      page.getByRole("link", { name: "City sports day", exact: true }),
    ).toBeVisible();
  });

  test("adds a replacement unrecorded, preserves edits, and submits actual hours for verification", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(`/en/vacancies/${CITY_SPORTS_DAY}?tab=attendance`, {
      waitUntil: "networkidle",
    });
    await page.getByLabel("Attendance of Dilnoza Karimova").selectOption("no_show");
    await page.getByLabel("Attendance of Sardor Toshmatov").selectOption("excused");
    const search = page.getByRole("searchbox", { name: "Search by name or username" });
    await search.fill("Dilnoza");
    await page.getByRole("button", { name: "Add volunteer", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name or username").fill("Dilnoza");
    await dialog.getByRole("button", { name: "Search", exact: true }).click();
    await expect(dialog.getByText("Already added")).toBeVisible();
    await expect(dialog.getByRole("radio")).toBeDisabled();
    await dialog.getByLabel("Name or username").fill("nodira_a");
    await dialog.getByRole("button", { name: "Search", exact: true }).click();
    await dialog.getByRole("radio").check();
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("Manually added", { exact: true })).toBeVisible();
    await expect(search).toHaveValue("");
    await expect(page.getByLabel("Attendance of Dilnoza Karimova")).toHaveValue(
      "no_show",
    );
    await expect(page.getByLabel("Attendance of Nodira Alimova")).toHaveValue("");
    await page.getByLabel("Attendance of Nodira Alimova").selectOption("attended");
    await page.getByLabel("Hours worked by Nodira Alimova").fill("2.5");
    await page.getByRole("button", { name: "Review and submit" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^(Submit|Send)/ })
      .click();
    await expect(page.locator("main")).toContainText("Awaiting verification");
    await expect(
      page.getByRole("button", { name: "Add volunteer", exact: true }),
    ).toHaveCount(0);
  });

  test("requires Request a correction before adding to verified attendance", async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(`/en/vacancies/${vacancy(10)}?tab=attendance`, {
      waitUntil: "networkidle",
    });
    await expect(
      page.getByRole("button", { name: "Add volunteer", exact: true }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Request a correction", exact: true })
      .click();
    await page.getByRole("button", { name: "Add volunteer", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Name or username").fill("Nodira");
    await dialog.getByRole("button", { name: "Search", exact: true }).click();
    await dialog.getByRole("radio").check();
    await dialog.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByLabel("Attendance of Nodira Alimova")).toHaveValue("");
    await expect(page.getByLabel("Attendance of Aziza Nazarova")).toHaveValue(
      "no_show",
    );
    await expect(page.locator("main")).toContainText("Manually added");
  });
});

test("keeps invalid typed hours when adding is blocked", async ({ page }) => {
  await signIn(page);
  await page.goto(`/en/vacancies/${CITY_SPORTS_DAY}?tab=attendance`, {
    waitUntil: "networkidle",
  });
  await page.getByLabel("Hours worked by Aziza Nazarova").fill("wrong");
  await page.getByRole("button", { name: "Add volunteer", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name or username").fill("@n");
  await expect(
    dialog.getByRole("button", { name: "Search", exact: true }),
  ).toBeDisabled();
  await dialog.getByLabel("Name or username").fill("@Nodira");
  await dialog.getByRole("button", { name: "Search", exact: true }).click();
  await dialog.getByRole("radio").check();
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await expect(
    page.getByText(
      "Correct the invalid hours in the attendance list before adding a volunteer.",
    ),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByLabel("Hours worked by Aziza Nazarova")).toHaveValue("wrong");
  await expect(page.getByText("Manually added", { exact: true })).toHaveCount(0);
});

test("cancels a returned correction and removes its unverified replacement", async ({
  page,
  request,
}) => {
  await signIn(page);
  const id = vacancy(10);
  await page.goto(`/en/vacancies/${id}?tab=attendance`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Request a correction", exact: true }).click();
  await page.getByRole("button", { name: "Add volunteer", exact: true }).click();
  let dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name or username").fill("Nodira");
  await dialog.getByRole("button", { name: "Search", exact: true }).click();
  await dialog.getByRole("radio").check();
  await dialog.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByLabel("Attendance of Nodira Alimova").selectOption("attended");
  await page.getByLabel("Hours worked by Nodira Alimova").fill("3");
  await page.getByRole("button", { name: "Review and submit", exact: true }).click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox").fill("Replacement participated");
  await dialog.getByRole("button", { name: /^(Submit|Send)/ }).click();
  await expect(page.locator("main")).toContainText("Awaiting verification");
  const returned = await request.post(`${STUB}/__return-attendance-correction`, {
    data: { id },
  });
  expect(returned.ok()).toBe(true);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.getByText("Check the replacement hours")).toBeVisible();
  await page.getByRole("button", { name: "Cancel correction", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Request a correction", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Manually added", { exact: true })).toHaveCount(0);
});
