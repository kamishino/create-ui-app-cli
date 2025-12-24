import { spawnSync } from "child_process";
import fs from "fs-extra";
import path from "path";

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

/**
 * Checks if the project supports AI-assisted releases.
 * Detects the presence of 'project:release' script in package.json.
 *
 * @param {string} targetDir - The target project directory
 * @returns {boolean} True if AI release support is detected, false otherwise
 */
export function checkAiReleaseSupport(targetDir) {
  try {
    const packageJsonPath = path.join(targetDir, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

    // Check if project:release script exists
    return !!(packageJson.scripts && packageJson.scripts["project:release"]);
  } catch (err) {
    // Silently fail if there's any error reading package.json
    return false;
  }
}
