import express from 'express';
import multer from 'multer';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import mysql from 'mysql2/promise';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const JWT_SECRET = process.env.JWT_SECRET || 'secret-for-dev-fallback';
const PORT = 3000;

// Configure multer for file uploads (in-memory buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Database connection pool setup (lazy)
let pool: mysql.Pool | null = null;
function getDbPool() {
  if (!pool && process.env.DB_PASSWORD) {
    try {
      pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'community_hero',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      console.log('MySQL connection pool created.');
    } catch (e) {
      console.error('Failed to create MySQL pool:', e);
    }
  }
  return pool;
}

// Ensure the tables exist on start if DB works
async function initDb() {
  const db = getDbPool();
  if (db) {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(100),
          email VARCHAR(255) UNIQUE,
          password_hash VARCHAR(255),
          role VARCHAR(20) DEFAULT 'public',
          points_balance INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      try {
        await db.query('ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE, ADD COLUMN password_hash VARCHAR(255), ADD COLUMN role VARCHAR(20) DEFAULT "citizen"');
      } catch (e) {
        // Ignored if already exists
      }
      await db.query(`
        CREATE TABLE IF NOT EXISTS issues (
          id INT AUTO_INCREMENT PRIMARY KEY,
          category VARCHAR(50),
          severity VARCHAR(50),
          description TEXT,
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          photo_url VARCHAR(255),
          upvote_count INT DEFAULT 0,
          upvotes INT DEFAULT 0,
          status VARCHAR(50) DEFAULT 'Unverified',
          reporter_id INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      try {
        await db.query('ALTER TABLE issues ADD COLUMN photo_url VARCHAR(255), ADD COLUMN upvote_count INT DEFAULT 0');
      } catch (e) {
        // Ignored if already exists
      }
      try {
        await db.query('ALTER TABLE issues ADD COLUMN upvotes INT DEFAULT 0');
      } catch (e) {
        // Ignored if already exists
      }
      try {
        await db.query('ALTER TABLE issues MODIFY COLUMN status VARCHAR(50) DEFAULT "Unverified"');
      } catch (e) {
        // Ignored
      }
      try {
        await db.query('ALTER TABLE issues MODIFY COLUMN photo_url LONGTEXT');
      } catch (e) {
        // Ignored
      }
      try {
        await db.query('ALTER TABLE issues ADD COLUMN latitude DECIMAL(10, 8), ADD COLUMN longitude DECIMAL(11, 8)');
      } catch (e) {
        // Ignored if already exists
      }
      await db.query(`
        CREATE TABLE IF NOT EXISTS issue_upvotes (
          user_id INT,
          issue_id INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_user_issue (user_id, issue_id)
        );
      `);
      try {
        await db.query('ALTER TABLE users ADD COLUMN municipality_zone VARCHAR(100)');
      } catch (e) {
        // Ignored if already exists
      }
      try {
        await db.query('ALTER TABLE issues ADD COLUMN municipality_zone VARCHAR(100)');
      } catch (e) {
        // Ignored if already exists
      }

      // Seed Fake Data
      const bcrypt = await import('bcryptjs');
      const hash = await bcrypt.hash('password123', 10);
      
      // Seed users
      await db.query(`INSERT IGNORE INTO users (id, name, email, password_hash, role, municipality_zone) VALUES (1, 'Test User', 'test@example.com', '${hash}', 'citizen', NULL)`);
      await db.query(`INSERT IGNORE INTO users (id, name, email, password_hash, role, municipality_zone) VALUES (2, 'Vadodara Admin', 'vmc@example.com', '${hash}', 'admin', 'Vadodara')`);
      await db.query(`INSERT IGNORE INTO users (id, name, email, password_hash, role, municipality_zone) VALUES (3, 'Botad Admin', 'bmc@example.com', '${hash}', 'admin', 'Botad')`);

      // Seed issues
      await db.query(`INSERT IGNORE INTO issues (id, category, severity, description, status, reporter_id, municipality_zone) VALUES (1, 'Road', 'High', 'Pothole on Main St', 'Pending', 1, 'Vadodara')`);
      await db.query(`INSERT IGNORE INTO issues (id, category, severity, description, status, reporter_id, municipality_zone) VALUES (2, 'Water', 'Medium', 'Leaking pipe', 'Working', 1, 'Vadodara')`);
      await db.query(`INSERT IGNORE INTO issues (id, category, severity, description, status, reporter_id, municipality_zone) VALUES (3, 'Waste', 'Low', 'Garbage dump', 'Completed', 1, 'Vadodara')`);
      await db.query(`INSERT IGNORE INTO issues (id, category, severity, description, status, reporter_id, municipality_zone) VALUES (7, 'Road', 'Low', 'Missing sign', 'Unverified', 1, 'Vadodara')`);
      
      await db.query(`INSERT IGNORE INTO issues (id, category, severity, description, status, reporter_id, municipality_zone) VALUES (4, 'Road', 'High', 'Broken street light', 'Pending', 1, 'Botad')`);
      await db.query(`INSERT IGNORE INTO issues (id, category, severity, description, status, reporter_id, municipality_zone) VALUES (5, 'Water', 'High', 'No water supply', 'Working', 1, 'Botad')`);
      await db.query(`INSERT IGNORE INTO issues (id, category, severity, description, status, reporter_id, municipality_zone) VALUES (6, 'Waste', 'Medium', 'Overflowing bin', 'Pending', 1, 'Botad')`);

      console.log('MySQL schema ensured.');
    } catch (e) {
      console.warn('Could not initialize MySQL tables. Is the DB running?', e);
    }
  }
}
initDb();

// RBAC Middleware
function authorizeRole(role: string) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: number, role: string };
      // Assign to req for later use
      (req as any).user = decoded;
      
      if (decoded.role !== role) {
        return res.status(403).json({ error: 'Access Denied: Insufficient permissions' });
      }
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'Access Denied: Admin role required' });
  }
  next();
};

// Optional Auth Middleware for endpoints that don't enforce a role but need user data
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return next(); // Not logged in
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number, role: string };
    (req as any).user = decoded;
  } catch (err) {}
  next();
}

app.post(['/api/auth/signup', '/api/signup'], async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'Database unavailable' });

    // Seed and Delegate: check against root admin email
    const rootAdminEmail = process.env.ROOT_ADMIN_EMAIL;
    const finalRole = (rootAdminEmail && email.toLowerCase() === rootAdminEmail.toLowerCase()) ? 'admin' : 'citizen';

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    try {
      const [result] = await db.execute(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [name, email, passwordHash, finalRole]
      ) as any;
      res.status(201).json({ success: true, message: 'User created successfully', role: finalRole });
    } catch (dbErr: any) {
      if (dbErr.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'Email already exists' });
      }
      throw dbErr;
    }
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post(['/api/auth/login', '/api/login'], async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'Database unavailable' });

    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]) as any;
    const user = rows[0];

    // Generic error message for security
    const authFailedMessage = 'Invalid email or password';

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: authFailedMessage });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email, municipality_zone: user.municipality_zone }, 
      JWT_SECRET, 
      { expiresIn: '12h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points_balance,
        municipality_zone: user.municipality_zone
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/analyze-image', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const base64EncodeString = req.file.buffer.toString('base64');
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: req.file.mimetype,
            data: base64EncodeString,
          },
        },
        "Analyze this image of a community infrastructure issue. Return ONLY a raw JSON object with three keys: \"category\" (Must be exactly one of: Pothole, Streetlight, Water Leak, Garbage, Other), \"severity\" (High, Medium, Low), and \"description\" (A short, 1-sentence description of the problem)."
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            severity: { type: Type.STRING },
            description: { type: Type.STRING }
          }
        }
      }
    });

    const jsonStr = response.text || "";
    const result = JSON.parse(jsonStr);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("AI Analysis error:", error);
    res.status(500).json({ error: 'Failed to analyze image' });
  }
});

async function getMunicipalityZone(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
  
  try {
    const response = await fetch(url, { 
      headers: { 'User-Agent': 'CommunityHeroApp/1.0' } 
    });
    
    if (!response.ok) throw new Error('Network response was not ok');
    
    const data = await response.json();
    
    // Extract the most relevant address component
    const city = data?.address?.city || 
                 data?.address?.town || 
                 data?.address?.village || 
                 data?.address?.county || 
                 data?.address?.state;

    if (city) {
      return city;
    } else {
      throw new Error('No city found in address data');
    }
    
  } catch (error) {
    console.error('Geocoding failed for coordinates:', lat, lng, error);
    // If we reach here, the API failed. 
    // Instead of a fallback, we return 'Unassigned' so the Admin can manually fix it.
    return 'Unassigned';
  }
}

app.post('/api/issues', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    // 1. Explicitly ignore municipality_zone from req.body
    const { description, type, reporter_id, latitude, longitude } = req.body;
    const userId = (req as any).user?.id || reporter_id;

    if (!description || !type) {
      return res.status(400).json({ error: 'Description and type are required.' });
    }

    let finalPhotoUrl = 'https://placehold.co/400x300?text=' + encodeURIComponent(type);
    if (req.file) {
      finalPhotoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    const finalLat = latitude !== undefined && latitude !== null && latitude !== '' ? Number(latitude) : 0.0000;
    const finalLng = longitude !== undefined && longitude !== null && longitude !== '' ? Number(longitude) : 0.0000;

    // 2. Always use the server-side calculation
    const backendMunicipalityZone = await getMunicipalityZone(finalLat, finalLng);

    const db = getDbPool();
    if (db) {
      try {
        // 3. Insert the backend-generated zone, ignoring any user-provided string
        await db.execute(
          'INSERT INTO issues (category, severity, description, reporter_id, photo_url, latitude, longitude, municipality_zone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            type, 
            'Medium',
            description, 
            userId,
            finalPhotoUrl,
            finalLat,
            finalLng,
            backendMunicipalityZone // This is the secured variable
          ]
        );
      } catch (dbError) {
        console.error("Database insert error:", dbError);
        return res.status(500).json({ error: "Database error" });
      }
    } else {
      return res.status(503).json({ error: "Database connection not available" });
    }

    res.json({
      success: true,
      message: "Issue reported successfully",
      zoneAssigned: backendMunicipalityZone // Optional: let the user know where it was routed
    });

  } catch (error) {
    console.error("Internal Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post(['/api/issues/:id/upvote', '/api/upvote'], authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const issueId = req.params.id || req.body.issue_id;
    if (!issueId) return res.status(400).json({ error: 'Issue ID is required' });

    const db = getDbPool();
    if (!db) return res.status(503).json({ error: 'Database unavailable' });

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      try {
        await connection.execute(
          'INSERT INTO issue_upvotes (user_id, issue_id) VALUES (?, ?)',
          [userId, issueId]
        );
      } catch (err: any) {
        if (err.code === 'ER_DUP_ENTRY') {
          await connection.rollback();
          connection.release();
          return res.status(400).json({ error: 'You have already voted on this issue.' });
        }
        throw err;
      }

      await connection.execute(
        'UPDATE issues SET upvotes = upvotes + 1, upvote_count = upvote_count + 1 WHERE id = ?',
        [issueId]
      );

      const [rows] = await connection.execute(
        'SELECT upvotes, status FROM issues WHERE id = ?',
        [issueId]
      ) as any;

      const issue = rows[0];
      if (issue && issue.upvotes >= 3 && issue.status === 'Unverified') {
        await connection.execute(
          'UPDATE issues SET status = "Pending" WHERE id = ?',
          [issueId]
        );
      }

      await connection.commit();
      connection.release();
      res.json({ success: true, message: 'Upvoted successfully!' });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error) {
    console.error('Error upvoting issue:', error);
    res.status(500).json({ error: 'Failed to upvote' });
  }
});

app.get('/api/issues', async (req, res) => {
  try {
    const db = getDbPool();
    if (db) {
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;
      const includeCompleted = req.query.all === 'true';

      // Extract user info from token (optional authentication for this route)
      let userZone = null;
      let userRole = null;
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        try {
          const userPayload = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key-12345') as any;
          userRole = userPayload.role;
          userZone = userPayload.municipality_zone;
        } catch (e) {
          // Ignore invalid token
        }
      }

      let query = 'SELECT * FROM issues';
      let conditions: string[] = [];
      let params: any[] = [];

      if (!includeCompleted) {
        conditions.push('status != "Completed"');
      }

      if (req.query.status) {
        conditions.push('status = ?');
        params.push(req.query.status as string);
        
        // If they are specifically fetching Unverified issues, limit to their own zone if they have one
        if (req.query.status === 'Unverified' && userRole === 'citizen' && userZone) {
          conditions.push('municipality_zone = ?');
          params.push(userZone);
        }
      }

      // If the user is an admin and has a municipality_zone, filter the issues
      if (userRole === 'admin' && userZone) {
        conditions.push('municipality_zone = ?');
        params.push(userZone);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

      const [rows] = await db.query(query, params);
      res.json({ success: true, data: rows });
    } else {
      res.status(503).json({ success: false, error: 'Database connection not available.' });
    }
  } catch (error) {
    console.error("Error fetching issues:", error);
    res.status(500).json({ success: false, error: "Failed to fetch issues" });
  }
});

app.delete('/api/issues/:id', authorizeRole('admin'), async (req, res) => {
  try {
    const db = getDbPool();
    if (db) {
      const issueId = req.params.id;
      const [result] = await db.execute('DELETE FROM issues WHERE id = ?', [issueId]) as any;
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, error: 'Issue not found' });
      }
      res.json({ success: true, message: 'Issue deleted successfully' });
    } else {
      res.status(503).json({ success: false, error: 'Database connection not available.' });
    }
  } catch (error) {
    console.error("Error deleting issue:", error);
    res.status(500).json({ success: false, error: "Failed to delete issue" });
  }
});

app.patch('/api/issues/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const db = getDbPool();
    if (!db) {
      return res.status(503).json({ success: false, error: 'Database connection not available.' });
    }

    const issueId = req.params.id;
    const status = req.body.status;
    if (!['Pending', 'Working', 'Completed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      const [issues] = await connection.execute('SELECT reporter_id, status FROM issues WHERE id = ?', [issueId]) as any;
      if (issues.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ success: false, error: 'Issue not found' });
      }

      const issue = issues[0];
      if (issue.status === status) {
          await connection.rollback();
          connection.release();
          return res.status(400).json({ success: false, error: `Issue already ${status}` });
      }

      await connection.execute('UPDATE issues SET status = ? WHERE id = ?', [status, issueId]);

      let message = `Issue status updated to ${status}`;

      if (status === 'Completed' && issue.status !== 'Completed') {
        if (issue.reporter_id) {
          await connection.execute('UPDATE users SET points_balance = points_balance + 50 WHERE id = ?', [issue.reporter_id]);
          message = 'Issue Completed! 50 Points awarded to the reporter.';
        }
      }

      await connection.commit();
      connection.release();
      res.json({ success: true, message, status });
    } catch (err) {
      await connection.rollback();
      connection.release();
      throw err;
    }
  } catch (error) {
    console.error("Error updating issue:", error);
    res.status(500).json({ success: false, error: "Failed to update issue" });
  }
});

app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const userPayload = (req as any).user;
    if (!userPayload) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const db = getDbPool();
    if (db) {
      const userId = userPayload.id;
      
      // Handle hardcoded admin
      if (userId === 0 && userPayload.role === 'admin') {
        return res.json({ 
          success: true, 
          data: { 
            id: 0, 
            name: 'City Administrator', 
            email: userPayload.email, 
            role: 'admin', 
            points_balance: 0 
          } 
        });
      }

      const [users] = await db.execute('SELECT id, name, email, role, points_balance FROM users WHERE id = ?', [userId]) as any;
      if (users.length > 0) {
        res.json({ success: true, data: users[0] });
      } else {
        res.status(404).json({ success: false, error: 'User not found' });
      }
    } else {
      res.status(503).json({ success: false, error: 'Database connection not available.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch user profile" });
  }
});

app.patch('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const userPayload = (req as any).user;
    if (!userPayload || userPayload.id === 0) {
      return res.status(403).json({ success: false, error: 'Cannot edit this profile' });
    }
    
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Invalid name provided' });
    }

    const db = getDbPool();
    if (db) {
      const [result] = await db.execute('UPDATE users SET name = ? WHERE id = ?', [name.trim(), userPayload.id]) as any;
      if (result.affectedRows > 0) {
        res.json({ success: true, message: 'Profile updated' });
      } else {
        res.status(404).json({ success: false, error: 'User not found' });
      }
    } else {
      res.status(503).json({ success: false, error: 'Database connection not available.' });
    }
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ success: false, error: "Failed to update user profile" });
  }
});

// Admin User Management APIs
app.get('/api/users', authenticateToken, isAdmin, async (req, res) => {
  try {
    const db = getDbPool();
    if (!db) return res.status(503).json({ success: false, error: 'Database connection not available.' });

    const [users] = await db.execute('SELECT id, name, email, role, points_balance, created_at FROM users ORDER BY created_at DESC');
    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

app.patch('/api/users/:id/role', authenticateToken, isAdmin, async (req, res) => {
  try {
    const db = getDbPool();
    if (!db) return res.status(503).json({ success: false, error: 'Database connection not available.' });

    const targetUserId = req.params.id;
    const { role } = req.body;
    const currentUserId = (req as any).user.id;

    if (parseInt(targetUserId) === currentUserId) {
       return res.status(400).json({ success: false, error: 'Cannot change your own role' });
    }

    if (!['admin', 'citizen'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const [result] = await db.execute('UPDATE users SET role = ? WHERE id = ?', [role, targetUserId]) as any;
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, message: `User role updated to ${role}` });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ success: false, error: "Failed to update user role" });
  }
});

// Setup Vite middleware for development or serve static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
