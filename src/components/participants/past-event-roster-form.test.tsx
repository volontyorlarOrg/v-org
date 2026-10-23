import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddParticipantsForm } from "./add-participants-form";
import { PastEventRosterForm, type RosterFormLabels } from "./past-event-roster-form";

const actions = vi.hoisted(() => ({ create: vi.fn(), find: vi.fn(), add: vi.fn() }));
vi.mock("@/lib/past-event-rosters/actions", () => ({
  createPastEventRosterAction: actions.create,
  findPastEventVolunteersAction: actions.find,
  addPastEventParticipantsAction: actions.add,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const labels: RosterFormLabels = {
  steps: "Steps",
  details: "Event details",
  participants: "Participants",
  review: "Review",
  title: "Event name",
  date: "Event date",
  note: "Note",
  username: "Usernames",
  usernameHint: "Paste several",
  usernameHelp: "Use exact usernames",
  find: "Add",
  finding: "Finding",
  notFound: "Not found: {names}.",
  alreadyAdded: "Already added: {names}.",
  everyone: "Same for everyone",
  everyoneHelp: "Sets everyone",
  apply: "Apply to all",
  hours: "Hours",
  xp: "XP",
  remove: "Remove",
  empty: "Add participants",
  emptyHelp: "Find a volunteer",
  limit: "100 participants",
  next: "Continue",
  back: "Back",
  send: "Submit for approval",
  sending: "Submitting",
  cancel: "Cancel",
  reviewHelp: "An administrator reviews the event",
  totals: "Participants: {count} · Hours: {hours} · XP: {xp}",
  zeroHours: "Participants with 0 hours: {count}.",
  fallbackError: "Try again",
  errors: {
    pastEventRosterDuplicate: "Already selected",
    pastEventVolunteerNotFound: "Volunteer not found",
    pastEventRosterParticipants: "Add participants first",
    pastEventDateInvalid: "Choose a past date",
    hoursAmount: "Bad hours",
    xpAmount: "Bad XP",
    required: "Required",
  },
};

const people: Record<string, { id: string; username: string; displayName: string }> = {
  aziza: {
    id: "00000000-0000-4000-8000-000000000001",
    username: "aziza",
    displayName: "Aziza",
  },
  bobur: {
    id: "00000000-0000-4000-8000-000000000003",
    username: "bobur",
    displayName: "Bobur",
  },
};

beforeEach(() => {
  actions.find.mockReset().mockImplementation(async (names: string[]) => ({
    result: { status: "ok" },
    found: names
      .filter((name) => people[name])
      .map((name) => ({ ...people[name]!, avatarUrl: null })),
    missing: names.filter((name) => !people[name]),
  }));
  actions.create
    .mockReset()
    .mockResolvedValue({ status: "error", code: "server", fields: {} });
  actions.add.mockReset().mockResolvedValue({ status: "ok" });
});

function renderForm() {
  const user = userEvent.setup();
  render(
    <PastEventRosterForm
      locale="en"
      submissionId="00000000-0000-4000-8000-000000000002"
      latestDate="2026-10-15"
      labels={labels}
    />,
  );
  return user;
}

async function fillDetails() {
  const user = renderForm();
  await user.type(screen.getByLabelText("Event name"), "Book drive");
  fireEvent.change(screen.getByLabelText("Event date"), {
    target: { value: "2025-09-20" },
  });
  await user.click(screen.getByRole("button", { name: "Continue" }));
  return user;
}

describe("event-first participant proposal form", () => {
  it("keeps all work local until the roster has been reviewed and explicitly submitted", async () => {
    const user = await fillDetails();
    await user.type(screen.getByLabelText("Usernames"), "@aziza");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByText("Aziza");
    await user.clear(screen.getByLabelText("Hours @aziza"));
    await user.type(screen.getByLabelText("Hours @aziza"), "3.5");
    await user.clear(screen.getByLabelText("XP @aziza"));
    await user.type(screen.getByLabelText("XP @aziza"), "40");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(actions.create).not.toHaveBeenCalled();
    expect(screen.getByText("Hours: 3.5 · XP: 40")).toBeInTheDocument();
    expect(
      screen.getByText("Participants: 1 · Hours: 3.5 · XP: 40"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit for approval" }));
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1));
    const form = actions.create.mock.calls[0]![1] as FormData;
    expect(JSON.parse(String(form.get("roster")))).toMatchObject({
      title: "Book drive",
      eventDate: "2025-09-20",
      participants: [{ volunteerId: people.aziza!.id, hours: "3.5", xpAwarded: "40" }],
    });
    await screen.findByText("Try again");
    await user.click(screen.getByRole("button", { name: "Submit for approval" }));
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(2));
    const retried = actions.create.mock.calls[1]![1] as FormData;
    expect(retried.get("roster")).toBe(form.get("roster"));
  });

  it("prevents duplicate selection and refuses review with no participants", async () => {
    const user = await fillDetails();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Add participants first")).toBeInTheDocument();
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await user.type(screen.getByLabelText("Usernames"), "aziza");
      await user.click(screen.getByRole("button", { name: "Add" }));
      await screen.findByText("Aziza");
    }
    await screen.findByText("Already added: @aziza.");
    expect(actions.find).toHaveBeenCalledTimes(1);
    expect(screen.getAllByLabelText("Hours @aziza")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Remove @aziza" }));
    expect(screen.queryByLabelText("Hours @aziza")).not.toBeInTheDocument();
    expect(actions.create).not.toHaveBeenCalled();
  });

  it("adds a pasted list at once, names who was not found and leaves them in the field to fix", async () => {
    const user = await fillDetails();
    await user.type(screen.getByLabelText("Usernames"), "aziza, @bobur nobody");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByText("Bobur");
    expect(actions.find).toHaveBeenCalledWith(["aziza", "bobur", "nobody"]);
    expect(screen.getByText("Aziza")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Not found: @nobody.");
    expect(screen.getByLabelText("Usernames")).toHaveValue("@nobody");
  });

  it("sets the same hours and XP for everyone, and warns on review about anyone left at 0 hours", async () => {
    const user = await fillDetails();
    await user.type(screen.getByLabelText("Usernames"), "aziza bobur");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByText("Bobur");
    const everyone = screen.getByRole("group", { name: "Same for everyone" });
    const [hours, xp] = [
      screen.getAllByLabelText("Hours")[0]!,
      screen.getAllByLabelText("XP")[0]!,
    ];
    expect(everyone).toContainElement(hours);
    await user.clear(hours);
    await user.type(hours, "1.234");
    await user.click(screen.getByRole("button", { name: "Apply to all" }));
    expect(screen.getByText("Bad hours")).toBeInTheDocument();
    expect(screen.getByLabelText("Hours @aziza")).toHaveValue(0);
    await user.clear(hours);
    await user.type(hours, "4");
    await user.clear(xp);
    await user.type(xp, "50");
    await user.click(screen.getByRole("button", { name: "Apply to all" }));
    expect(screen.getByLabelText("Hours @aziza")).toHaveValue(4);
    expect(screen.getByLabelText("XP @bobur")).toHaveValue(50);
    await user.clear(screen.getByLabelText("Hours @bobur"));
    await user.type(screen.getByLabelText("Hours @bobur"), "0");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      screen.getByText("Participants: 2 · Hours: 4 · XP: 100"),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Participants with 0 hours: 1.",
    );
  });

  it("shows a missing name or date at its own field and moves focus there", async () => {
    const user = renderForm();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const title = screen.getByLabelText("Event name");
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveFocus();
    expect(screen.getByText("Required")).toBeInTheDocument();
    expect(screen.getByText("Choose a past date")).toBeInTheDocument();
    expect(screen.getByLabelText("Steps")).toBeInTheDocument();
  });
});

describe("adding participants to a submitted event", () => {
  const addLabels = {
    ...labels,
    add: "Add participants",
    addHelp: "Forgot someone?",
    added: "Sent for approval.",
  };

  it("adds only people not yet on the event and sends them for approval", async () => {
    const user = userEvent.setup();
    render(
      <AddParticipantsForm
        rosterId="00000000-0000-4000-8000-0000000000aa"
        taken={[people.aziza!.id]}
        labels={addLabels}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Add participants" }));
    await user.type(screen.getByLabelText("Usernames"), "aziza bobur");
    await user.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByText("Bobur");
    expect(screen.queryByLabelText("Hours @aziza")).not.toBeInTheDocument();
    expect(screen.getByText("Already added: @aziza.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit for approval" }));
    await waitFor(() => expect(actions.add).toHaveBeenCalledTimes(1));
    const form = actions.add.mock.calls[0]![1] as FormData;
    expect(form.get("rosterId")).toBe("00000000-0000-4000-8000-0000000000aa");
    expect(JSON.parse(String(form.get("participants")))).toEqual([
      { volunteerId: people.bobur!.id, hours: "0", xpAwarded: "0" },
    ]);
    await waitFor(() =>
      expect(screen.queryByLabelText("Usernames")).not.toBeInTheDocument(),
    );
  });
});
