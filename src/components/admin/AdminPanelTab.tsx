function ThankUsersButton() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string|null>(null);

  const handleThank = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/broadcast-special-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "thank" })
      });
      const data = await res.json();
      if (res.ok) {
        setResult("Thank you email sent to all users!");
      } else {
        setResult(data.error || "Failed to send thank you email.");
      }
    } catch (err) {
      setResult("Failed to send thank you email.");
    }
    setSending(false);
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleThank}
        className="bg-green-600 text-white px-6 py-2 rounded font-semibold disabled:opacity-60"
        disabled={sending}
      >
        {sending ? "Sending..." : "Thank Users & Ask to Share"}
      </button>
      {result && <div className="mt-2 text-sm">{result}</div>}
    </div>
  );
}

function BugReportButton() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string|null>(null);

  const handleBug = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/broadcast-special-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "bug" })
      });
      const data = await res.json();
      if (res.ok) {
        setResult("Bug report email sent to all users!");
      } else {
        setResult(data.error || "Failed to send bug report email.");
      }
    } catch (err) {
      setResult("Failed to send bug report email.");
    }
    setSending(false);
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleBug}
        className="bg-yellow-600 text-white px-6 py-2 rounded font-semibold disabled:opacity-60"
        disabled={sending}
      >
        {sending ? "Sending..." : "Ask Users About Bugs"}
      </button>
      {result && <div className="mt-2 text-sm">{result}</div>}
    </div>
  );
}
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";

const ADMIN_EMAILS = [
  "rikardo_balaj@universitetipolis.edu.al",
  "firdeus_kasaj@universitetipolis.edu.al"
];

function BroadcastEmailForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string|null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/broadcast-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message })
      });
      const data = await res.json();
      if (res.ok) {
        setResult("Email sent to all users!");
        setSubject("");
        setMessage("");
      } else {
        setResult(data.error || "Failed to send email.");
      }
    } catch (err) {
      setResult("Failed to send email.");
    }
    setSending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <label className="block font-medium mb-1">Subject</label>
        <input
          className="border rounded px-3 py-2 w-full"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block font-medium mb-1">Message</label>
        <textarea
          className="border rounded px-3 py-2 w-full min-h-[100px]"
          value={message}
          onChange={e => setMessage(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        className="bg-orange-500 text-white px-6 py-2 rounded font-semibold disabled:opacity-60"
        disabled={sending}
      >
        {sending ? "Sending..." : "Send to All Users"}
      </button>
      {result && <div className="mt-2 text-sm">{result}</div>}
    </form>
  );
}

function RemindIncompleteProfilesButton() {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string|null>(null);

  const handleRemind = async () => {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/remind-incomplete-profiles", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setResult("Reminder email sent to all users with incomplete profiles!");
      } else {
        setResult(data.error || "Failed to send reminder email.");
      }
    } catch (err) {
      setResult("Failed to send reminder email.");
    }
    setSending(false);
  };

  return (
    <div className="mt-6">
      <button
        onClick={handleRemind}
        className="bg-blue-500 text-white px-6 py-2 rounded font-semibold disabled:opacity-60"
        disabled={sending}
      >
        {sending ? "Sending reminders..." : "Remind Incomplete Profiles"}
      </button>
      {result && <div className="mt-2 text-sm">{result}</div>}
    </div>
  );
}

export default function AdminPanelTab() {
  const { user, loading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [userStats, setUserStats] = useState({ total: 0, active: 0 });
  const [fetchingStats, setFetchingStats] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user || !ADMIN_EMAILS.includes(user.email)) {
        setAuthorized(false);
      } else {
        setAuthorized(true);
      }
    }
  }, [user, loading]);

  useEffect(() => {
    const fetchStats = async () => {
      setFetchingStats(true);
      const usersSnap = await getDocs(collection(db, "users"));
      let total = 0;
      let active = 0;
      const now = Date.now();
      const THIRTY_MINUTES = 30 * 60 * 1000;
      usersSnap.forEach(doc => {
        total++;
        const data = doc.data();
        if (data.lastSeen && data.lastSeen.toDate) {
          const lastSeen = data.lastSeen.toDate().getTime();
          if (now - lastSeen <= THIRTY_MINUTES) active++;
        }
      });
      setUserStats({ total, active });
      setFetchingStats(false);
    };
    if (authorized) fetchStats();
  }, [authorized]);

  if (!authorized) return <div className="p-8">You are not authorized to view this panel.</div>;

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">User Statistics</h2>
        {fetchingStats ? (
          <p>Loading...</p>
        ) : (
          <table className="min-w-[300px] border border-gray-300">
            <thead>
              <tr>
                <th className="border px-4 py-2">Total Users</th>
                <th className="border px-4 py-2">Active Users</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-4 py-2 text-center">{userStats.total}</td>
                <td className="border px-4 py-2 text-center">{userStats.active}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Send Email to All Users</h2>
        <BroadcastEmailForm />
        <RemindIncompleteProfilesButton />
        <ThankUsersButton />
        <BugReportButton />
      </div>
    </main>
  );
}
