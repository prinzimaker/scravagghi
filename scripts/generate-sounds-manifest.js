#!/usr/bin/env node

/**
 * Genera automaticamente sounds.json basandosi sui file presenti nelle cartelle
 * Viene eseguito automaticamente prima di avviare il dev server
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOUNDS_DIR = path.join(__dirname, '../client/public/sounds');
const OUTPUT_FILE = path.join(SOUNDS_DIR, 'sounds.json');

// Formati audio supportati
const AUDIO_EXTENSIONS = ['.wav', '.mp3', '.ogg'];

/**
 * Legge tutti i file audio da una cartella
 */
function getAudioFiles(dir) {
  try {
    if (!fs.existsSync(dir)) {
      return [];
    }

    return fs.readdirSync(dir)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return AUDIO_EXTENSIONS.includes(ext);
      })
      .sort(); // Ordina alfabeticamente per consistenza
  } catch (error) {
    console.warn(`⚠️ Could not read directory: ${dir}`);
    return [];
  }
}

/**
 * Genera il manifest sounds.json
 */
function generateManifest() {
  console.log('🔊 Generating sounds.json manifest...');

  const manifest = {
    byte: {
      low: getAudioFiles(path.join(SOUNDS_DIR, 'byte/low')),
      med: getAudioFiles(path.join(SOUNDS_DIR, 'byte/med')),
      hig: getAudioFiles(path.join(SOUNDS_DIR, 'byte/hig'))
    },
    kill: getAudioFiles(path.join(SOUNDS_DIR, 'kill')),
    frust: getAudioFiles(path.join(SOUNDS_DIR, 'frust'))
  };

  // Conta i file totali
  const totalFiles =
    manifest.byte.low.length +
    manifest.byte.med.length +
    manifest.byte.hig.length +
    manifest.kill.length +
    manifest.frust.length;

  if (totalFiles === 0) {
    console.log('⚠️ No audio files found in /sounds/ directories');
    console.log('   Place your audio files in:');
    console.log('   - client/public/sounds/byte/low/');
    console.log('   - client/public/sounds/byte/med/');
    console.log('   - client/public/sounds/byte/hig/');
    console.log('   - client/public/sounds/kill/');
    console.log('   - client/public/sounds/frust/');
    console.log('');
    console.log('   Creating empty sounds.json manifest...');
  }

  // Scrivi il file JSON
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(manifest, null, 2) + '\n',
    'utf-8'
  );

  console.log('✅ sounds.json generated:');
  console.log(`   - Byte/Low: ${manifest.byte.low.length} files`);
  console.log(`   - Byte/Med: ${manifest.byte.med.length} files`);
  console.log(`   - Byte/Hig: ${manifest.byte.hig.length} files`);
  console.log(`   - Kill: ${manifest.kill.length} files`);
  console.log(`   - Frust: ${manifest.frust.length} files`);
  console.log(`   Total: ${totalFiles} audio files`);
  console.log('');

  // Mostra i file trovati se ce ne sono
  if (manifest.byte.low.length > 0) {
    console.log('   Found in byte/low:', manifest.byte.low.join(', '));
  }
  if (manifest.byte.med.length > 0) {
    console.log('   Found in byte/med:', manifest.byte.med.join(', '));
  }
  if (manifest.byte.hig.length > 0) {
    console.log('   Found in byte/hig:', manifest.byte.hig.join(', '));
  }
  if (manifest.kill.length > 0) {
    console.log('   Found in kill:', manifest.kill.join(', '));
  }
  if (manifest.frust.length > 0) {
    console.log('   Found in frust:', manifest.frust.join(', '));
  }

  return manifest;
}

// Esegui
try {
  generateManifest();
} catch (error) {
  console.error('❌ Error generating sounds.json:', error);
  process.exit(1);
}
