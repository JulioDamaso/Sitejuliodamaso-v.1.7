/// <reference path="../pb_data/types.d.ts" />

// Sistema Automatizado de Monitoramento Processual (DNJ/CNJ)
// Coleções:
//  - lawyers: perfil do advogado (OAB, CPF, tribunais monitorados)
//  - monitoring_sources: fontes de monitoramento (DataJud, DJEN, tribunais)
//  - monitoring_runs: log de execuções das fontes
//  - review_queue: fila de revisão humana (andamentos/publicações classificados)
//  - case_movements: movimentações importadas e aprovadas
//  - case_hearings: audiências
//  - deadlines: prazos calculados e confirmados
//  - dnj_config: configurações globais do módulo
// (djen_publications já existe — reutilizada como inbox de publicações)

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const processes = app.findCollectionByNameOrId("processes");

    const adminRule = "@request.auth.collectionName = 'users'";

    // --- lawyers ---
    try {
      app.findCollectionByNameOrId("lawyers");
    } catch (_) {
      app.save(
        new Collection({
          type: "base",
          name: "lawyers",
          listRule: adminRule,
          viewRule: adminRule,
          createRule: adminRule,
          updateRule: adminRule,
          deleteRule: adminRule,
          fields: [
            { name: "name", type: "text", required: true, max: 200 },
            { name: "oab", type: "text", max: 40 },
            { name: "oab_uf", type: "text", max: 2 },
            { name: "cpf_cnpj", type: "text", max: 20 },
            { name: "tribunals", type: "text", max: 500 }, // lista separada por vírgula
            { name: "profile", type: "text", max: 0 },
            { name: "active", type: "bool" },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
            { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
          ],
        }),
      );
    }

    // --- monitoring_sources ---
    try {
      app.findCollectionByNameOrId("monitoring_sources");
    } catch (_) {
      app.save(
        new Collection({
          type: "base",
          name: "monitoring_sources",
          listRule: adminRule,
          viewRule: adminRule,
          createRule: adminRule,
          updateRule: adminRule,
          deleteRule: adminRule,
          fields: [
            { name: "name", type: "text", required: true, max: 120 },
            {
              name: "type",
              type: "select",
              maxSelect: 1,
              values: ["datajud", "djen", "tribunal", "outro"],
            },
            { name: "config_json", type: "text", max: 0 },
            { name: "enabled", type: "bool" },
            { name: "last_run", type: "date" },
            { name: "next_run", type: "date" },
            { name: "error_message", type: "text", max: 500 },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
            { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
          ],
        }),
      );
    }

    // --- monitoring_runs ---
    try {
      app.findCollectionByNameOrId("monitoring_runs");
    } catch (_) {
      const sources = app.findCollectionByNameOrId("monitoring_sources");
      app.save(
        new Collection({
          type: "base",
          name: "monitoring_runs",
          listRule: adminRule,
          viewRule: adminRule,
          createRule: adminRule,
          updateRule: adminRule,
          deleteRule: adminRule,
          fields: [
            {
              name: "source",
              type: "relation",
              required: true,
              maxSelect: 1,
              collectionId: sources.id,
              cascadeDelete: true,
            },
            { name: "started_at", type: "date" },
            { name: "completed_at", type: "date" },
            {
              name: "status",
              type: "select",
              maxSelect: 1,
              values: ["rodando", "concluido", "erro"],
            },
            { name: "records_found", type: "number" },
            { name: "records_imported", type: "number" },
            { name: "error_log", type: "text", max: 0 },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
          ],
        }),
      );
    }

    // --- review_queue ---
    try {
      app.findCollectionByNameOrId("review_queue");
    } catch (_) {
      app.save(
        new Collection({
          type: "base",
          name: "review_queue",
          listRule: adminRule,
          viewRule: adminRule,
          createRule: adminRule,
          updateRule: adminRule,
          deleteRule: adminRule,
          fields: [
            { name: "process_number", type: "text", max: 60 },
            {
              name: "process_ref",
              type: "relation",
              maxSelect: 1,
              collectionId: processes.id,
            },
            { name: "source", type: "text", max: 80 },
            { name: "original_data", type: "text", max: 0 },
            { name: "ai_interpretation", type: "text", max: 0 },
            { name: "confidence", type: "number" },
            {
              name: "action_type",
              type: "select",
              maxSelect: 1,
              values: ["andamento", "publicacao", "prazo", "audiencia", "outro"],
            },
            {
              name: "status",
              type: "select",
              maxSelect: 1,
              values: ["pendente", "aprovado", "rejeitado", "ignorado", "marcar_depois"],
            },
            {
              name: "reviewed_by",
              type: "relation",
              maxSelect: 1,
              collectionId: users.id,
            },
            { name: "reviewed_at", type: "date" },
            { name: "notes", type: "text", max: 0 },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
            { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
          ],
        }),
      );
    }

    // --- case_movements ---
    try {
      app.findCollectionByNameOrId("case_movements");
    } catch (_) {
      app.save(
        new Collection({
          type: "base",
          name: "case_movements",
          listRule: adminRule,
          viewRule: adminRule,
          createRule: adminRule,
          updateRule: adminRule,
          deleteRule: adminRule,
          fields: [
            {
              name: "process",
              type: "relation",
              required: true,
              maxSelect: 1,
              collectionId: processes.id,
              cascadeDelete: true,
            },
            { name: "source", type: "text", max: 80 },
            { name: "original_data", type: "text", max: 0 },
            { name: "classified_type", type: "text", max: 80 },
            { name: "ai_interpretation", type: "text", max: 0 },
            { name: "confidence", type: "number" },
            {
              name: "status",
              type: "select",
              maxSelect: 1,
              values: ["pendente", "aprovado", "ignorado"],
            },
            { name: "moved_at", type: "date" },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
            { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
          ],
        }),
      );
    }

    // --- case_hearings ---
    try {
      app.findCollectionByNameOrId("case_hearings");
    } catch (_) {
      app.save(
        new Collection({
          type: "base",
          name: "case_hearings",
          listRule: adminRule,
          viewRule: adminRule,
          createRule: adminRule,
          updateRule: adminRule,
          deleteRule: adminRule,
          fields: [
            {
              name: "process",
              type: "relation",
              required: true,
              maxSelect: 1,
              collectionId: processes.id,
              cascadeDelete: true,
            },
            { name: "date", type: "date", required: true },
            { name: "time", type: "text", max: 20 },
            { name: "location", type: "text", max: 200 },
            { name: "type", type: "text", max: 80 },
            {
              name: "status",
              type: "select",
              maxSelect: 1,
              values: ["confirmada", "pendente", "realizada", "cancelada"],
            },
            { name: "notes", type: "text", max: 0 },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
            { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
          ],
        }),
      );
    }

    // --- deadlines ---
    try {
      app.findCollectionByNameOrId("deadlines");
    } catch (_) {
      app.save(
        new Collection({
          type: "base",
          name: "deadlines",
          listRule: adminRule,
          viewRule: adminRule,
          createRule: adminRule,
          updateRule: adminRule,
          deleteRule: adminRule,
          fields: [
            {
              name: "process",
              type: "relation",
              required: true,
              maxSelect: 1,
              collectionId: processes.id,
              cascadeDelete: true,
            },
            { name: "type", type: "text", max: 80 },
            {
              name: "days_kind",
              type: "select",
              maxSelect: 1,
              values: ["uteis", "corridos"],
            },
            { name: "days", type: "number" },
            { name: "initial_date", type: "date" },
            { name: "calculated_date", type: "date" },
            { name: "confirmed_date", type: "date" },
            { name: "suspended", type: "bool" },
            {
              name: "responsible_user",
              type: "relation",
              maxSelect: 1,
              collectionId: users.id,
            },
            {
              name: "status",
              type: "select",
              maxSelect: 1,
              values: ["calculado", "confirmado", "vencido", "cumprido"],
            },
            { name: "notes", type: "text", max: 0 },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
            { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
          ],
        }),
      );
    }

    // --- dnj_config ---
    try {
      app.findCollectionByNameOrId("dnj_config");
    } catch (_) {
      app.save(
        new Collection({
          type: "base",
          name: "dnj_config",
          listRule: adminRule,
          viewRule: adminRule,
          createRule: adminRule,
          updateRule: adminRule,
          deleteRule: adminRule,
          fields: [
            { name: "key", type: "text", required: true, max: 80 },
            { name: "value", type: "text", max: 0 },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
            { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
          ],
          indexes: ["CREATE UNIQUE INDEX idx_dnj_config_key ON dnj_config (key)"],
        }),
      );
    }
  },
  (app) => {
    const names = [
      "dnj_config",
      "deadlines",
      "case_hearings",
      "case_movements",
      "review_queue",
      "monitoring_runs",
      "monitoring_sources",
      "lawyers",
    ];
    names.forEach((n) => {
      try {
        const c = app.findCollectionByNameOrId(n);
        app.delete(c);
      } catch (_) {}
    });
  },
);
