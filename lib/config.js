const Conf = require('conf');
const chalk = require('chalk');

const config = new Conf({
    projectName: 'create-ui-app-cli' // Explicit project name to ensure consistent config location
});

function getTemplates() {
    let templates = config.get('templates');

    if (!templates || templates.length === 0) {
        templates = [
            {
                title: 'My Example Template',
                value: {
                    repo: 'git@github.com:username/repo',
                    branch: 'main'
                },
                description: 'Edit this in your config file'
            }
        ];
        config.set('templates', templates);
        console.log(chalk.blue(`
ℹ Config created at: ${chalk.bold(config.path)}`));
        console.log(chalk.blue(`ℹ You can edit this file to add your own template repositories.
`));
    }

    return templates;
}

module.exports = {
    getTemplates
};
