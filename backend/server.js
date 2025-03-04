const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
const url = require('url');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('URL Analyzer Backend is running!');
});

app.post('/api/analyze-url', async (req, res) => {
    const { url: inputUrl } = req.body;

    if (!inputUrl) {
        return res.status(400).json({ message: 'URL is required' });
    }

    try {
        const response = await axios.get(inputUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        const html = response.data;
        const $ = cheerio.load(html);
        const baseUrl = new URL(inputUrl);

        // Image Analysis
        const imageTypes = {};
        const imageSizePromises = [];

        $('img').each((_, element) => {
            let src = $(element).attr('src');
            if (!src) return;

            try {
                src = new URL(src, baseUrl).href;
            } catch {
                return;
            }

            const extension = src.split('.').pop().toLowerCase().split('?')[0] || 'unknown';

            if (!imageTypes[extension]) {
                imageTypes[extension] = { count: 0, size: 0 };
            }

            imageTypes[extension].count += 1;

            imageSizePromises.push(
                axios.get(src, { responseType: 'arraybuffer' })
                    .then((imageResponse) => {
                        imageTypes[extension].size += Buffer.byteLength(imageResponse.data);
                    })
                    .catch(() => {})
            );
        });

        await Promise.allSettled(imageSizePromises);

        // Link Analysis
        const internalLinks = new Set();
        const externalLinks = new Set();

        $('a').each((_, element) => {
            let href = $(element).attr('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

            try {
                const absoluteUrl = new URL(href, baseUrl).href;
                const absoluteUrlObj = new URL(absoluteUrl);
                const baseUrlObj = new URL(baseUrl);

                const cleanBaseHost = baseUrlObj.hostname.replace(/^www\./, '');
                const cleanLinkHost = absoluteUrlObj.hostname.replace(/^www\./, '');

                if (
                    cleanLinkHost === cleanBaseHost || 
                    absoluteUrl.startsWith(baseUrl.href) ||
                    absoluteUrlObj.hostname.endsWith(cleanBaseHost)
                ) {
                    internalLinks.add(absoluteUrl);
                } else {
                    externalLinks.add(absoluteUrl);
                }
            } catch {
                // Ignore invalid URLs
            }
        });

        res.json({
            message: 'URL processed successfully',
            data: {
                imageTypes,
                internalLinks: [...internalLinks].slice(0, 50),  // Limit to 50 links
                externalLinks: [...externalLinks].slice(0, 50)   // Limit to 50 links
            }
        });

    } catch (error) {
        console.error('URL Processing Error:', error.message);
        res.status(500).json({ 
            message: 'Error processing URL', 
            details: error.message 
        });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));