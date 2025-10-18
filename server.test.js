const request = require('supertest');
const app = require('./server');
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

const DRAFTS_DIR = path.join(__dirname, 'blueprint_local', 'intranet', 'projects', 'drafts');

describe('BluePrint API', () => {
  beforeEach(async () => {
    // Clean up the drafts directory before each test
    await fs.rm(DRAFTS_DIR, { recursive: true, force: true });
    await fs.mkdir(DRAFTS_DIR, { recursive: true });
  });

  it('should save HTML content inside a Markdown file with front-matter', async () => {
    const draftData = {
      titre: 'Test Project',
      content: '<h1>Hello World</h1><p>This is HTML content.</p>'
    };

    const response = await request(app)
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
});
