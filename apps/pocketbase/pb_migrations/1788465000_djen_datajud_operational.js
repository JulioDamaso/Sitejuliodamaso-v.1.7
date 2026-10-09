/// <reference path="../pb_data/types.d.ts" />

// DJEN/DataJud operacional:
// - transforma djen_publications em inbox por usuário com rascunho de prazo;
// - guarda feriados locais/tribunal para cálculo auditável;
// - permite rastrear importações DataJud nos eventos;
// - vincula prazo confirmado da publicação à agenda.

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const processes = app.findCollectionByNameOrId("processes");
    const events = app.findCollectionByNameOrId("events");
    const appointments = app.findCollectionByNameOrId("appointments");
    const djen = app.findCollectionByNameOrId("djen_publications");

    const add = (collection, field) => {
      if (!collection.fields.getByName(field.name)) collection.fields.add(field);
    };

    // Processos: metadados oficiais importados sem sobrescrever dados humanos.
    add(processes, new TextField({ name: "tribunal", max: 40 }));
    add(processes, new TextField({ name: "parties", max: 0 }));
    add(processes, new DateField({ name: "datajud_synced_at" }));
    app.save(processes);

    // Eventos: origem + chave externa para deduplicar até 500 movimentações DataJud.
    add(events, new TextField({ name: "source", max: 40 }));
    add(events, new TextField({ name: "external_id", max: 80 }));
    events.indexes = events.indexes || [];
    if (!events.indexes.some((i) => String(i).includes("idx_events_process_source_external"))) {
      events.indexes.push("CREATE UNIQUE INDEX idx_events_process_source_external ON events (process, source, external_id) WHERE external_id != ''");
    }
    app.save(events);

    // DJEN: metadados necessários para auditoria, classificação e prazo.
    add(djen, new TextField({ name: "external_id", max: 120 }));
    add(djen, new TextField({ name: "source_hash", max: 200 }));
    add(djen, new TextField({ name: "tribunal", max: 40 }));
    add(djen, new TextField({ name: "orgao", max: 200 }));
    add(djen, new TextField({ name: "process_number", max: 60 }));
    add(djen, new DateField({ name: "availability_date" }));
    add(djen, new DateField({ name: "publication_date" }));
    add(djen, new SelectField({ name: "action_required", maxSelect: 1, values: ["sim", "nao", "revisar"] }));
    add(djen, new TextField({ name: "action_reason", max: 500 }));
    add(djen, new SelectField({ name: "urgency", maxSelect: 1, values: ["alta", "media", "normal"] }));
    add(djen, new NumberField({ name: "deadline_days" }));
    add(djen, new SelectField({ name: "deadline_kind", maxSelect: 1, values: ["uteis", "corridos"] }));
    add(djen, new SelectField({ name: "regime", maxSelect: 1, values: ["cpc", "clt", "outro"] }));
    add(djen, new SelectField({ name: "deadline_status", maxSelect: 1, values: ["rascunho", "confirmado", "sem_prazo"] }));
    add(djen, new RelationField({ name: "responsible_user", maxSelect: 1, collectionId: users.id, cascadeDelete: false }));
    add(djen, new TextField({ name: "link", max: 1000 }));
    add(djen, new BoolField({ name: "cancelled" }));
    add(djen, new TextField({ name: "cancel_reason", max: 500 }));
    djen.indexes = djen.indexes || [];
    if (!djen.indexes.some((i) => String(i).includes("idx_djen_user_external"))) {
      djen.indexes.push("CREATE UNIQUE INDEX idx_djen_user_external ON djen_publications (responsible_user, external_id) WHERE external_id != ''");
    }
    const officeUser = "@request.auth.collectionName = 'users'";
    const owner = "@request.auth.role = 'owner'";
    djen.listRule = `${officeUser} && (${owner} || responsible_user = @request.auth.id)`;
    djen.viewRule = djen.listRule;
    djen.createRule = `${officeUser} && (${owner} || responsible_user = @request.auth.id)`;
    djen.updateRule = `${officeUser} && (${owner} || responsible_user = @request.auth.id)`;
    djen.deleteRule = djen.updateRule;
    app.save(djen);

    // Agenda: vínculo ao processo e à publicação que originou o prazo.
    add(appointments, new RelationField({ name: "process", maxSelect: 1, collectionId: processes.id, cascadeDelete: false }));
    add(appointments, new RelationField({ name: "djen_publication", maxSelect: 1, collectionId: djen.id, cascadeDelete: false }));
    app.save(appointments);

    // Feriados/indisponibilidade: preenchimento manual/administrativo por comarca/tribunal.
    try {
      app.findCollectionByNameOrId("court_holidays");
    } catch (_) {
      app.save(new Collection({
        type: "base",
        name: "court_holidays",
        listRule: `${officeUser} && (${owner} || responsible_user = @request.auth.id)`,
        viewRule: `${officeUser} && (${owner} || responsible_user = @request.auth.id)`,
        createRule: `${officeUser} && (${owner} || responsible_user = @request.auth.id)`,
        updateRule: `${officeUser} && (${owner} || responsible_user = @request.auth.id)`,
        deleteRule: `${officeUser} && (${owner} || responsible_user = @request.auth.id)`,
        fields: [
          { name: "date", type: "date", required: true },
          { name: "name", type: "text", required: true, max: 200 },
          { name: "scope", type: "select", maxSelect: 1, values: ["nacional", "tribunal", "comarca"] },
          { name: "tribunal", type: "text", max: 40 },
          { name: "comarca", type: "text", max: 120 },
          { name: "source", type: "text", max: 500 },
          { name: "active", type: "bool" },
          { name: "responsible_user", type: "relation", maxSelect: 1, collectionId: users.id, cascadeDelete: false },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: ["CREATE INDEX idx_court_holidays_date ON court_holidays (date)"],
      }));
    }
  },
  (app) => {
    try { app.delete(app.findCollectionByNameOrId("court_holidays")); } catch (_) {}
    const remove = (collection, names) => {
      names.forEach((name) => { try { collection.fields.removeByName(name); } catch (_) {} });
      app.save(collection);
    };
    try { remove(app.findCollectionByNameOrId("appointments"), ["process", "djen_publication"]); } catch (_) {}
    try { remove(app.findCollectionByNameOrId("events"), ["source", "external_id"]); } catch (_) {}
    try { remove(app.findCollectionByNameOrId("processes"), ["tribunal", "parties", "datajud_synced_at"]); } catch (_) {}
    try {
      remove(app.findCollectionByNameOrId("djen_publications"), [
        "external_id", "source_hash", "tribunal", "orgao", "process_number", "availability_date", "publication_date",
        "action_required", "action_reason", "urgency", "deadline_days", "deadline_kind", "regime", "deadline_status", "responsible_user",
        "link", "cancelled", "cancel_reason",
      ]);
    } catch (_) {}
  },
);
