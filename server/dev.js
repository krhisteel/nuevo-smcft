// Servidor local de la API (en Vercel se usa api/index.js).
// También sirve el frontend compilado (dist/) si existe, para "npm start".
import fs from 'node:fs'
import path from 'node:path'
import express from 'express'
import app from './app.js'

// Carga variables de .env si existe (sin dependencias extra)
if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
}

const dist = path.resolve('dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const port = Number(process.env.PORT || process.env.API_PORT || 3001)
app.listen(port, () => {
  console.log(`SMCFT API escuchando en http://localhost:${port}/api/v1`)
})
