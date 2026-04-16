import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express()
const host = '0.0.0.0'
const port = Number(process.env.PREVIEW_PORT || 4173)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distDir = path.join(__dirname, 'dist')

app.use(
  express.static(distDir, {
    extensions: ['html'],
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'no-store')
    },
  }),
)

app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(port, host, () => {
  console.log(`True Voice preview available at http://${host}:${port}`)
})
