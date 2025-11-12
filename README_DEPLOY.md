(Deployment notes)

(1) Secrets required

 - Add `CF_API_TOKEN` to the repository Secrets (GitHub > Settings > Secrets and variables > Actions). The supplied workflow uses this token to authenticate `wrangler publish`.

(2) wrangler.toml

 - The repository contains a minimal `wrangler.toml`. Edit it to add your `account_id`, `zone_id`, and `route` if you want to publish to a specific route. For testing `workers_dev` mode, set `workers_dev = true` (already set).

(3) Local dry-run

 - You can test locally with the build script:

	 npm install
	 npm run build

	 This runs `wrangler deploy --dry-run` and helps catch configuration issues before pushing.

(4) Workflow

 - The GitHub Actions workflow at `.github/workflows/deploy.yml` runs on push to `main`. It installs `wrangler` and runs `wrangler publish`. If you prefer `wrangler deploy` or different flags, edit the workflow accordingly.
