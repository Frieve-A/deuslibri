const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'content', 'books');
const targetDir = path.join(__dirname, '..', 'public', 'content', 'books');

// Function to recursively copy directory
function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  // Read source directory
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectory
      copyDir(srcPath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Check if source directory exists
if (fs.existsSync(sourceDir)) {
  console.log('Copying content to public folder...');
  copyDir(sourceDir, targetDir);
  console.log('Content copied successfully!');
} else {
  console.warn('Warning: content/books directory not found');
}
