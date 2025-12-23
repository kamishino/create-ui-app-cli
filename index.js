#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const prompts = require('prompts');
const degit = require('degit');
const chalk = require('chalk');
const { spawnSync } = require('child_process');
const { getTemplates } = require('./lib/config');

async function init() {
    console.log(chalk.bold.cyan('\n🚀 UI Scaffold CLI (create-ui-app)\n'));

    // 1. Get Templates
    const templates = getTemplates();

    // 2. Prompt User
    const response = await prompts([
        {
            type: 'text',
            name: 'projectName',
            message: 'What is the project name?',
            initial: 'my-app',
            validate: value => value.trim().length > 0 ? true : 'Project name is required'
        },
        {
            type: 'select',
            name: 'template',
            message: 'Which template would you like to use?',
            choices: templates,
            initial: 0
        }
    ]);

    if (!response.projectName || !response.template) {
        console.log(chalk.yellow('\n⚠ Operation cancelled.'));
        process.exit(0);
    }

    const { projectName, template } = response;
    const targetDir = path.join(process.cwd(), projectName);

    if (fs.existsSync(targetDir)) {
        const { overwrite } = await prompts({
            type: 'confirm',
            name: 'overwrite',
            message: `Directory ${projectName} already exists. Overwrite?`,
            initial: false
        });

        if (!overwrite) {
            console.log(chalk.yellow('\n⚠ Operation cancelled.'));
            process.exit(0);
        }
        await fs.remove(targetDir);
    }

    // 3. Clone Repository
    console.log(chalk.dim(`\nDownloading template from ${template.repo}#${template.branch}...`));

    const emitter = degit(`${template.repo}#${template.branch}`, {
        cache: false,
        force: true,
        mode: 'git' // Important for private repos/SSH
    });

    try {
        await emitter.clone(targetDir);
    } catch (err) {
        console.error(chalk.red(`\n❌ Error cloning repository: ${err.message}`));
        if (err.message.includes('git')) {
             console.log(chalk.yellow('Tip: Ensure you have SSH access to the repository if it is private.'));
        }
        process.exit(1);
    }

    // 4. Post-processing
    process.chdir(targetDir);

    try {
        // Clean git history
        await fs.remove('.git');
        
        // Init new git repo
        spawnSync('git', ['init'], { stdio: 'ignore' });
        
        // Handle .env
        if (fs.existsSync('.env.example')) {
            await fs.copy('.env.example', '.env');
            console.log(chalk.green('✔ Created .env from .env.example'));
        }

        console.log(chalk.bold.green(`\n✅ Project ready in ./${projectName}`));
        console.log(chalk.dim('\nNext steps:'));
        console.log(`  cd ${projectName}`);
        console.log('  npm install');
        console.log('  npm run dev');

    } catch (err) {
        console.error(chalk.red(`\n❌ Error during post-processing: ${err.message}`));
    }
}

init().catch(err => {
    console.error(chalk.red(err));
    process.exit(1);
});
