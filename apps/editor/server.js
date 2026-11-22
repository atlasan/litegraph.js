// Editor and tester dev server (npm run editor): serves the repository paths the pages load.
// Run from the repository root.
import express from "express";

const app = express()

app.use('/css', express.static('css'))
app.use('/src', express.static('src'))
app.use('/build', express.static('build'))
app.use('/external', express.static('external'))
app.use('/vendor', express.static('vendor'))
// the apps live in apps/; their old URLs (/editor/..., /editor_tester/...) keep working
app.use('/apps/editor', express.static('apps/editor'))
app.use('/apps/tester', express.static('apps/tester'))
app.use('/editor_tester', express.static('apps/tester'))
app.use('/editor', express.static('apps/editor'))
app.use('/', express.static('apps/editor'))

// PORT picks another port (for example when a second checkout already serves 8000)
const port = Number(process.env.PORT) || 8000
app.listen(port, '127.0.0.1', () => console.log(`Simple server running on http://127.0.0.1:${port}`))
