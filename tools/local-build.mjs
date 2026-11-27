import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const localBuildRoot = path.join(root, '.lg', 'local-build');

// Fresh clones can run the bundled apps from the checked-in milestone.
export function bundlePath(relative) {
    const local = path.join(localBuildRoot, relative);
    return existsSync(local) ? local : path.join(root, relative);
}
