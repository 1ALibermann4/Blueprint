const request = require('supertest');
const app = require('./server');
const fs = require('fs').promises;
const path = require('path');

const DRAFTS_DIR = path.join(__dirname, 'blueprint_local', 'intranet', 'projects', 'drafts');

describe('BluePrint API', () => {
  beforeEach(async () => {
    // Clean up the drafts directory before each test
    await fs.rm(DRAFTS_DIR, { recursive: true, force: true });
    await fs.mkdir(DRAFTS_DIR, { recursive: true });
  });

  it('should rename the draft file when the title is changed', async () => {
    const initialDraft = {
      frontMatter: { titre: 'Initial Title' },
      content: 'Initial content'
    };

    // 1. Create a draft
    const response1 = await request(app)
      .post('/api/drafts')
      .send(initialDraft);

    expect(response1.status).toBe(201);
    const originalFilename = response1.body.file;
    expect(originalFilename).toBe('initial_title.md');

    // Verify the file was created
    const files1 = await fs.readdir(DRAFTS_DIR);
    expect(files1).toContain(originalFilename);

    // 2. Update the draft with a new title
    const updatedDraft = {
      currentFile: originalFilename,
      frontMatter: { titre: 'Updated Title' },
      content: 'Updated content'
    };

    const response2 = await request(app)
      .post('/api/drafts')
      .send(updatedDraft);

    expect(response2.status).toBe(201);
    const newFilename = response2.body.file;
    expect(newFilename).toBe('updated_title.md');

    // 3. Verify the old file is gone and the new one exists
    const files2 = await fs.readdir(DRAFTS_DIR);
    expect(files2).not.toContain(originalFilename);
    expect(files2).toContain(newFilename);
  });
});
