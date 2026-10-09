/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // --- users (admin do escritório): sign-up fechado, senha forte ---
    const users = app.findCollectionByNameOrId("users");
    users.createRule = null;
    const pw = users.fields.getByName("password");
    pw.min = Math.max(pw.min || 0, 10);
    app.save(users);

    // --- clients (auth por protocolo + senha) ---
    const clients = new Collection({
      type: "auth",
      name: "clients",
      listRule: "@request.auth.collectionName = 'users' || id = @request.auth.id",
      viewRule: "@request.auth.collectionName = 'users' || id = @request.auth.id",
      createRule: "@request.auth.collectionName = 'users'",
      updateRule: "@request.auth.collectionName = 'users' || id = @request.auth.id",
      deleteRule: "@request.auth.collectionName = 'users'",
      fields: [
        { name: "protocol", type: "text", required: true, max: 40 },
        { name: "name", type: "text", required: true, max: 120 },
        { name: "phone", type: "text", max: 40 },
        { name: "notes", type: "text" },
      ],
      passwordAuth: { enabled: true, identityFields: ["protocol"] },
      authAlert: { enabled: false },
      indexes: ["CREATE UNIQUE INDEX idx_clients_protocol ON clients (protocol)"],
    });
    app.save(clients);

    // --- posts do blog ---
    const posts = new Collection({
      type: "base",
      name: "posts",
      listRule: "status = 'publicado' || @request.auth.collectionName = 'users'",
      viewRule: "status = 'publicado' || @request.auth.collectionName = 'users'",
      createRule: "@request.auth.collectionName = 'users'",
      updateRule: "@request.auth.collectionName = 'users'",
      deleteRule: "@request.auth.collectionName = 'users'",
      fields: [
        { name: "title", type: "text", required: true, max: 200 },
        { name: "slug", type: "text", required: true, max: 220 },
        { name: "excerpt", type: "text", max: 400 },
        { name: "content", type: "text" },
        { name: "category", type: "text", max: 80 },
        { name: "tags", type: "text", max: 300 },
        { name: "cover", type: "text", max: 500 },
        { name: "seo_title", type: "text", max: 200 },
        { name: "seo_description", type: "text", max: 300 },
        { name: "status", type: "select", required: true, maxSelect: 1, values: ["rascunho", "publicado", "agendado"] },
        { name: "publish_at", type: "date" },
        { name: "author", type: "relation", maxSelect: 1, collectionId: users.id, cascadeDelete: false },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_posts_slug ON posts (slug)",
        "CREATE INDEX idx_posts_status ON posts (status)",
      ],
    });
    app.save(posts);

    // --- processos ---
    const processes = new Collection({
      type: "base",
      name: "processes",
      listRule: "@request.auth.collectionName = 'users' || @request.auth.id = client",
      viewRule: "@request.auth.collectionName = 'users' || @request.auth.id = client",
      createRule: "@request.auth.collectionName = 'users'",
      updateRule: "@request.auth.collectionName = 'users'",
      deleteRule: "@request.auth.collectionName = 'users'",
      fields: [
        { name: "client", type: "relation", required: true, maxSelect: 1, collectionId: clients.id, cascadeDelete: true },
        { name: "title", type: "text", required: true, max: 200 },
        { name: "number", type: "text", max: 60 },
        { name: "area", type: "text", max: 80 },
        { name: "status", type: "select", required: true, maxSelect: 1, values: ["ativo", "suspenso", "concluido", "arquivado"] },
        { name: "stage", type: "text", max: 120 },
        { name: "summary", type: "text" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_processes_client ON processes (client)"],
    });
    app.save(processes);

    const childListRule = "@request.auth.collectionName = 'users' || process.client = @request.auth.id";
    const adminWrite = "@request.auth.collectionName = 'users'";

    // --- eventos (timeline) ---
    app.save(new Collection({
      type: "base",
      name: "events",
      listRule: childListRule,
      viewRule: childListRule,
      createRule: adminWrite,
      updateRule: adminWrite,
      deleteRule: adminWrite,
      fields: [
        { name: "process", type: "relation", required: true, maxSelect: 1, collectionId: processes.id, cascadeDelete: true },
        { name: "date", type: "date" },
        { name: "title", type: "text", required: true, max: 200 },
        { name: "description", type: "text" },
        { name: "type", type: "select", maxSelect: 1, values: ["andamento", "audiencia", "prazo", "documento", "outro"] },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_events_process ON events (process)"],
    }));

    // --- documentos ---
    app.save(new Collection({
      type: "base",
      name: "documents",
      listRule: childListRule,
      viewRule: childListRule,
      createRule: adminWrite,
      updateRule: adminWrite,
      deleteRule: adminWrite,
      fields: [
        { name: "process", type: "relation", required: true, maxSelect: 1, collectionId: processes.id, cascadeDelete: true },
        { name: "title", type: "text", required: true, max: 200 },
        { name: "description", type: "text" },
        { name: "file", type: "file", maxSelect: 1, maxSize: 10485760 },
        { name: "external_url", type: "text", max: 500 },
        { name: "visible", type: "bool" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_documents_process ON documents (process)"],
    }));

    // --- pendências / tarefas ---
    app.save(new Collection({
      type: "base",
      name: "pendencias",
      listRule: childListRule,
      viewRule: childListRule,
      createRule: adminWrite,
      updateRule: adminWrite,
      deleteRule: adminWrite,
      fields: [
        { name: "process", type: "relation", required: true, maxSelect: 1, collectionId: processes.id, cascadeDelete: true },
        { name: "title", type: "text", required: true, max: 200 },
        { name: "description", type: "text" },
        { name: "due", type: "date" },
        { name: "done", type: "bool" },
        { name: "for_client", type: "bool" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_pendencias_process ON pendencias (process)"],
    }));

    // --- compromissos ---
    app.save(new Collection({
      type: "base",
      name: "appointments",
      listRule: "@request.auth.collectionName = 'users' || client = @request.auth.id",
      viewRule: "@request.auth.collectionName = 'users' || client = @request.auth.id",
      createRule: adminWrite,
      updateRule: adminWrite,
      deleteRule: adminWrite,
      fields: [
        { name: "client", type: "relation", required: true, maxSelect: 1, collectionId: clients.id, cascadeDelete: true },
        { name: "date", type: "date" },
        { name: "title", type: "text", required: true, max: 200 },
        { name: "location", type: "text", max: 200 },
        { name: "notes", type: "text" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_appointments_client ON appointments (client)"],
    }));

    // --- financeiro ---
    app.save(new Collection({
      type: "base",
      name: "financial",
      listRule: "@request.auth.collectionName = 'users' || (@request.auth.id = client && visible = true)",
      viewRule: "@request.auth.collectionName = 'users' || (@request.auth.id = client && visible = true)",
      createRule: adminWrite,
      updateRule: adminWrite,
      deleteRule: adminWrite,
      fields: [
        { name: "client", type: "relation", required: true, maxSelect: 1, collectionId: clients.id, cascadeDelete: true },
        { name: "description", type: "text", required: true, max: 200 },
        { name: "amount", type: "number" },
        { name: "due", type: "date" },
        { name: "status", type: "select", maxSelect: 1, values: ["pendente", "pago", "vencido"] },
        { name: "visible", type: "bool" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE INDEX idx_financial_client ON financial (client)"],
    }));

    // --- link da bio ---
    app.save(new Collection({
      type: "base",
      name: "bio_links",
      listRule: "active = true || @request.auth.collectionName = 'users'",
      viewRule: "active = true || @request.auth.collectionName = 'users'",
      createRule: adminWrite,
      updateRule: adminWrite,
      deleteRule: adminWrite,
      fields: [
        { name: "title", type: "text", required: true, max: 120 },
        { name: "url", type: "text", required: true, max: 500 },
        { name: "type", type: "select", maxSelect: 1, values: ["link", "ebook", "social", "whatsapp"] },
        { name: "order", type: "number" },
        { name: "active", type: "bool" },
        { name: "created", type: "autodate", onCreate: true, onUpdate: false },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
      ],
    }));
  },
  (app) => {
    ["bio_links", "financial", "appointments", "pendencias", "documents", "events", "processes", "posts", "clients"].forEach((name) => {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (e) {
        if (!e.message.includes("no rows in result set")) throw e;
      }
    });
  },
);
