import test from "node:test";
import assert from "node:assert/strict";
import worker, { isUuid } from "./public.js";

function createDatabase() {
    const specimens = [];
    return {
        specimens,
        prepare(sql) {
            let params = [];
            return {
                bind(...values) {
                    params = values;
                    return this;
                },
                async all() {
                    return { results: [...specimens] };
                },
                async first() {
                    if (sql.includes("WHERE id = ?")) {
                        const record = specimens.find(specimen => specimen.id === params[0]);
                        return record ? { specimen_code: record.specimen_code, status: record.status, ...record } : null;
                    }
                    return null;
                },
                async run() {
                    if (sql.includes("INSERT INTO specimens")) {
                        const [id, specimen_code, sample_type, participant_study_ref, collection_date, status, created_by, logged_by] = params;
                        specimens.unshift({ id, specimen_code, sample_type, participant_study_ref, collection_date, status, created_by, logged_by });
                    }
                    return { meta: { changes: 1 } };
                }
            };
        },
        async batch() {
            return [{ meta: { changes: 1 } }, { meta: { changes: 1 } }];
        }
    };
}

test("UUID validation accepts v4 identifiers and rejects malformed input", () => {
    assert.equal(isUuid("b6f7467e-3378-4c34-96c8-56a3726e6624"), true);
    assert.equal(isUuid("not-a-uuid"), false);
});

test("health endpoint declares that the specimen API is public", async () => {
    const response = await worker.fetch(
        new Request("https://lumko.example/api/health"),
        {}
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
        ok: true,
        authenticationRequired: false,
        publicReadWrite: true
    });
});

test("specimens can be read without credentials", async () => {
    const DB = createDatabase();
    const response = await worker.fetch(
        new Request("https://lumko.example/api/specimens"),
        { DB }
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { specimens: [] });
});

test("specimens can be created without credentials and use an anonymous audit identity", async () => {
    const DB = createDatabase();
    const response = await worker.fetch(
        new Request("https://lumko.example/api/specimens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sampleType: "Blood Sample",
                participantStudyRef: "DEMO-P-001"
            })
        }),
        { DB }
    );
    assert.equal(response.status, 201);
    const { specimen } = await response.json();
    assert.equal(specimen.participant_study_ref, "DEMO-P-001");
    assert.equal(specimen.created_by, "public-anonymous-access");
    assert.equal(specimen.logged_by, "Public visitor (unauthenticated)");
});

test("public specimen creation validates input", async () => {
    const response = await worker.fetch(
        new Request("https://lumko.example/api/specimens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sampleType: "Unknown", participantStudyRef: "" })
        }),
        { DB: createDatabase() }
    );
    assert.equal(response.status, 400);
});

test("specimen statuses can be changed without credentials", async () => {
    const DB = createDatabase();
    const specimenId = "b6f7467e-3378-4c34-96c8-56a3726e6624";
    DB.specimens.push({
        id: specimenId,
        specimen_code: "SPEC-2026-TEST",
        sample_type: "Blood Sample",
        participant_study_ref: "DEMO-P-001",
        collection_date: "2026-10-01",
        status: "Received",
        created_by: "public-anonymous-access",
        logged_by: "Public visitor (unauthenticated)"
    });
    const response = await worker.fetch(
        new Request("https://lumko.example/api/specimens", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: specimenId, status: "Processing" })
        }),
        { DB }
    );
    assert.equal(response.status, 200);
});

test("unknown API route returns 404", async () => {
    const response = await worker.fetch(
        new Request("https://lumko.example/api/not-a-route"),
        {}
    );
    assert.equal(response.status, 404);
});
