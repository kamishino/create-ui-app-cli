# UI Scaffold CLI (create-ui-app)

A flexible, data-driven Node.js CLI tool used to bootstrap new frontend projects. Unlike traditional scaffolding tools with hardcoded templates, this tool utilizes a **Local Configuration Store** pattern, allowing you to define your own registry of template repositories (Public or Private).

## Features

*   **Total Flexibility**: Add, remove, or edit template sources without touching the CLI source code.
*   **Private Repo Support**: Seamlessly clone private repositories using your local SSH keys.
*   **Zero-Config Start**: Auto-generates a default configuration file on the first run.
*   **Clean Slate**: Automatically removes git history from templates and initializes a fresh project.
*   **Smart Package Manager Detection**: Automatically detects and uses your preferred package manager (pnpm, yarn, bun, or npm) with prompted dependency installation.
*   **AI Release Integration**: Detects templates with AI-assisted release workflows and notifies users about required environment variables (e.g., `GEMINI_API_KEY`).
*   **Smart Name Resolution**: Automatically resolves directory naming conflicts by appending incremental suffixes (e.g., `my-app` → `my-app-1`) without prompting.

## Installation

```bash
# Install globally
npm install -g create-ui-app-cli

# Or run directly via npx
npx create-ui-app-cli
```

## Usage

Run the command in your terminal:

```bash
create-ui-app
```

### CLI Flags

*   `--config` - Manage template configurations
*   `--install` - Automatically install dependencies after cloning
*   `--no-install` - Skip dependency installation (default behavior)

**Examples:**

```bash
# Default: Skip installation
create-ui-app

# Auto-install dependencies
create-ui-app --install

# Explicitly skip installation
create-ui-app --no-install

# Manage templates
create-ui-app --config
```

### Workflow

1.  **First Run**: The tool will detect that no configuration exists. It will create a `config.json` file on your system and print the path.
2.  **Selection**: Choose a template from the list.
3.  **Project Name**: Enter the name for your new project. If a directory with that name already exists, the CLI will automatically append a suffix (e.g., `-1`, `-2`) and notify you.
4.  **Dependency Installation**: By default, dependencies are NOT installed automatically. Use `--install` flag to auto-install using your preferred package manager (pnpm, yarn, bun, or npm).
5.  **AI Release Detection**: If your template includes AI-assisted release workflows (via `project:release` script), you'll receive a notification to configure your `GEMINI_API_KEY` in the `.env` file.

## Configuration

The tool uses [conf](https://github.com/sindresorhus/conf) to store your template registry locally. You can find the config file path by running the tool (it logs the path at the start).

### Config Structure

Edit the `config.json` file to add your own templates:

```json
{
  "templates": [
    {
      "title": "My React Starter",
      "value": {
        "repo": "git@github.com:username/my-react-starter",
        "branch": "main"
      },
      "description": "React + Vite + Tailwind"
    },
    {
      "title": "Enterprise Dashboard",
      "value": {
        "repo": "git@github.com:org/private-dashboard-template",
        "branch": "develop"
      },
      "description": "Private repo requiring SSH"
    }
  ]
}
```

### Template Requirements

*   **SSH**: For private repositories, ensure the `repo` URL is in SSH format (`git@github.com:...`) and your SSH keys are added to your GitHub/GitLab agent.
*   **Public**: HTTPS URLs work fine for public repos, but SSH is recommended for consistency.

## License

ISC
