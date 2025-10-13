const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const session = require('express-session');
const { Issuer } = require('openid-client');
const openidConfig = require('./openid-config');

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
    res.redirect('/login');
  }
};

// Serve static files from the 'blueprint_local' directory
app.use(express.static(path.join(__dirname, 'blueprint_local')));

// Protect the 'intranet' and 'admin' directories
app.use('/intranet', checkAuth);
app.use('/admin', checkAuth);

const DRAFTS_DIR = path.join(__dirname, 'blueprint_local', 'intranet', 'projects', 'drafts');
const PUBLISHED_DIR = path.join(__dirname, 'blueprint_local', 'public', 'projects', 'published');

// Helper function to list JSON files in a directory
const listProjects = async (dir) => {
  try {
    const files = await fs.readdir(dir);
    return files.filter(file => file.endsWith('.json'));
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

// API route to create a new draft project
app.post('/api/drafts', checkAuth, async (req, res) => {
  try {
    const { titre, ...content } = req.body;
    if (!titre) {
      return res.status(400).json({ error: 'Title is required' });
    }
    // Sanitize the title to create a safe filename.
    const fileName = `${titre.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    const filePath = path.join(DRAFTS_DIR, fileName);

    await fs.mkdir(DRAFTS_DIR, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(req.body, null, 2));
    res.status(201).json({ message: 'Draft created successfully', file: fileName });
  } catch (error) {
    console.error('Error creating draft:', error);
    res.status(500).json({ error: 'Failed to create draft' });
  }
});

// API route to publish a project
app.post('/api/publish', checkAuth, async (req, res) => {
  try {
    const { file } = req.body;
    if (!file) {
      return res.status(400).json({ error: 'File name is required' });
    }
    const sourcePath = path.join(DRAFTS_DIR, file);
    const destPath = path.join(PUBLISHED_DIR, file);

    await fs.mkdir(PUBLISHED_DIR, { recursive: true });
    await fs.rename(sourcePath, destPath);
    res.json({ message: `Project ${file} published successfully` });
  } catch (error) {
    console.error('Error publishing project:', error);
    res.status(500).json({ error: 'Failed to publish project' });
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
app.post('/api/upload', checkAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }
  // The file is saved by multer. We return the path to the file.
  res.json({ filePath: `/uploads/${req.file.filename}` });
});


app.get('/login', (req, res) => {
  const { nonce, state } = Issuer.generate();
  req.session.nonce = nonce;
  req.session.state = state;

  const authUrl = client.authorizationUrl({
    scope: openidConfig.scope,
    response_mode: 'form_post',
    nonce,
    state,
  });
  res.redirect(authUrl);
});

app.post('/auth/callback', async (req, res) => {
  try {
    const params = client.callbackParams(req);
    const { nonce, state } = req.session;
    delete req.session.nonce;
    delete req.session.state;

    const tokenSet = await client.callback(openidConfig.redirect_uri, params, { nonce, state });
    const claims = tokenSet.claims();

    req.session.user = {
      id: claims.sub,
      name: claims.name,
      email: claims.email,
    };
    req.session.id_token = tokenSet.id_token;

    res.redirect('/intranet/editor.html');
  } catch (err) {
    console.error('Callback error:', err);
    res.status(400).send('Authentication failed');
  }
});

app.get('/logout', (req, res) => {
  const id_token = req.session.id_token;
  delete req.session.id_token;
  req.session.destroy(err => {
    if (err) console.error('Failed to destroy session:', err);
    const endSessionUrl = client.endSessionUrl({
      id_token_hint: id_token,
      post_logout_redirect_uri: 'http://localhost:3000', // Redirect after logout
    });
    res.redirect(endSessionUrl);
  });
});

// A simple test route to confirm the server is running.
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Welcome to the BluePrint API' });
});

let client;
Issuer.discover(openidConfig.issuer)
  .then(issuer => {
    client = new issuer.Client({
      client_id: openidConfig.client_id,
      client_secret: openidConfig.client_secret,
      redirect_uris: [openidConfig.redirect_uri],
      response_types: ['code'],
    });
    console.log('OpenID client discovered and configured.');
  })
  .catch(err => {
    console.error('Failed to discover OpenID issuer:', err);
    process.exit(1);
  });

// Start the server and log a message to the console.
app.listen(port, () => {
  console.log(`BluePrint server is running on http://localhost:${port}`);
});