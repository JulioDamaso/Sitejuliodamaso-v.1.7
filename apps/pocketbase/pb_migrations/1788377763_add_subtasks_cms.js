/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const pendencias = app.findCollectionByNameOrId("pendencias");

    // --- subtasks (subtarefas de pendências) ---
    try {
      app.findCollectionByNameOrId("subtasks");
    } catch (_) {
      app.save(
        new Collection({
          type: "base",
          name: "subtasks",
          listRule: "@request.auth.collectionName = 'users' || (pendencia.process.client = @request.auth.id && pendencia.visible = true)",
          viewRule: "@request.auth.collectionName = 'users' || (pendencia.process.client = @request.auth.id && pendencia.visible = true)",
          createRule: "@request.auth.collectionName = 'users'",
          updateRule: "@request.auth.collectionName = 'users'",
          deleteRule: "@request.auth.collectionName = 'users'",
          fields: [
            { name: "pendencia", type: "relation", required: true, maxSelect: 1, collectionId: pendencias.id, cascadeDelete: true },
            { name: "title", type: "text", required: true, max: 200 },
            { name: "done", type: "bool" },
            { name: "order", type: "number" },
            { name: "created", type: "autodate", onCreate: true, onUpdate: false },
            { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
          ],
          indexes: ["CREATE INDEX idx_subtasks_pendencia ON subtasks (pendencia)"],
        }),
      );
    }

    // --- CMS seed keys (site_settings) ---
    const settings = app.findCollectionByNameOrId("site_settings");
    const seed = {
      hero_title: "Como podemos ajudar você hoje?",
      hero_subtitle:
        "Busque por informações sobre direito imobiliário, usucapião, inventário, adjudicação compulsória e regularização de imóveis.",
      about_teaser:
        "O escritório nasceu da paixão pelo Direito Imobiliário e da experiência em mais de uma década de atuação em cartórios de notas e registro. Cada etapa é registrada, explicada em linguagem clara e disponibilizada no portal do cliente.",
      areas_intro: "Do registro do imóvel à partilha da herança",
      blog_intro: "Entenda antes de decidir",
      footer_about:
        "Julio Damaso Advocacia — advocacia imobiliária e saúde patrimonial, com atendimento online em todo o Brasil.",
      contact_whatsapp: "5533998457769",
      contact_email: "juliodamaso.advogado@gmail.com",
      contact_instagram: "https://instagram.com/juliodamaso.adv",
    };

    Object.entries(seed).forEach(([key, value]) => {
      try {
        app.findFirstRecordByFilter("site_settings", `key = "${key}"`);
      } catch (_) {
        const rec = new Record(settings);
        rec.set("key", key);
        rec.set("value", value);
        app.save(rec);
      }
    });
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("subtasks"));
    } catch (e) {
      if (!String(e).includes("no rows")) throw e;
    }
    ["hero_title", "hero_subtitle", "about_teaser", "areas_intro", "blog_intro", "footer_about", "contact_whatsapp", "contact_email", "contact_instagram"].forEach((key) => {
      try {
        const rec = app.findFirstRecordByFilter("site_settings", `key = "${key}"`);
        app.delete(rec);
      } catch (e) {
        if (!String(e).includes("no rows") && !String(e).includes("no result")) {
          // ignore
        }
      }
    });
  },
);
