INSERT OR IGNORE INTO staff_users (firebase_uid, email, display_name, role, active)
VALUES (
    'public-anonymous-access',
    'public-access@lumko.invalid',
    'Public visitor (unauthenticated)',
    'staff',
    1
);
