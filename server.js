import express from "express";

const app = express()

// Configure MIME types for CSS files
app.use((req, res, next) => {
    if (req.url.endsWith('.css')) {
        res.type('text/css');
    }
    next();
});

app.use('/css', express.static('css'))
app.use('/src', express.static('src'))
app.use('/build', express.static('build'))
app.use('/external', express.static('external'))
app.use('/editor_tester', express.static('editor_tester'))
app.use('/editor', express.static('editor'))
app.use('/', express.static('editor'))

app.listen(8000, () => console.log('Simple server running on http://127.0.0.1:8000'))
