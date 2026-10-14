const SPECIMEN_TYPES = new Set([
    "Blood Sample",
    "Tissue Biopsy",
    "Plasma Sample",
    "Serum Sample",
    "Other Clinical Specimen"
]);
const SPECIMEN_STATUSES = new Set(["Received", "Processing", "Stored", "Archived"]);
const MAX_JSON_BYTES = 4096;
const SPECIMEN_LIMIT = 200;
const PUBLIC_ACTOR = "public-anonymous-access";

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff"
        }
    });
}

async function parseJson(request) {
    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > MAX_JSON_BYTES) throw new Error("Request is too large.");
    if (!request.body) throw new Error("Request body must be a JSON object.");
    const reader = request.body.getReader();
    const chunks = [];
    let byteLength = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        byteLength += value.byteLength;
        if (byteLength > MAX_JSON_BYTES) {
            await reader.cancel();
            throw new Error("Request is too large.");
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    chunks.forEach(chunk => {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    });
    let body;
    try {
        body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        throw new Error("Request body must contain valid JSON.");
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        throw new Error("Request body must be a JSON object.");
    }
    return body;
}

function isUuid(value) {
    return typeof value === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function handleApi(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/health") {
        return jsonResponse({ ok: true, authenticationRequired: false, publicReadWrite: true });
    }
    if (url.pathname !== "/api/specimens") {
        return jsonResponse({ error: "API route not found." }, 404);
    }

    if (request.method === "GET") {
        const result = await env.DB.prepare(
            `SELECT id, specimen_code, sample_type, participant_study_ref,
                    collection_date, status, created_by, logged_by, created_at, updated_at
               FROM specimens
              ORDER BY created_at DESC
              LIMIT ?`
        ).bind(SPECIMEN_LIMIT).all();
        return jsonResponse({ specimens: result.results || [] });
    }

    if (request.method === "POST") {
        let body;
        try {
            body = await parseJson(request);
        } catch (error) {
            return jsonResponse({ error: error.message }, 400);
        }
        const sampleType = typeof body.sampleType === "string" ? body.sampleType : "";
        const reference = typeof body.participantStudyRef === "string"
            ? body.participantStudyRef.trim()
            : "";
        if (!SPECIMEN_TYPES.has(sampleType) || reference.length > 120) {
            return jsonResponse({ error: "Choose a valid specimen type and a reference of 120 characters or fewer." }, 400);
        }

        const id = crypto.randomUUID();
        const date = new Date().toISOString().slice(0, 10);
        const specimen = {
            id,
            specimen_code: `SPEC-${date.slice(0, 4)}-${id.slice(0, 8).toUpperCase()}`,
            sample_type: sampleType,
            participant_study_ref: reference || "Not specified",
            collection_date: date,
            status: "Received",
            created_by: PUBLIC_ACTOR,
            logged_by: "Public visitor (unauthenticated)"
        };
        await env.DB.prepare(
            `INSERT INTO specimens
                (id, specimen_code, sample_type, participant_study_ref, collection_date, status, created_by, logged_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
            specimen.id,
            specimen.specimen_code,
            specimen.sample_type,
            specimen.participant_study_ref,
            specimen.collection_date,
            specimen.status,
            specimen.created_by,
            specimen.logged_by
        ).run();
        return jsonResponse({ specimen }, 201);
    }

    if (request.method === "PATCH") {
        let body;
        try {
            body = await parseJson(request);
        } catch (error) {
            return jsonResponse({ error: error.message }, 400);
        }
        if (!isUuid(body.id) || !SPECIMEN_STATUSES.has(body.status)) {
            return jsonResponse({ error: "Provide a valid specimen ID and status." }, 400);
        }
        const previous = await env.DB.prepare(
            "SELECT specimen_code, status FROM specimens WHERE id = ?"
        ).bind(body.id).first();
        if (!previous) return jsonResponse({ error: "Specimen not found." }, 404);
        if (previous.status === body.status) {
            return jsonResponse({ error: "Specimen already has that status." }, 409);
        }

        const updateResults = await env.DB.batch([
            env.DB.prepare(
                `UPDATE specimens
                    SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
                  WHERE id = ? AND status = ?`
            ).bind(body.status, body.id, previous.status),
            env.DB.prepare(
                `INSERT INTO specimen_audit_log
                    (specimen_id, specimen_code, actor_uid, action, old_status, new_status)
                 SELECT ?, ?, ?, 'status_changed', ?, ?
                  WHERE changes() = 1`
            ).bind(body.id, previous.specimen_code, PUBLIC_ACTOR, previous.status, body.status)
        ]);
        if (updateResults[0].meta.changes !== 1) {
            return jsonResponse({ error: "Specimen changed during this update. Refresh and retry." }, 409);
        }
        const updated = await env.DB.prepare(
            `SELECT id, specimen_code, sample_type, participant_study_ref,
                    collection_date, status, created_by, logged_by, created_at, updated_at
               FROM specimens WHERE id = ?`
        ).bind(body.id).first();
        return jsonResponse({ specimen: updated });
    }

    return jsonResponse({ error: "Method not allowed." }, 405);
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        if (url.pathname === "/") {
            url.pathname = "/Connect%20IT%20Solutions%20Task%203%20Website/index.html";
            return env.ASSETS.fetch(new Request(url, request));
        }
        if (url.pathname.startsWith("/api/")) {
            try {
                return await handleApi(request, env);
            } catch (error) {
                console.error("Public Cloudflare API request failed.", error);
                return jsonResponse({ error: "The request could not be completed. Please retry." }, 500);
            }
        }
        return env.ASSETS.fetch(request);
    }
};

export { handleApi, isUuid };
