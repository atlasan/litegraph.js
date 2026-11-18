import express from 'express';
import fs from 'node:fs';
import { workflowsDir } from './config.js';

export const router = express.Router();
fs.mkdirSync(workflowsDir, { recursive: true });
router.get('/list_files', async (_req, res) => {
  try {
    const entries = await fs.promises.readdir(workflowsDir, { withFileTypes: true });
    res.json(entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json')).map((entry) => entry.name).sort());
  } catch {
    res.status(500).json({ error: 'Failed to read workflows directory' });
  }
});
