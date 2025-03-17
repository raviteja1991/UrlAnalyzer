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
        console.log(`Processing URL: ${inputUrl}`);
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
        const imageUrls = []; // Added array to store all image URLs
        const imageSizePromises = [];

        $('img').each((_, element) => {
            let src = $(element).attr('src');
            if (!src) return;

            try {
                src = new URL(src, baseUrl).href;
                imageUrls.push(src); // Add to all images array
            } catch {
                return;
            }

            const extension = src.split('.').pop().toLowerCase().split('?')[0] || 'unknown';

            if (!imageTypes[extension]) {
                imageTypes[extension] = { count: 0, size: 0, urls: [] };
            }

            imageTypes[extension].count += 1;
            imageTypes[extension].urls.push(src); // Add URL to specific type

            imageSizePromises.push(
                axios.get(src, { responseType: 'arraybuffer', timeout: 5000 })
                    .then((imageResponse) => {
                        imageTypes[extension].size += Buffer.byteLength(imageResponse.data);
                    })
                    .catch(() => {
                        // Continue silently if an image fails to load
                    })
            );
        });

        // Use Promise.allSettled to handle both fulfilled and rejected promises
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
                imageUrls, // Include all image URLs
                internalLinks: [...internalLinks],
                externalLinks: [...externalLinks]
            }
        });

    } catch (error) {
        console.error('URL Processing Error:', error);

        if (error.code = 'ECONNABORTED') {
            return res.status(408).json({
                message: 'Request timedout. The website might be too large or slow to respond.'
            });
        }

        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            return res.status(error.response.status).json({
                message: `Failed to fetch URL (Status: ${error.response.status})`,
                details: error.message
            });
        } else if (error.request) {
            // The request was made but no response was received
            return res.status(503).json({
                message: 'No response received from the target server',
                details: error.message
            });
        } else {
            // Something happened in setting up the request that triggered an Error
            return res.status(500).json({
                message: 'Error processing URL',
                details: error.message
            });
        }
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));