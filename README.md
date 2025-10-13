# BluePrint Project

BluePrint is a lightweight, file-based project management tool designed to streamline the process of creating, reviewing, and publishing project reports. It provides a simple yet effective workflow for teams to document their work and share it with a wider audience.

## Key Features

- **Intuitive Editor**: A rich-text editor allows for easy creation of detailed project reports, including context, objectives, and outcomes.
- **Draft Management**: Save your work as drafts and revisit them later.
- **Review and Publish Workflow**: Submit your completed reports for review. Once approved, they are published and become publicly accessible.

## Project Structure

The repository is organized into two main parts: the **intranet** for internal-facing tools and the **public**-facing site for published content.

- `intranet/`: Contains the tools for creating and managing project drafts.
  - `editor.html`: The main interface for writing project reports.
  - `scripts/editor.js`: Handles the logic for the editor, including saving, loading, and submitting drafts.
- `admin/`: Houses the tools for reviewing and publishing projects.
  - `validate.html`: A dashboard for reviewing submitted drafts.
  - `scripts/validate.js`: Manages the validation workflow, allowing reviewers to approve and publish projects.
- `public/`: The public-facing side of the application.
  - `index.html`: Displays a list of all published projects.
  - `project.html`: Shows the detailed view of a single project.
  - `scripts/render.js`: Renders the project lists and individual project pages.

## Getting Started

To get started with BluePrint, you need a local web server to serve the static files.

### Prerequisites

- A local web server (e.g., Python's `http.server`, `live-server` for Node.js).
- A modern web browser.

### Setup and Usage

1. **Start a Local Server**: From the `blueprint_local` directory, start a local web server. For example, using Python:

   ```bash
   python -m http.server
   ```

2. **Access the Application**:
   - **To create or edit a project**: Navigate to `http://localhost:8000/intranet/editor.html`.
   - **To review submitted projects**: Go to `http://localhost:8000/admin/validate.html`.
   - **To view published projects**: Visit `http://localhost:8000/public/index.html`.

## How It Works

1. **Creating a Project**:
   - Open the editor and write your project report.
   - Save it as a draft to keep it in your local storage.
   - Once ready, submit it for review.

2. **Reviewing a Project**:
   - The review dashboard lists all submitted drafts.
   - Reviewers can view the full content of each project.
   - If approved, the project is published with a single click.

3. **Viewing a Project**:
   - Published projects appear on the main page.
   - Click on any project to see its full details.