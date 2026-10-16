import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PastEventRosterForm, type RosterFormLabels } from "./past-event-roster-form";

const actions = vi.hoisted(() => ({ create: vi.fn(), find: vi.fn() }));
vi.mock("@/lib/past-event-rosters/actions", () => ({
  createPastEventRosterAction: actions.create,
  findPastEventVolunteerAction: actions.find,
}));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, ...props }: React.ComponentProps<"a">) => (
    <a {...props}>{children}</a>
  ),
}));

const labels: RosterFormLabels = {
  details: "Event details",
  participants: "Participants",
  review: "Review",
  title: "Event name",
  date: "Event date",
  note: "Note",
  username: "Username",
  usernameHelp: "Use an exact username",
  find: "Add volunteer",
  finding: "Finding",
  hours: "Hours",
  xp: "XP",
  remove: "Remove",
  empty: "Add participants",
  emptyHelp: "Find a volunteer",
  next: "Continue",
  back: "Back",
  send: "Submit for approval",
  sending: "Submitting",
  cancel: "Cancel",
  approvalHelp: "Approval required",
  limit: "100 participants",
  reviewHelp: "Each person needs approval",
  fallbackError: "Try again",
  errors: {
    pastEventRosterDuplicate: "Already selected",
    pastEventVolunteerNotFound: "Volunteer not found",
    pastEventRosterParticipants: "Add participants first",
    required: "Required",
  },
};
const id = "00000000-0000-4000-8000-000000000001";
const volunteer = { id, username: "aziza", displayName: "Aziza", avatarUrl: null };

beforeEach(() => {
  actions.find.mockReset().mockResolvedValue({ result: { status: "ok" }, volunteer });
  actions.create
    .mockReset()
    .mockResolvedValue({ status: "error", code: "server", fields: {} });
});

async function fillDetails() {
  const user = userEvent.setup();
  render(
    <PastEventRosterForm
      locale="en"
      submissionId="00000000-0000-4000-8000-000000000002"
      latestDate="2026-10-15"
      labels={labels}
    />,
  );
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
    await user.type(screen.getByLabelText("Username"), "@aziza");
    await user.click(screen.getByRole("button", { name: "Add volunteer" }));
    await screen.findByText("Aziza");
    await user.clear(screen.getByLabelText("Hours @aziza"));
    await user.type(screen.getByLabelText("Hours @aziza"), "3.5");
    await user.clear(screen.getByLabelText("XP @aziza"));
    await user.type(screen.getByLabelText("XP @aziza"), "40");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(actions.create).not.toHaveBeenCalled();
    expect(screen.getByText("Hours: 3.5 · XP: 40")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit for approval" }));
    await waitFor(() => expect(actions.create).toHaveBeenCalledTimes(1));
    const form = actions.create.mock.calls[0]![1] as FormData;
    expect(JSON.parse(String(form.get("roster")))).toMatchObject({
      title: "Book drive",
      eventDate: "2025-09-20",
      participants: [{ volunteerId: id, hours: "3.5", xpAwarded: "40" }],
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
      await user.type(screen.getByLabelText("Username"), "aziza");
      await user.click(screen.getByRole("button", { name: "Add volunteer" }));
      await waitFor(() => expect(actions.find).toHaveBeenCalledTimes(attempt + 1));
    }
    await screen.findByText("Already selected");
    expect(screen.getAllByLabelText("Hours @aziza")).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Remove @aziza" }));
    expect(screen.queryByLabelText("Hours @aziza")).not.toBeInTheDocument();
    expect(actions.create).not.toHaveBeenCalled();
  });
});
