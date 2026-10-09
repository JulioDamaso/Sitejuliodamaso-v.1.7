/// <reference path="../pb_data/types.d.ts" />

// Auto-assign the responsible user on create so per-user visibility works
// without requiring every frontend create call to set it explicitly.
// Each handler is self-contained (JSVM isolates handler scope).

// Collections that use a `responsible` relation field.
onRecordCreateRequest((e) => {
  const map = {
    processes: "responsible",
    pendencias: "responsible",
    financial: "responsible",
    ledger: "responsible",
    appointments: "responsible",
  };
  const field = map[e.record.collection().name];
  if (field) {
    const auth = e.requestInfo.auth;
    if (auth && auth.collection().name === "users") {
      const cur = e.record.get(field);
      if (!cur || (Array.isArray(cur) && cur.length === 0)) {
        e.record.set(field, auth.id);
      }
    }
  }
  e.next();
});

// time_entries uses `user`; deadlines uses `responsible_user`; case_notes uses `author`.
onRecordCreateRequest((e) => {
  const map = {
    time_entries: "user",
    deadlines: "responsible_user",
    case_notes: "author",
  };
  const field = map[e.record.collection().name];
  if (field) {
    const auth = e.requestInfo.auth;
    if (auth && auth.collection().name === "users") {
      const cur = e.record.get(field);
      if (!cur || (Array.isArray(cur) && cur.length === 0)) {
        e.record.set(field, auth.id);
      }
    }
  }
  e.next();
});
