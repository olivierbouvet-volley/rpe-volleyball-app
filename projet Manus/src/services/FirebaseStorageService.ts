export interface MediaUploadResult {
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video';
  fileName: string;
  size: number;
}

class FirebaseStorageService {
  private storage: any;

  constructor() {
    // Firebase est chargé globalement via firebase-loader.js
    // Attendre que Firebase soit disponible
    if (!(window as any).firebase) {
      console.warn('⚠️ Firebase pas encore chargé, attente...');
    }
  }

  private getStorage() {
    if (!this.storage) {
      const firebase = (window as any).firebase;
      if (!firebase || !firebase.storage) {
        throw new Error('Firebase Storage n\'est pas disponible. Vérifiez que firebase-storage-compat.js est chargé.');
      }
      this.storage = firebase.storage();
    }
    return this.storage;
  }

  /**
   * Compresse une image avant upload
   */
  private async compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Redimensionner si nécessaire
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to compress image'));
              }
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Génère une miniature pour une image
   */
  private async generateThumbnail(file: File, maxWidth: number = 300): Promise<Blob> {
    return this.compressImage(file, maxWidth, 0.7);
  }

  /**
   * Upload un fichier média vers Firebase Storage
   */
  async uploadMedia(
    file: File,
    userId: string,
    dateKey: string,
    onProgress?: (progress: number) => void
  ): Promise<MediaUploadResult> {
    try {
      const mediaId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        throw new Error('Type de fichier non supporté. Utilisez des images ou vidéos.');
      }

      const basePath = `schedules/${userId}/${dateKey}`;
      let uploadFile: File | Blob = file;
      let thumbnailUrl: string | undefined;

      const storage = this.getStorage();

      // Compression pour les images
      if (isImage) {
        uploadFile = await this.compressImage(file);
        
        // Générer miniature
        const thumbnail = await this.generateThumbnail(file);
        const thumbnailRef = storage.ref(`${basePath}/thumbnails/${mediaId}_thumb.jpg`);
        await thumbnailRef.put(thumbnail);
        thumbnailUrl = await thumbnailRef.getDownloadURL();
      }

      // Upload du fichier principal
      const fileName = `${mediaId}.${fileExtension}`;
      const fileRef = storage.ref(`${basePath}/${fileName}`);
      const uploadTask = fileRef.put(uploadFile, {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Suivi de progression
      if (onProgress) {
        uploadTask.on('state_changed', (snapshot: any) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(progress);
        });
      }

      await uploadTask;
      const url = await fileRef.getDownloadURL();

      return {
        url,
        thumbnailUrl,
        type: isImage ? 'image' : 'video',
        fileName: file.name,
        size: file.size,
      };
    } catch (error) {
      console.error('Erreur upload Firebase Storage:', error);
      throw new Error(`Échec de l'upload: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    }
  }

  /**
   * Supprime un fichier média de Storage
   */
  async deleteMedia(url: string): Promise<void> {
    try {
      const storage = this.getStorage();
      const fileRef = storage.refFromURL(url);
      await fileRef.delete();
    } catch (error) {
      console.error('Erreur suppression Firebase Storage:', error);
      // Ne pas bloquer si le fichier n'existe pas
    }
  }

  /**
   * Supprime plusieurs fichiers
   */
  async deleteMultipleMedia(urls: string[]): Promise<void> {
    await Promise.all(urls.map(url => this.deleteMedia(url)));
  }
}

export const storageService = new FirebaseStorageService();
