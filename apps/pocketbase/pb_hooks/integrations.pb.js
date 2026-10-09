/// <reference path="../pb_data/types.d.ts" />

// Matriz de Rastreabilidade — reações server-side de integração cruzada.
// Cada handler é autocontido (JSVM isola cada callback; nada do escopo externo).

// 1) Mudar fase no Kanban → grava em process_movements + atualiza linha do tempo (events)
onRecordUpdateRequest(function (e) {
  try {
    var old = $app.findRecordById("processes", e.record.id);
    e.record.withCustomData(true);
    e.record.set("__old_stage_ref", old.getString("stage_ref"));
    e.record.set("__old_stage_name", old.getString("stage"));
    // Recalcula SLA: ao mudar de etapa, reinicia o contador de dias na etapa
    var oldRef = old.getString("stage_ref");
    var newRef = e.record.getString("stage_ref");
    if (oldRef !== newRef && newRef !== "") {
      e.record.set("stage_entered_at", new Date().toISOString().replace("T", " ").slice(0, 19));
    }
  } catch (_) {}
  e.next();
}, "processes");

onRecordAfterUpdateSuccess(function (e) {
  try {
    var oldRef = "";
    var oldName = "";
    try { oldRef = e.record.get("__old_stage_ref") || ""; oldName = e.record.get("__old_stage_name") || ""; } catch (_) {}
    var newRef = e.record.getString("stage_ref");
    var newName = e.record.getString("stage");
    if (oldRef === newRef || newRef === "") { e.next(); return; }

    // grava em process_movements
    var mvCol = $app.findCollectionByNameOrId("process_movements");
    var mv = new Record(mvCol);
    mv.set("process", e.record.id);
    mv.set("from_stage", oldName);
    mv.set("to_stage", newName);
    mv.set("to_stage_ref", newRef);
    try { var a = e.requestInfo && e.requestInfo.auth; if (a) mv.set("actor", a.id); } catch (_) {}
    $app.save(mv);

    // atualiza linha do tempo do Portal (events, visível ao cliente)
    var evCol = $app.findCollectionByNameOrId("events");
    var ev = new Record(evCol);
    ev.set("process", e.record.id);
    ev.set("title", "Movimentação de etapa: " + newName);
    ev.set("description", "Processo movido para a etapa \"" + newName + "\"" + (oldName ? " (de \"" + oldName + "\")" : "") + ".");
    ev.set("type", "andamento");
    ev.set("date", new Date().toISOString().replace("T", " ").slice(0, 19));
    ev.set("visible", true);
    $app.save(ev);
  } catch (err) {
    try { $app.logger().error("integration movement failed", "err", String(err)); } catch (_) {}
  }
  e.next();
}, "processes");

// 2) Inserir Audiência → cria alerta no Dashboard (notification)
onRecordAfterCreateSuccess(function (e) {
  try {
    var title = e.record.getString("title");
    var dateStr = e.record.getString("date");
    var nCol = $app.findCollectionByNameOrId("notifications");
    var n = new Record(nCol);
    n.set("title", "Novo compromisso: " + title);
    n.set("body", "Agendado para " + (dateStr || "data a definir") + ".");
    n.set("kind", "sistema");
    n.set("link", "/restrito/painel/agenda");
    n.set("read", false);
    $app.save(n);
  } catch (err) {
    try { $app.logger().error("integration appt notify failed", "err", String(err)); } catch (_) {}
  }
  e.next();
}, "appointments");

// 3) Upload pelo Cliente → notifica o advogado + registra log LGPD
onRecordAfterCreateSuccess(function (e) {
  try {
    var auth = e.requestInfo && e.requestInfo.auth;
    var isClient = false;
    try { isClient = !!auth && auth.collection().name === "clients"; } catch (_) {}
    if (!isClient) { e.next(); return; }

    var title = e.record.getString("title");
    var who = "";
    try { who = auth.getString("name") || auth.getString("protocol"); } catch (_) {}

    // notificação ao advogado
    var nCol = $app.findCollectionByNameOrId("notifications");
    var n = new Record(nCol);
    n.set("title", "Cliente enviou documento: " + title);
    n.set("body", "Revisar e liberar no portal. Enviado por " + (who || "cliente") + ".");
    n.set("kind", "sistema");
    n.set("link", "/restrito/painel/processos/" + e.record.getString("process"));
    n.set("read", false);
    $app.save(n);

    // log LGPD
    var lgCol = $app.findCollectionByNameOrId("lgpd_logs");
    var lg = new Record(lgCol);
    lg.set("actor", who || "cliente");
    try { lg.set("actor_ref", auth.id); } catch (_) {}
    lg.set("action", "upload_documento");
    lg.set("collection_name", "documents");
    lg.set("record_id", e.record.id);
    lg.set("detail", "Cliente " + (auth.getString("protocol") || "") + " enviou o documento \"" + title + "\" via portal.");
    $app.save(lg);
  } catch (err) {
    try { $app.logger().error("integration client upload log failed", "err", String(err)); } catch (_) {}
  }
  e.next();
}, "documents");
