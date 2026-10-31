export function checkAbort(signal) {
    if (signal?.aborted) throw Object.assign(new Error('Test canceled'), { name: 'AbortError' });
}

// A task boundary lets Stop and timeout timers run even during CPU-heavy scenarios.
export function pause(ms = 0, signal) {
    return new Promise((resolve, reject) => {
        const finish = (error) => {
            clearTimeout(timer);
            signal?.removeEventListener('abort', abort);
            if (error) reject(error); else resolve();
        };
        const abort = () => finish(Object.assign(new Error('Test canceled'), { name: 'AbortError' }));
        const timer = setTimeout(() => finish(), ms);
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) abort();
    });
}

export function shuffled(values, random = Math.random) {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
