const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration du stockage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const playerId = req.params.playerId || 'common';
    const uploadPath = path.join(__dirname, 'uploads', playerId);
    
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Nom unique : timestamp + nom original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Filtre de fichiers (optionnel, ici on accepte tout pour l'instant)
const fileFilter = (req, file, cb) => {
  // Exemple pour accepter seulement les images et PDF
  // if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
  //   cb(null, true);
  // } else {
  //   cb(new Error('Format de fichier non supporté'), false);
  // }
  cb(null, true);
};

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // Limite à 10MB
  },
  fileFilter: fileFilter
});

module.exports = upload;
