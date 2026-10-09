/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    // Permite que administradores/owner gerenciem usuários; cada usuário
    // continua podendo editar o próprio registro.
    users.listRule = "@request.auth.collectionName = 'users'";
    users.viewRule = "@request.auth.collectionName = 'users'";
    users.createRule =
      "@request.auth.collectionName = 'users' && (@request.auth.role = 'admin' || @request.auth.role = 'owner')";
    users.updateRule =
      "@request.auth.collectionName = 'users' && (id = @request.auth.id || @request.auth.role = 'admin' || @request.auth.role = 'owner')";
    users.deleteRule =
      "@request.auth.collectionName = 'users' && (@request.auth.role = 'admin' || @request.auth.role = 'owner')";
    app.save(users);

    // Backfill: garante role/active no admin seedado
    try {
      const admin = app.findAuthRecordByEmail("users", "admin@juliodamaso.adv.br");
      if (!admin.get("role")) admin.set("role", "owner");
      admin.set("active", true);
      app.save(admin);
    } catch (_) {}
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.listRule = "id = @request.auth.id";
    users.viewRule = "id = @request.auth.id";
    users.createRule = null;
    users.updateRule = "id = @request.auth.id";
    users.deleteRule = "id = @request.auth.id";
    app.save(users);
  },
);
