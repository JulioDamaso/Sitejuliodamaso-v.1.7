/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    const clients = app.findCollectionByNameOrId("clients");

    // --- admin do escritório (única forma de acesso à área restrita) ---
    const adminEmail = $os.getenv("PB_SUPERUSER_EMAIL");
    const adminPassword = $os.getenv("PB_SUPERUSER_PASSWORD");
    if (!adminEmail || !adminPassword) throw new Error("PB_SUPERUSER_EMAIL e PB_SUPERUSER_PASSWORD sao obrigatorios para a carga inicial.");
    let admin;
    try {
      admin = app.findAuthRecordByEmail("users", adminEmail);
    } catch (_) {
      admin = new Record(users);
      admin.setEmail(adminEmail);
      admin.setPassword(adminPassword);
      admin.set("name", "Julio Damaso");
      admin.set("verified", true);
      app.save(admin);
    }

    // --- cliente de demonstração ---
    const demoClientPassword = $os.getenv("PB_DEMO_CLIENT_PASSWORD");
    let client;
    try {
      client = app.findAuthRecordByEmail("clients", "jd-0001@clientes.local");
    } catch (_) {
      if (!demoClientPassword) throw new Error("PB_DEMO_CLIENT_PASSWORD e obrigatorio para criar o cliente de demonstracao.");
      client = new Record(clients);
      client.setEmail("jd-0001@clientes.local");
      client.setPassword(demoClientPassword);
      client.set("protocol", "JD-0001");
      client.set("name", "Maria Silva (Demonstração)");
      client.set("phone", "(11) 99999-0001");
      client.set("notes", "Registro de demonstração do portal.");
      client.set("verified", true);
      app.save(client);
    }

    // --- processo de demonstração ---
    const processes = app.findCollectionByNameOrId("processes");
    const proc = new Record(processes);
    proc.set("client", client.id);
    proc.set("title", "Usucapião extrajudicial — Imóvel em São Paulo");
    proc.set("number", "0001234-56.2026.8.26.0100");
    proc.set("area", "Direito Imobiliário");
    proc.set("status", "ativo");
    proc.set("stage", "Instrução do pedido na serventia");
    proc.set("summary", "Pedido de usucapião extrajudicial de imóvel urbano, com planta assinada e anuência dos confrontantes em fase de colheita.");
    app.save(proc);

    const events = app.findCollectionByNameOrId("events");
    [
      ["2026-06-02 09:00:00", "Distribuição do pedido", "Pedido protocolado na serventia extrajudicial competente.", "andamento"],
      ["2026-06-20 14:00:00", "Certidões expedidas", "Recebidas as certidões negativas de ônus reais e ações reipersecutórias.", "documento"],
      ["2026-07-15 10:30:00", "Notificação dos confrontantes", "Confrontantes notificados; prazo de 15 dias para manifestação.", "prazo"],
      ["2026-08-05 11:00:00", "Anuência parcial colhida", "Dois confrontantes anuíram expressamente com o pedido.", "andamento"],
    ].forEach(([date, title, description, type]) => {
      const ev = new Record(events);
      ev.set("process", proc.id);
      ev.set("date", date);
      ev.set("title", title);
      ev.set("description", description);
      ev.set("type", type);
      app.save(ev);
    });

    const documents = app.findCollectionByNameOrId("documents");
    [
      ["Planta e memorial descritivo", "Documento assinado pelo engenheiro responsável, com ART.", "https://example.com/planta-memorial.pdf", true],
      ["Checklist de documentos do cliente", "Relação de documentos pessoais e do imóvel necessários.", "https://example.com/checklist.pdf", true],
    ].forEach(([title, description, url, visible]) => {
      const doc = new Record(documents);
      doc.set("process", proc.id);
      doc.set("title", title);
      doc.set("description", description);
      doc.set("external_url", url);
      doc.set("visible", visible);
      app.save(doc);
    });

    const pendencias = app.findCollectionByNameOrId("pendencias");
    [
      ["Enviar comprovante de residência atualizado", "Documento necessário para instruir a petição.", "2026-09-10 18:00:00", false, true],
      ["Aguardar certidão da Prefeitura", "Certidão de dados cadastrais do imóvel solicitada ao município.", "2026-09-20 18:00:00", false, false],
    ].forEach(([title, description, due, done, forClient]) => {
      const p = new Record(pendencias);
      p.set("process", proc.id);
      p.set("title", title);
      p.set("description", description);
      p.set("due", due);
      p.set("done", done);
      p.set("for_client", forClient);
      app.save(p);
    });

    const appointments = app.findCollectionByNameOrId("appointments");
    const ap = new Record(appointments);
    ap.set("client", client.id);
    ap.set("date", "2026-09-12 14:00:00");
    ap.set("title", "Reunião de acompanhamento");
    ap.set("location", "Escritório — Av. Paulista, 1000, São Paulo");
    ap.set("notes", "Revisão das certidões e próximos passos da instrução.");
    app.save(ap);

    const financial = app.findCollectionByNameOrId("financial");
    [
      ["Honorários — parcela 1 de 3", 2500, "2026-07-10 23:59:59", "pago", true],
      ["Honorários — parcela 2 de 3", 2500, "2026-09-10 23:59:59", "pendente", true],
    ].forEach(([description, amount, due, status, visible]) => {
      const f = new Record(financial);
      f.set("client", client.id);
      f.set("description", description);
      f.set("amount", amount);
      f.set("due", due);
      f.set("status", status);
      f.set("visible", visible);
      app.save(f);
    });

    // --- posts do blog ---
    const posts = app.findCollectionByNameOrId("posts");
    const seedPosts = [
      {
        title: "Usucapião: como transformar posse em propriedade",
        slug: "usucapiao-como-transformar-posse-em-propriedade",
        excerpt: "Entenda os requisitos da usucapião urbana e rural, os documentos necessários e quando é possível fazer o pedido direto no cartório.",
        category: "Direito Imobiliário",
        tags: "usucapião, posse, propriedade, regularização imobiliária",
        content: [
          "A usucapião é o instituto que permite converter a **posse prolongada e qualificada** em propriedade registrada. Para quem vive há anos em um imóvel sem escritura, é o caminho mais seguro para regularizar a situação.",
          "",
          "## Requisitos essenciais",
          "",
          "- Posse mansa, pacífica e ininterrupta;",
          "- Animus domini: a intenção de se comportar como dono;",
          "- Prazo legal, que varia conforme a modalidade (de 2 a 15 anos);",
          "- Planta e memorial descritivo assinados por profissional habilitado.",
          "",
          "> A posse precisa ser pública e contínua. Períodos de ocultação ou litígio interrompem o prazo.",
          "",
          "## Via judicial ou extrajudicial?",
          "",
          "Desde 2015, é possível requerer a usucapião **diretamente no cartório de registro de imóveis**, com anuência dos confrontantes e do Ministério Público quando houver interesse de incapazes. A via extrajudicial costuma ser mais rápida e econômica.",
          "",
          "## Documentos básicos",
          "",
          "1. Documentos pessoais do requerente;",
          "2. Planta, memorial descritivo e ART;",
          "3. Certidões negativas de ônus e ações;",
          "4. Comprovantes de posse (contas de consumo, IPTU, declarações).",
          "",
          "Cada caso tem particularidades. Uma análise jurídica prévia evita indeferimentos e retrabalho.",
        ].join("\n"),
      },
      {
        title: "Inventário: judicial ou extrajudicial, qual escolher?",
        slug: "inventario-judicial-ou-extrajudicial",
        excerpt: "Compare prazos, custos e requisitos do inventário em cartório e do inventário judicial, e saiba quando cada via é obrigatória.",
        category: "Sucessões e Família",
        tags: "inventário, herança, partilha, divórcio, escritura",
        content: [
          "A abertura da sucessão exige a partilha dos bens entre herdeiros. A escolha entre a via **extrajudicial** (cartório) e a **judicial** impacta prazo, custo e desgaste da família.",
          "",
          "## Comparativo objetivo",
          "",
          "| Critério | Extrajudicial | Judicial |",
          "| --- | --- | --- |",
          "| Requisito | Herdeiros capazes e de acordo, com advogado | Obrigatório com menores, testamento ou litígio |",
          "| Prazo médio | 1 a 3 meses | 1 a 5 anos |",
          "| Custo | Emolumentos cartorários + honorários | Custas processuais + honorários |",
          "| Formalização | Escritura pública | Sentença e formal de partilha |",
          "",
          "## Quando a via judicial é obrigatória",
          "",
          "- Existência de herdeiros menores ou incapazes;",
          "- Testamento a ser cumprido;",
          "- Desacordo entre herdeiros sobre a partilha.",
          "",
          "## O papel do advogado",
          "",
          "Mesmo no cartório, a presença de advogado é **exigida por lei**. Ele garante que a partilha respeite a legítima, calcula o ITCMD corretamente e evita nulidades futuras.",
        ].join("\n"),
      },
      {
        title: "Regularização imobiliária: por onde começar",
        slug: "regularizacao-imobiliaria-por-onde-comecar",
        excerpt: "Escritura, registro, averbação e georreferenciamento: um roteiro claro para tirar o imóvel da informalidade com segurança jurídica.",
        category: "Direito Imobiliário",
        tags: "regularização, registro de imóveis, escritura, compra e venda, doação",
        content: [
          "Imóvel sem registro é patrimônio em risco: não pode ser vendido com segurança, financiado ou partilhado em inventário. A regularização devolve valor e liquidez ao bem.",
          "",
          "## Diagnóstico primeiro",
          "",
          "Antes de qualquer medida, é preciso mapear a situação documental:",
          "",
          "- Existe título de compra e venda, doação ou cessão?",
          "- O imóvel tem matrícula aberta no cartório de registro?",
          "- Há débitos de IPTU ou pendências na Prefeitura?",
          "",
          "## Caminhos mais comuns",
          "",
          "1. **Escritura pública + registro**, quando há título particular e vendedor localizado;",
          "2. **Usucapião**, quando a posse é antiga e o vendedor não aparece;",
          "3. **Adjudicação compulsória**, quando o vendedor se recusa a outorgar a escritura;",
          "4. **Georreferenciamento e retificação**, para corrigir medidas e confrontações.",
          "",
          "> Regularizar é quase sempre mais barato do que conviver com o risco: imóvel informal vale, em média, 30% a 50% menos no mercado.",
          "",
          "Um planejamento jurídico adequado escolhe a via mais rápida e evita duplicidade de custas.",
        ].join("\n"),
      },
    ];
    const publishDates = ["2026-08-20 09:00:00", "2026-08-27 09:00:00", "2026-09-01 09:00:00"];
    seedPosts.forEach((data, i) => {
      const post = new Record(posts);
      post.set("title", data.title);
      post.set("slug", data.slug);
      post.set("excerpt", data.excerpt);
      post.set("content", data.content);
      post.set("category", data.category);
      post.set("tags", data.tags);
      post.set("seo_title", data.title + " | Julio Damaso Advocacia");
      post.set("seo_description", data.excerpt);
      post.set("status", "publicado");
      post.set("publish_at", publishDates[i]);
      post.set("author", admin.id);
      app.save(post);
    });

    // --- link da bio ---
    const bio = app.findCollectionByNameOrId("bio_links");
    [
      ["Baixe o e-book: Guia da Regularização Imobiliária", "https://example.com/ebook-regularizacao.pdf", "ebook", 1, true],
      ["Fale comigo no WhatsApp", "https://wa.me/5511999999999", "whatsapp", 2, true],
      ["Instagram", "https://instagram.com/juliodamaso.adv", "social", 3, true],
      ["Artigos no blog", "/blog", "link", 4, true],
    ].forEach(([title, url, type, order, active]) => {
      const link = new Record(bio);
      link.set("title", title);
      link.set("url", url);
      link.set("type", type);
      link.set("order", order);
      link.set("active", active);
      app.save(link);
    });
  },
  (app) => {
    try {
      const admin = app.findAuthRecordByEmail("users", $os.getenv("PB_SUPERUSER_EMAIL"));
      app.delete(admin);
    } catch (e) {
      if (!e.message.includes("no rows in result set")) throw e;
    }
    try {
      const client = app.findAuthRecordByEmail("clients", "jd-0001@clientes.local");
      app.delete(client);
    } catch (e) {
      if (!e.message.includes("no rows in result set")) throw e;
    }
    ["posts", "bio_links"].forEach((name) => {
      app.findAllRecords(name).forEach((r) => app.delete(r));
    });
  },
);
