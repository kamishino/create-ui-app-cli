#!/usr/bin/env node

import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import chalk from "chalk";
import { spawnSync } from "child_process";
import { config, getTemplates, hasTemplates } from "./lib/config.js";
import { configWizard, manageTemplates } from "./lib/wizard.js";
import {
  detectPackageManager,
  checkAiReleaseSupport,
  getUniqueProjectName,
} from "./lib/utils.js";

async function init() {
  // Check for --config flag
  if (process.argv.includes("--config")) {
    await manageTemplates(config);
    return;
  }

  // Parse installation flags
  const shouldInstall = process.argv.includes("--install");
  const shouldSkipInstall = process.argv.includes("--no-install");

  // Default behavior: skip installation if no flag is specified
  const autoInstall = shouldInstall && !shouldSkipInstall;

  console.log(chalk.bold.cyan("\n🚀 UI Scaffold CLI (create-ui-app)\n"));

  // 1. Check if templates exist
  if (!hasTemplates()) {
    const { runWizard } = await prompts({
      type: "confirm",
      name: "runWizard",
      message: "No templates found. Run configuration wizard?",
      initial: true,
    });

    if (runWizard) {
      await configWizard(config);
    } else {
      console.log(
        chalk.yellow(
          "\n⚠️  Operation cancelled. Run with --config to add templates later.\n"
        )
      );
      process.exit(0);
    }
  }

  // 2. Get Templates
  const templates = getTemplates();
  if (!templates) {
    process.exit(0);
  }

  // 3. Prompt User
  const response = await prompts([
    {
      type: "text",
      name: "projectName",
      message: "What is the project name?",
      initial: "my-app",
      validate: (value) =>
        value.trim().length > 0 ? true : "Project name is required",
    },
    {
      type: "select",
      name: "template",
      message: "Which template would you like to use?",
      choices: templates,
      initial: 0,
    },
  ]);

  if (!response.projectName || !response.template) {
    console.log(chalk.yellow("\n⚠️  Operation cancelled."));
    process.exit(0);
  }

  let { projectName, template } = response;

  // Resolve naming conflicts automatically
  const uniqueName = getUniqueProjectName(projectName, process.cwd());

  if (uniqueName !== projectName) {
    console.log(
      chalk.yellow(
        `\n⚠️  Directory '${projectName}' already exists. Creating project in '${uniqueName}' instead.\n`
      )
    );
    projectName = uniqueName;
  }

  const targetDir = path.join(process.cwd(), projectName);

  // 4. Clone Repository
  console.log(
    chalk.dim(
      `\nDownloading template from ${template.repo}#${template.branch}...`
    )
  );

  try {
    // Use git clone directly to avoid 'rm' issues on Windows and handle private repos better
    const gitArgs = [
      "clone",
      "--depth",
      "1",
      "--branch",
      template.branch,
      template.repo,
      targetDir,
    ];
    const { status } = spawnSync("git", gitArgs, { stdio: "inherit" });

    if (status !== 0) {
      throw new Error(`Git clone failed with status ${status}`);
    }
  } catch (err) {
    console.error(chalk.red(`\n❌ Error cloning repository: ${err.message}`));
    if (err.message.includes("Host key verification failed")) {
      console.log(
        chalk.yellow("\n💡 Tip: Your SSH key is not authenticated with GitHub.")
      );
      console.log(
        chalk.gray("   Run this command to fix it: ssh -T git@github.com")
      );
      console.log(
        chalk.gray(
          "   Or update the template to use an HTTPS URL via 'npm run config'"
        )
      );
    } else {
      console.log(
        chalk.yellow(
          "Tip: Ensure you have SSH access to the repository if it is private."
        )
      );
    }
    process.exit(1);
  }

  // 5. Post-processing
  process.chdir(targetDir);

  try {
    // Clean git history
    await fs.remove(".git");

    // Init new git repo
    spawnSync("git", ["init"], { stdio: "ignore" });

    // Handle .env
    if (fs.existsSync(".env.example")) {
      await fs.copy(".env.example", ".env");
      console.log(chalk.green("✔ Created .env from .env.example"));
    }

    // Automatic dependency installation based on flags
    const packageManager = detectPackageManager();
    let didInstall = false;

    if (autoInstall && packageManager) {
      console.log(
        chalk.dim(`\nInstalling dependencies with ${packageManager}...\n`)
      );

      const installResult = spawnSync(packageManager, ["install"], {
        stdio: "inherit",
        cwd: targetDir,
        shell: true,
      });

      if (installResult.status === 0) {
        didInstall = true;
        console.log(chalk.green("\n✔ Dependencies installed successfully"));
      } else {
        console.log(
          chalk.yellow(
            "\n⚠️  Installation failed. You may need to run the install command manually."
          )
        );
      }
    }

    // Check for AI release support
    const hasAiSupport = checkAiReleaseSupport(targetDir);

    // Read template info
    const templateInfoPath = path.join(targetDir, ".template-info.json");
    if (fs.existsSync(templateInfoPath)) {
      const templateInfo = JSON.parse(
        fs.readFileSync(templateInfoPath, "utf-8")
      );

      console.log(
        chalk.bold.green(
          `\n✅ ${templateInfo.name} (${templateInfo.variant}) ready!`
        )
      );
      console.log(chalk.gray(`   ${templateInfo.description}\n`));

      if (templateInfo.features && templateInfo.features.length > 0) {
        console.log(chalk.cyan("📦 Features:"));
        templateInfo.features.forEach((f) =>
          console.log(chalk.gray(`   • ${f}`))
        );
        console.log("");
      }

      if (templateInfo.postInstall && templateInfo.postInstall.steps) {
        console.log(chalk.cyan("📋 Next steps:"));
        console.log(chalk.gray(`   1. cd ${projectName}`));

        // Filter out install step if already installed
        const steps = didInstall
          ? templateInfo.postInstall.steps.filter(
              (step) =>
                !step.toLowerCase().includes("npm install") &&
                !step.toLowerCase().includes("yarn install") &&
                !step.toLowerCase().includes("pnpm install") &&
                !step.toLowerCase().includes("bun install")
            )
          : templateInfo.postInstall.steps;

        steps.forEach((step, i) => {
          console.log(chalk.gray(`   ${i + 2}. ${step}`));
        });
        console.log("");
      }

      // AI release support notification
      if (hasAiSupport) {
        console.log(chalk.cyan("🤖 AI Release Support Detected"));
        console.log(
          chalk.gray(
            "   To use 'npm run project:release', please set your GEMINI_API_KEY in .env"
          )
        );
        console.log("");
      }
    } else {
      // Fallback
      console.log(chalk.bold.green(`\n✅ Project ready in ./${projectName}\n`));
      console.log(chalk.cyan("Next steps:"));
      console.log(chalk.gray(`  cd ${projectName}`));
      if (!didInstall) {
        console.log(chalk.gray("  npm install"));
      }
      console.log(chalk.gray("  npm run dev\n"));

      // AI release support notification
      if (hasAiSupport) {
        console.log(chalk.cyan("🤖 AI Release Support Detected"));
        console.log(
          chalk.gray(
            "   To use 'npm run project:release', please set your GEMINI_API_KEY in .env"
          )
        );
        console.log("");
      }
    }
  } catch (err) {
    console.error(
      chalk.red(`\n❌ Error during post-processing: ${err.message}`)
    );
  }
}

init().catch((err) => {
  console.error(chalk.red(err));
  process.exit(1);
});
