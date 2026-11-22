import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export const runnerRoot = fileURLToPath(new URL('../', import.meta.url));
export const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
dotenv.config({ path: path.join(runnerRoot, '.env') });
export const workflowsDir = path.resolve(runnerRoot, process.env.WORKFLOWS_DIR || 'workflows');

export function resolveWorkflow(file) {
  if (typeof file !== 'string' || !file || path.isAbsolute(file) || file.includes('\\') || file.split('/').includes('..') || !file.toLowerCase().endsWith('.json')) {
    throw new Error('Expected a relative JSON workflow path');
  }
  const root = fs.realpathSync(workflowsDir);
  const resolved = fs.realpathSync(path.resolve(root, file));
  const relative = path.relative(root, resolved);
  if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative) || !fs.statSync(resolved).isFile()) {
    throw new Error('Workflow must be a file inside WORKFLOWS_DIR');
  }
  return { graphId: relative.split(path.sep).join('/'), filePath: resolved };
}
