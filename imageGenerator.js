const { createCanvas, loadImage } = require('canvas');
const fs = require('fs').promises;
const path = require('path');

const IMAGES_DIR = path.join(__dirname, 'images');

/**
 * Generate an image with time overlay
 * @param {string} type - 'sahar' or 'iftar'
 * @param {string} timeText - Time to display (e.g., '05:54')
 * @param {string} outputPath - Path to save generated image
 * @returns {Promise<string>} - Path to generated image
 */
async function generateTimeImage(type, timeText, outputPath) {
  try {
    const templatePath = path.join(IMAGES_DIR, type, `${type}.png`);
    
    // Load template image
    const image = await loadImage(templatePath);
    
    // Create canvas with same dimensions
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');
    
    // Draw template
    ctx.drawImage(image, 0, 0);
    
    // Font settings - bold, elegant font, dark green, centered
    ctx.font = 'bold 110px Georgia, "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Calculate center position (adjust for golden box - moved lower)
    const centerX = image.width / 2;
    const centerY = image.height / 2 + 60; // Moved lower in the golden box
    
    // Draw text outline/stroke for better visibility
    ctx.strokeStyle = '#d4af37'; // Gold color outline
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText(timeText, centerX, centerY);
    
    // Draw text fill
    ctx.fillStyle = '#1a3d2f'; // Dark green color
    ctx.fillText(timeText, centerX, centerY);
    
    // Add subtle shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Save to file
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(outputPath, buffer);
    
    console.log(`Generated ${type} image: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`Error generating ${type} image:`, error.message);
    throw error;
  }
}

/**
 * Clean up temporary image file
 * @param {string} filePath - Path to file to delete
 */
async function cleanupTempFile(filePath) {
  try {
    await fs.unlink(filePath);
    console.log(`Cleaned up: ${filePath}`);
  } catch (error) {
    console.error('Error cleaning up temp file:', error.message);
    // Don't throw - cleanup errors shouldn't break the bot
  }
}

module.exports = {
  generateTimeImage,
  cleanupTempFile
};
