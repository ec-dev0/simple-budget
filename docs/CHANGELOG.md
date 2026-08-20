# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/ec-dev0/simple-budget/releases/tag/v0.1.0
