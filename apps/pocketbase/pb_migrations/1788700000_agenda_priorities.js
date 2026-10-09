/// <reference path="../pb_data/types.d.ts" />

// Prioridade comum para compromissos e tarefas processuais.
migrate(
  (app) => {
    const addPriority = (collectionName) => {
      const collection = app.findCollectionByNameOrId(collectionName);
      if (!collection.fields.getByName("priority")) {
        collection.fields.add(new SelectField({
          name: "priority",
          maxSelect: 1,
          values: ["urgente", "alta", "normal", "baixa"],
        }));
        app.save(collection);
      }
    };

    addPriority("appointments");
    addPriority("pendencias");
  },
  (app) => {
    for (const collectionName of ["appointments", "pendencias"]) {
      try {
        const collection = app.findCollectionByNameOrId(collectionName);
        collection.fields.removeByName("priority");
        app.save(collection);
      } catch (_) {}
    }
  },
);
