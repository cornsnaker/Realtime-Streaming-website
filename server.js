/**
 * StreamFlow Proxy Server
 * Bypasses CORS and hotlink restrictions for video streaming
 */

const http = require('http');
const https = require('https');
const url = require('url');
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream');
const { exec } = require('child_process');
const { promisify } = require('util');
const assToVtt = require('ass-to-vtt');

const execAsync = promisify(exec);

const PORT = process.env.PORT || 4000;

// MIME types for serving static files
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mkv': 'video/x-matroska',
    '.webm': 'video/webm',
    '.mp4': 'video/mp4'
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    
    // Add CORS headers to all responses
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Play endpoint: /play?url=VIDEO_URL - Opens video in web player
    if (pathname === '/play') {
        const videoUrl = parsedUrl.query.url;

        if (!videoUrl) {
            // Redirect to home if no URL provided
            res.writeHead(302, { 'Location': '/' });
            res.end();
            return;
        }

        // Serve index.html with the video URL pre-loaded
        const indexPath = path.join(__dirname, 'index.html');
        fs.readFile(indexPath, 'utf8', (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Server error');
                return;
            }

            // Inject script to auto-load the video
            const autoLoadScript = `
                <script>
                    window.addEventListener('DOMContentLoaded', () => {
                        const urlInput = document.getElementById('urlInput');
                        if (urlInput) {
                            urlInput.value = decodeURIComponent('${encodeURIComponent(videoUrl)}');
                            // Auto-trigger load after a short delay
                            setTimeout(() => {
                                const loadBtn = document.getElementById('loadBtn');
                                if (loadBtn) loadBtn.click();
                            }, 100);
                        }
                    });
                </script>
            `;

            // Insert before closing body tag
            const modifiedHtml = data.replace('</body>', `${autoLoadScript}</body>`);

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(modifiedHtml);
        });
        return;
    }

    // Proxy endpoint: /proxy?url=VIDEO_URL
    if (pathname === '/proxy') {
        const videoUrl = parsedUrl.query.url;

        if (!videoUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
        }

        console.log(`\n🎬 Proxying: ${videoUrl}`);

        try {
            await proxyVideo(videoUrl, req, res);
        } catch (error) {
            console.error('❌ Proxy error:', error.message);
            // Only send error if headers haven't been sent
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        }
        return;
    }

    // Download endpoint: /download?url=VIDEO_URL&filename=NAME
    if (pathname === '/download') {
        const videoUrl = parsedUrl.query.url;
        const filename = parsedUrl.query.filename || 'video';

        if (!videoUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
        }

        console.log(`\n📥 Download: ${videoUrl}`);

        try {
            await proxyDownload(videoUrl, filename, req, res);
        } catch (error) {
            console.error('❌ Download error:', error.message);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        }
        return;
    }

    // Subtitle conversion endpoint: /subtitle/convert?url=SUBTITLE_URL
    if (pathname === '/subtitle/convert') {
        const subtitleUrl = parsedUrl.query.url;

        if (!subtitleUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
        }

        console.log(`\n📝 Converting subtitle: ${subtitleUrl}`);

        try {
            await convertAndProxySubtitle(subtitleUrl, req, res);
        } catch (error) {
            console.error('❌ Subtitle conversion error:', error.message);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        }
        return;
    }

    // Subtitle proxy endpoint: /subtitle/proxy?url=SUBTITLE_URL
    if (pathname === '/subtitle/proxy') {
        const subtitleUrl = parsedUrl.query.url;

        if (!subtitleUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
        }

        console.log(`\n📝 Proxying subtitle: ${subtitleUrl}`);

        try {
            await proxySubtitle(subtitleUrl, req, res);
        } catch (error) {
            console.error('❌ Subtitle proxy error:', error.message);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        }
        return;
    }

    // Video analysis endpoint: /analyze?url=VIDEO_URL
    if (pathname === '/analyze') {
        const videoUrl = parsedUrl.query.url;

        if (!videoUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
        }

        console.log(`\n🔍 Analyzing video: ${videoUrl}`);

        try {
            const analysis = await analyzeVideo(videoUrl);
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify(analysis));
        } catch (error) {
            console.error('❌ Analysis error:', error.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: error.message,
                ffprobeAvailable: false
            }));
        }
        return;
    }

    // Extract subtitle endpoint: /extract-subtitle?url=VIDEO_URL&index=N
    if (pathname === '/extract-subtitle') {
        const videoUrl = parsedUrl.query.url;
        const subtitleIndex = parsedUrl.query.index || '0';

        if (!videoUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
        }

        console.log(`\n📤 Extracting subtitle ${subtitleIndex} from: ${videoUrl}`);

        try {
            await extractSubtitle(videoUrl, subtitleIndex, req, res);
        } catch (error) {
            console.error('❌ Extraction error:', error.message);
            if (!res.headersSent) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        }
        return;
    }

    // Serve static files
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(__dirname, filePath);
    
    // Security: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
            return;
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
});

function proxyVideo(videoUrl, clientReq, clientRes) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(videoUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;
        
        // Forward Range header for seeking support
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive',
            'Referer': `${parsedUrl.protocol}//${parsedUrl.hostname}/`
        };
        
        // Forward Range header for seeking
        if (clientReq.headers.range) {
            headers['Range'] = clientReq.headers.range;
            console.log(`📍 Range: ${clientReq.headers.range}`);
        }
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.path,
            method: clientReq.method || 'GET',
            headers: headers,
            timeout: 30000
        };
        
        const proxyReq = protocol.request(options, (proxyRes) => {
            console.log(`📥 Response: ${proxyRes.statusCode}`);
            
            // Handle redirects
            if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                let redirectUrl = proxyRes.headers.location;
                // Handle relative redirects
                if (redirectUrl.startsWith('/')) {
                    redirectUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${redirectUrl}`;
                }
                console.log(`🔄 Redirect: ${redirectUrl}`);
                proxyVideo(redirectUrl, clientReq, clientRes)
                    .then(resolve)
                    .catch(reject);
                return;
            }
            
            // Extract filename from Content-Disposition or URL
            let filename = 'unknown';
            const contentDisposition = proxyRes.headers['content-disposition'];
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }
            // Fallback to URL parsing
            if (filename === 'unknown') {
                const urlPath = parsedUrl.pathname;
                const pathSegments = urlPath.split('/');
                filename = pathSegments[pathSegments.length - 1] || 'video';
                filename = decodeURIComponent(filename);
                // Remove query params from filename
                filename = filename.split('?')[0];
            }

            // Forward response headers
            const responseHeaders = {
                'Content-Type': proxyRes.headers['content-type'] || 'video/mp4',
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-cache',
                'X-Original-Filename': filename
            };

            if (proxyRes.headers['content-length']) {
                responseHeaders['Content-Length'] = proxyRes.headers['content-length'];
            }

            if (proxyRes.headers['content-range']) {
                responseHeaders['Content-Range'] = proxyRes.headers['content-range'];
            }
            
            // Use appropriate status code
            const statusCode = proxyRes.statusCode;
            
            if (!clientRes.headersSent) {
                clientRes.writeHead(statusCode, responseHeaders);
            }
            
            // Pipe the video stream to client
            proxyRes.pipe(clientRes);
            
            proxyRes.on('end', () => {
                console.log('✅ Done');
                resolve();
            });
            
            proxyRes.on('error', (err) => {
                console.error('Stream error:', err.message);
                if (!clientRes.headersSent) {
                    reject(err);
                } else {
                    resolve(); // Already streaming, just end
                }
            });
        });
        
        proxyReq.on('timeout', () => {
            console.error('⏱️ Request timeout');
            proxyReq.destroy();
            reject(new Error('Request timeout'));
        });
        
        proxyReq.on('error', (err) => {
            console.error('Request error:', err.message);
            reject(err);
        });
        
        // Handle client disconnect
        clientReq.on('close', () => {
            proxyReq.destroy();
        });
        
        clientRes.on('close', () => {
            proxyReq.destroy();
        });
        
        proxyReq.end();
    });
}

function proxyDownload(videoUrl, filename, clientReq, clientRes) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(videoUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive'
        };

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.path,
            method: 'GET',
            headers: headers,
            timeout: 30000
        };

        const proxyReq = protocol.request(options, (proxyRes) => {
            // Handle redirects
            if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                let redirectUrl = proxyRes.headers.location;
                if (redirectUrl.startsWith('/')) {
                    redirectUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}${redirectUrl}`;
                }
                console.log(`🔄 Redirect: ${redirectUrl}`);
                proxyDownload(redirectUrl, filename, clientReq, clientRes)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            // Force download with Content-Disposition
            const responseHeaders = {
                'Content-Type': proxyRes.headers['content-type'] || 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                'Access-Control-Allow-Origin': '*'
            };

            if (proxyRes.headers['content-length']) {
                responseHeaders['Content-Length'] = proxyRes.headers['content-length'];
            }

            clientRes.writeHead(200, responseHeaders);
            proxyRes.pipe(clientRes);

            proxyRes.on('end', () => {
                console.log('✅ Download complete');
                resolve();
            });

            proxyRes.on('error', reject);
        });

        proxyReq.on('timeout', () => {
            console.error('⏱️ Request timeout');
            proxyReq.destroy();
            reject(new Error('Request timeout'));
        });

        proxyReq.on('error', reject);
        proxyReq.end();
    });
}

function convertAndProxySubtitle(subtitleUrl, clientReq, clientRes) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(subtitleUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.path,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': '*/*'
            },
            timeout: 30000
        };

        const proxyReq = protocol.request(options, (proxyRes) => {
            if (proxyRes.statusCode !== 200) {
                reject(new Error(`HTTP ${proxyRes.statusCode}`));
                return;
            }

            // Set response headers
            clientRes.writeHead(200, {
                'Content-Type': 'text/vtt; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600'
            });

            // Convert ASS to VTT and stream to client
            pipeline(
                proxyRes,
                assToVtt(),
                clientRes,
                (err) => {
                    if (err) {
                        console.error('Pipeline error:', err);
                        reject(err);
                    } else {
                        console.log('✅ Subtitle converted and sent');
                        resolve();
                    }
                }
            );
        });

        proxyReq.on('error', reject);
        proxyReq.on('timeout', () => {
            proxyReq.destroy();
            reject(new Error('Request timeout'));
        });

        proxyReq.end();
    });
}

function proxySubtitle(subtitleUrl, clientReq, clientRes) {
    return new Promise((resolve, reject) => {
        const parsedUrl = url.parse(subtitleUrl);
        const protocol = parsedUrl.protocol === 'https:' ? https : http;

        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
            path: parsedUrl.path,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': '*/*'
            },
            timeout: 30000
        };

        const proxyReq = protocol.request(options, (proxyRes) => {
            if (proxyRes.statusCode !== 200) {
                reject(new Error(`HTTP ${proxyRes.statusCode}`));
                return;
            }

            // Determine content type
            let contentType = proxyRes.headers['content-type'] || 'text/vtt; charset=utf-8';
            if (!contentType.includes('vtt') && !contentType.includes('srt')) {
                contentType = 'text/vtt; charset=utf-8';
            }

            clientRes.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600'
            });

            proxyRes.pipe(clientRes);

            proxyRes.on('end', () => {
                console.log('✅ Subtitle proxied');
                resolve();
            });

            proxyRes.on('error', reject);
        });

        proxyReq.on('error', reject);
        proxyReq.on('timeout', () => {
            proxyReq.destroy();
            reject(new Error('Request timeout'));
        });

        proxyReq.end();
    });
}

async function analyzeVideo(videoUrl) {
    return new Promise(async (resolve, reject) => {
        try {
            // Check if ffprobe is available
            try {
                await execAsync('ffprobe -version');
            } catch (err) {
                resolve({
                    error: 'ffprobe not available',
                    ffprobeAvailable: false,
                    message: 'Install ffmpeg to enable automatic audio/subtitle detection'
                });
                return;
            }

            // Use ffprobe to analyze the video
            const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoUrl}"`;

            const { stdout, stderr } = await execAsync(command, {
                timeout: 30000,
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });

            const data = JSON.parse(stdout);

            // Extract audio tracks
            const audioTracks = data.streams
                .filter(stream => stream.codec_type === 'audio')
                .map((stream, index) => ({
                    index: index,
                    streamIndex: stream.index,
                    codec: stream.codec_name,
                    language: stream.tags?.language || 'unknown',
                    title: stream.tags?.title || `Audio ${index + 1}`,
                    channels: stream.channels,
                    channelLayout: stream.channel_layout,
                    sampleRate: stream.sample_rate,
                    bitrate: stream.bit_rate
                }));

            // Extract subtitle tracks
            const subtitleTracks = data.streams
                .filter(stream => stream.codec_type === 'subtitle')
                .map((stream, index) => ({
                    index: index,
                    streamIndex: stream.index,
                    codec: stream.codec_name,
                    language: stream.tags?.language || 'unknown',
                    title: stream.tags?.title || `Subtitle ${index + 1}`,
                    forced: stream.disposition?.forced === 1
                }));

            // Extract video info
            const videoStreams = data.streams
                .filter(stream => stream.codec_type === 'video')
                .map(stream => ({
                    codec: stream.codec_name,
                    profile: stream.profile,
                    width: stream.width,
                    height: stream.height,
                    fps: eval(stream.r_frame_rate),
                    bitrate: stream.bit_rate
                }));

            const analysis = {
                ffprobeAvailable: true,
                format: data.format.format_name,
                duration: parseFloat(data.format.duration),
                size: parseInt(data.format.size),
                bitrate: parseInt(data.format.bit_rate),
                audioTracks: audioTracks,
                subtitleTracks: subtitleTracks,
                videoStreams: videoStreams,
                hasMultipleAudio: audioTracks.length > 1,
                hasEmbeddedSubtitles: subtitleTracks.length > 0
            };

            resolve(analysis);
        } catch (error) {
            console.error('Analysis error:', error);
            resolve({
                error: error.message,
                ffprobeAvailable: false
            });
        }
    });
}

async function extractSubtitle(videoUrl, subtitleIndex, clientReq, clientRes) {
    return new Promise(async (resolve, reject) => {
        try {
            // Check if ffmpeg is available
            try {
                await execAsync('ffmpeg -version');
            } catch (err) {
                reject(new Error('ffmpeg not available'));
                return;
            }

            // Create a temporary file path
            const tempFile = `/tmp/subtitle_${Date.now()}.vtt`;

            // Extract subtitle using ffmpeg and convert to VTT
            const command = `ffmpeg -i "${videoUrl}" -map 0:s:${subtitleIndex} "${tempFile}" -y`;

            await execAsync(command, {
                timeout: 30000
            });

            // Read the extracted file
            fs.readFile(tempFile, 'utf8', (err, data) => {
                if (err) {
                    reject(new Error('Failed to read extracted subtitle'));
                    return;
                }

                // Set response headers
                clientRes.writeHead(200, {
                    'Content-Type': 'text/vtt; charset=utf-8',
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=3600'
                });

                clientRes.end(data);

                // Clean up temp file
                fs.unlink(tempFile, (unlinkErr) => {
                    if (unlinkErr) console.error('Failed to delete temp file:', unlinkErr);
                });

                console.log('✅ Subtitle extracted and sent');
                resolve();
            });
        } catch (error) {
            console.error('Extraction error:', error);
            reject(error);
        }
    });
}

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🎬 StreamFlow Proxy Server                          ║
║                                                        ║
║   Open:   http://localhost:${PORT}                       ║
║   Proxy:  http://localhost:${PORT}/proxy?url=VIDEO_URL   ║
║                                                        ║
║   Press Ctrl+C to stop                                 ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
    `);
});
