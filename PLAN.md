# Implementation Plan: Automatic Audio/Subtitle Detection + MKV/AV1 Support

## Status: Backend Complete, Frontend Remaining

### Completed (Backend - server.js)
✅ Added child_process imports for exec
✅ Added MKV MIME type support (`.mkv`: `video/x-matroska`)
✅ Created `/analyze` endpoint for ffprobe-based video analysis
✅ Created `/extract-subtitle` endpoint for subtitle extraction
✅ Implemented `analyzeVideo()` function - detects audio/subtitle/video streams
✅ Implemented `extractSubtitle()` function - extracts and converts subtitles to VTT

### Remaining Implementation

#### 1. player.js Updates

**Add state variable (line ~99):**
```javascript
this.videoAnalysis = null;
```

**Call analysis in loadedmetadata handler (line ~357):**
After `this.detectAudioTracks()`, add:
```javascript
this.analyzeVideoStreams();
```

**Add new methods after extractFilename() method (~line 1353):**

```javascript
async analyzeVideoStreams() {
    // Only analyze when using proxy (to avoid CORS)
    if (!this.useProxyCheckbox.checked || !this.originalUrl) return;

    const analysisUrl = `${window.location.origin}/analyze?url=${encodeURIComponent(this.originalUrl)}`;

    try {
        const response = await fetch(analysisUrl);
        const analysis = await response.json();

        if (analysis.ffprobeAvailable) {
            this.videoAnalysis = analysis;

            // Populate embedded subtitles if found
            if (analysis.hasEmbeddedSubtitles) {
                this.populateEmbeddedSubtitles(analysis.subtitleTracks);
            }

            // Show audio track count badge if multiple tracks
            if (analysis.hasMultipleAudio) {
                this.showAudioTrackInfo(analysis.audioTracks);
            }

            console.log('📊 Video analysis:', analysis);
        }
    } catch (error) {
        console.log('ℹ️ Video analysis unavailable');
    }
}

populateEmbeddedSubtitles(subtitleTracks) {
    const subtitleTracksDiv = this.subtitleTracks;
    if (!subtitleTracksDiv) return;

    // Create section header
    const embeddedHeader = document.createElement('div');
    embeddedHeader.className = 'subtitle-section-title';
    embeddedHeader.textContent = 'Embedded Subtitles';

    // Insert at top
    const firstChild = subtitleTracksDiv.firstChild;
    subtitleTracksDiv.insertBefore(embeddedHeader, firstChild);

    // Add each embedded subtitle option
    subtitleTracks.forEach((track, index) => {
        const trackOption = document.createElement('div');
        trackOption.className = 'subtitle-track-option embedded';
        trackOption.dataset.embedded = 'true';
        trackOption.dataset.index = index;
        trackOption.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" class="track-icon">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M7 13h2M11 13h6M7 9h6M15 9h2" stroke="currentColor" stroke-width="2"/>
            </svg>
            <span>${track.title} (${track.language})</span>
        `;

        trackOption.addEventListener('click', () => {
            this.loadEmbeddedSubtitle(index, track);
        });

        subtitleTracksDiv.insertBefore(trackOption, firstChild.nextSibling);
    });
}

async loadEmbeddedSubtitle(index, track) {
    const extractUrl = `${window.location.origin}/extract-subtitle?url=${encodeURIComponent(this.originalUrl)}&index=${index}`;

    try {
        this.addSubtitleTrack(extractUrl, track.title);
        this.showNotification(`Loaded: ${track.title}`);
    } catch (error) {
        this.showNotification('Failed to load embedded subtitle', 'error');
    }
}

showAudioTrackInfo(audioTracks) {
    if (this.audioBtn && !this.audioBtn.querySelector('.track-count-badge')) {
        const badge = document.createElement('span');
        badge.className = 'track-count-badge';
        badge.textContent = audioTracks.length;
        this.audioBtn.appendChild(badge);
    }
}
```

#### 2. index.html Updates

**Add format badges (line ~90):**
After `<span class="format-tag">WAV</span>`, add:
```html
<span class="format-tag">MKV</span>
<span class="format-tag">AV1</span>
```

#### 3. styles.css Updates

**Add at end of file:**
```css
/* Embedded Subtitle Styles */
.subtitle-section-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-secondary);
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-color);
    letter-spacing: 0.5px;
}

.subtitle-track-option.embedded {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
}

.subtitle-track-option.embedded .track-icon {
    width: 16px;
    height: 16px;
    color: var(--accent-primary);
}

.track-count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    margin-left: 4px;
    background: var(--accent-primary);
    color: var(--bg-primary);
    border-radius: 50%;
    font-size: 11px;
    font-weight: 600;
}
```

#### 4. README.md Updates

**Add to "New Features" section (after Audio Track Selection):**
```markdown
#### 5. Automatic Stream Detection
- **ffprobe Integration**: Automatically detects all audio and subtitle streams
- **Embedded Subtitles**: Extract subtitles from MKV/MP4/WebM containers
- **Multi-Audio Detection**: Shows count badge when multiple audio tracks detected
- **Codec Support**: Detects AV1, H.265/HEVC, VP9, H.264
- **Container Support**: MKV (Matroska), MP4, WebM
- **Graceful Fallback**: Works without ffmpeg (manual loading still available)
```

**Add to "API Endpoints" section:**
```markdown
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
```

**Update "Multi-Format Support" section (lines ~21-24):**
```markdown
- **Video**: MP4, WebM, OGG, MKV (Matroska)
- **Codecs**: H.264, H.265/HEVC, VP8, VP9, AV1
- **Streaming**: HLS (.m3u8), DASH (.mpd)
- **Audio**: MP3, M4A, FLAC, WAV
```

**Add to "Installation" section:**
```markdown
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
```

### Verification Plan

1. **MKV Support Test:**
   - Load an MKV video file URL
   - Enable "Use Local Proxy"
   - Verify video plays correctly
   - Check that MKV badge appears in format list

2. **Embedded Subtitle Detection:**
   - Load MKV/MP4 with embedded subtitles (proxy mode)
   - Open subtitle menu
   - Verify "Embedded Subtitles" section appears
   - Click an embedded subtitle
   - Verify it loads and displays

3. **AV1 Codec:**
   - Load AV1-encoded video
   - Verify playback (browser-dependent)
   - Check console shows correct codec detection

4. **Multiple Audio Tracks:**
   - Load video with multiple audio streams
   - Verify badge appears on audio button with count
   - Click audio button to see all tracks

5. **Graceful Fallback:**
   - Test without ffmpeg installed
   - Verify no errors appear
   - Manual subtitle loading still works

6. **Direct URL Mode:**
   - Load video without "Use Local Proxy"
   - Verify no analysis requests (would fail CORS)
   - Player works normally

### Edge Cases Handled

1. **ffmpeg Not Available:**
   - analyzeVideo() checks availability first
   - Returns graceful error with ffprobeAvailable: false
   - Frontend silently falls back to manual mode
   - No user-facing errors

2. **Analysis Fails:**
   - Wrapped in try-catch
   - Logs info message to console
   - Player continues normal operation
   - Manual subtitle/audio loading remains functional

3. **Subtitle Extraction Fails:**
   - Returns 500 error with message
   - Frontend shows error notification
   - User can try different subtitle index
   - Other features unaffected

4. **Proxy Mode Disabled:**
   - Check prevents analysis when !useProxyCheckbox.checked
   - Avoids CORS issues with direct ffprobe
   - No unnecessary network requests

5. **No Embedded Streams:**
   - Section simply not created
   - Manual loading interface remains
   - No empty sections shown

6. **Temp File Cleanup:**
   - extractSubtitle() cleans up after response
   - Handles cleanup errors gracefully
   - Uses timestamp-based names to avoid collisions

### Dependencies

**Server Requirements:**
- ffmpeg/ffprobe (optional, for stream detection)
- Installed via package manager (apt/brew/etc)
- Not an npm dependency

**No New NPM Dependencies:**
- Existing: ass-to-vtt (already in package.json)
- Uses Node.js built-in child_process

### Critical Files

1. **server.js** - Backend complete ✅
2. **player.js** - Needs 4 new methods + 1 method call
3. **index.html** - Needs 2 format badges
4. **styles.css** - Needs 3 CSS sections
5. **README.md** - Needs documentation updates

### Implementation Order

1. Update player.js (core functionality)
2. Update index.html (UI badges)
3. Update styles.css (styling)
4. Update README.md (documentation)
5. Test all scenarios
