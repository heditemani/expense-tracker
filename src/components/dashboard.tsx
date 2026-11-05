"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft, ArrowDownRight, ArrowUpRight, CalendarDays, Check, ChevronDown, CircleDollarSign,
  Download, Ellipsis, Filter, LayoutDashboard, LogOut, Plus, Search, Settings2, SlidersHorizontal,
  Sparkles, TrendingUp, Wallet, X,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { currencyCodes } from "@/lib/currencies";
import { categories } from "@/lib/validation";

type Transaction = {
  id: string; amount: number; category: string; date: string;
  type: "INCOME" | "EXPENSE"; description: string;
};
type Summary = {
  income: number; expenses: number; balance: number;
  daily: { date: string; income: number; expenses: number }[];
  categories: { category: string; amount: number }[];
};
type User = { id: string; name: string; email: string; currencyCode: string };
type TransactionDraft = Omit<Transaction, "id">;

const colors = ["#88a887", "#e7b66c", "#8b9cc2", "#da8f78", "#99b7c4", "#bc9bb4", "#bbc888", "#c5a77d", "#a9a9a9"];
const currencyNames = new Intl.DisplayNames(["en"], { type: "currency" });
const money = (amount: number, currencyCode: string) => new Intl.NumberFormat("en", { style: "currency", currency: currencyCode }).format(amount);
const compactMoney = (amount: number, currencyCode: string) =>
  new Intl.NumberFormat("en", { style: "currency", currency: currencyCode, notation: "compact", maximumFractionDigits: 1 }).format(amount);
const dateLabel = (date: string) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const dayLabel = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({ income: 0, expenses: 0, balance: 0, daily: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const loadData = useCallback(async () => {
    setError("");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (typeFilter !== "ALL") params.set("type", typeFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      const [meResponse, transactionResponse, summaryResponse] = await Promise.all([
        fetch("/api/auth/me"), fetch(`/api/transactions?${params}`), fetch("/api/summary"),
      ]);
      if (meResponse.status === 401 || transactionResponse.status === 401) {
        router.replace("/login");
        return;
      }
      if (!meResponse.ok || !transactionResponse.ok || !summaryResponse.ok) throw new Error("We couldn't load your dashboard. Please try again.");
      const [me, transactionData, summaryData] = await Promise.all([meResponse.json(), transactionResponse.json(), summaryResponse.json()]);
      setUser(me.user);
      setTransactions(transactionData.transactions);
      setSummary(summaryData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your dashboard.");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, from, router, to, typeFilter]);

  useEffect(() => { void loadData(); }, [loadData]);

  const visibleTransactions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return transactions.filter((transaction) => !normalized || transaction.description.toLowerCase().includes(normalized) || transaction.category.toLowerCase().includes(normalized));
  }, [query, transactions]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  async function saveTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const draft: TransactionDraft = {
      amount: Number(formData.get("amount")),
      category: String(formData.get("category")),
      date: new Date(`${String(formData.get("date"))}T12:00:00.000Z`).toISOString(),
      type: String(formData.get("type")) as Transaction["type"],
      description: String(formData.get("description")),
    };
    setSaving(true);
    try {
      const response = await fetch(editing ? `/api/transactions/${editing.id}` : "/api/transactions", {
        method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to save this transaction.");
      setDialogOpen(false);
      setEditing(null);
      await loadData();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this transaction.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTransaction(transaction: Transaction) {
    if (!window.confirm(`Delete "${transaction.description || transaction.category}"? This can't be undone.`)) return;
    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to delete this transaction.");
      await loadData();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete this transaction.");
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function changeCurrency(currencyCode: string) {
    const previousCurrency = user?.currencyCode;
    if (!previousCurrency || currencyCode === previousCurrency) return;
    setUser((current) => current ? { ...current, currencyCode } : current);
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currencyCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to update your currency.");
      setUser(data.user);
    } catch (currencyError) {
      setUser((current) => current ? { ...current, currencyCode: previousCurrency } : current);
      setError(currencyError instanceof Error ? currencyError.message : "Unable to update your currency.");
    }
  }

  function exportCsv() {
    const currencyCode = user?.currencyCode ?? "USD";
    const rows = [["Date", "Type", "Category", "Description", `Amount (${currencyCode})`], ...visibleTransactions.map((transaction) => [
      dateLabel(transaction.date), transaction.type, transaction.category,
      transaction.description, transaction.amount.toFixed(2),
    ])];
    const csv = rows.map((row) => row.map((field) => `"${field.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    link.download = "pennywise-transactions.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const today = new Date();
  const greeting = today.getHours() < 12 ? "Good morning" : today.getHours() < 18 ? "Good afternoon" : "Good evening";
  const initialDraft = editing ?? {
    amount: 0, category: "Food", date: new Date().toISOString(), type: "EXPENSE" as const, description: "",
  };
  const displayCurrency = user?.currencyCode ?? "USD";

  if (loading) return <main className="loading-screen"><span className="loader" />Getting your finances in order…</main>;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/dashboard"><span className="brand-mark"><CircleDollarSign size={20} /></span>pennywise<span className="brand-period">.</span></a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav"><a className="nav-item active" href="/dashboard"><LayoutDashboard size={17} />Overview</a></nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><Sparkles size={16} /><strong>A little reminder</strong><p>Every dollar you track is a step toward a more intentional life.</p></div>
          <button className="profile-button" onClick={signOut}><span className="avatar">{user?.name?.charAt(0).toUpperCase() ?? "P"}</span><span className="profile-copy"><strong>{user?.name ?? "Your account"}</strong><small>{user?.email}</small></span><LogOut size={16} /></button>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <strong>Overview</strong></div><div className="topbar-right"><label className="currency-picker" title="Changes display only. Amounts are not converted."><span>Currency</span><select aria-label="Account currency. Display only; amounts are not converted." value={displayCurrency} onChange={(event) => void changeCurrency(event.target.value)}>{currencyCodes.map((code) => <option key={code} value={code}>{code} — {currencyNames.of(code) ?? code}</option>)}</select><ChevronDown size={13} /></label><span className="today-label"><CalendarDays size={15} />{today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span><button className="avatar top-avatar" aria-label="Account" onClick={signOut}>{user?.name?.charAt(0).toUpperCase() ?? "P"}</button></div></header>
        <div className="dashboard-content">
          <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR FINANCIAL SNAPSHOT</div><h1>{greeting}{user ? `, ${user.name.split(" ")[0]}` : ""}<span className="heading-period">.</span></h1><p>Here’s how your money is moving. You’ve got this.</p></div><button className="button button-primary" onClick={openCreate}><Plus size={17} /> Add transaction</button></div>
          {error && <div className="inline-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss error"><X size={15} /></button></div>}

          <section className="summary-grid" aria-label="Financial summary">
            <article className="summary-card balance-card"><div className="card-topline"><span className="card-label">TOTAL BALANCE</span><span className="card-icon balance-icon"><Wallet size={17} /></span></div><div className="balance-amount">{money(summary.balance, user?.currencyCode ?? "USD")}</div><div className="card-note"><span className="positive-note"><TrendingUp size={14} /> Your net position</span><span>all time</span></div><div className="balance-decoration" /></article>
            <article className="summary-card"><div className="card-topline"><span className="card-label">TOTAL INCOME</span><span className="card-icon income-icon"><ArrowDownLeft size={17} /></span></div><div className="metric-amount">{money(summary.income, user?.currencyCode ?? "USD")}</div><div className="card-note">Money coming in <span className="metric-dot income-dot" /></div></article>
            <article className="summary-card"><div className="card-topline"><span className="card-label">TOTAL EXPENSES</span><span className="card-icon expense-icon"><ArrowUpRight size={17} /></span></div><div className="metric-amount">{money(summary.expenses, user?.currencyCode ?? "USD")}</div><div className="card-note">Money going out <span className="metric-dot expense-dot" /></div></article>
            <article className="summary-card"><div className="card-topline"><span className="card-label">NET SAVINGS</span><span className="card-icon savings-icon"><Sparkles size={17} /></span></div><div className={`metric-amount ${summary.balance < 0 ? "negative" : ""}`}>{money(summary.balance, user?.currencyCode ?? "USD")}</div><div className="card-note">{summary.income ? `${Math.round((summary.balance / summary.income) * 100)}% of income retained` : "Add income to see your savings rate"} <span className="metric-dot savings-dot" /></div></article>
          </section>

          <section className="chart-grid">
            <article className="panel trend-panel"><div className="panel-heading"><div><h2>Money in motion</h2><p>Your income and expenses, day by day</p></div><span className="range-badge"><span /> LAST 30 DAYS</span></div><div className="chart-area">{summary.daily.length && summary.daily.some((day) => day.income || day.expenses) ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={summary.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}><defs><linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#78977b" stopOpacity={0.19} /><stop offset="95%" stopColor="#78977b" stopOpacity={0} /></linearGradient><linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#d7947b" stopOpacity={0.16} /><stop offset="95%" stopColor="#d7947b" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eeede8" vertical={false} /><XAxis dataKey="date" tickFormatter={dayLabel} interval={4} minTickGap={18} tickLine={false} axisLine={false} tick={{ fill: "#777b72", fontSize: 11 }} dy={10} /><YAxis tickFormatter={(value: number) => compactMoney(value, displayCurrency)} tickLine={false} axisLine={false} tick={{ fill: "#777b72", fontSize: 11 }} /><Tooltip formatter={(value) => money(Number(value), displayCurrency)} labelFormatter={(label) => dateLabel(`${String(label)}T00:00:00.000Z`)} contentStyle={{ border: "1px solid #eeede8", borderRadius: 10, fontSize: 12, boxShadow: "0 6px 20px #20281a12" }} /><Area type="monotone" dataKey="income" name="Income" stroke="#78977b" strokeWidth={2.2} fill="url(#incomeFill)" /><Area type="monotone" dataKey="expenses" name="Expenses" stroke="#d7947b" strokeWidth={2.2} fill="url(#expenseFill)" /></AreaChart></ResponsiveContainer> : <div className="empty-chart"><TrendingUp size={22} /><span>Your daily trends will show up here.</span><small>Add a few transactions to get started.</small></div>}</div><div className="chart-legend"><span><i className="legend-income" /> Income</span><span><i className="legend-expense" /> Expenses</span></div></article>
            <article className="panel category-panel"><div className="panel-heading"><div><h2>Spending by category</h2><p>Where your expenses are going</p></div><button className="icon-button" aria-label="Spending by category"><Ellipsis size={19} /></button></div>{summary.categories.length ? <><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={summary.categories} dataKey="amount" nameKey="category" innerRadius={67} outerRadius={88} paddingAngle={3} stroke="none">{summary.categories.map((entry, index) => <Cell key={entry.category} fill={colors[index % colors.length]} />)}</Pie><Tooltip formatter={(value) => money(Number(value), displayCurrency)} contentStyle={{ border: "1px solid #eeede8", borderRadius: 10, fontSize: 12 }} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{money(summary.expenses, displayCurrency)}</strong><span>total spent</span></div></div><div className="category-legend">{summary.categories.slice(0, 4).map((entry, index) => <div className="category-line" key={entry.category}><span><i style={{ background: colors[index % colors.length] }} />{entry.category}</span><strong>{money(entry.amount, displayCurrency)}</strong></div>)}</div></> : <div className="empty-category"><div className="empty-pie"><span /></div><strong>No spending to show yet</strong><small>Your category breakdown will appear here.</small></div>}</article>
          </section>

          <section className="panel transactions-panel"><div className="transactions-heading"><div><div className="title-with-count"><h2>Recent transactions</h2><span className="count-badge">{visibleTransactions.length}</span></div><p>A running record of your financial activity</p></div><div className="transaction-actions"><button className="button button-outline export-button" onClick={exportCsv} disabled={!visibleTransactions.length}><Download size={15} /> Export</button></div></div>
            <div className="filters-row"><label className="search-field"><Search size={16} /><input placeholder="Search transactions..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className="filter-field"><SlidersHorizontal size={15} /><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="ALL">All types</option><option value="INCOME">Income</option><option value="EXPENSE">Expense</option></select><ChevronDown size={14} /></label><label className="filter-field"><Filter size={15} /><select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="ALL">All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></label><label className="date-filter"><span>From</span><input aria-label="Filter from date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label className="date-filter"><span>To</span><input aria-label="Filter to date" type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>
            {visibleTransactions.length ? <div className="table-scroll"><table><thead><tr><th>TRANSACTION</th><th>CATEGORY</th><th>DATE</th><th>TYPE</th><th className="amount-heading">AMOUNT · {displayCurrency}</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visibleTransactions.map((transaction) => <tr key={transaction.id}><td><div className="transaction-name"><span className={`transaction-type-icon ${transaction.type === "INCOME" ? "type-income" : "type-expense"}`}>{transaction.type === "INCOME" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}</span><span><strong>{transaction.description || transaction.category}</strong><small>{transaction.type === "INCOME" ? "Income" : "Expense"}</small></span></div></td><td><span className="category-pill">{transaction.category}</span></td><td className="date-cell">{dateLabel(transaction.date)}</td><td><span className={`type-label ${transaction.type === "INCOME" ? "type-label-income" : "type-label-expense"}`}><i />{transaction.type === "INCOME" ? "Income" : "Expense"}</span></td><td className={`amount-cell ${transaction.type === "INCOME" ? "amount-income" : ""}`}>{transaction.type === "INCOME" ? "+" : "−"}{money(transaction.amount, displayCurrency)}</td><td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${transaction.description || transaction.category}`} onClick={() => { setEditing(transaction); setDialogOpen(true); }}><Settings2 size={15} /></button><button className="icon-button delete-action" aria-label={`Delete ${transaction.description || transaction.category}`} onClick={() => void deleteTransaction(transaction)}><X size={15} /></button></div></td></tr>)}</tbody></table></div> : <div className="empty-transactions"><div className="empty-icon"><CircleDollarSign size={22} /></div><strong>{transactions.length ? "No transactions match these filters" : "Your story starts with a single transaction"}</strong><p>{transactions.length ? "Try changing your search or filters." : "Add your first income or expense to see your finances take shape."}</p>{!transactions.length && <button className="button button-outline" onClick={openCreate}><Plus size={16} /> Add a transaction</button>}</div>}
            <div className="table-footer"><span>Showing <strong>{visibleTransactions.length}</strong> of <strong>{transactions.length}</strong> transactions</span><span>All caught up <Check size={14} /></span></div>
          </section>
          <footer className="dashboard-footer"><span>Made for more mindful money.</span><span>Pennywise <i>·</i> Your data stays yours</span></footer>
        </div>
      </section>

      {dialogOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialogOpen(false); }}><section className="transaction-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-heading"><div><span className="eyebrow">{editing ? "MAKE A CHANGE" : "KEEP YOUR MONEY IN FOCUS"}</span><h2 id="modal-title">{editing ? "Edit transaction" : "Add a transaction"}</h2><p>{editing ? "Update the details below." : "A small note today makes a clearer picture tomorrow."}</p></div><button className="icon-button" onClick={() => setDialogOpen(false)} aria-label="Close"><X size={19} /></button></div><form onSubmit={saveTransaction} className="transaction-form"><label>Type<div className="type-toggle"><label className={initialDraft.type === "EXPENSE" ? "selected expense-selected" : ""}><input type="radio" name="type" value="EXPENSE" defaultChecked={initialDraft.type === "EXPENSE"} />Expense</label><label className={initialDraft.type === "INCOME" ? "selected income-selected" : ""}><input type="radio" name="type" value="INCOME" defaultChecked={initialDraft.type === "INCOME"} />Income</label></div></label><div className="form-two-col"><label>Amount ({displayCurrency})<div className="amount-input"><span>{new Intl.NumberFormat("en", { style: "currency", currency: displayCurrency, currencyDisplay: "narrowSymbol" }).formatToParts(0).find((part) => part.type === "currency")?.value}</span><input name="amount" type="number" min="0.01" max="1000000000" step="any" defaultValue={editing?.amount ?? ""} placeholder="0.00" required /></div></label><label>Date<input name="date" type="date" defaultValue={initialDraft.date.slice(0, 10)} required /></label></div><label>Category<select name="category" defaultValue={initialDraft.category} required>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label>Description <span className="optional-label">· optional</span><input name="description" maxLength={240} defaultValue={editing?.description ?? ""} placeholder="What was this for?" /></label><div className="modal-actions"><button type="button" className="button button-outline" onClick={() => setDialogOpen(false)}>Cancel</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save changes" : "Save transaction"} {!saving && <ArrowUpRight size={16} />}</button></div></form></section></div>}
    </main>
  );
}
