/// <reference path="../pb_data/types.d.ts" />

// Adiciona flag `cancelled` a appointments e events para permitir
// cancelar (sem excluir) compromissos e andamentos, com badge e histórico.

migrate(
  (app) => {
    const addCancelled = (name) => {
      try {
        const col = app.findCollectionByNameOrId(name);
        if (!col.fields.getByName("cancelled")) {
          col.fields.add(new BoolField({ name: "cancelled" }));
          app.save(col);
        }
      } catch (e) {
        if (!String(e).includes("no rows")) throw e;
      }
    };
    ["appointments", "events"].forEach(addCancelled);
  },
  (app) => {
    const removeField = (name) => {
      try {
        const col = app.findCollectionByNameOrId(name);
        const f = col.fields.getByName("cancelled");
        if (f) {
          col.fields.remove(f);
          app.save(col);
        }
      } catch (_) {}
    };
    ["appointments", "events"].forEach(removeField);
  },
);
