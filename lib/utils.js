import { spawnSync } from "child_process";

/**
 * Detects the available package manager on the system.
 * Checks in priority order: pnpm, yarn, bun, npm.
 * 
 * @returns {string|null} The name of the first available package manager, or null if none found.
 */
export function detectPackageManager() {
  const packageManagers = ["pnpm", "yarn", "bun", "npm"];

  for (const pm of packageManagers) {
    try {
      const result = spawnSync(pm, ["--version"], {
        stdio: "ignore",
        shell: true,
      });

      if (result.status === 0) {
        return pm;
      }
    } catch (err) {
      // Command not found, continue to next package manager
      continue;
    }
  }

  return null;
}
