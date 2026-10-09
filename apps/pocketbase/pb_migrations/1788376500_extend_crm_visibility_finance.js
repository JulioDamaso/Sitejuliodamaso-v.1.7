/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Visibility flags on portal-facing collections (like financial.visible)
    const addVisible = (name) => {
      const col = app.findCollectionByNameOrId(name);
      if (!col.fields.getByName("visible")) {
        col.fields.add(new BoolField({ name: "visible" }));
        app.save(col);
      }
    };
    ["events", "documents", "pendencias", "appointments", "processes"].forEach(addVisible);

    // Tighten list rules so clients only see visible=true rows
    const events = app.findCollectionByNameOrId("events");
    events.listRule =
      "@request.auth.collectionName = 'users' || (process.client = @request.auth.id && visible = true)";
    events.viewRule = events.listRule;
    app.save(events);

    const documents = app.findCollectionByNameOrId("documents");
    documents.listRule =
      "@request.auth.collectionName = 'users' || (process.client = @request.auth.id && visible = true)";
    documents.viewRule = documents.listRule;
    app.save(documents);

    const pendencias = app.findCollectionByNameOrId("pendencias");
    pendencias.listRule =
      "@request.auth.collectionName = 'users' || (process.client = @request.auth.id && visible = true)";
    pendencias.viewRule = pendencias.listRule;
    app.save(pendencias);

    const appointments = app.findCollectionByNameOrId("appointments");
    appointments.listRule =
      "@request.auth.collectionName = 'users' || (client = @request.auth.id && visible = true)";
    appointments.viewRule = appointments.listRule;
    app.save(appointments);

    // posts: cover_file upload
    const posts = app.findCollectionByNameOrId("posts");
    if (!posts.fields.getByName("cover_file")) {
      posts.fields.add(
        new FileField({
          name: "cover_file",
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        }),
      );
      app.save(posts);
    }

    // bio_links: color
    const bio = app.findCollectionByNameOrId("bio_links");
    if (!bio.fields.getByName("color")) {
      bio.fields.add(new TextField({ name: "color", max: 20 }));
      app.save(bio);
    }

    // clients: cpf, extra search fields
    const clients = app.findCollectionByNameOrId("clients");
    if (!clients.fields.getByName("cpf")) {
      clients.fields.add(new TextField({ name: "cpf", max: 20 }));
      clients.fields.add(new TextField({ name: "comments", max: 0 }));
      app.save(clients);
    }

    // site_settings singleton-ish
    try {
      app.findCollectionByNameOrId("site_settings");
    } catch (_) {
      app.save(
        new Collection({
          type: "base",
          name: "site_settings",
          listRule: "",
          viewRule: "",
          createRule: "@request.auth.collectionName = 'users'",
          updateRule: "@request.auth.collectionName = 'users'",
          deleteRule: "@request.auth.collectionName = 'users'",
          fields: [
            { name: "key", type: "text", required: true, max: 80 },
            { name: "value", type: "text" },
            { name: "file", type: "file", maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
            { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
          ],
          indexes: ["CREATE UNIQUE INDEX idx_site_settings_key ON site_settings (key)"],
        }),
      );
    }

    // funnels + stages
    try {
      app.findCollectionByNameOrId("funnels");
    } catch (_) {
      const funnels = new Collection({
        type: "base",
        name: "funnels",
        listRule: "@request.auth.collectionName = 'users'",
        viewRule: "@request.auth.collectionName = 'users'",
        createRule: "@request.auth.collectionName = 'users'",
        updateRule: "@request.auth.collectionName = 'users'",
        deleteRule: "@request.auth.collectionName = 'users'",
        fields: [
          { name: "name", type: "text", required: true, max: 120 },
          { name: "type", type: "select", maxSelect: 1, values: ["judicial", "extrajudicial", "custom"] },
          { name: "color", type: "text", max: 20 },
          { name: "active", type: "bool" },
          { name: "order", type: "number" },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
      });
      app.save(funnels);

      const stages = new Collection({
        type: "base",
        name: "funnel_stages",
        listRule: "@request.auth.collectionName = 'users'",
        viewRule: "@request.auth.collectionName = 'users'",
        createRule: "@request.auth.collectionName = 'users'",
        updateRule: "@request.auth.collectionName = 'users'",
        deleteRule: "@request.auth.collectionName = 'users'",
        fields: [
          { name: "funnel", type: "relation", required: true, maxSelect: 1, collectionId: funnels.id, cascadeDelete: true },
          { name: "name", type: "text", required: true, max: 120 },
          { name: "order", type: "number" },
          { name: "is_archive", type: "bool" },
          { name: "color", type: "text", max: 20 },
          { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
        ],
        indexes: ["CREATE INDEX idx_funnel_stages_funnel ON funnel_stages (funnel)"],
      });
      app.save(stages);

      const processes = app.findCollectionByNameOrId("processes");
      if (!processes.fields.getByName("funnel")) {
        processes.fields.add(
          new RelationField({
            name: "funnel",
            maxSelect: 1,
            collectionId: funnels.id,
            cascadeDelete: false,
          }),
        );
        processes.fields.add(
          new RelationField({
            name: "stage_ref",
            maxSelect: 1,
            collectionId: stages.id,
            cascadeDelete: false,
          }),
        );
        processes.fields.add(new BoolField({ name: "archived" }));
        app.save(processes);
      }
    }

    // office ledger (escritório + pessoal / pró-labore)
    try {
      app.findCollectionByNameOrId("ledger");
    } catch (_) {
      const clients = app.findCollectionByNameOrId("clients");
      const processes = app.findCollectionByNameOrId("processes");
      app.save(
        new Collection({
          type: "base",
          name: "ledger",
          listRule: "@request.auth.collectionName = 'users'",
          viewRule: "@request.auth.collectionName = 'users'",
          createRule: "@request.auth.collectionName = 'users'",
          updateRule: "@request.auth.collectionName = 'users'",
          deleteRule: "@request.auth.collectionName = 'users'",
          fields: [
            { name: "description", type: "text", required: true, max: 300 },
            { name: "amount", type: "number" },
            { name: "type", type: "select", maxSelect: 1, values: ["receita", "despesa", "prolabore", "transferencia"] },
            { name: "book", type: "select", maxSelect: 1, values: ["escritorio", "pessoal"] },
            { name: "category", type: "text", max: 80 },
            { name: "date", type: "date" },
            { name: "recurring", type: "bool" },
            { name: "recur_interval", type: "select", maxSelect: 1, values: ["mensal", "semanal", "anual", "unico"] },
            { name: "status", type: "select", maxSelect: 1, values: ["pendente", "pago", "vencido", "cancelado"] },
            { name: "client", type: "relation", maxSelect: 1, collectionId: clients.id, cascadeDelete: false },
            { name: "process", type: "relation", maxSelect: 1, collectionId: processes.id, cascadeDelete: false },
            { name: "notes", type: "text" },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
            { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
          ],
          indexes: [
            "CREATE INDEX idx_ledger_date ON ledger (date)",
            "CREATE INDEX idx_ledger_book ON ledger (book)",
          ],
        }),
      );
    }

    // notifications
    try {
      app.findCollectionByNameOrId("notifications");
    } catch (_) {
      app.save(
        new Collection({
          type: "base",
          name: "notifications",
          listRule: "@request.auth.collectionName = 'users'",
          viewRule: "@request.auth.collectionName = 'users'",
          createRule: "@request.auth.collectionName = 'users'",
          updateRule: "@request.auth.collectionName = 'users'",
          deleteRule: "@request.auth.collectionName = 'users'",
          fields: [
            { name: "title", type: "text", required: true, max: 200 },
            { name: "body", type: "text" },
            { name: "kind", type: "select", maxSelect: 1, values: ["cobranca", "prazo", "tarefa", "sistema", "dnj"] },
            { name: "link", type: "text", max: 300 },
            { name: "read", type: "bool" },
            { name: "due", type: "date" },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
            { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
          ],
        }),
      );
    }

    // audit log
    try {
      app.findCollectionByNameOrId("audit_logs");
    } catch (_) {
      const users = app.findCollectionByNameOrId("users");
      app.save(
        new Collection({
          type: "base",
          name: "audit_logs",
          listRule: "@request.auth.collectionName = 'users'",
          viewRule: "@request.auth.collectionName = 'users'",
          createRule: "@request.auth.collectionName = 'users'",
          updateRule: null,
          deleteRule: null,
          fields: [
            { name: "actor", type: "relation", maxSelect: 1, collectionId: users.id, cascadeDelete: false },
            { name: "action", type: "text", required: true, max: 40 },
            { name: "collection", type: "text", max: 80 },
            { name: "record_id", type: "text", max: 40 },
            { name: "before", type: "text" },
            { name: "after", type: "text" },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          ],
        }),
      );
    }

    // staff roles on users
    const users = app.findCollectionByNameOrId("users");
    if (!users.fields.getByName("role")) {
      users.fields.add(
        new SelectField({
          name: "role",
          maxSelect: 1,
          values: ["owner", "admin", "financeiro", "operacional", "leitura"],
        }),
      );
      users.fields.add(new BoolField({ name: "active" }));
      users.fields.add(new TextField({ name: "permissions", max: 0 }));
      app.save(users);
    }

    // seed default funnels
    try {
      const existing = app.findFirstRecordByFilter("funnels", "name = 'Judicial'");
      if (!existing) throw new Error("seed");
    } catch (_) {
      const funnelsCol = app.findCollectionByNameOrId("funnels");
      const stagesCol = app.findCollectionByNameOrId("funnel_stages");
      const defs = [
        {
          name: "Judicial",
          type: "judicial",
          stages: ["Distribuição", "Citação", "Instrução", "Sentença", "Recurso", "Arquivo morto"],
        },
        {
          name: "Extrajudicial",
          type: "extrajudicial",
          stages: ["Documentação", "Protocolo em cartório", "Exigências", "Lavratura/Registro", "Arquivo morto"],
        },
      ];
      defs.forEach((d, fi) => {
        const f = new Record(funnelsCol);
        f.set("name", d.name);
        f.set("type", d.type);
        f.set("active", true);
        f.set("order", fi + 1);
        f.set("color", fi === 0 ? "#1f5c45" : "#c45c2a");
        app.save(f);
        d.stages.forEach((sn, si) => {
          const s = new Record(stagesCol);
          s.set("funnel", f.id);
          s.set("name", sn);
          s.set("order", si + 1);
          s.set("is_archive", sn.toLowerCase().includes("arquivo"));
          app.save(s);
        });
      });
    }

    // backfill visible=true on existing rows
    ["events", "documents", "pendencias", "appointments", "processes"].forEach((name) => {
      try {
        app.findAllRecords(name).forEach((r) => {
          if (r.get("visible") !== true && r.get("visible") !== false) {
            r.set("visible", true);
            app.save(r);
          }
        });
      } catch (_) {}
    });
  },
  (app) => {
    ["audit_logs", "notifications", "ledger", "funnel_stages", "funnels", "site_settings"].forEach((name) => {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (e) {
        if (!String(e).includes("no rows")) throw e;
      }
    });
  },
);
