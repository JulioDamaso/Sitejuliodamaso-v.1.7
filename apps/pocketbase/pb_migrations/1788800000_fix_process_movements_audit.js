/// <reference path="../pb_data/types.d.ts" />

// A auditoria de etapas é append-only: usuários autenticados podem criar
// registros, mas nenhum usuário pode alterá-los ou excluí-los.
migrate(
  (app) => {
    const movements = app.findCollectionByNameOrId("process_movements");
    const users = "@request.auth.collectionName = 'users'";
    movements.listRule = users;
    movements.viewRule = users;
    movements.createRule = users;
    movements.updateRule = null;
    movements.deleteRule = null;
    app.save(movements);
  },
  () => {},
);
