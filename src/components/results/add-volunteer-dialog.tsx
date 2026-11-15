"use client";

import { Plus, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/portal/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  addAttendanceVolunteerAction,
  searchAttendanceVolunteersAction,
} from "@/lib/results/actions";
import type { AttendanceSheet, SheetRow } from "@/lib/results/schemas";

type Volunteer = SheetRow["volunteer"];

export function AddVolunteerDialog({
  vacancyId,
  taken,
  disabled,
  beforeAdd,
  onAdded,
}: {
  vacancyId: string;
  taken: readonly string[];
  disabled: boolean;
  beforeAdd: () => Promise<boolean>;
  onAdded: (sheet: AttendanceSheet) => void;
}) {
  const t = useTranslations("results.sheet.addVolunteer");
  const errors = useTranslations("results.errors");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Volunteer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const term = query.trim().replace(/^@/, "");
  const failure = (code: string) =>
    errors.has(code) ? errors(code) : errors("generic");

  function search() {
    setError(null);
    setSelected(null);
    startTransition(async () => {
      const result = await searchAttendanceVolunteersAction(vacancyId, term);
      if (!result.ok) {
        setError(failure(result.code));
        return;
      }
      setItems(result.data.items);
      setSearched(true);
    });
  }

  function add() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      if (!(await beforeAdd())) return;
      const result = await addAttendanceVolunteerAction(vacancyId, selected);
      if (!result.ok) {
        setError(failure(result.code));
        return;
      }
      onAdded(result.data);
      setOpen(false);
      toast.success(t("success"));
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        setOpen(next);
        if (next) {
          setQuery("");
          setItems([]);
          setSelected(null);
          setSearched(false);
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <Plus aria-hidden="true" />
          {t("title")}
        </Button>
      </DialogTrigger>
      <DialogContent closeLabel={t("close")}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (term.length >= 2 && !pending) search();
            }}
            className="flex items-end gap-2"
          >
            <div className="min-w-0 flex-1">
              <label
                htmlFor="attendance-volunteer-search"
                className="mb-1.5 block text-sm font-semibold text-ink"
              >
                {t("searchLabel")}
              </label>
              <Input
                id="attendance-volunteer-search"
                value={query}
                maxLength={80}
                disabled={pending}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelected(null);
                  setItems([]);
                  setSearched(false);
                  setError(null);
                }}
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              disabled={pending || term.length < 2}
            >
              <Search aria-hidden="true" />
              {t("search")}
            </Button>
          </form>
          {error ? (
            <p role="alert" className="text-sm text-danger-ink">
              {error}
            </p>
          ) : null}
          <div aria-live="polite" aria-busy={pending}>
            {pending ? <p className="text-sm text-ink-muted">{t("pending")}</p> : null}
            {searched && items.length === 0 ? (
              <p className="text-sm text-ink-muted">{t("empty")}</p>
            ) : null}
          </div>
          {items.length > 0 ? (
            <fieldset
              disabled={pending}
              className="flex flex-col divide-y divide-border"
            >
              <legend className="sr-only">{t("select")}</legend>
              {items.map((person) => {
                const added = taken.includes(person.id);
                return (
                  <label
                    key={person.id}
                    className="flex cursor-pointer items-center gap-3 py-3 has-disabled:cursor-default has-disabled:opacity-60"
                  >
                    <input
                      type="radio"
                      name="attendance-volunteer"
                      value={person.id}
                      checked={selected === person.id}
                      disabled={added}
                      onChange={() => setSelected(person.id)}
                      className="size-4 accent-action"
                    />
                    <Avatar
                      name={person.displayName ?? person.username}
                      src={person.avatarUrl ?? undefined}
                      size="sm"
                      person
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold break-words text-ink">
                        {person.displayName ?? person.username}
                      </span>
                      <span className="block text-sm break-all text-ink-muted">
                        @{person.username}
                      </span>
                    </span>
                    {added ? (
                      <span className="text-xs text-ink-muted">
                        {t("alreadyAdded")}
                      </span>
                    ) : null}
                  </label>
                );
              })}
            </fieldset>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={pending}>
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button onClick={add} disabled={!selected || pending}>
            {t("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
