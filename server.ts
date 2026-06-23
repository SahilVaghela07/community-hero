import express from 'express';
import multer from 'multer';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import mysql from 'mysql2/promise';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
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
        CREATE TABLE IF NOT EXISTS issues (
          id INT AUTO_INCREMENT PRIMARY KEY,
          category VARCHAR(50),
          severity VARCHAR(50),
          description TEXT,
          latitude DECIMAL(10, 8),
          longitude DECIMAL(11, 8),
          status VARCHAR(50) DEFAULT 'Pending',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('MySQL issues table ensured.');
    } catch (e) {
      console.warn('Could not initialize MySQL tables. Is the DB running?', e);
    }
  }
}
initDb();

app.post('/api/issues', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    const { latitude, longitude } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'Image file is required.' });
    }

    const base64Image = file.buffer.toString('base64');
    
    // Schema for structured JSON output from Gemini
    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: "One of: Pothole, Streetlight, Leak, Garbage, Other",
        },
        severity: {
          type: Type.STRING,
          description: "One of: Low, Medium, High",
        },
        description: {
          type: Type.STRING,
          description: "A brief 1-sentence summary of the issue.",
        }
      },
      required: ["category", "severity", "description"]
    };

    let aiResult;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: "user",
            parts: [
               { text: "Analyze this image of a civic issue. Provide the category, severity, and a brief description." },
               { inlineData: { data: base64Image, mimeType: file.mimetype } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });
      
      const responseText = response.text;
      if (responseText) {
          aiResult = JSON.parse(responseText);
      } else {
        throw new Error('Empty response from AI.');
      }
    } catch (aiError) {
      console.error("Gemini API error, falling back to mock data:", aiError);
      // Fallback in case of AI failure
      aiResult = {
        category: "Other",
        severity: "Medium",
        description: "An issue was reported but AI analysis is currently unavailable."
      };
    }

    // Insert into MySQL if available
    const db = getDbPool();
    if (db) {
      try {
        await db.execute(
          'INSERT INTO issues (category, severity, description, latitude, longitude) VALUES (?, ?, ?, ?, ?)',
          [
            aiResult.category, 
            aiResult.severity, 
            aiResult.description, 
            latitude ? parseFloat(latitude) : null, 
            longitude ? parseFloat(longitude) : null
          ]
        );
      } catch (dbError) {
        console.error("Error inserting into MySQL table:", dbError);
        // Continue and return success to UI anyway
      }
    } else {
      console.log('Skipping MySQL insert (no DB configured or running). Simulated insert:', aiResult);
    }

    res.json({
      success: true,
      data: aiResult
    });

  } catch (error) {
    console.error("Internal Server Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


app.get('/api/issues', async (req, res) => {
  try {
    const db = getDbPool();
    if (db) {
      const [rows] = await db.query('SELECT * FROM issues ORDER BY created_at DESC');
      res.json({ success: true, data: rows });
    } else {
      res.status(503).json({ success: false, error: 'Database connection not available.' });
    }
  } catch (error) {
    console.error("Error fetching issues:", error);
    res.status(500).json({ success: false, error: "Failed to fetch issues" });
  }
});

app.delete('/api/issues/:id', async (req, res) => {
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

app.patch('/api/issues/:id/status', async (req, res) => {
  try {
    const db = getDbPool();
    if (db) {
      const issueId = req.params.id;
      // using body parser
      let data = '';
      req.on('data', chunk => { data += chunk.toString(); });
      req.on('end', async () => {
        try {
          const body = JSON.parse(data || '{}');
          const status = body.status;
          if (!status) {
            return res.status(400).json({ success: false, error: 'Status is required' });
          }
          const [result] = await db.execute('UPDATE issues SET status = ? WHERE id = ?', [status, issueId]) as any;
          if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Issue not found' });
          }
          res.json({ success: true, message: 'Issue status updated', status });
        } catch (e) {
            res.status(400).json({ success: false, error: 'Invalid JSON body' });
        }
      });
    } else {
      res.status(503).json({ success: false, error: 'Database connection not available.' });
    }
  } catch (error) {
    console.error("Error updating issue:", error);
    res.status(500).json({ success: false, error: "Failed to update issue" });
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
