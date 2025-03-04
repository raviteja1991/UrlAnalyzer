const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
// Import the url module for resolving relative URLs
const urlModule = require("url"); 
const imageSizePromises = [];

const app = express();
app.use(cors()); // Enable CORS
app.use(express.json()); // Enable JSON request body

// Sample route to test the server
app.get("/", (req, res) => {
    res.send("Backend is running!");
});

// Endpoint to fetch URL details
app.post('/api/analyze-url', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ message: "URL is required" });
    }

    try {
        // Fetch the HTML content of the URL
        const response = await axios.get(url);
        const html = response.data;
        const $ = cheerio.load(html);


        // Analyze images
        const imageTypes = {};
        $('img').each((index, element) => {
            let src = $(element).attr('src');
            if (!src) return; // Skip if no src

            // Resolve relative URLs
            src = urlModule.resolve(url, src);
            const extension = src ? src.split('.').pop() : 'unknown';

            if (!imageTypes[extension]) {
                imageTypes[extension] = { count: 0, size: 0 };
            }

            // Increment the image count 
            imageTypes[extension].count += 1;

            // Push the axios request to an array of promises
            imageSizePromises.push(axios.get(src, { responseType: 'arraybuffer' })
                .then((imageResponse) => {
                    const imageSize = Buffer.byteLength(imageResponse.data);
                    imageTypes[extension].size += imageSize;
                }).catch((err) => {
                    console.error(`Error fetching image: ${src}`, err);
                })
            );
        });

        await Promise.all(imageSizePromises);

        const internalLinks = [];
        const externalLinks = [];
        $('a').each((index, element) => {
            const href = $(element).attr('href');
            if (href) {
                const isInternal = href.startsWith(url);
                if (isInternal) {
                    internalLinks.push(href);
                } else {
                    externalLinks.push(href);
                }
            }
        });

        res.json({
            message: "URL processed successfully",
            data: {
                imageTypes,
                internalLinks,
                externalLinks,
            },
        });
    } catch (error) {
        console.error("Error processing the URL:", error);
        res.status(500).json({ message: 'Error processing URL' });
    }
});


const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
