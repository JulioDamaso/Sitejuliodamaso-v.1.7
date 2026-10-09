/// <reference path="../pb_data/types.d.ts" />

// Adiciona "investimento" aos valores do select `type` da coleção ledger,
// permitindo distinguir investimentos de despesas operacionais no painel
// financeiro (visão de gestor sênior).

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("ledger");
    const field = col.fields.getByName("type");
    const vals = field.values.slice();
    if (vals.indexOf("investimento") === -1) {
      vals.push("investimento");
      field.values = vals;
      app.save(col);
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId("ledger");
      const field = col.fields.getByName("type");
      field.values = ["receita", "despesa", "prolabore", "transferencia"];
      app.save(col);
    } catch (_) {}
  },
);
