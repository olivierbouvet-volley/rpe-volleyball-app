const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const upload = require('./uploadConfig');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Dossier pour les uploads
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

// Servir les fichiers statiques (les uploads)
app.use('/uploads', express.static(UPLOADS_DIR));

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// === API DOCUMENTS ===

// 1. Upload Document
app.post('/api/players/:playerId/documents', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier envoyé' });
    }
    
    res.json({
      message: 'Fichier uploadé avec succès',
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        path: `/uploads/${req.params.playerId}/${req.file.filename}`,
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadDate: new Date()
      }
    });
  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload' });
  }
});

// 2. List Documents
app.get('/api/players/:playerId/documents', (req, res) => {
  const playerId = req.params.playerId;
  const playerDir = path.join(UPLOADS_DIR, playerId);

  if (!fs.existsSync(playerDir)) {
    return res.json([]); // Pas de dossier = pas de fichiers
  }

  fs.readdir(playerDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lecture dossier' });
    }

    const fileList = files.map(filename => {
      const filePath = path.join(playerDir, filename);
      const stats = fs.statSync(filePath);
      
      return {
        filename: filename,
        // On essaie de retrouver le nom original (partie après le premier tiret du timestamp)
        originalname: filename.substring(filename.indexOf('-') + 1).substring(filename.substring(filename.indexOf('-') + 1).indexOf('-') + 1),
        path: `/uploads/${playerId}/${filename}`,
        size: stats.size,
        uploadDate: stats.mtime
      };
    });

    res.json(fileList);
  });
});

// 3. Delete Document
app.delete('/api/players/:playerId/documents/:filename', (req, res) => {
  const { playerId, filename } = req.params;
  const filePath = path.join(UPLOADS_DIR, playerId, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    res.json({ message: 'Fichier supprimé' });
  } else {
    res.status(404).json({ error: 'Fichier non trouvé' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
