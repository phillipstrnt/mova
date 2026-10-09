import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bell, Building2, CheckCheck, Circle, LogOut, Menu, Phone, Search, ShieldCheck, UserCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { useBusiness } from "../../context/BusinessContext";
import api from "../../services/api";

const getNotificationPath = (link) => {
  if (typeof link !== "string" || !link.startsWith("/") || link.startsWith("//")) return "";
  if (link === "/app" || link.startsWith("/app/")) return link;
  const section = link.split("/").filter(Boolean)[0];
  return section ? `/app/${section}` : "/app";
};

const formatNotificationTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-UG", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const formatSearchAmount = (value) => new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0,
}).format(Number(value) || 0);

const Topbar = ({ onMenuClick }) => {
  const { user, business, logout, hasPermission } = useAuth();
  const { activeBranchId, activeBranch } = useBusiness();
  const branchValue = activeBranchId?._id || activeBranchId;
  const branchId = branchValue ? String(branchValue) : "";
  const navigate = useNavigate();
  const notificationPanelRef = useRef(null);
  const profilePanelRef = useRef(null);
  const desktopSearchRef = useRef(null);
  const mobileSearchRef = useRef(null);
  const desktopSearchInputRef = useRef(null);
  const mobileSearchInputRef = useRef(null);
  const searchRequestRef = useRef(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const [updatingNotification, setUpdatingNotification] = useState("");

  const firstName = user?.name?.split(" ")[0] || "User";

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");
      return undefined;
    }

    const requestId = ++searchRequestRef.current;
    const timerId = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");

      const requests = [];
      if (hasPermission("products.view")) {
        requests.push({ type: "Product", path: "/app/products", request: api.get("/products", { params: { search: query, limit: 4, ...(branchId ? { branchId } : {}) } }) });
      }
      if (hasPermission("customers.view")) {
        requests.push({ type: "Customer", path: "/app/customers", request: api.get("/customers", { params: { search: query, status: "active", limit: 4, ...(branchId ? { branchId } : {}) } }) });
      }
      if (hasPermission("sales.view")) {
        requests.push({ type: "Sale", path: "/app/sales", request: api.get("/sales", { params: { search: query, limit: 4, ...(branchId ? { branchId } : {}) } }) });
      }
      if (hasPermission("payments.view")) {
        requests.push({ type: "Payment", path: "/app/payments", request: api.get("/payments", { params: { search: query, limit: 4 } }) });
      }

      const settled = await Promise.allSettled(requests.map((item) => item.request));
      if (requestId !== searchRequestRef.current) return;

      const results = [];
      let failedRequests = 0;
      settled.forEach((result, index) => {
        if (result.status !== "fulfilled") {
          failedRequests += 1;
          return;
        }

        const { type, path } = requests[index];
        const data = result.value?.data || {};
        const rows = data.products || data.customers || data.sales || data.payments || data.data?.products || data.data?.customers || [];
        rows.slice(0, 4).forEach((record) => {
          let title = "";
          let detail = "";
          if (type === "Product") {
            title = record.name || "Product";
            detail = record.sku ? `SKU ${record.sku}` : record.barcode ? `Barcode ${record.barcode}` : "Product";
          } else if (type === "Customer") {
            title = record.name || "Customer";
            detail = record.phone || record.email || "Customer";
          } else if (type === "Sale") {
            title = record.receiptNumber || record.invoiceNumber || record.saleNumber || "Sale";
            detail = `${record.customerId?.name || record.customerName || "Sale"} · ${formatSearchAmount(record.grandTotal ?? record.totalAmount ?? record.total ?? record.amount)}`;
          } else {
            title = record.reference || record.paymentReference || record.transactionId || "Payment";
            detail = `${record.paymentMethod || record.method || "Payment"} · ${formatSearchAmount(record.amount)}`;
          }

          results.push({
            key: `${type}-${record._id || results.length}`,
            type,
            title,
            detail,
            path,
          });
        });
      });

      setSearchResults(results.slice(0, 12));
      setSearchError(failedRequests === requests.length && requests.length > 0 ? "Search is temporarily unavailable. Try again." : "");
      setSearchLoading(false);
    }, 250);

    return () => {
      window.clearTimeout(timerId);
      searchRequestRef.current += 1;
    };
  }, [branchId, hasPermission, searchQuery]);

  const loadNotifications = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setNotificationsLoading(true);
    try {
      setNotificationError("");
      const response = await api.get("/notifications", {
        params: { limit: 30, ...(branchId ? { branchId } : {}) },
      });
      const data = response?.data;
      setNotifications(Array.isArray(data?.notifications) ? data.notifications : []);
      setUnreadCount(Number(data?.unreadCount) || 0);
    } catch (error) {
      setNotificationError(error?.response?.data?.message || "Unable to load notifications. Please try again.");
    } finally {
      if (!quiet) setNotificationsLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    loadNotifications({ quiet: true });
    const intervalId = window.setInterval(() => loadNotifications({ quiet: true }), 60_000);
    const handleFocus = () => loadNotifications({ quiet: true });
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!notificationsOpen && !profileOpen && !searchOpen) return undefined;
    const handlePointerDown = (event) => {
      if (!notificationPanelRef.current?.contains(event.target)) setNotificationsOpen(false);
      if (!profilePanelRef.current?.contains(event.target)) setProfileOpen(false);
      const insideSearch = desktopSearchRef.current?.contains(event.target) || mobileSearchRef.current?.contains(event.target);
      if (!insideSearch) {
        setSearchOpen(false);
        setMobileSearchOpen(false);
      }
    };
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
        setMobileSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [notificationsOpen, profileOpen, searchOpen]);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        const isMobile = window.matchMedia("(max-width: 767px)").matches;
        setSearchOpen(true);
        setMobileSearchOpen(isMobile);
        window.requestAnimationFrame(() => {
          (isMobile ? mobileSearchInputRef : desktopSearchInputRef).current?.focus();
        });
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const handleOpenNotifications = () => {
    const opening = !notificationsOpen;
    setNotificationsOpen(opening);
    if (opening) setProfileOpen(false);
    if (opening) {
      setSearchOpen(false);
      setMobileSearchOpen(false);
    }
    if (opening) loadNotifications();
  };

  const handleOpenProfile = () => {
    const opening = !profileOpen;
    setProfileOpen(opening);
    if (opening) {
      setNotificationsOpen(false);
      setSearchOpen(false);
      setMobileSearchOpen(false);
    }
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    try {
      await logout?.();
    } catch (error) {
      console.error("MOVA logout error:", error);
    }
    navigate("/login", { replace: true });
  };

  const handleMarkRead = async (notification) => {
    if (!notification?._id || notification.read) return;
    setUpdatingNotification(notification._id);
    try {
      await api.patch(`/notifications/${notification._id}/read`);
      setNotifications((current) => current.map((item) => (
        item._id === notification._id ? { ...item, read: true, readAt: new Date().toISOString() } : item
      )));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      setNotificationError(error?.response?.data?.message || "Unable to update this notification.");
    } finally {
      setUpdatingNotification("");
    }
  };

  const handleMarkAllRead = async () => {
    if (!unreadCount) return;
    setUpdatingNotification("all");
    try {
      await api.patch("/notifications/read-all", branchId ? { branchId } : {});
      setNotifications((current) => current.map((item) => ({ ...item, read: true })));
      setUnreadCount(0);
    } catch (error) {
      setNotificationError(error?.response?.data?.message || "Unable to mark notifications as read.");
    } finally {
      setUpdatingNotification("");
    }
  };

  const handleNotificationClick = async (notification) => {
    await handleMarkRead(notification);
    const path = getNotificationPath(notification?.link);
    setNotificationsOpen(false);
    if (path) navigate(path);
  };

  const handleSearchResultClick = (result) => {
    const path = `${result.path}?search=${encodeURIComponent(searchQuery.trim())}`;
    setSearchOpen(false);
    setMobileSearchOpen(false);
    navigate(path);
  };

  const searchContent = searchLoading ? (
    <p className="px-4 py-8 text-center text-sm text-slate-500">Searching your business…</p>
  ) : searchError ? (
    <p role="alert" className="px-4 py-8 text-center text-sm text-rose-600">{searchError}</p>
  ) : searchQuery.trim().length < 2 ? (
    <p className="px-4 py-8 text-center text-sm text-slate-500">Type at least 2 characters to search products, customers, sales, and payments.</p>
  ) : searchResults.length === 0 ? (
    <p className="px-4 py-8 text-center text-sm text-slate-500">No matching records found.</p>
  ) : (
    <div className="max-h-[min(60vh,28rem)] overflow-y-auto py-1">
      {searchResults.map((result) => (
        <button key={result.key} type="button" onClick={() => handleSearchResultClick(result)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-900">{result.title}</span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">{result.detail}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{result.type}<ArrowUpRight size={13} /></span>
        </button>
      ))}
    </div>
  );

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onMenuClick} className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
          <Menu size={22} />
        </button>
        <div ref={desktopSearchRef} className="relative hidden md:block">
          <div className="flex h-11 w-[min(30rem,40vw)] items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-slate-400 transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100">
            <Search size={18} className="shrink-0" />
            <input
              ref={desktopSearchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => { setSearchOpen(true); setMobileSearchOpen(false); }}
              placeholder="Search products, customers, sales..."
              aria-label="Search your business"
              aria-expanded={searchOpen}
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
            {searchQuery && <button type="button" onClick={() => { setSearchQuery(""); desktopSearchInputRef.current?.focus(); }} className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Clear search"><X size={15} /></button>}
            <kbd className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-400">Ctrl K</kbd>
          </div>
          {searchOpen && <section role="dialog" aria-label="Search results" className="absolute left-0 top-full z-50 mt-2 w-[min(34rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Search results</div>
            {searchContent}
          </section>}
        </div>

        <div ref={mobileSearchRef} className="relative md:hidden">
          <button type="button" onClick={() => {
            setSearchOpen(true);
            setMobileSearchOpen(true);
            setNotificationsOpen(false);
            setProfileOpen(false);
            window.requestAnimationFrame(() => mobileSearchInputRef.current?.focus());
          }} className={`rounded-xl p-2.5 transition hover:bg-slate-100 ${mobileSearchOpen ? "bg-slate-100 text-slate-900" : "text-slate-500"}`} aria-label="Open search" aria-expanded={mobileSearchOpen}>
            <Search size={20} />
          </button>
          {mobileSearchOpen && <section role="dialog" aria-label="Search your business" className="fixed left-3 right-3 top-[4.5rem] z-[60] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <Search size={18} className="shrink-0 text-slate-400" />
              <input ref={mobileSearchInputRef} type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search products, customers, sales..." aria-label="Search your business" className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400" />
              <button type="button" onClick={() => { setMobileSearchOpen(false); setSearchOpen(false); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close search"><X size={18} /></button>
            </div>
            {searchContent}
          </section>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative" ref={notificationPanelRef}>
          <button
            type="button"
            onClick={handleOpenNotifications}
            className={`relative rounded-xl p-2.5 transition hover:bg-slate-100 ${notificationsOpen ? "bg-slate-100 text-slate-900" : "text-slate-500"}`}
            aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
            aria-expanded={notificationsOpen}
            aria-haspopup="dialog"
          >
            <Bell size={20} />
            {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
          </button>

          {notificationsOpen && (
            <section role="dialog" aria-label="Notifications" className="absolute right-0 top-full z-50 mt-3 flex max-h-[min(75vh,36rem)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-96">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Notifications</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{unreadCount ? `${unreadCount} unread` : "You're all caught up"}</p>
                </div>
                <button type="button" onClick={handleMarkAllRead} disabled={!unreadCount || updatingNotification === "all"} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent">
                  <CheckCheck size={15} /> Mark all read
                </button>
              </div>

              {notificationError && <div role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-2.5 text-xs text-rose-700">{notificationError}<button type="button" onClick={() => loadNotifications()} className="ml-2 font-bold underline">Retry</button></div>}

              <div className="overflow-y-auto">
                {notificationsLoading && notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-500">Loading notifications...</p>
                ) : notifications.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <Bell size={22} className="mx-auto text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">No notifications yet</p>
                    <p className="mt-1 text-xs text-slate-500">Updates for your business will appear here.</p>
                  </div>
                ) : notifications.map((notification) => (
                  <button type="button" key={notification._id} onClick={() => handleNotificationClick(notification)} disabled={updatingNotification === notification._id} className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 disabled:opacity-60 ${notification.read ? "bg-white" : "bg-blue-50/50"}`}>
                    <span className={`mt-1 shrink-0 ${notification.read ? "text-slate-300" : "text-blue-600"}`}>
                      {notification.read ? <Bell size={17} /> : <Circle size={9} fill="currentColor" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-900">{notification.title}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-600">{notification.message}</span>
                      <span className="mt-1.5 block text-[11px] text-slate-400">{formatNotificationTime(notification.createdAt)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="hidden h-8 w-px bg-slate-200 sm:block" />
        <div className="relative flex items-center gap-3" ref={profilePanelRef}>
          <div className="hidden text-right sm:block">
            <p className="text-sm font-bold text-slate-900">{firstName}</p>
            <p className="text-xs text-slate-400">{business?.name || "MOVA Business"}</p>
          </div>
          <button
            type="button"
            onClick={handleOpenProfile}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition ${profileOpen ? "bg-blue-100 text-blue-700" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}
            aria-label="Open user profile menu"
            aria-expanded={profileOpen}
            aria-haspopup="dialog"
          >
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={`${user?.name || "User"} profile`}
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <UserCircle size={24} />
            )}
          </button>

          {profileOpen && (
            <section role="dialog" aria-label="User profile" className="absolute right-0 top-full z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Signed in</p>
                <p className="mt-1 truncate text-base font-bold text-slate-900">{user?.name || "MOVA User"}</p>
                {user?.email && <p className="mt-1 truncate text-sm text-slate-500">{user.email}</p>}
              </div>
              <div className="space-y-3 px-4 py-4 text-sm">
                <div className="flex items-center gap-3 text-slate-600">
                  <ShieldCheck size={17} className="shrink-0 text-slate-400" />
                  <span className="capitalize">{String(user?.role || "User").replaceAll("_", " ").toLowerCase()}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Building2 size={17} className="shrink-0 text-slate-400" />
                  <span className="truncate">{business?.name || "MOVA Business"}{activeBranch?.name ? ` · ${activeBranch.name}` : ""}</span>
                </div>
                {user?.phone && <div className="flex items-center gap-3 text-slate-600"><Phone size={17} className="shrink-0 text-slate-400" /><span>{user.phone}</span></div>}
              </div>
              <div className="border-t border-slate-100 p-2">
                <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50">
                  <LogOut size={17} /> Log out
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
