/// <reference path="../pb_data/types.d.ts" />

// Matriz de Rastreabilidade — coleções de integração cruzada:
//  - process_movements: histórico de mudanças de fase (Kanban → process_movements)
//  - lgpd_logs: registro de operações com dados pessoais (upload pelo cliente, etc.)
//  - processes.stage_entered_at: data de entrada na etapa atual (recálculo de SLA)
//  - documents.createRule aberto para clientes enviarem documentos aos próprios processos

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const processes = app.findCollectionByNameOrId("processes");
    const funnelStages = app.findCollectionByNameOrId("funnel_stages");

    // --- processes: stage_entered_at + drive_link (pasta no Drive) ---
    if (!processes.fields.getByName("stage_entered_at")) {
      processes.fields.add(new DateField({ name: "stage_entered_at" }));
    }
    if (!processes.fields.getByName("drive_link")) {
      processes.fields.add(new TextField({ name: "drive_link", max: 500 }));
    }
    app.save(processes);

    // --- documents: permite que o cliente envie documentos ao seu próprio processo ---
    const documents = app.findCollectionByNameOrId("documents");
    documents.createRule =
      "@request.auth.collectionName = 'users' || (@request.auth.collectionName = 'clients' && process.client = @request.auth.id)";
    app.save(documents);

    // --- process_movements ---
    try {
      app.findCollectionByNameOrId("process_movements");
    } catch (_) {
      app.save(
        new Collection({
          type: "base",
          name: "process_movements",
          listRule: "@request.auth.collectionName = 'users'",
          viewRule: "@request.auth.collectionName = 'users'",
          createRule: null,
          updateRule: null,
          deleteRule: null,
          fields: [
            { name: "process", type: "relation", required: true, maxSelect: 1, collectionId: processes.id, cascadeDelete: true },
            { name: "from_stage", type: "text", max: 120 },
            { name: "to_stage", type: "text", max: 120 },
            { name: "to_stage_ref", type: "relation", maxSelect: 1, collectionId: funnelStages.id, cascadeDelete: false },
            { name: "actor", type: "relation", maxSelect: 1, collectionId: users.id, cascadeDelete: false },
            { name: "notes", type: "text" },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          ],
          indexes: ["CREATE INDEX idx_process_movements_process ON process_movements (process)"],
        }),
      );
    }

    // --- lgpd_logs ---
    try {
      app.findCollectionByNameOrId("lgpd_logs");
    } catch (_) {
      const clients = app.findCollectionByNameOrId("clients");
      app.save(
        new Collection({
          type: "base",
          name: "lgpd_logs",
          listRule: "@request.auth.collectionName = 'users'",
          viewRule: "@request.auth.collectionName = 'users'",
          createRule: null,
          updateRule: null,
          deleteRule: null,
          fields: [
            { name: "actor", type: "text", max: 60 },
            { name: "actor_ref", type: "relation", maxSelect: 1, collectionId: clients.id, cascadeDelete: false },
            { name: "action", type: "text", required: true, max: 60 },
            { name: "collection_name", type: "text", max: 80 },
            { name: "record_id", type: "text", max: 40 },
            { name: "detail", type: "text" },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          ],
          indexes: ["CREATE INDEX idx_lgpd_logs_created ON lgpd_logs (created)"],
        }),
      );
    }
  },
  (app) => {
    ["process_movements", "lgpd_logs"].forEach((name) => {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (e) {
        if (!String(e).includes("no rows")) throw e;
      }
    });
    try {
      const processes = app.findCollectionByNameOrId("processes");
      ["stage_entered_at", "drive_link"].forEach((fn) => {
        const f = processes.fields.getByName(fn);
        if (f) processes.fields.remove(f);
      });
      app.save(processes);
    } catch (_) {}
    try {
      const documents = app.findCollectionByNameOrId("documents");
      documents.createRule = "@request.auth.collectionName = 'users'";
      app.save(documents);
    } catch (_) {}
  },
);
