/// <reference path="../pb_data/types.d.ts" />

// Fluxo revisável e idempotente da publicação DJEN:
// - identifica se o processo foi localizado;
// - separa aprovação de movimentação e de prazo;
// - mantém as referências criadas para impedir duplicidade.

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const djen = app.findCollectionByNameOrId("djen_publications");
    const deadlines = app.findCollectionByNameOrId("deadlines");

    const add = (collection, field) => {
      if (!collection.fields.getByName(field.name)) collection.fields.add(field);
    };

    add(djen, new SelectField({
      name: "triage_status",
      maxSelect: 1,
      values: ["novo", "pendente_vinculo", "revisao", "aprovado", "concluido", "ignorado"],
    }));
    add(djen, new SelectField({
      name: "process_match_status",
      maxSelect: 1,
      values: ["encontrado", "nao_encontrado", "manual"],
    }));
    add(djen, new SelectField({
      name: "movement_status",
      maxSelect: 1,
      values: ["pendente", "aprovado", "nao_aplicavel"],
    }));
    add(djen, new TextField({ name: "movement_event_id", max: 80 }));
    add(djen, new TextField({ name: "deadline_id", max: 80 }));
    add(djen, new TextField({ name: "appointment_id", max: 80 }));
    djen.listRule = "@request.auth.collectionName = 'users' && (@request.auth.role = 'owner' || responsible_user = @request.auth.id)";
    djen.viewRule = djen.listRule;
    djen.createRule = djen.listRule;
    djen.updateRule = djen.listRule;
    djen.deleteRule = djen.updateRule;
    app.save(djen);

    add(deadlines, new RelationField({ name: "djen_publication", maxSelect: 1, collectionId: djen.id, cascadeDelete: false }));
    deadlines.listRule = "@request.auth.collectionName = 'users'";
    deadlines.viewRule = deadlines.listRule;
    deadlines.createRule = deadlines.listRule;
    deadlines.updateRule = deadlines.listRule;
    deadlines.deleteRule = deadlines.listRule;
    deadlines.indexes = deadlines.indexes || [];
    if (!deadlines.indexes.some((i) => String(i).includes("idx_deadlines_djen_publication"))) {
      deadlines.indexes.push("CREATE UNIQUE INDEX idx_deadlines_djen_publication ON deadlines (djen_publication) WHERE djen_publication != ''");
    }
    app.save(deadlines);
  },
  (app) => {
    try {
      const djen = app.findCollectionByNameOrId("djen_publications");
      ["triage_status", "process_match_status", "movement_status", "movement_event_id", "deadline_id", "appointment_id"].forEach((name) => {
        try { djen.fields.removeByName(name); } catch (_) {}
      });
      app.save(djen);
    } catch (_) {}
    try {
      const deadlines = app.findCollectionByNameOrId("deadlines");
      try { deadlines.fields.removeByName("djen_publication"); } catch (_) {}
      deadlines.indexes = (deadlines.indexes || []).filter((i) => !String(i).includes("idx_deadlines_djen_publication"));
      app.save(deadlines);
    } catch (_) {}
  },
);
