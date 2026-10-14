import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(projectRoot, "dist");
const publicDirectories = [
    "Connect IT Solutions Task 3 Website",
    "Connect IT Solutions application APK V1"
];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const directory of publicDirectories) {
    await cp(
        path.join(projectRoot, directory),
        path.join(outputDirectory, directory),
        { recursive: true }
    );
}

console.log(`Built ${publicDirectories.length} site directories into dist/.`);
