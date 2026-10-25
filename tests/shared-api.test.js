import test from "node:test";
import assert from "node:assert/strict";

const localStorageData = new Map();
globalThis.window = {};
globalThis.localStorage = {
    getItem(key) {
        return localStorageData.get(key) ?? null;
    },
    setItem(key, value) {
        localStorageData.set(key, value);
    }
};

const { LumkoData } = await import("../Connect IT Solutions Task 3 Website/shared-api.js");

test("specimen records are created and read from browser-local storage", async () => {
    localStorageData.clear();
    const specimen = await LumkoData.createSpecimen("Blood Sample", "DEMO-P-001");

    assert.equal(specimen.participant_study_ref, "DEMO-P-001");
    assert.equal(specimen.status, "Received");
    assert.equal(specimen.logged_by, "Presentation user (browser-local)");
    assert.deepEqual(await LumkoData.listSpecimens(), [specimen]);
});

test("specimen status changes are persisted in browser-local storage", async () => {
    localStorageData.clear();
    const specimen = await LumkoData.createSpecimen("Blood Sample", "DEMO-P-002");

    const updated = await LumkoData.updateSpecimenStatus(specimen.id, "Processing");

    assert.equal(updated.status, "Processing");
    assert.equal((await LumkoData.listSpecimens())[0].status, "Processing");
});

test("invalid specimen input is rejected", async () => {
    await assert.rejects(
        LumkoData.createSpecimen("Unknown", "DEMO-P-003"),
        /valid specimen type/
    );
});
