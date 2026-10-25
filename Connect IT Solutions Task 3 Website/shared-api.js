const STORAGE_KEY = "lumko-presentation-specimens-v1";
const SPECIMEN_TYPES = new Set([
    "Blood Sample",
    "Tissue Biopsy",
    "Plasma Sample",
    "Serum Sample",
    "Other Clinical Specimen"
]);
const SPECIMEN_STATUSES = new Set(["Received", "Processing", "Stored", "Archived"]);

function readSpecimens() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return [];

    let specimens;
    try {
        specimens = JSON.parse(stored);
    } catch {
        throw new Error("Browser-local specimen data is invalid. Clear this site's stored data to continue.");
    }
    if (!Array.isArray(specimens)) {
        throw new Error("Browser-local specimen data is invalid. Clear this site's stored data to continue.");
    }
    return specimens;
}

function writeSpecimens(specimens) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(specimens));
}

const LumkoData = {
    async listSpecimens() {
        return readSpecimens();
    },
    async createSpecimen(sampleType, participantStudyRef) {
        const reference = typeof participantStudyRef === "string" ? participantStudyRef.trim() : "";
        if (!SPECIMEN_TYPES.has(sampleType) || reference.length > 120) {
            throw new Error("Choose a valid specimen type and a reference of 120 characters or fewer.");
        }

        const id = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        const specimen = {
            id,
            specimen_code: `SPEC-${timestamp.slice(0, 4)}-${id.slice(0, 8).toUpperCase()}`,
            sample_type: sampleType,
            participant_study_ref: reference || "Not specified",
            collection_date: timestamp.slice(0, 10),
            status: "Received",
            created_by: "browser-local-presentation",
            logged_by: "Presentation user (browser-local)",
            created_at: timestamp,
            updated_at: timestamp
        };
        writeSpecimens([specimen, ...readSpecimens()]);
        return specimen;
    },
    async updateSpecimenStatus(id, status) {
        if (typeof id !== "string" || !SPECIMEN_STATUSES.has(status)) {
            throw new Error("Provide a valid specimen ID and status.");
        }
        const specimens = readSpecimens();
        const index = specimens.findIndex(specimen => specimen.id === id);
        if (index === -1) throw new Error("Specimen not found in this browser.");
        if (specimens[index].status === status) {
            throw new Error("Specimen already has that status.");
        }

        const updatedSpecimen = { ...specimens[index], status, updated_at: new Date().toISOString() };
        specimens[index] = updatedSpecimen;
        writeSpecimens(specimens);
        return updatedSpecimen;
    }
};

window.LumkoData = LumkoData;

export { LumkoData };
