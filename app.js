(function () {
  document.getElementById("year").textContent = new Date().getFullYear();

  const cfg = window.SITE_CONFIG || {};
  const form = document.getElementById("gb-form");
  const list = document.getElementById("gb-list");
  const status = document.getElementById("gb-status");

  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_KEY) {
    status.textContent = "Guestbook is not connected yet.";
    form.querySelector("button").disabled = true;
    return;
  }

  const endpoint = cfg.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/guestbook";
  const headers = { apikey: cfg.SUPABASE_KEY, "Content-Type": "application/json" };

  function render(rows) {
    list.replaceChildren();
    if (!rows.length) {
      const li = document.createElement("li");
      li.className = "muted";
      li.textContent = "No notes yet. Be the first.";
      list.append(li);
      return;
    }
    for (const r of rows) {
      const li = document.createElement("li");
      const who = document.createElement("span");
      who.className = "who";
      who.textContent = r.name;
      const time = document.createElement("time");
      time.dateTime = r.created_at;
      time.textContent = new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
      const p = document.createElement("p");
      p.textContent = r.message;
      li.append(who, time, p);
      list.append(li);
    }
  }

  async function load() {
    try {
      const res = await fetch(endpoint + "?select=name,message,created_at&order=created_at.desc&limit=50", { headers });
      if (!res.ok) throw new Error(res.status);
      render(await res.json());
    } catch (e) {
      status.textContent = "Couldn't load notes right now.";
    }
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const data = new FormData(form);
    if (data.get("website")) return; // bot filled the honeypot
    const name = String(data.get("name") || "").trim();
    const message = String(data.get("message") || "").trim();
    if (!name || !message) return;

    const btn = form.querySelector("button");
    btn.disabled = true;
    status.textContent = "Saving…";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { ...headers, Prefer: "return=minimal" },
        body: JSON.stringify({ name, message }),
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      status.textContent = "Thanks — your note is up.";
      await load();
    } catch (e) {
      status.textContent = "Something went wrong. Please try again.";
    } finally {
      btn.disabled = false;
    }
  });

  load();
})();
