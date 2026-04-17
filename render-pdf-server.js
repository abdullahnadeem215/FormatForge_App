const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Adobe PDF to Word endpoint
app.post('/convert-pdf-to-word', upload.single('file'), async (req, res) => {
  try {
    const { file } = req;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const clientId = process.env.ADOBE_CLIENT_ID;
    const clientSecret = process.env.ADOBE_CLIENT_SECRET;

    // Get Adobe token
    const tokenRes = await fetch('https://pdf-services.adobe.io/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`
    });
    const { access_token } = await tokenRes.json();

    // Upload PDF
    const uploadRes = await fetch('https://pdf-services.adobe.io/assets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/pdf'
      },
      body: file.buffer
    });
    const { assetID } = await uploadRes.json();

    // Convert to Word
    const convertRes = await fetch('https://pdf-services.adobe.io/operation/exportpdf', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ assetID, targetFormat: 'DOCX' })
    });
    const { jobID } = await convertRes.json();

    // Poll for completion
    let status = 'running';
    let resultUrl = '';
    while (status !== 'done') {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`https://pdf-services.adobe.io/operation/exportpdf/${jobID}/status`, {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      const data = await statusRes.json();
      status = data.status;
      if (status === 'done') resultUrl = data.asset.assetID;
    }

    // Download result
    const downloadRes = await fetch(`https://pdf-services.adobe.io/asset/${resultUrl}/content`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    const docxBuffer = await downloadRes.buffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(docxBuffer);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
