import prompts from "prompts";
import chalk from "chalk";

async function configWizard(config) {
  console.log(chalk.bold.cyan("\n🔧 Template Configuration Wizard\n"));
  console.log(chalk.gray("Add your template repositories to the config.\n"));

  const templates = [];
  let addMore = true;

  while (addMore) {
    const response = await prompts([
      {
        type: "text",
        name: "title",
        message: "Template name:",
        validate: (value) => (value.trim().length > 0 ? true : "Name is required"),
      },
      {
        type: "text",
        name: "repo",
        message: "Repository URL (SSH format):",
        initial: "git@github.com:username/repo",
        validate: (value) => {
          if (!value.includes("github.com") && !value.includes("gitlab.com")) {
            return "Please use a valid Git hosting URL";
          }
          return true;
        },
      },
      {
        type: "text",
        name: "branch",
        message: "Branch name:",
        initial: "main",
      },
      {
        type: "text",
        name: "description",
        message: "Description (optional):",
        initial: "",
      },
    ]);

    if (!response.title || !response.repo || !response.branch) {
      console.log(chalk.yellow("\n⚠️  Template configuration cancelled."));
      break;
    }

    templates.push({
      title: response.title,
      value: {
        repo: response.repo,
        branch: response.branch,
      },
      description: response.description || "Custom template",
    });

    console.log(chalk.green(`✓ Added: ${response.title}\n`));

    const { continueAdding } = await prompts({
      type: "confirm",
      name: "continueAdding",
      message: "Add another template?",
      initial: false,
    });

    addMore = continueAdding;
  }

  if (templates.length > 0) {
    config.set("templates", templates);
    console.log(chalk.green(`\n✅ Saved ${templates.length} template(s) to config.`));
    console.log(chalk.cyan(`Config location: ${chalk.bold(config.path)}\n`));
  }

  return templates;
}

async function manageTemplates(config) {
  console.log(chalk.bold.cyan("\n⚙️  Template Management\n"));

  const { action } = await prompts({
    type: "select",
    name: "action",
    message: "What would you like to do?",
    choices: [
      { title: "Add new template", value: "add" },
      { title: "View current templates", value: "view" },
      { title: "Reset to default", value: "reset" },
      { title: "Exit", value: "exit" },
    ],
  });

  switch (action) {
    case "add":
      await configWizard(config);
      break;
    case "view":
      const templates = config.get("templates");
      if (templates && templates.length > 0) {
        console.log(chalk.cyan("\nCurrent templates:\n"));
        templates.forEach((t, i) => {
          console.log(chalk.bold(`${i + 1}. ${t.title}`));
          console.log(chalk.gray(`   Repo: ${t.value.repo}#${t.value.branch}`));
          console.log(chalk.gray(`   Desc: ${t.description}\n`));
        });
      } else {
        console.log(chalk.yellow("\nNo templates configured yet.\n"));
      }
      break;
    case "reset":
      config.clear();
      console.log(chalk.yellow("\n⚠️  Config reset. Run the tool again to add templates.\n"));
      break;
    case "exit":
      console.log(chalk.gray("\nGoodbye!\n"));
      break;
  }
}

export { configWizard, manageTemplates };
