const express = require('express');
const { createCanvas, registerFont } = require('canvas');
const GIFEncoder = require('gifencoder');
const { PassThrough } = require('stream');
const moment = require('moment');
const path = require('path');

// Load custom font
registerFont(path.join(__dirname, 'fonts/FilsonProRegular.otf'), { family: 'Filson Pro' });
registerFont(path.join(__dirname, 'fonts/FilsonProHeavy.otf'), { family: 'Filson Pro Heavy' });


const app = express();
const PORT = process.env.PORT || 3000;

// Root path
app.get('/', (req, res) => {
    res.send(`
        <h1>Welcome to the Dynamic Image & GIF API</h1>
        <p>Currently serving the following endpoints:</p>
        <ul>
            <li><strong>Generate Image:</strong> <code>/generate-image?text=Hello&bgColor=%23000000&width=500&height=300</code></li>
            <li><strong>Countdown GIF:</strong> <code>/countdown-gif?endTime=2025-02-12T15:30:00Z&width=300&height=150&bgColor=%23000000&textColor=%23FFFFFF&duration=10</code></li>
        </ul>
        <p>Modify the query parameters to customize your image or GIF output.</p>
    `);
});

app.get('/generate-image', (req, res) => {
    const { text = 'Hello, World!', bgColor = '#000000', width = '500', height = '300' } = req.query;

    // Convert width and height to integers
    const canvasWidth = parseInt(width, 10) || 500;
    const canvasHeight = parseInt(height, 10) || 300;

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Set background color
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Set text style

    ctx.fillStyle = '#FFFFFF'; 
    ctx.font = `${Math.min(canvasWidth / 10, 50)}px 'Filson Pro Heavy'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw text in the center
    ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);

    // Send response as image
    res.setHeader('Content-Type', 'image/png');
    res.send(canvas.toBuffer());
});

app.get('/countdown-gif', (req, res) => {
    const { endTime, width = 300, height = 150, bgColor = '#000000', textColor = '#FFFFFF', duration = 10 } = req.query;

    if (!endTime) {
        return res.status(400).send('Error: Missing endTime parameter (ISO format required)');
    }

    const endMoment = moment.utc(endTime);
    if (!endMoment.isValid()) {
        return res.status(400).send('Error: Invalid endTime format. Use ISO format (e.g., 2025-02-12T15:30:00Z)');
    }

    let now = moment.utc();
    let remainingTime = moment.duration(endMoment.diff(now));

    if (remainingTime.asSeconds() <= 0) {
        return res.status(400).send('Error: Countdown has already expired.');
    }

    const totalFrames = Math.min(duration, remainingTime.asSeconds()); // GIF duration limit
    const canvasWidth = parseInt(width, 10) || 300;
    const canvasHeight = parseInt(height, 10) || 150;

    const encoder = new GIFEncoder(canvasWidth, canvasHeight);
    encoder.start();
    encoder.setRepeat(0); // Loop indefinitely
    encoder.setDelay(1000); // 1-second per frame
    encoder.setQuality(10);

    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // loop that generates gif images
    for (let i = 0; i <= totalFrames; i++) {  
        let frameTime = moment.duration(remainingTime.asSeconds() - i, 'seconds');

        // Format countdown time
        const timeString = `${String(frameTime.hours()).padStart(2, '0')}:` +
                           `${String(frameTime.minutes()).padStart(2, '0')}:` +
                           `${String(frameTime.seconds()).padStart(2, '0')}`;

        // Background color
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Text styling
        ctx.fillStyle = textColor;
        ctx.font = `${Math.min(canvasWidth / 5, 50)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw countdown text
        ctx.fillText(timeString, canvasWidth / 2, canvasHeight / 2);

        // Add frame to GIF
        encoder.addFrame(ctx);
    }

    encoder.finish();

    // Stream the GIF to the response
    res.setHeader('Content-Type', 'image/gif');
    const stream = new PassThrough();
    stream.end(encoder.out.getData());
    stream.pipe(res);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});