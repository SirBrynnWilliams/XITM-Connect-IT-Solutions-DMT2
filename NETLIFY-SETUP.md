# Netlify static presentation

Netlify builds the website and companion LIMS presentation as static files. These builds do not deploy the Cloudflare Worker or connect to its D1 database.

## Website site

Create a Netlify site from this repository with the settings in `netlify.toml`:

- Build command: `npm run build:website`
- Publish directory: `dist/website`
- Suggested site name: `lumko-medical-research-facility-website`

The companion mobile app is also available on this site at `/Connect%20IT%20Solutions%20application%20APK%20V1/index.html`.

## Mobile app site

Create a second Netlify site from the same repository. Set its build command to `npm run build:mobile` and its publish directory to `dist/mobile`. Suggested site name: `lumko-mobile`. These names are suggestions; Netlify requires each name to be available. The resulting addresses will be `https://<site-name>.netlify.app`.

Netlify's Git integration builds committed files from GitHub, not uncommitted workspace changes. Push the desired project changes to the repository before connecting either site, or deploy the built output folders manually.

The standalone mobile site and website site have different origins. Browser-local data is separate for each site, so specimen records will not sync between them. The app's LIMS records are stored only in the browser and are not sent to a server.

Netlify's URLs can be opened by anyone who obtains the link; an unlisted URL is not authentication or access control.

## Presentation data and limitations

These static sites store specimen presentation records in the current browser's local storage. Records are not sent to a server, are not shared with other browsers or between the separate Netlify sites, and do not provide account authentication. Other demonstration forms that use local storage are also limited to the current browser. Use fictional information only; do not enter patient, participant, credential, confidential research, or other sensitive information.

## Cloudflare resources

Deploying this static site does not disable or delete an already-deployed Cloudflare Worker or its D1 database. To stop the previous Cloudflare URL and API from being reachable, disable or delete the Worker from the Cloudflare account dashboard. Do not delete the D1 database unless its data is no longer needed. The Netlify site does not call the Worker.
