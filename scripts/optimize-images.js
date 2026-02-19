const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🖼️ Comprimiendo imágenes...\n');

  try {
    const publicDir = path.join(process.cwd(), 'public');
    let optimizedCount = 0;
    let totalSaved = 0;
    const delays = [];

    const walkDir = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          walkDir(fullPath);
        } else if (stats.isFile()) {
          const ext = path.extname(file).toLowerCase();
          
          if (['.webp', '.png', '.jpg', '.jpeg', '.avif'].includes(ext)) {
            delays.push(processImage(fullPath, stats.size));
          }
        }
      });
    };

    const processImage = async (filePath, originalSize) => {
      try {
        const dir = path.dirname(filePath);
        const fileName = path.basename(filePath);
        const ext = path.extname(filePath).toLowerCase();
        
        // Crear archivo con nombre temporal
        const newFileName = `${path.basename(filePath, ext)}_optimized${ext}`;
        const tempPath = path.join(dir, newFileName);

        // Leer y recomprimir
        let compressed = sharp(filePath);

        if (ext === '.webp') {
          compressed = compressed.webp({ quality: 70, effort: 6 });
        } else if (ext === '.avif') {
          compressed = compressed.avif({ quality: 70, effort: 6 });
        } else if (ext === '.png') {
          compressed = compressed.png({ compressionLevel: 9 });
        } else if (['.jpg', '.jpeg'].includes(ext)) {
          compressed = compressed.jpeg({ quality: 75, progressive: true });
        }

        await compressed.toFile(tempPath);

        const newSize = fs.statSync(tempPath).size;
        const saved = originalSize - newSize;

        if (saved > 100) {
          // Borrar original y renombrar
          fs.unlinkSync(filePath);
          fs.renameSync(tempPath, filePath);
          
          totalSaved += saved;
          optimizedCount++;
          
          const relPath = filePath.replace(publicDir, '').replace(/\\/g, '/');
          console.log(`✅ ${relPath}`);
          console.log(`   ${(originalSize / 1024).toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB (${(saved / 1024).toFixed(1)} KB)`);
        } else {
          // No se ahorró nada, borrar temp
          if (fs.existsSync(tempPath)) {
            fs.unlinkSync(tempPath);
          }
        }
      } catch (err) {
        console.error(`⚠️  Error en ${filePath}:`, err.message);
        
        // Limpiar archivos temp en error
        const dir = path.dirname(filePath);
        const fileName = path.basename(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const newFileName = `${path.basename(filePath, ext)}_optimized${ext}`;
        const tempPath = path.join(dir, newFileName);
        
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
          } catch (e) {}
        }
      }
    };

    walkDir(publicDir);

    // Esperar a que terminen todas las promesas
    await Promise.all(delays);

    console.log(`\n✅ Completado:`);
    console.log(`   📊 Imágenes optimizadas: ${optimizedCount}`);
    console.log(`   💾 Total ahorrado: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);

  } catch (error) {
    console.error('❌ Error fatal:', error.message);
  }
})();