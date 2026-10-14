async function apiRequest(path, options = {}) {
    const response = await fetch(path, {
        ...options,
        headers: {
            Accept: "application/json",
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers
        },
        cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `The server returned ${response.status}.`);
    return result;
}

window.LumkoData = {
    async listSpecimens() {
        const result = await apiRequest("/api/specimens");
        return result.specimens;
    },
    async createSpecimen(sampleType, participantStudyRef) {
        const result = await apiRequest("/api/specimens", {
            method: "POST",
            body: JSON.stringify({ sampleType, participantStudyRef })
        });
        return result.specimen;
    },
    async updateSpecimenStatus(id, status) {
        const result = await apiRequest("/api/specimens", {
            method: "PATCH",
            body: JSON.stringify({ id, status })
        });
        return result.specimen;
    }
};
