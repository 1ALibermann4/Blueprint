# BluePrint Project

BluePrint is a lightweight, file-based project management tool designed to streamline the process of creating, reviewing, and publishing project reports. It provides a simple yet effective workflow for students and teams to document their work and share it with a wider audience.

## Key Features

- **Intuitive Visual Editor (WYSIWYG)**: An in-place rich-text editor that allows users to edit the project page directly, seeing the final result as they type.
- **Rich Content Support**: Full support for rich text formatting (bold, lists, tables), hyperlinks, and embedding images and videos.
- **Dynamic Participant Management**: Easily add or remove project members (students, supervisors) directly from the visual interface.
- **Secure Authentication with OpenID Connect**: A robust authentication system protects the editing and administration areas.
- **Dedicated Draft Management**: A dedicated page to view, edit, submit for review, or delete your project drafts.
- **Simple Review and Publish Workflow**: Submit completed reports for review. Once approved, they are published and become publicly accessible.
- **Image Uploads**: A seamless process for uploading and embedding media into project reports.

## Project Structure

The project is a Node.js application using the Express framework.

- `server.js`: The main server file that handles routing, authentication, and API logic.
- `blueprint_local/`: Contains all the frontend files (`intranet`, `public`, `admin`).
- `documentation/`: Contains technical diagrams and workflow descriptions.
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

3.  **Configure OpenID Connect** (Optional for local development with auth disabled):
    -   Rename `openid-config.js.example` to `openid-config.js`.
    -   Edit `openid-config.js` with your OpenID provider's details (issuer, client ID, client secret, etc.).
    -   Uncomment the OpenID-related sections in `server.js`.

4.  **Start the server**:
    ```bash
    npm start
    ```
    The server will be running at `http://localhost:3000`.

5.  **Access the Application**:
    - **Login**: Navigate to `http://localhost:3000/login`. You will be redirected to your OpenID provider to authenticate.
    - **Manage your projects**: After logging in, you will land on the drafts management page at `http://localhost:3000/intranet/brouillons.html`.
    - **Create or edit a project**: From the drafts page, click "Nouveau Projet" or "Modifier" to access the visual editor at `http://localhost:3000/intranet/editor.html`.
    - **View published projects**: Visit `http://localhost:3000/public/project_list.html`.

## How It Works

1.  **Login**: Access the intranet by authenticating with an OpenID provider.
2.  **Managing Projects**:
    - After logging in, you are presented with a list of your current drafts on the `brouillons.html` page.
    - From here, you can choose to create a new project, edit an existing one, submit a draft for review, or delete a draft.
3.  **Creating and Editing a Project**:
    - The editor loads a visual representation of the final project page.
    - Click directly on any editable text (titles, paragraphs) to modify it with a rich-text toolbar.
    - Click on images (like the main project image or participant photos) to replace them.
    - Add or remove participants using the dedicated buttons.
    - Save your work at any time, which saves it as a `.md` file on the server and returns you to the drafts page.
4.  **Submitting and Publishing**:
    - From the drafts page, click "Soumettre" on the project you wish to publish.
    - The server then converts your work into a final, static HTML file and makes it publicly available.
5.  **Viewing a Project**:
    - Published projects appear on the public project list (`project_list.html`).
    - Anyone can click on a project to see its full, published page.
