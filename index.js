#!/usr/bin/env node

import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import degit from "degit";
import chalk from "chalk";
import { spawnSync } from "child_process";
import { config, getTemplates, hasTemplates } from "./lib/config.js";
import { configWizard, manageTemplates } from "./lib/wizard.js";

async function init() {
  // Check for --config flag
  if (process.argv.includes("--config")) {
    await manageTemplates(config);
    return;
  }

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
      console.log(chalk.yellow("\n⚠️  Operation cancelled. Run with --config to add templates later.\n"));
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
      validate: (value) => (value.trim().length > 0 ? true : "Project name is required"),
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

  const { projectName, template } = response;
  const targetDir = path.join(process.cwd(), projectName);

  if (fs.existsSync(targetDir)) {
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: `Directory ${projectName} already exists. Overwrite?`,
      initial: false,
    });

    if (!overwrite) {
      console.log(chalk.yellow("\n⚠️  Operation cancelled."));
      process.exit(0);
    }
    await fs.remove(targetDir);
  }

  // 4. Clone Repository
  console.log(chalk.dim(`\nDownloading template from ${template.repo}#${template.branch}...`));

  const emitter = degit(`${template.repo}#${template.branch}`, {
    cache: false,
    force: true,
    mode: "git",
  });

  try {
    await emitter.clone(targetDir);
  } catch (err) {
    console.error(chalk.red(`\n❌ Error cloning repository: ${err.message}`));
    if (err.message.includes("git")) {
      console.log(chalk.yellow("Tip: Ensure you have SSH access to the repository if it is private."));
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

    // Read template info
    const templateInfoPath = path.join(targetDir, ".template-info.json");
    if (fs.existsSync(templateInfoPath)) {
      const templateInfo = JSON.parse(fs.readFileSync(templateInfoPath, "utf-8"));

      console.log(chalk.bold.green(`\n✅ ${templateInfo.name} (${templateInfo.variant}) ready!`));
      console.log(chalk.gray(`   ${templateInfo.description}\n`));

      if (templateInfo.features && templateInfo.features.length > 0) {
        console.log(chalk.cyan("📦 Features:"));
        templateInfo.features.forEach((f) => console.log(chalk.gray(`   • ${f}`)));
        console.log("");
      }

      if (templateInfo.postInstall && templateInfo.postInstall.steps) {
        console.log(chalk.cyan("📋 Next steps:"));
        templateInfo.postInstall.steps.forEach((step, i) => {
          console.log(chalk.gray(`   ${i + 1}. ${step}`));
        });
        console.log("");
      }
    } else {
      // Fallback
      console.log(chalk.bold.green(`\n✅ Project ready in ./${projectName}\n`));
      console.log(chalk.cyan("Next steps:"));
      console.log(chalk.gray(`  cd ${projectName}`));
      console.log(chalk.gray("  npm install"));
      console.log(chalk.gray("  npm run dev\n"));
    }
  } catch (err) {
    console.error(chalk.red(`\n❌ Error during post-processing: ${err.message}`));
  }
}

init().catch((err) => {
  console.error(chalk.red(err));
  process.exit(1);
});
