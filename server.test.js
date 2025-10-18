const request = require('supertest');
const app = require('./server');
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

const DRAFTS_DIR = path.join(__dirname, 'blueprint_local', 'intranet', 'projects', 'drafts');

describe('BluePrint API', () => {
  let agent;

  beforeEach(async () => {
    // Clean up the drafts directory before each test
    await fs.rm(DRAFTS_DIR, { recursive: true, force: true });
    await fs.mkdir(DRAFTS_DIR, { recursive: true });

    // Create a logged-in agent before each test
    agent = request.agent(app);
    await agent
      .post('/api/login')
      .send({ username: 'test-user' });
  });

  it('should save HTML content inside a Markdown file with front-matter', async () => {
    const draftData = {
      titre: 'Test Project',
      content: '<h1>Hello World</h1><p>This is HTML content.</p>'
    };

    // Use the authenticated agent for the request
    const response = await agent
      .post('/api/drafts')
      .send(draftData);

    expect(response.status).toBe(201);
    const filename = response.body.file;
    expect(filename).toBe('test_project.md');

    // Verify the file content
    const filePath = path.join(DRAFTS_DIR, filename);
    const fileContent = await fs.readFile(filePath, 'utf8');
    const parsedContent = matter(fileContent);

    expect(parsedContent.data.titre).toBe('Test Project');
    expect(parsedContent.content.trim()).toBe('<h1>Hello World</h1><p>This is HTML content.</p>');
  });

  it('should delete a draft file', async () => {
    // 1. Create a dummy file to be deleted
    const fileName = 'draft_to_delete.md';
    const filePath = path.join(DRAFTS_DIR, fileName);
    await fs.writeFile(filePath, '---\ntitre: To Be Deleted\n---\n<p>Delete me.</p>');

    // 2. Send the delete request
    const response = await agent
      .delete(`/api/drafts/${fileName}`);

    // 3. Assert the response
    expect(response.status).toBe(200);
    expect(response.body.message).toBe(`Draft ${fileName} deleted successfully.`);

    // 4. Verify the file no longer exists
    await expect(fs.access(filePath)).rejects.toThrow();
  });
});
