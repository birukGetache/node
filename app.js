const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const QRCode = require('qrcode');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(bodyParser.json());

const ENCRYPTION_KEY = crypto.randomBytes(32); // Store this securely
let dataStore = {}; // In-memory store for demonstration purposes

// Function to encrypt data
const encryptData = (data) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted; // Store IV with the encrypted data
};

// Function to decrypt data
const decryptData = (data) => {
  const [iv, encrypted] = data.split(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.from(iv, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Hash the sensitive data
    const hashedEmail = await bcrypt.hash(email, 10);
    
    // Encrypt the non-sensitive data
    const encryptedPhone = encryptData(phone);

    // Generate a unique identifier (for demo purposes)
    const uniqueId = crypto.randomBytes(16).toString('hex');
    
    // Store data in memory (for demonstration; in a real app, you'd save it to a database)
    dataStore[uniqueId] = { name, hashedEmail, encryptedPhone };

    // Generate QR Code for the unique ID URL
    const qrCodeData = `http://localhost:8080/api/decrypt/${uniqueId}`;

    res.json({ 
      message: 'Form data received successfully!', 
      qrCode: qrCodeData 
    });
  } catch (error) {
    console.error('Error processing data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint to decrypt the phone number using unique ID
app.get('/api/decrypt/:id', (req, res) => {
  const { id } = req.params;
  const data = dataStore[id];
  
  if (!data) {
    return res.status(404).json({ message: 'Data not found' });
  }

  try {
    const decryptedPhone = decryptData(data.encryptedPhone);
    res.json({ name: data.name, email: data.hashedEmail, phone: decryptedPhone });
  } catch (error) {
    console.error('Decryption error:', error);
    res.status(500).json({ message: 'Failed to decrypt data' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
