/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const processes = app.findCollectionByNameOrId("processes");
    const clients = app.findCollectionByNameOrId("clients");
    const pendencias = app.findCollectionByNameOrId("pendencias");
    const appointments = app.findCollectionByNameOrId("appointments");
    const financial = app.findCollectionByNameOrId("financial");
    const notifications = app.findCollectionByNameOrId("notifications");

    const addField = (col, field) => {
      if (!col.fields.getByName(field.name)) {
        col.fields.add(field);
        return true;
      }
      return false;
    };

    // --- processes: código, valor da causa, foro/comarca/vara, responsável, SLA ---
    let changed = false;
    changed = addField(processes, new TextField({ name: "code", max: 40 })) || changed;
    changed = addField(processes, new NumberField({ name: "value_cause" })) || changed;
    changed = addField(processes, new TextField({ name: "foro", max: 120 })) || changed;
    changed = addField(processes, new TextField({ name: "comarca", max: 120 })) || changed;
    changed = addField(processes, new TextField({ name: "vara", max: 120 })) || changed;
    changed = addField(processes, new TextField({ name: "services", max: 0 })) || changed;
    changed = addField(processes, new NumberField({ name: "sla_days" })) || changed;
    changed = addField(
      processes,
      new RelationField({ name: "responsible", maxSelect: 1, collectionId: users.id, cascadeDelete: false }),
    ) || changed;
    if (changed) app.save(processes);

    // --- pendencias: prioridade, responsável ---
    let pc = false;
    pc = addField(
      pendencias,
      new SelectField({ name: "priority", maxSelect: 1, values: ["urgente", "alta", "normal", "baixa"] }),
    ) || pc;
    pc = addField(
      pendencias,
      new RelationField({ name: "responsible", maxSelect: 1, collectionId: users.id, cascadeDelete: false }),
    ) || pc;
    if (pc) app.save(pendencias);

    // --- appointments: categoria, link da sala, sync gcal, autorizado ao cliente ---
    let ac = false;
    ac = addField(
      appointments,
      new SelectField({
        name: "category",
        maxSelect: 1,
        values: ["audiencia", "reuniao", "diligencia", "prazo", "pericia"],
      }),
    ) || ac;
    ac = addField(appointments, new TextField({ name: "meet_link", max: 500 })) || ac;
    ac = addField(appointments, new BoolField({ name: "sync_gcal" })) || ac;
    ac = addField(appointments, new BoolField({ name: "authorized_client" })) || ac;
    if (ac) app.save(appointments);

    // --- financial: vínculo ao processo, tipo (honorario/despesa), categoria ---
    let fc = false;
    fc = addField(
      financial,
      new RelationField({ name: "process", maxSelect: 1, collectionId: processes.id, cascadeDelete: false }),
    ) || fc;
    fc = addField(
      financial,
      new SelectField({ name: "type", maxSelect: 1, values: ["honorario", "despesa", "custas"] }),
    ) || fc;
    fc = addField(financial, new TextField({ name: "category", max: 80 })) || fc;
    if (fc) app.save(financial);

    // --- notifications: adiar até ---
    let nc = false;
    nc = addField(notifications, new DateField({ name: "snooze_until" })) || nc;
    if (nc) app.save(notifications);

    // --- time_entries: apontamentos do cronômetro ---
    try {
      app.findCollectionByNameOrId("time_entries");
    } catch (_) {
      app.save(
        new Collection({
          type: "base",
          name: "time_entries",
          listRule: "@request.auth.collectionName = 'users'",
          viewRule: "@request.auth.collectionName = 'users'",
          createRule: "@request.auth.collectionName = 'users'",
          updateRule: "@request.auth.collectionName = 'users'",
          deleteRule: "@request.auth.collectionName = 'users'",
          fields: [
            { name: "process", type: "relation", maxSelect: 1, collectionId: processes.id, cascadeDelete: false },
            { name: "pendencia", type: "relation", maxSelect: 1, collectionId: pendencias.id, cascadeDelete: false },
            { name: "user", type: "relation", maxSelect: 1, collectionId: users.id, cascadeDelete: false },
            { name: "description", type: "text", max: 200 },
            { name: "seconds", type: "number", required: true },
            { name: "billable", type: "bool" },
            { name: "date", type: "date" },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
            { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
          ],
          indexes: ["CREATE INDEX idx_time_entries_process ON time_entries (process)"],
        }),
      );
    }

    // --- case_notes: atendimentos, pareceres, mural interno do caso ---
    try {
      app.findCollectionByNameOrId("case_notes");
    } catch (_) {
      app.save(
        new Collection({
          type: "base",
          name: "case_notes",
          listRule: "@request.auth.collectionName = 'users'",
          viewRule: "@request.auth.collectionName = 'users'",
          createRule: "@request.auth.collectionName = 'users'",
          updateRule: "@request.auth.collectionName = 'users'",
          deleteRule: "@request.auth.collectionName = 'users'",
          fields: [
            { name: "process", type: "relation", required: true, maxSelect: 1, collectionId: processes.id, cascadeDelete: true },
            { name: "author", type: "relation", maxSelect: 1, collectionId: users.id, cascadeDelete: false },
            { name: "kind", type: "select", maxSelect: 1, values: ["atendimento", "parecer", "mural"] },
            { name: "title", type: "text", max: 200 },
            { name: "body", type: "text" },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
            { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
          ],
          indexes: ["CREATE INDEX idx_case_notes_process ON case_notes (process)"],
        }),
      );
    }

    // --- djen_publications: publicações do diário para revisão humana ---
    try {
      app.findCollectionByNameOrId("djen_publications");
    } catch (_) {
      app.save(
        new Collection({
          type: "base",
          name: "djen_publications",
          listRule: "@request.auth.collectionName = 'users'",
          viewRule: "@request.auth.collectionName = 'users'",
          createRule: "@request.auth.collectionName = 'users'",
          updateRule: "@request.auth.collectionName = 'users'",
          deleteRule: "@request.auth.collectionName = 'users'",
          fields: [
            { name: "process", type: "relation", maxSelect: 1, collectionId: processes.id, cascadeDelete: false },
            { name: "number", type: "text", max: 60 },
            { name: "parties", type: "text", max: 0 },
            { name: "court", type: "text", max: 120 },
            { name: "published_at", type: "date" },
            { name: "summary", type: "text" },
            { name: "raw", type: "text" },
            { name: "status", type: "select", maxSelect: 1, values: ["pendente", "associado", "ignorado"] },
            { name: "deadline", type: "date" },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
            { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
          ],
          indexes: ["CREATE INDEX idx_djen_status ON djen_publications (status)"],
        }),
      );
    }

    // backfill processes.code for existing rows without a code
    try {
      const all = app.findAllRecords(processes);
      let seq = 1;
      const year = new Date().getFullYear();
      all.forEach((r) => {
        if (!r.getString("code")) {
          r.set("code", `PRC-${year}-${String(seq).padStart(4, "0")}`);
          seq += 1;
          app.save(r);
        }
      });
    } catch (_) {}

    // backfill pendencias.priority = normal
    try {
      app.findAllRecords(pendencias).forEach((r) => {
        if (!r.getString("priority")) {
          r.set("priority", "normal");
          app.save(r);
        }
      });
    } catch (_) {}
  },
  (app) => {
    ["djen_publications", "case_notes", "time_entries"].forEach((name) => {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (e) {
        if (!String(e).includes("no rows")) throw e;
      }
    });
    const removeField = (colName, fieldName) => {
      try {
        const col = app.findCollectionByNameOrId(colName);
        const f = col.fields.getByName(fieldName);
        if (f) {
          col.fields.remove(f);
          app.save(col);
        }
      } catch (_) {}
    };
    ["code", "value_cause", "foro", "comarca", "vara", "services", "sla_days", "responsible"].forEach((f) =>
      removeField("processes", f),
    );
    ["priority", "responsible"].forEach((f) => removeField("pendencias", f));
    ["category", "meet_link", "sync_gcal", "authorized_client"].forEach((f) => removeField("appointments", f));
    ["process", "type", "category"].forEach((f) => removeField("financial", f));
    removeField("notifications", "snooze_until");
  },
);
