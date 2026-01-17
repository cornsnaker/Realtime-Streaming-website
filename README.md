# StreamFlow - Advanced Video Streaming Platform

A professional, feature-rich video streaming platform with smart buffering, subtitle support, audio track selection, and seamless CORS bypass capabilities.

## Features

### Core Video Player
- **Smart Buffering System**
  - 60 seconds ahead buffering
  - 10% history buffer for smooth seeking
  - Real-time buffer health monitoring
  - Continues buffering when paused

- **Advanced Playback Controls**
  - Speed control (0.25x - 100x with custom input)
  - Volume control with visual slider
  - Fullscreen and Picture-in-Picture modes
  - Seek with visual progress bar and tooltip
  - Time jump with custom time input (supports multiple formats)

- **Multi-Format Support**
  - **Video**: MP4, WebM, OGG, MKV (Matroska)
  - **Codecs**: H.264, H.265/HEVC, VP8, VP9, AV1
  - **Streaming**: HLS (.m3u8), DASH (.mpd)
  - **Audio**: MP3, M4A, FLAC, WAV

### New Features

#### 1. Original Filename Display
- Extracts and displays the original video filename
- Supports Content-Disposition headers
- Falls back to URL parsing
- Clean, modern UI integration

#### 2. Download & Link Management
- **Download Video**: Direct download with original filename
- **Copy Streaming Link**: Get direct streaming URL
- **Copy Web Player Link**: Share `/play?url=` links for instant playback
- **Copy Download Link**: Share download-ready URLs
- Toast notifications for all copy actions

#### 3. Subtitle Support
- **Load from URL**: Paste subtitle URLs directly
- **Upload Local Files**: Drag and drop or browse
- **Format Support**:
  - VTT (WebVTT)
  - SRT (SubRip)
  - **ASS** (Advanced SubStation Alpha) - **Auto-converts to VTT**
- **Multiple Subtitles**: Load and switch between multiple subtitle tracks
- **Remove Subtitles**: Easy removal of loaded tracks

#### 4. Audio Track Selection
- Detect multiple audio tracks in videos
- Switch between audio tracks on the fly
- Visual indication of available tracks
- Browser audioTracks API integration

#### 5. Automatic Stream Detection
- **ffprobe Integration**: Automatically detects all audio and subtitle streams
- **Embedded Subtitles**: Extract subtitles from MKV/MP4/WebM containers
- **Multi-Audio Detection**: Shows count badge when multiple audio tracks detected
- **Codec Support**: Detects AV1, H.265/HEVC, VP9, H.264
- **Container Support**: MKV (Matroska), MP4, WebM
- **Graceful Fallback**: Works without ffmpeg (manual loading still available)

#### 6. `/play` Endpoint
Share videos with a simple link:
```
http://your-domain.com/play?url=VIDEO_URL
```
- Auto-loads and starts playback
- Perfect for sharing
- Full web player interface

### Keyboard Shortcuts
- `Space` / `K` - Play/Pause
- `←` / `J` - Skip backward 10s
- `→` / `L` - Skip forward 10s
- `↑` / `↓` - Volume control
- `M` - Mute/Unmute
- `F` - Fullscreen
- `P` - Picture-in-Picture
- `0-9` - Jump to percentage
- `?` - Show shortcuts help

## Installation

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Realtime-Streaming-website
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Open in browser:**
   ```
   http://localhost:4000
   ```

### Optional: FFmpeg for Advanced Features

For automatic audio/subtitle detection and embedded subtitle extraction:

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Note**: The player works without ffmpeg, but embedded subtitle detection will be unavailable.

## API Endpoints

### `/play?url=VIDEO_URL`
Opens video in web player with auto-play
- **Method**: GET
- **Parameters**:
  - `url` (required): Video URL to play
- **Example**: `http://localhost:4000/play?url=https://example.com/video.mp4`

### `/proxy?url=VIDEO_URL`
Proxies video with CORS bypass
- **Method**: GET, HEAD
- **Parameters**:
  - `url` (required): Video URL to proxy
- **Response Headers**:
  - `X-Original-Filename`: Extracted filename
  - `Content-Type`: Video MIME type
  - `Accept-Ranges`: bytes
  - Range request support for seeking

### `/download?url=VIDEO_URL&filename=NAME`
Downloads video with original filename
- **Method**: GET
- **Parameters**:
  - `url` (required): Video URL
  - `filename` (optional): Custom filename
- **Response**: Video file with `Content-Disposition: attachment`

### `/subtitle/convert?url=SUBTITLE_URL`
Converts ASS subtitles to VTT format
- **Method**: GET
- **Parameters**:
  - `url` (required): ASS subtitle URL
- **Response**: Converted VTT subtitle

### `/subtitle/proxy?url=SUBTITLE_URL`
Proxies VTT/SRT subtitles with CORS bypass
- **Method**: GET
- **Parameters**:
  - `url` (required): Subtitle URL (.vtt or .srt)
- **Response**: Subtitle file with CORS headers

### `/analyze?url=VIDEO_URL`
Analyzes video file structure using ffprobe
- **Method**: GET
- **Parameters**:
  - `url` (required): Video URL to analyze
- **Response**: JSON with audio tracks, subtitle tracks, video codec info
- **Requires**: ffmpeg/ffprobe installed on server
- **Graceful Degradation**: Returns error if ffprobe unavailable

**Example Response:**
```json
{
  "ffprobeAvailable": true,
  "format": "matroska,webm",
  "duration": 5420.5,
  "audioTracks": [
    {"index": 0, "codec": "aac", "language": "eng", "channels": 2}
  ],
  "subtitleTracks": [
    {"index": 0, "codec": "ass", "language": "eng", "title": "English"}
  ],
  "videoStreams": [
    {"codec": "av1", "width": 1920, "height": 1080, "fps": 23.976}
  ],
  "hasMultipleAudio": false,
  "hasEmbeddedSubtitles": true
}
```

### `/extract-subtitle?url=VIDEO_URL&index=N`
Extracts embedded subtitle stream from video file
- **Method**: GET
- **Parameters**:
  - `url` (required): Video URL
  - `index` (optional): Subtitle stream index (default: 0)
- **Response**: VTT subtitle file
- **Requires**: ffmpeg installed on server

## Configuration

### Environment Variables
- `PORT`: Server port (default: 4000)

### Server Configuration
Edit `server.js` for advanced configuration:
- Proxy timeout (default: 30 seconds)
- Buffer settings
- CORS headers
- MIME types

## Usage Examples

### Basic Video Playback
1. Open the app in your browser
2. Paste a video URL
3. Click "Stream" or press Enter
4. Enjoy buffer-free playback

### Using Proxy for Blocked URLs
1. Check "Use Local Proxy" toggle
2. Paste the blocked video URL
3. Click "Stream"
4. Server proxies the video bypassing CORS

### Adding Subtitles
**From URL:**
1. Click the subtitle button in player controls
2. Paste subtitle URL (.vtt, .srt, or .ass)
3. Click "Load"
4. Subtitle appears and auto-enables

**From Local File:**
1. Click the subtitle button
2. Click "Upload Local File"
3. Select your subtitle file
4. Subtitle loads instantly

### Sharing Videos
1. Load a video in the player
2. Click the link button
3. Choose "Copy Web Player Link"
4. Share the link - recipients get instant playback!

### Downloading Videos
1. Load a video
2. Click the link button
3. Click "Download Video"
4. File downloads with original filename

## Technical Architecture

### Frontend
- **Pure JavaScript** - No framework dependencies
- **StreamFlowPlayer Class** - Modular, extensible architecture
- **Event-driven** - Clean separation of concerns
- **Responsive** - Mobile-optimized controls

### Backend
- **Node.js HTTP Server** - Lightweight and fast
- **Stream-based proxying** - Memory efficient
- **ass-to-vtt** - Subtitle format conversion
- **Range request support** - Seeking compatibility

### Key Technologies
- **HLS.js** - HLS streaming support
- **Dash.js** - DASH streaming support
- **HTML5 Video API** - Native video playback
- **Fetch API** - Modern networking
- **Blob URLs** - Local file handling

## Browser Support

### Fully Supported
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### Partial Support
- Opera 76+
- Mobile browsers (iOS Safari, Chrome Mobile)

### Features by Browser
| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| HLS Streaming | ✅ | ✅ | ✅ | ✅ |
| DASH Streaming | ✅ | ✅ | ⚠️ | ✅ |
| Audio Tracks | ✅ | ⚠️ | ✅ | ✅ |
| Picture-in-Picture | ✅ | ❌ | ✅ | ✅ |
| Subtitles | ✅ | ✅ | ✅ | ✅ |

## Troubleshooting

### Video Won't Load
- **Check URL**: Ensure it's a direct video link
- **Try Proxy**: Enable "Use Local Proxy" option
- **Check Console**: Open browser DevTools for errors
- **CORS Issues**: Some servers block external access

### Subtitles Not Showing
- **Format**: Ensure file is .vtt, .srt, or .ass
- **Encoding**: Check file is UTF-8 encoded
- **CORS**: Use subtitle proxy for external URLs
- **Browser**: Some browsers have subtitle display issues

### Audio Tracks Not Available
- **Video Format**: Only some formats support multiple audio
- **Browser**: Not all browsers support audioTracks API
- **Check Console**: Look for audio track detection messages

### Download Issues
- **Popup Blocker**: Allow popups for the site
- **CORS**: Server must allow downloads
- **Browser**: Some browsers block automatic downloads

## Performance Tips

1. **Use Proxy Sparingly**: Only when CORS blocks direct access
2. **HLS/DASH**: Better for long videos and adaptive quality
3. **Subtitle Files**: Keep subtitle files small (<1MB)
4. **Network**: Stable connection recommended for 4K+ videos

## Security Considerations

- **CORS Bypass**: Use responsibly and legally
- **URL Validation**: Server validates all input URLs
- **Path Traversal**: Protected against directory traversal attacks
- **Rate Limiting**: Consider adding rate limiting for production
- **HTTPS**: Deploy with HTTPS in production

## Development

### File Structure
```
Realtime-Streaming-website/
├── server.js           # Backend proxy server
├── index.html          # Main HTML structure
├── player.js           # Video player class
├── styles.css          # All styles
├── package.json        # Dependencies
└── README.md          # This file
```

### Adding New Features
1. Backend: Add endpoints in `server.js`
2. Frontend: Update `player.js` class methods
3. UI: Add controls in `index.html`
4. Styling: Add styles in `styles.css`

### Testing
- Test with various video formats
- Test proxy functionality
- Test subtitle conversion (ASS → VTT)
- Test on multiple browsers
- Test responsive design

## Deployment

### Railway
1. Connect your GitHub repository
2. Railway auto-detects Node.js
3. Sets PORT environment variable
4. Deploys automatically

### Heroku
```bash
heroku create your-app-name
git push heroku main
```

### Docker

**Build the image:**
```bash
docker build -t streamflow .
```

**Run the container:**
```bash
docker run -d -p 4000:4000 --name streamflow streamflow
```

**With custom port:**
```bash
docker run -d -p 8080:8080 -e PORT=8080 --name streamflow streamflow
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  streamflow:
    build: .
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

**Features included in Docker image:**
- Node.js 18 Alpine (lightweight)
- ffmpeg for video analysis and subtitle extraction
- Health check endpoint
- Production-optimized

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License - See package.json

## Credits

- **HLS.js** - https://github.com/video-dev/hls.js
- **Dash.js** - https://github.com/Dash-Industry-Forum/dash.js
- **ass-to-vtt** - https://github.com/soruly/ass-to-vtt

## Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing issues first
- Provide detailed reproduction steps

---

**Built with ❤️ for seamless video streaming**
