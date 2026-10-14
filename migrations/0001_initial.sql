PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS staff_users (
    firebase_uid TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL CHECK (length(display_name) BETWEEN 2 AND 100),
    role TEXT NOT NULL CHECK (role IN ('staff', 'it')),
    active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS specimens (
    id TEXT PRIMARY KEY,
    specimen_code TEXT NOT NULL UNIQUE,
    sample_type TEXT NOT NULL CHECK (
        sample_type IN (
            'Blood Sample',
            'Tissue Biopsy',
            'Plasma Sample',
            'Serum Sample',
            'Other Clinical Specimen'
        )
    ),
    participant_study_ref TEXT NOT NULL DEFAULT 'Not specified'
        CHECK (length(participant_study_ref) <= 120),
    collection_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Received'
        CHECK (status IN ('Received', 'Processing', 'Stored', 'Archived')),
    created_by TEXT NOT NULL REFERENCES staff_users(firebase_uid),
    logged_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS specimen_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    specimen_id TEXT NOT NULL REFERENCES specimens(id),
    specimen_code TEXT NOT NULL,
    actor_uid TEXT NOT NULL REFERENCES staff_users(firebase_uid),
    action TEXT NOT NULL CHECK (action IN ('created', 'status_changed')),
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS specimens_collection_date_idx
    ON specimens (collection_date DESC);
CREATE INDEX IF NOT EXISTS specimens_status_idx
    ON specimens (status);
CREATE INDEX IF NOT EXISTS specimens_created_by_idx
    ON specimens (created_by);
CREATE INDEX IF NOT EXISTS specimen_audit_log_code_idx
    ON specimen_audit_log (specimen_code, changed_at DESC);

CREATE TRIGGER IF NOT EXISTS specimens_audit_insert
AFTER INSERT ON specimens
BEGIN
    INSERT INTO specimen_audit_log (
        specimen_id, specimen_code, actor_uid, action, old_status, new_status
    ) VALUES (
        NEW.id, NEW.specimen_code, NEW.created_by, 'created', NULL, NEW.status
    );
END;
