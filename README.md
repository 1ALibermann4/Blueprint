# BluePrint Project

BluePrint is a lightweight, file-based project management tool designed to streamline the process of creating, reviewing, and publishing project reports. It provides a simple yet effective workflow for teams to document their work and share it with a wider audience.

## Key Features

- **Intuitive Split-Screen Editor**: A rich-text editor with a live preview allows for easy creation of detailed project reports.
- **Secure Authentication with OpenID Connect**: A robust authentication system protects the editing and administration areas.
- **Draft Management**: Save your work as drafts in local storage and revisit them later.
- **Review and Publish Workflow**: Submit completed reports for review. Once approved, they are published and become publicly accessible.
- **Modern UI/UX**: A clean, unified interface with non-blocking notifications for a smooth user experience.
- **Image and Video Uploads**: Easily upload and embed media into your project reports.

## Project Structure

The project is a Node.js application using the Express framework.

- `server.js`: The main server file that handles routing, authentication, and API logic.
- `blueprint_local/`: Contains all the frontend files.
- `openid-config.js.example`: An example configuration file for the OpenID Connect provider.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (which includes npm)
- An OpenID Connect provider (e.g., Google, Okta, or a self-hosted one)
- A modern web browser

### Setup and Usage

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/1ALibermann4/Blueprint.git
    cd Blueprint
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure OpenID Connect**:
    -   Rename `openid-config.js.example` to `openid-config.js`.
    -   Edit `openid-config.js` with your OpenID provider's details (issuer, client ID, client secret, etc.).

4.  **Start the server**:
    ```bash
    npm start
    ```
    The server will be running at `http://localhost:3000`.

5.  **Access the Application**:
    - **Login**: Navigate to `http://localhost:3000/login`. You will be redirected to your OpenID provider to authenticate.
    - **Create or edit a project**: After logging in, you will be redirected to the editor at `http://localhost:3000/intranet/editor.html`.
    - **Review submitted projects**: Navigate to `http://localhost:3000/admin/validate.html`.
    - **View published projects**: Visit `http://localhost:3000/`.

## How It Works

1.  **Login**: Access the application by authenticating with your OpenID provider.
2.  **Creating a Project**:
    - Open the editor and write your project report in the left pane.
    - See a live preview of your report in the right pane.
    - Save it as a draft to keep it in your local storage.
    - Once ready, submit it for review.
3.  **Reviewing a Project**:
    - The review dashboard lists all submitted drafts.
    - Reviewers can view the full content of each project.
    - If approved, the project is published with a single click.
4.  **Viewing a Project**:
    - Published projects appear on the main page.
    - Click on any project to see its full details.