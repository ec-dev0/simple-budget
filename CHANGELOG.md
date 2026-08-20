# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-08-20

### Added
- GHCR badge and `## Screenshots` placeholder (`docs/screenshots/preview1.png`)
  in `README.md` and `README.es.md`, plus `docker pull …:latest` quick-start in
  the Docker section of both READMEs.
- Toast hint shown when trying to mark an item as bought without an actual cost,
  telling the user to add it via the edit action (bilingual: `es`/`en`,
  auto-dismiss after 6 s, `role="status"`).

### Changed
- Marking an item as bought without an actual cost no longer opens the
  "Mark as bought" form nor toggles the checkbox: the check is rejected and the
  hint toast appears instead.
- `CHANGELOG.md` moved from `docs/` to the repository root.

### Fixed
- Dark-mode contrast of the native currency `<select>` in the budget form: the
  dropdown list now uses the theme tokens (`--surface`, `--ink`, `--accent-soft`)
  and the control uses a custom chevron that matches the paper aesthetic
  (light/dark variants), replacing the OS-native arrow.

## [0.1.0] - 2026-08-20

### Added
- GitHub Actions workflow (`.github/workflows/docker.yml`) that builds and publishes
  a Docker image to GHCR (`ghcr.io/ec-dev0/simple-budget`) on every push, on tag
  releases (`v*.*.*`) and manually (`workflow_dispatch`). Pull requests build the image
  for validation but do not publish.
- BuildKit and Buildx setup with GitHub Actions cache (`type=gha`) so subsequent
  builds reuse the Bun install cache and the image layer cache.
- Docker metadata labels (title, description, source, license) and provenance/SBOM
  attestations on published images.
- This `CHANGELOG.md` file following Keep a Changelog 1.1.0.

### Changed
- `Dockerfile` upgraded to `syntax=docker/dockerfile:1.7` and both `bun install` runs
  now use `--mount=type=cache,target=/root/.bun/install/cache`, dramatically cutting
  CI build times on warm caches.

[0.2.0]: https://github.com/ec-dev0/simple-budget/releases/tag/v0.2.0
[0.1.0]: https://github.com/ec-dev0/simple-budget/releases/tag/v0.1.0
