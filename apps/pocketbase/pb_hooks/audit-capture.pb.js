/// <reference path="../pb_data/types.d.ts" />

// Captura alterações (create/update/delete) nas coleções principais e grava
// em audit_logs com snapshot antes/depois. Falhas de log nunca abortam a
// operação original.
//
// IMPORTANT: PocketBase recompiles each hook handler in an isolated JSVM
// scope, so a handler CANNOT reference any variable/function declared in the
// file's outer scope. The previous version referenced `name`, `authOf`,
// `writeAudit`, `snapshot` and `beforeCache` from the outer scope and threw
// "ReferenceError: name/authOf is not defined", aborting EVERY write on
// audited collections (funnels, processes, events, pendencias, financial…).
//
// Design:
//   - The forEach loop only provides the collection name as the 2nd argument
//     to onRecord*(handler, name). That 2nd arg is evaluated at load time in
//     the outer VM, so per-collection scoping works.
//   - Every handler BODY is fully self-contained: helpers (snapshot/authOf/
//     writeAudit) are redeclared inside each handler, and the collection name
//     is read from `e.record.collectionName` at runtime — no outer references.

var AUDITED = [
  "posts", "clients", "processes", "events", "documents", "pendencias",
  "appointments", "financial", "ledger", "funnels", "funnel_stages",
  "bio_links", "users", "notifications", "site_settings", "subtasks",
  "time_entries", "case_notes", "djen_publications",
];

AUDITED.forEach(function (COL) {
  onRecordAfterCreateSuccess(function (e) {
    function snapshot(r) {
      if (!r) return "";
      try {
        var o = r.export();
        try { delete o.password; } catch (_) {}
        try { delete o.tokenKey; } catch (_) {}
        return JSON.stringify(o);
      } catch (_) {
        try { return JSON.stringify(String(r)); } catch (__) { return ""; }
      }
    }
    function authOf(ev) {
      try { return (ev.requestInfo && ev.requestInfo.auth) || null; } catch (_) { return null; }
    }
    function writeAudit(auth, action, collection, recordId, before, after) {
      try {
        var c = $app.findCollectionByNameOrId("audit_logs");
        var rec = new Record(c);
        if (auth) { try { rec.set("actor", auth.id); } catch (_) {} }
        rec.set("action", action);
        rec.set("collection", collection);
        rec.set("record_id", String(recordId || "").slice(0, 40));
        rec.set("before", before || "");
        rec.set("after", after || "");
        $app.save(rec);
      } catch (err) {
        try { $app.logger().error("audit log failed", "err", String(err)); } catch (_) {}
      }
    }
    try {
      writeAudit(authOf(e), "create", e.record.collection().name, e.record.id, "", snapshot(e.record));
    } catch (_) {}
    e.next();
  }, COL);

  onRecordUpdateRequest(function (e) {
    function snapshot(r) {
      if (!r) return "";
      try {
        var o = r.export();
        try { delete o.password; } catch (_) {}
        try { delete o.tokenKey; } catch (_) {}
        return JSON.stringify(o);
      } catch (_) {
        try { return JSON.stringify(String(r)); } catch (__) { return ""; }
      }
    }
    // Stash the "before" snapshot on the record's transient customData so the
    // after-success handler can build a before/after diff. customData is not
    // persisted to the DB and does not interfere with the save.
    try {
      var old = $app.findRecordById(e.record.collection().name, e.record.id);
      e.record.withCustomData(true);
      e.record.set("__audit_before", snapshot(old));
    } catch (_) {}
    e.next();
  }, COL);

  onRecordAfterUpdateSuccess(function (e) {
    function snapshot(r) {
      if (!r) return "";
      try {
        var o = r.export();
        try { delete o.password; } catch (_) {}
        try { delete o.tokenKey; } catch (_) {}
        return JSON.stringify(o);
      } catch (_) {
        try { return JSON.stringify(String(r)); } catch (__) { return ""; }
      }
    }
    function authOf(ev) {
      try { return (ev.requestInfo && ev.requestInfo.auth) || null; } catch (_) { return null; }
    }
    function writeAudit(auth, action, collection, recordId, before, after) {
      try {
        var c = $app.findCollectionByNameOrId("audit_logs");
        var rec = new Record(c);
        if (auth) { try { rec.set("actor", auth.id); } catch (_) {} }
        rec.set("action", action);
        rec.set("collection", collection);
        rec.set("record_id", String(recordId || "").slice(0, 40));
        rec.set("before", before || "");
        rec.set("after", after || "");
        $app.save(rec);
      } catch (err) {
        try { $app.logger().error("audit log failed", "err", String(err)); } catch (_) {}
      }
    }
    var before = "";
    try { before = e.record.get("__audit_before") || ""; } catch (_) {}
    try {
      writeAudit(authOf(e), "update", e.record.collection().name, e.record.id, before, snapshot(e.record));
    } catch (_) {}
    e.next();
  }, COL);

  onRecordAfterDeleteSuccess(function (e) {
    function snapshot(r) {
      if (!r) return "";
      try {
        var o = r.export();
        try { delete o.password; } catch (_) {}
        try { delete o.tokenKey; } catch (_) {}
        return JSON.stringify(o);
      } catch (_) {
        try { return JSON.stringify(String(r)); } catch (__) { return ""; }
      }
    }
    function authOf(ev) {
      try { return (ev.requestInfo && ev.requestInfo.auth) || null; } catch (_) { return null; }
    }
    function writeAudit(auth, action, collection, recordId, before, after) {
      try {
        var c = $app.findCollectionByNameOrId("audit_logs");
        var rec = new Record(c);
        if (auth) { try { rec.set("actor", auth.id); } catch (_) {} }
        rec.set("action", action);
        rec.set("collection", collection);
        rec.set("record_id", String(recordId || "").slice(0, 40));
        rec.set("before", before || "");
        rec.set("after", after || "");
        $app.save(rec);
      } catch (err) {
        try { $app.logger().error("audit log failed", "err", String(err)); } catch (_) {}
      }
    }
    // The record object still holds its (now-deleted) data — use it as "before".
    try {
      writeAudit(authOf(e), "delete", e.record.collection().name, e.record.id, snapshot(e.record), "");
    } catch (_) {}
    e.next();
  }, COL);
});
