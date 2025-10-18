const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');
const { logAction } = require('./logger');
// const { Issuer } = require('openid-client');
// const openidConfig = require('./openid-config');

const app = express();
const port = 3000;

// Middleware to parse JSON bodies, which will be used for API requests.
app.use(express.json());

app.use(session({
  secret: 'a-secure-secret-key', // In production, use an environment variable
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // In production, set to true and use HTTPS
}));

// Middleware to protect routes
const checkAuth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    // Redirect to the new simulation login page
    res.redirect('/login.html');
  }
};

// Serve static files from the 'blueprint_local' directory
app.use(express.static(path.join(__dirname, 'blueprint_local')));

// Protect the 'intranet' and 'admin' directories
app.use('/intranet', checkAuth);
app.use('/admin', checkAuth);

const DRAFTS_DIR = path.join(__dirname, 'blueprint_local', 'intranet', 'projects', 'drafts');
const PUBLISHED_DIR = path.join(__dirname, 'blueprint_local', 'public', 'projects', 'published');

// API route for simulated login
app.post('/api/login', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ message: 'Username is required.' });
    }

    // Create a user session
    req.session.user = { name: username };

    // Log the login event
    await logAction('USER_LOGIN', { user: username, result: 'success' });

    res.status(200).json({ message: 'Login successful.' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'An internal error occurred.' });
  }
});

// Helper function to list project files in a directory
const listProjects = async (dir) => {
  try {
    const files = await fs.readdir(dir);
    // Drafts are .md, published projects are .html
    return files.filter(file => file.endsWith('.md') || file.endsWith('.html'));
  } catch (error) {
    // If the directory doesn't exist, return an empty array.
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

// API route to list draft projects
app.get('/api/projects/drafts', checkAuth, async (req, res) => {
  try {
    const projects = await listProjects(DRAFTS_DIR);
    res.json(projects);
  } catch (error) {
    console.error('Error listing draft projects:', error);
    res.status(500).json({ error: 'Failed to list draft projects' });
  }
});

// API route to list published projects
app.get('/api/projects/published', async (req, res) => {
  try {
    const projects = await listProjects(PUBLISHED_DIR);
    res.json(projects);
  } catch (error) {
    console.error('Error listing published projects:', error);
    res.status(500).json({ error: 'Failed to list published projects' });
  }
});

// API route to get the project template
app.get('/api/templates/project', checkAuth, async (req, res) => {
  try {
    const templatePath = path.join(__dirname, 'blueprint_local', 'public', 'templates', 'page_projet.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');

    // Extract only the content within the <body> tag
    const bodyContentMatch = templateContent.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const extractedContent = bodyContentMatch ? bodyContentMatch[1] : '';

    res.setHeader('Content-Type', 'text/html');
    res.send(extractedContent);
  } catch (error) {
    console.error('Error reading project template:', error);
    res.status(500).json({ error: 'Failed to read project template' });
  }
});

// API route to get a single project's content (Markdown container version)
app.get('/api/project', async (req, res) => {
  const { file, type } = req.query;
  if (!file || !type) {
    return res.status(400).json({ error: 'File and type are required' });
  }

  const dir = type === 'draft' ? DRAFTS_DIR : PUBLISHED_DIR;
  const filePath = path.join(dir, file);

  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    const { data, content } = matter(fileContent);

    // Send the parsed front matter (for the title) and the HTML content back
    res.json({ frontMatter: data, content: content });
  } catch (error) {
    console.error('Error reading project file:', error);
    res.status(500).json({ error: 'Failed to read project file' });
  }
});

// API route to create or update a draft project (Markdown container version)
app.post('/api/drafts', checkAuth, async (req, res) => {
  try {
    const { titre, content, currentFile } = req.body;

    if (!titre) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Sanitize the title to create a safe filename with .md extension.
    const newFileName = `${titre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    const newFilePath = path.join(DRAFTS_DIR, newFileName);

    // If a currentFile is provided and it's different from the new file name,
    // it means we are renaming the file. We should delete the old one.
    if (currentFile && currentFile !== newFileName) {
      const oldFilePath = path.join(DRAFTS_DIR, currentFile);
      try {
        await fs.unlink(oldFilePath);
      } catch (error) {
        console.error(`Could not delete old file: ${oldFilePath}`, error);
      }
    }

    // Create front matter and stringify the content
    const frontMatter = { titre: titre };
    const fileContent = matter.stringify(content || '', frontMatter);

    await fs.mkdir(DRAFTS_DIR, { recursive: true });
    await fs.writeFile(newFilePath, fileContent);

    await logAction('SAVE_DRAFT', { file: newFileName, result: 'success' });
    res.status(201).json({ message: 'Draft saved successfully', file: newFileName });
  } catch (error) {
    console.error('Error saving draft:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// API route to publish a project
app.post('/api/publish', checkAuth, async (req, res) => {
  try {
    const { file } = req.body;
    if (!file) {
      return res.status(400).json({ error: 'File name is required' });
    }

    const sourceMdPath = path.join(DRAFTS_DIR, file);

    // 1. Read the Markdown file and extract its HTML content
    const mdContent = await fs.readFile(sourceMdPath, 'utf8');
    const { content: htmlContent } = matter(mdContent);

    // 2. Create the destination HTML file path
    const htmlFileName = file.replace('.md', '.html');
    const destHtmlPath = path.join(PUBLISHED_DIR, htmlFileName);

    // 3. Write the extracted HTML to the new file
    await fs.mkdir(PUBLISHED_DIR, { recursive: true });
    await fs.writeFile(destHtmlPath, htmlContent);

    // 4. Delete the original Markdown file from drafts
    await fs.unlink(sourceMdPath);

    await logAction('PUBLISH_PROJECT', { file: htmlFileName, result: 'success' });
    res.json({ message: `Project ${htmlFileName} published successfully` });
  } catch (error) {
    console.error('Error publishing project:', error);
    res.status(500).json({ error: 'Failed to publish project' });
  }
});

// API route for deleting a draft
app.delete('/api/drafts/:fileName', checkAuth, async (req, res) => {
  try {
    const { fileName } = req.params;
    if (!fileName) {
      return res.status(400).json({ message: 'File name is required.' });
    }

    const filePath = path.join(DRAFTS_DIR, fileName);

    // Security check: ensure the path is within the drafts directory
    if (path.dirname(filePath) !== DRAFTS_DIR) {
        return res.status(400).json({ message: 'Invalid file path.' });
    }

    await fs.unlink(filePath);
    await logAction('DELETE_DRAFT', { file: fileName, result: 'success' });
    res.status(200).json({ message: `Draft ${fileName} deleted successfully.` });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'Draft not found.' });
    }
    console.error('Error deleting draft:', error);
    await logAction('DELETE_DRAFT', { file: req.params.fileName, result: 'failure', error: error.message });
    res.status(500).json({ message: 'Failed to delete draft.' });
  }
});

const multer = require('multer');
const UPLOADS_DIR = path.join(__dirname, 'blueprint_local', 'public', 'uploads');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Use the original file name, but you might want to sanitize it
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// API route for file uploads
app.post('/api/upload', checkAuth, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  // TinyMCE expects a JSON response with a 'location' property.
  const filePath = `/uploads/${req.file.filename}`;
  await logAction('FILE_UPLOAD', { file: req.file.filename, path: filePath, result: 'success' });
  res.json({ location: filePath });
});

// API route to get login history
app.get('/api/logs/logins', checkAuth, async (req, res) => {
  try {
    const logFilePath = path.join(__dirname, 'logs', 'backend-actions.json');
    const logs = JSON.parse(await fs.readFile(logFilePath, 'utf8'));

    // Filter for login events and reverse to show most recent first
    const loginEvents = logs
      .filter(log => log.action === 'USER_LOGIN')
      .reverse();

    res.json(loginEvents);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // If the log file doesn't exist yet, return an empty array
      return res.json([]);
    }
    console.error('Error reading login logs:', error);
    res.status(500).json({ error: 'Failed to retrieve login history.' });
  }
});


// app.get('/login', (req, res) => {
//   const { nonce, state } = Issuer.generate();
//   req.session.nonce = nonce;
//   req.session.state = state;

//   const authUrl = client.authorizationUrl({
//     scope: openidConfig.scope,
//     response_mode: 'form_post',
//     nonce,
//     state,
//   });
//   res.redirect(authUrl);
// });

// app.post('/auth/callback', async (req, res) => {
//   try {
//     const params = client.callbackParams(req);
//     const { nonce, state } = req.session;
//     delete req.session.nonce;
//     delete req.session.state;

//     const tokenSet = await client.callback(openidConfig.redirect_uri, params, { nonce, state });
//     const claims = tokenSet.claims();

//     req.session.user = {
//       id: claims.sub,
//       name: claims.name,
//       email: claims.email,
//     };
//     req.session.id_token = tokenSet.id_token;

//     res.redirect('/intranet/editor.html');
//   } catch (err) {
//     console.error('Callback error:', err);
//     res.status(400).send('Authentication failed');
//   }
// });

// app.get('/logout', (req, res) => {
//   const id_token = req.session.id_token;
//   delete req.session.id_token;
//   req.session.destroy(err => {
//     if (err) console.error('Failed to destroy session:', err);
//     const endSessionUrl = client.endSessionUrl({
//       id_token_hint: id_token,
//       post_logout_redirect_uri: 'http://localhost:3000', // Redirect after logout
//     });
//     res.redirect(endSessionUrl);
//   });
// });

// A simple test route to confirm the server is running.
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Welcome to the BluePrint API' });
});

// let client;
// Issuer.discover(openidConfig.issuer)
//   .then(issuer => {
//     client = new issuer.Client({
//       client_id: openidConfig.client_id,
//       client_secret: openidConfig.client_secret,
//       redirect_uris: [openidConfig.redirect_uri],
//       response_types: ['code'],
//     });
//     console.log('OpenID client discovered and configured.');
//   })
//   .catch(err => {
//     console.error('Failed to discover OpenID issuer:', err);
//     process.exit(1);
//   });

// Start the server and log a message to the console.
if (require.main === module) {
  app.listen(port, () => {
    console.log(`BluePrint server is running on http://localhost:${port}`);
  });
}

module.exports = app;