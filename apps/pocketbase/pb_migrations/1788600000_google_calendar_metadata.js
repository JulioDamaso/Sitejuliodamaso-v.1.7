/// <reference path="../pb_data/types.d.ts" />

// Metadados externos para sincronização idempotente com o Google Calendar.
migrate(
  (app) => {
    const appointments = app.findCollectionByNameOrId("appointments");
    const add = (field) => { if (!appointments.fields.getByName(field.name)) appointments.fields.add(field); };

    add(new TextField({ name: "google_calendar_id", max: 200 }));
    add(new TextField({ name: "google_event_id", max: 200 }));
    add(new TextField({ name: "google_etag", max: 200 }));
    add(new DateField({ name: "google_updated_at" }));
    add(new SelectField({ name: "google_sync_status", maxSelect: 1, values: ["local", "sincronizado", "conflito", "removido"] }));
    appointments.indexes = appointments.indexes || [];
    if (!appointments.indexes.some((i) => String(i).includes("idx_appointments_google_event"))) {
      appointments.indexes.push("CREATE UNIQUE INDEX idx_appointments_google_event ON appointments (google_calendar_id, google_event_id) WHERE google_event_id != ''");
    }
    app.save(appointments);
  },
  (app) => {
    try {
      const appointments = app.findCollectionByNameOrId("appointments");
      ["google_calendar_id", "google_event_id", "google_etag", "google_updated_at", "google_sync_status"].forEach((name) => {
        try { appointments.fields.removeByName(name); } catch (_) {}
      });
      appointments.indexes = (appointments.indexes || []).filter((i) => !String(i).includes("idx_appointments_google_event"));
      app.save(appointments);
    } catch (_) {}
  },
);
