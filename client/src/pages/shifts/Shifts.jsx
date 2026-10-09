import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Save, UserRound } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useBusiness } from "../../context/BusinessContext";
import api from "../../services/api";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMonday = (date) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return formatDateInput(monday);
};

const addDays = (isoDate, count) => {
  const [year, month, day] = isoDate.split("-").map(Number);
  const result = new Date(year, month - 1, day, 12);
  result.setDate(result.getDate() + count);
  return result;
};

const formatWeekRange = (weekStart) => {
  const start = addDays(weekStart, 0);
  const end = addDays(weekStart, 6);
  const formatter = new Intl.DateTimeFormat("en-UG", { day: "numeric", month: "short" });
  return `${formatter.format(start)} – ${formatter.format(end)}, ${end.getFullYear()}`;
};

const formatTime = (value) => {
  if (!value) return "";
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
};

const emptyDays = () => DAYS.map((_, dayOfWeek) => ({ dayOfWeek, isDayOff: false, startTime: "", endTime: "" }));

const mapScheduleDays = (schedule) => {
  const rows = emptyDays();
  (schedule?.days || []).forEach((day) => {
    const index = Number(day.dayOfWeek);
    if (index >= 0 && index < 7) {
      rows[index] = {
        dayOfWeek: index,
        isDayOff: Boolean(day.isDayOff),
        startTime: day.startTime || "",
        endTime: day.endTime || "",
      };
    }
  });
  return rows;
};

const getId = (value) => String(value?._id || value?.id || value || "");

export default function Shifts() {
  const { user } = useAuth();
  const { activeBranch, activeBranchId } = useBusiness();
  const role = String(user?.role || "").toUpperCase();
  const canManage = ["OWNER", "ADMIN", "MANAGER"].includes(role);
  const branchId = getId(activeBranchId || activeBranch?._id);

  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [cashiers, setCashiers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [mySchedule, setMySchedule] = useState(null);
  const [selectedCashierId, setSelectedCashierId] = useState("");
  const [days, setDays] = useState(emptyDays);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedCashier = useMemo(
    () => cashiers.find((cashier) => getId(cashier) === selectedCashierId) || null,
    [cashiers, selectedCashierId]
  );

  const selectedSchedule = useMemo(() => {
    if (!canManage) return mySchedule;
    return schedules.find((schedule) => getId(schedule.cashierId) === selectedCashierId) || null;
  }, [canManage, mySchedule, schedules, selectedCashierId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      setSuccess("");
      try {
        const response = await api.get("/shifts", {
          params: { weekStart, ...(branchId ? { branchId } : {}) },
        });
        if (cancelled) return;

        if (canManage) {
          const nextCashiers = Array.isArray(response.data?.cashiers) ? response.data.cashiers : [];
          setCashiers(nextCashiers);
          setSchedules(Array.isArray(response.data?.schedules) ? response.data.schedules : []);
          setSelectedCashierId((current) => (
            nextCashiers.some((cashier) => getId(cashier) === current)
              ? current
              : getId(nextCashiers[0])
          ));
        } else {
          setMySchedule(response.data?.schedule || null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError?.response?.data?.message || "Unable to load this week’s shifts.");
          setCashiers([]);
          setSchedules([]);
          setMySchedule(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [branchId, canManage, weekStart]);

  useEffect(() => {
    setDays(mapScheduleDays(selectedSchedule));
  }, [selectedCashierId, selectedSchedule, weekStart]);

  const changeWeek = (offset) => setWeekStart(getMonday(addDays(weekStart, offset * 7)));

  const updateDay = (dayOfWeek, field, value) => {
    setDays((current) => current.map((day) => {
      if (day.dayOfWeek !== dayOfWeek) return day;
      if (field === "isDayOff") {
        return { ...day, isDayOff: value, startTime: value ? "" : day.startTime, endTime: value ? "" : day.endTime };
      }
      return { ...day, [field]: value, isDayOff: false };
    }));
    setSuccess("");
  };

  const saveSchedule = async (event) => {
    event.preventDefault();
    if (!selectedCashierId || !branchId) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await api.put("/shifts", { branchId, weekStart, cashierId: selectedCashierId, days });
      const saved = response.data?.schedule;
      setSchedules((current) => [
        ...current.filter((schedule) => getId(schedule.cashierId) !== selectedCashierId),
        saved,
      ]);
      setSuccess(response.data?.message || "Weekly shifts saved.");
    } catch (saveError) {
      setError(saveError?.response?.data?.message || "Unable to save this weekly schedule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700"><CalendarDays size={17} /> Cashier schedules</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{canManage ? "Weekly cashier shifts" : "My working shifts"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {canManage ? "Set each cashier’s start and finish time for the selected week." : "Check your start and finish times for each day this week."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => changeWeek(-1)} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Previous week"><ChevronLeft size={18} /></button>
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700">
            <CalendarDays size={16} className="text-slate-400" /><span className="hidden sm:inline">Week of</span>
            <input type="date" value={weekStart} onChange={(event) => event.target.value && setWeekStart(getMonday(addDays(event.target.value, 0)))} className="w-32 border-0 bg-transparent p-0 text-sm font-semibold outline-none focus:ring-0" aria-label="Choose week" />
          </label>
          <button type="button" onClick={() => changeWeek(1)} className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50" aria-label="Next week"><ChevronRight size={18} /></button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-bold text-slate-900">{formatWeekRange(weekStart)}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><UserRound size={14} /> {activeBranch?.name || "Current branch"}</p>
          </div>
          {canManage && (
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              Cashier
              <select value={selectedCashierId} onChange={(event) => setSelectedCashierId(event.target.value)} disabled={loading || cashiers.length === 0} className="min-w-48 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50">
                {cashiers.length === 0 && <option value="">No cashiers in this branch</option>}
                {cashiers.map((cashier) => <option key={getId(cashier)} value={getId(cashier)}>{cashier.name}</option>)}
              </select>
            </label>
          )}
        </div>

        {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
        {success && <div role="status" className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 size={17} />{success}</div>}

        {!canManage && !selectedSchedule && !loading && !error && <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-4 text-sm text-blue-800">No shifts have been assigned for you this week yet. Your manager can update your schedule here.</div>}
        {canManage && cashiers.length === 0 && !loading && !error && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">There are no active cashiers assigned to this branch. Add or assign a cashier to this branch first.</div>}

        {loading ? <div className="py-14 text-center text-sm text-slate-500">Loading weekly shifts…</div> : (!canManage && !selectedSchedule) ? null : (
          <form onSubmit={saveSchedule}>
            <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[620px] border-collapse text-left">
                <thead className="bg-slate-50"><tr className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Day</th>{canManage && <th className="px-4 py-3">Day off</th>}
                  <th className="px-4 py-3">{canManage ? "Start time" : "Shift starts"}</th>
                  <th className="px-4 py-3">{canManage ? "Finish time" : "Shift ends"}</th>
                  {!canManage && <th className="px-4 py-3">Status</th>}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">{days.map((day) => (
                  <tr key={day.dayOfWeek} className="text-sm text-slate-700">
                    <th scope="row" className="whitespace-nowrap px-4 py-3.5 font-semibold text-slate-900">{DAYS[day.dayOfWeek]}<span className="ml-2 text-xs font-normal text-slate-400">{formatDateInput(addDays(weekStart, day.dayOfWeek))}</span></th>
                    {canManage && <td className="px-4 py-3.5"><label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600"><input type="checkbox" checked={day.isDayOff} onChange={(event) => updateDay(day.dayOfWeek, "isDayOff", event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />Off</label></td>}
                    <td className="px-4 py-3">
                      {canManage ? <input type="time" value={day.startTime} disabled={day.isDayOff} onChange={(event) => updateDay(day.dayOfWeek, "startTime", event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400" aria-label={`${DAYS[day.dayOfWeek]} start time`} /> : day.isDayOff ? <span className="text-slate-400">—</span> : <span className="inline-flex items-center gap-1.5"><Clock3 size={14} className="text-slate-400" />{formatTime(day.startTime)}</span>}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? <input type="time" value={day.endTime} disabled={day.isDayOff} onChange={(event) => updateDay(day.dayOfWeek, "endTime", event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400" aria-label={`${DAYS[day.dayOfWeek]} finish time`} /> : day.isDayOff ? <span className="text-slate-400">—</span> : <span>{formatTime(day.endTime)}</span>}
                    </td>
                    {!canManage && <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${day.isDayOff ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>{day.isDayOff ? "Day off" : "Scheduled"}</span></td>}
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {canManage && <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-xs text-slate-500">Choose “Off” for rest days. Start and finish times are required for working days.</p>
              <button type="submit" disabled={saving || loading || !selectedCashier} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Save size={16} />}
                {saving ? "Saving schedule…" : "Save weekly shifts"}
              </button>
            </div>}
          </form>
        )}
      </section>
    </div>
  );
}
