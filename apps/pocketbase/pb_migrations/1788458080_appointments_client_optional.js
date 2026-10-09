/// <reference path="../pb_data/types.d.ts" />

// Permite que compromissos existam sem cliente vinculado — necessário para
// importar eventos do Google Agenda (que não têm cliente associado). Os
// compromissos criados manualmente continuam podendo vincular um cliente.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("appointments");
    const field = collection.fields.getByName("client");
    if (field) {
      field.required = false;
      app.save(collection);
    }
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("appointments");
    const field = collection.fields.getByName("client");
    if (field) {
      field.required = true;
      app.save(collection);
    }
  },
);
