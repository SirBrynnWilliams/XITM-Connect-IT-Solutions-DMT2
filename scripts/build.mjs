import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(projectRoot, "dist");
const websiteDirectory = "Connect IT Solutions Task 3 Website";
const mobileDirectory = "Connect IT Solutions application APK V1";
const buildTarget = process.argv[2] || "combined";

await mkdir(outputDirectory, { recursive: true });

async function copyDirectory(sourceDirectory, destinationDirectory) {
    await rm(destinationDirectory, { recursive: true, force: true });
    await cp(
        path.join(projectRoot, sourceDirectory),
        destinationDirectory,
        { recursive: true }
    );
}

async function copyMobileApp(destinationDirectory) {
    await copyDirectory(mobileDirectory, destinationDirectory);
    await cp(
        path.join(projectRoot, websiteDirectory, "shared-api.js"),
        path.join(destinationDirectory, "shared-api.js")
    );
}

if (buildTarget === "combined") {
    await rm(outputDirectory, { recursive: true, force: true });
    await mkdir(outputDirectory, { recursive: true });
    await copyDirectory(websiteDirectory, path.join(outputDirectory, websiteDirectory));
    await copyMobileApp(path.join(outputDirectory, mobileDirectory));
    console.log("Built the combined website and mobile app into dist/.");
} else if (buildTarget === "website") {
    const websiteOutput = path.join(outputDirectory, "website");
    await copyDirectory(websiteDirectory, path.join(websiteOutput, websiteDirectory));
    await copyMobileApp(path.join(websiteOutput, mobileDirectory));
    await writeFile(
        path.join(websiteOutput, "_redirects"),
        "/ /Connect%20IT%20Solutions%20Task%203%20Website/index.html 200\n"
    );
    console.log("Built the website and companion app into dist/website/.");
} else if (buildTarget === "mobile") {
    await copyMobileApp(path.join(outputDirectory, "mobile"));
    console.log("Built the standalone mobile app into dist/mobile/.");
} else {
    throw new Error(`Unknown build target "${buildTarget}". Choose combined, website, or mobile.`);
}
