// Local fault-injection harness: normal runner UI, no extra HTTP endpoints.
// Type "crash" on stdin to terminate loaded workers, then reopen in the UI.
import { Worker } from 'node:worker_threads';
import { createInterface } from 'node:readline';
import { createRunnerServer } from '../../headless/graphrunner/server/index.js';

const workers = new Set();
const original = Worker.prototype.postMessage;
Worker.prototype.postMessage = function(...args) {
    if (!workers.has(this)) {
        workers.add(this);
        this.once('exit', () => workers.delete(this));
    }
    return original.apply(this, args);
};
const runner = createRunnerServer();
runner.server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => {
    console.log(`Browser fixture: http://127.0.0.1:${runner.server.address().port}; stdin: crash or quit`);
});
const input = createInterface({ input:process.stdin });
let closing = false;
async function close() {
    if (closing) return;
    closing = true;
    Worker.prototype.postMessage = original;
    input.close();
    await runner.close();
}
input.on('line', async line => {
    if (line.trim() === 'crash') {
        const loaded = [...workers];
        await Promise.all(loaded.map(worker => worker.terminate()));
        console.log(`Terminated ${loaded.length} fixture worker(s).`);
    } else if (line.trim() === 'quit') await close();
});
process.once('SIGINT', close);
process.once('SIGTERM', close);
