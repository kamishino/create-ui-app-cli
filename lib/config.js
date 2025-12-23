import Conf from "conf";
import chalk from "chalk";

const config = new Conf({
  projectName: "create-ui-app-cli",
});

function getTemplates() {
  let templates = config.get("templates");

  if (!templates || templates.length === 0) {
    console.log(chalk.yellow("\n⚠️  No templates configured yet."));
    console.log(chalk.blue(`\nConfig location: ${chalk.bold(config.path)}`));
    console.log(chalk.cyan("\nTo add templates, run: create-ui-app-cli --config\n"));
    return null;
  }

  return templates;
}

function hasTemplates() {
  const templates = config.get("templates");
  return templates && templates.length > 0;
}

export { config, getTemplates, hasTemplates };
