/// <reference path="../pb_data/types.d.ts" />

// Per-user OAB registration + strict record-level visibility.
// - Adds oab_number / oab_uf to users (per-user OAB for search & subscription).
// - Adds `responsible` (relation to users) to financial, ledger, appointments.
// - Tightens access rules: only the master administrator (role = 'owner') sees
//   all records; every other user sees only records where they are the
//   responsible/owner. Client portal access to own records is preserved.
// Existing records without `responsible` remain visible only to the owner.

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    // --- users: OAB fields ---
    {
      const u = users;
      if (!u.fields.getByName("oab_number")) {
        u.fields.add(new TextField({ name: "oab_number", max: 20 }));
      }
      if (!u.fields.getByName("oab_uf")) {
        u.fields.add(new TextField({ name: "oab_uf", max: 2 }));
      }
      app.save(u);
    }

    // helper to add a responsible relation field idempotently
    const addResponsible = (colName) => {
      const c = app.findCollectionByNameOrId(colName);
      if (!c.fields.getByName("responsible")) {
        c.fields.add(
          new RelationField({
            name: "responsible",
            maxSelect: 1,
            collectionId: users.id,
          }),
        );
        app.save(c);
      }
    };
    ["financial", "ledger", "appointments"].forEach(addResponsible);

    // Rule builders ---------------------------------------------------------
    const owner = "@request.auth.role = 'owner'";
    const user = "@request.auth.collectionName = 'users'";
    const client = "@request.auth.collectionName = 'clients'";

    const setRules = (colName, { list, view, create, update, del }) => {
      const c = app.findCollectionByNameOrId(colName);
      c.listRule = list;
      c.viewRule = view;
      c.createRule = create;
      c.updateRule = update;
      c.deleteRule = del;
      app.save(c);
    };

    // processes: owner sees all; user sees own (responsible); client sees own
    const procSee = `(${user} && (${owner} || responsible = @request.auth.id)) || (${client} && @request.auth.id = client)`;
    setRules("processes", {
      list: procSee,
      view: procSee,
      create: user,
      update: `${user} && (${owner} || responsible = @request.auth.id)`,
      del: `${user} && (${owner} || responsible = @request.auth.id)`,
    });

    // pendencias: own responsible; client via process.client + visible
    const pendSee = `(${user} && (${owner} || responsible = @request.auth.id)) || (${client} && process.client = @request.auth.id && visible = true)`;
    setRules("pendencias", {
      list: pendSee,
      view: pendSee,
      create: user,
      update: `${user} && (${owner} || responsible = @request.auth.id)`,
      del: `${user} && (${owner} || responsible = @request.auth.id)`,
    });

    // financial: own responsible; client sees own visible
    const finSee = `(${user} && (${owner} || responsible = @request.auth.id)) || (${client} && @request.auth.id = client && visible = true)`;
    setRules("financial", {
      list: finSee,
      view: finSee,
      create: user,
      update: `${user} && (${owner} || responsible = @request.auth.id)`,
      del: `${user} && (${owner} || responsible = @request.auth.id)`,
    });

    // ledger: office/personal books — own responsible only (owner sees all)
    const ledSee = `${user} && (${owner} || responsible = @request.auth.id)`;
    setRules("ledger", {
      list: ledSee,
      view: ledSee,
      create: user,
      update: `${user} && (${owner} || responsible = @request.auth.id)`,
      del: `${user} && (${owner} || responsible = @request.auth.id)`,
    });

    // appointments: own responsible; client sees own visible
    setRules("appointments", {
      list: finSee,
      view: finSee,
      create: user,
      update: `${user} && (${owner} || responsible = @request.auth.id)`,
      del: `${user} && (${owner} || responsible = @request.auth.id)`,
    });

    // documents / events: traverse process.responsible; client via process.client + visible
    const docSee = `(${user} && (${owner} || process.responsible = @request.auth.id)) || (${client} && process.client = @request.auth.id && visible = true)`;
    setRules("documents", {
      list: docSee,
      view: docSee,
      create: `${user} || (${client} && process.client = @request.auth.id)`,
      update: `${user} && (${owner} || process.responsible = @request.auth.id)`,
      del: `${user} && (${owner} || process.responsible = @request.auth.id)`,
    });
    setRules("events", {
      list: docSee,
      view: docSee,
      create: user,
      update: `${user} && (${owner} || process.responsible = @request.auth.id)`,
      del: `${user} && (${owner} || process.responsible = @request.auth.id)`,
    });

    // subtasks: traverse pendencia.process.responsible
    const subSee = `(${user} && (${owner} || pendencia.process.responsible = @request.auth.id)) || (${client} && pendencia.process.client = @request.auth.id && pendencia.visible = true)`;
    setRules("subtasks", {
      list: subSee,
      view: subSee,
      create: user,
      update: `${user} && (${owner} || pendencia.process.responsible = @request.auth.id)`,
      del: `${user} && (${owner} || pendencia.process.responsible = @request.auth.id)`,
    });

    // time_entries: own user field
    const timeSee = `${user} && (${owner} || user = @request.auth.id)`;
    setRules("time_entries", {
      list: timeSee,
      view: timeSee,
      create: user,
      update: `${user} && (${owner} || user = @request.auth.id)`,
      del: `${user} && (${owner} || user = @request.auth.id)`,
    });

    // case_movements / case_hearings / case_notes: traverse process.responsible (reads)
    const caseSee = `${user} && (${owner} || process.responsible = @request.auth.id)`;
    setRules("case_movements", {
      list: caseSee,
      view: caseSee,
      create: user,
      update: user,
      del: user,
    });
    setRules("case_hearings", {
      list: caseSee,
      view: caseSee,
      create: user,
      update: user,
      del: user,
    });
    setRules("case_notes", {
      list: caseSee,
      view: caseSee,
      create: user,
      update: user,
      del: user,
    });

    // deadlines: own responsible_user
    const dlSee = `${user} && (${owner} || responsible_user = @request.auth.id)`;
    setRules("deadlines", {
      list: dlSee,
      view: dlSee,
      create: user,
      update: user,
      del: user,
    });

    // audit_logs & lgpd_logs: master administrator (owner) only
    const ownerOnly = "@request.auth.collectionName = 'users' && @request.auth.role = 'owner'";
    setRules("audit_logs", {
      list: ownerOnly,
      view: ownerOnly,
      create: user,
      update: null,
      del: null,
    });
    setRules("lgpd_logs", {
      list: ownerOnly,
      view: ownerOnly,
      create: null,
      update: null,
      del: null,
    });
  },
  (app) => {
    // Best-effort revert: restore the previous broad rules and drop added fields.
    const user = "@request.auth.collectionName = 'users'";
    const restoreAll = (colName, clientSee) => {
      try {
        const c = app.findCollectionByNameOrId(colName);
        c.listRule = clientSee || user;
        c.viewRule = clientSee || user;
        c.createRule = user;
        c.updateRule = user;
        c.deleteRule = user;
        app.save(c);
      } catch (_) {}
    };
    [
      "processes",
      "pendencias",
      "financial",
      "ledger",
      "appointments",
      "documents",
      "events",
      "subtasks",
      "time_entries",
      "case_movements",
      "case_hearings",
      "case_notes",
      "deadlines",
    ].forEach((n) => restoreAll(n));
    restoreAll("audit_logs");
    restoreAll("lgpd_logs");

    ["financial", "ledger", "appointments"].forEach((n) => {
      try {
        const c = app.findCollectionByNameOrId(n);
        c.fields.removeByName("responsible");
        app.save(c);
      } catch (_) {}
    });
    try {
      const u = app.findCollectionByNameOrId("users");
      u.fields.removeByName("oab_number");
      u.fields.removeByName("oab_uf");
      app.save(u);
    } catch (_) {}
  },
);
