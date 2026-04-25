const { existsSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const { join } = require("node:path");

const repoRoot = join(__dirname, "..", "..", "..");
const repoRootGit = join(repoRoot, ".git");
let huskyCli;

try {
  huskyCli = require.resolve("husky/bin.js", {
    paths: [join(__dirname, "..")],
  });
} catch {
  process.exit(0);
}

if (!existsSync(repoRootGit)) {
  process.exit(0);
}

const result = spawnSync(process.execPath, [huskyCli, "apps/web/.husky"], {
  stdio: "inherit",
  cwd: repoRoot,
  shell: false,
});

if (result.error) {
  console.error("Failed to run husky prepare step:", result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
