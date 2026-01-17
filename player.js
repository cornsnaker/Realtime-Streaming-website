/**
 * StreamFlow Video Player
 * High-quality streaming video player with smart buffering
 */

class StreamFlowPlayer {
    constructor() {
        // DOM Elements
        this.urlSection = document.getElementById('urlSection');
        this.playerSection = document.getElementById('playerSection');
        this.playerContainer = document.getElementById('playerContainer');
        this.video = document.getElementById('videoPlayer');
        this.urlInput = document.getElementById('videoUrl');
        this.loadBtn = document.getElementById('loadBtn');
        this.backBtn = document.getElementById('backBtn');
        this.useProxyCheckbox = document.getElementById('useProxy');
        
        // Overlays
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.playOverlay = document.getElementById('playOverlay');
        this.errorOverlay = document.getElementById('errorOverlay');
        this.errorText = document.getElementById('errorText');
        this.bufferIndicator = document.getElementById('bufferIndicator');
        
        // Controls
        this.controls = document.getElementById('controls');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.bigPlayBtn = document.getElementById('bigPlayBtn');
        this.skipBackBtn = document.getElementById('skipBackBtn');
        this.skipForwardBtn = document.getElementById('skipForwardBtn');
        this.muteBtn = document.getElementById('muteBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeFill = document.getElementById('volumeFill');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.pipBtn = document.getElementById('pipBtn');
        this.speedBtn = document.getElementById('speedBtn');
        this.speedMenu = document.getElementById('speedMenu');
        this.speedValue = document.getElementById('speedValue');
        this.retryBtn = document.getElementById('retryBtn');
        
        // Progress
        this.progressContainer = document.getElementById('progressContainer');
        this.progressBuffer = document.getElementById('progressBuffer');
        this.progressPlayed = document.getElementById('progressPlayed');
        this.progressThumb = document.getElementById('progressThumb');
        this.progressTooltip = document.getElementById('progressTooltip');
        
        // Time Display
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        this.timeDisplay = document.getElementById('timeDisplay');
        this.timeInputWrapper = document.getElementById('timeInputWrapper');
        this.timeInput = document.getElementById('timeInput');
        this.timeGoBtn = document.getElementById('timeGoBtn');
        
        // Stats
        this.bufferPercent = document.getElementById('bufferPercent');
        this.networkSpeed = document.getElementById('networkSpeed');
        
        // Shortcuts Modal
        this.shortcutsModal = document.getElementById('shortcutsModal');
        this.closeShortcuts = document.getElementById('closeShortcuts');

        // New UI Elements
        this.videoInfoSection = document.getElementById('videoInfoSection');
        this.filenameText = document.getElementById('filenameText');
        this.subtitleBtn = document.getElementById('subtitleBtn');
        this.subtitleMenu = document.getElementById('subtitleMenu');
        this.subtitleTracks = document.getElementById('subtitleTracks');
        this.loadSubtitleBtn = document.getElementById('loadSubtitleBtn');
        this.subtitleUrlInput = document.getElementById('subtitleUrl');
        this.subtitleFileInput = document.getElementById('subtitleFile');
        this.audioBtn = document.getElementById('audioBtn');
        this.audioMenu = document.getElementById('audioMenu');
        this.audioTracks = document.getElementById('audioTracks');
        this.linkBtn = document.getElementById('linkBtn');
        this.linkMenu = document.getElementById('linkMenu');
        this.copyStreamingLink = document.getElementById('copyStreamingLink');
        this.copyPlayLink = document.getElementById('copyPlayLink');
        this.copyDownloadLink = document.getElementById('copyDownloadLink');
        this.downloadBtn = document.getElementById('downloadBtn');

        // State
        this.isPlaying = false;
        this.isMuted = false;
        this.isFullscreen = false;
        this.controlsTimeout = null;
        this.cursorTimeout = null;
        this.lastVolume = 1;
        this.currentUrl = '';
        this.originalUrl = '';
        this.originalFilename = '';
        this.loadStartTime = 0;
        this.bytesLoaded = 0;

        // Subtitle & Audio State
        this.loadedSubtitles = [];
        this.currentSubtitle = -1;
        this.currentAudioTrack = 0;
        this.videoAnalysis = null;

        // Buffer Management
        this.bufferCheckInterval = null;
        this.targetBufferAhead = 60; // seconds to buffer ahead
        this.historyBufferRatio = 0.10; // 10% of watched video as history buffer
        this.maxWatchedPosition = 0; // track furthest watched position
        this.bufferRanges = []; // store all buffer ranges for visualization
        
        // Network speed tracking
        this.lastBufferTime = 0;
        this.lastBufferedAmount = 0;
        this.networkSpeedSamples = [];
        this.maxSpeedSamples = 10; // rolling average of last 10 samples
        
        // Range request support detection
        this.supportsRangeRequests = null; // null = unknown, true/false after check
        this.rangeRequestChecked = false;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.setupVideoEvents();
        this.updateVolumeUI();
        
        // Focus input on load
        this.urlInput.focus();
        
        // Check for URL in query params
        const params = new URLSearchParams(window.location.search);
        const videoUrl = params.get('url');
        if (videoUrl) {
            this.urlInput.value = decodeURIComponent(videoUrl);
            this.loadVideo();
        }
    }
    
    bindEvents() {
        // URL Input
        this.loadBtn.addEventListener('click', () => this.loadVideo());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadVideo();
        });
        this.backBtn.addEventListener('click', () => this.showUrlSection());
        this.retryBtn.addEventListener('click', () => this.loadVideo());
        
        // Play Controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.bigPlayBtn.addEventListener('click', () => this.togglePlay());
        this.skipBackBtn.addEventListener('click', () => this.skip(-10));
        this.skipForwardBtn.addEventListener('click', () => this.skip(10));
        
        // Volume
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        // Progress Bar
        this.progressContainer.addEventListener('click', (e) => this.seek(e));
        this.progressContainer.addEventListener('mousemove', (e) => this.updateTooltip(e));
        
        // Add drag support for progress bar
        let isDragging = false;
        this.progressContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            this.seek(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                this.seek(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // Fullscreen & PiP
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.pipBtn.addEventListener('click', () => this.togglePiP());
        
        // Time Input - click time display to show input
        this.timeDisplay.addEventListener('click', () => this.showTimeInput());
        this.timeGoBtn.addEventListener('click', () => this.jumpToInputTime());
        this.timeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.jumpToInputTime();
        });
        this.timeInput.addEventListener('blur', () => {
            // Hide input after a short delay (allows clicking Go button)
            setTimeout(() => this.hideTimeInput(), 200);
        });
        
        // Speed Menu
        this.speedBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.speedMenu.classList.toggle('active');
        });
        
        document.querySelectorAll('.speed-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.setPlaybackSpeed(speed);
            });
        });
        
        // Custom speed input
        const customSpeedInput = document.getElementById('customSpeedInput');
        const customSpeedBtn = document.getElementById('customSpeedBtn');
        
        if (customSpeedBtn && customSpeedInput) {
            customSpeedBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const speed = parseFloat(customSpeedInput.value);
                if (speed >= 0.1 && speed <= 100) {
                    this.setPlaybackSpeed(speed);
                    customSpeedInput.value = '';
                }
            });
            
            customSpeedInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.stopPropagation();
                    const speed = parseFloat(customSpeedInput.value);
                    if (speed >= 0.1 && speed <= 100) {
                        this.setPlaybackSpeed(speed);
                        customSpeedInput.value = '';
                    }
                }
            });
            
            customSpeedInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Subtitle controls
        if (this.subtitleBtn) {
            this.subtitleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.subtitleMenu.classList.toggle('active');
            });
        }

        if (this.loadSubtitleBtn) {
            this.loadSubtitleBtn.addEventListener('click', () => this.loadSubtitleFromUrl());
        }

        if (this.subtitleUrlInput) {
            this.subtitleUrlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.loadSubtitleFromUrl();
            });
            this.subtitleUrlInput.addEventListener('click', (e) => e.stopPropagation());
        }

        if (this.subtitleFileInput) {
            this.subtitleFileInput.addEventListener('change', (e) => this.loadSubtitleFromFile(e));
        }

        // Audio track controls
        if (this.audioBtn) {
            this.audioBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.updateAudioTrackList();
                this.audioMenu.classList.toggle('active');
            });
        }

        // Link & Download controls
        if (this.linkBtn) {
            this.linkBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.linkMenu.classList.toggle('active');
            });
        }

        if (this.copyStreamingLink) {
            this.copyStreamingLink.addEventListener('click', () => {
                this.copyToClipboard(this.currentUrl, 'Streaming link copied!');
            });
        }

        if (this.copyPlayLink) {
            this.copyPlayLink.addEventListener('click', () => {
                const playUrl = `${window.location.origin}/play?url=${encodeURIComponent(this.originalUrl)}`;
                this.copyToClipboard(playUrl, 'Web player link copied!');
            });
        }

        if (this.copyDownloadLink) {
            this.copyDownloadLink.addEventListener('click', () => {
                const downloadUrl = this.getDownloadUrl();
                this.copyToClipboard(downloadUrl, 'Download link copied!');
            });
        }

        if (this.downloadBtn) {
            this.downloadBtn.addEventListener('click', () => this.downloadVideo());
        }

        // Close menus when clicking outside
        document.addEventListener('click', () => {
            this.speedMenu.classList.remove('active');
            if (this.subtitleMenu) this.subtitleMenu.classList.remove('active');
            if (this.audioMenu) this.audioMenu.classList.remove('active');
            if (this.linkMenu) this.linkMenu.classList.remove('active');
        });
        
        // Shortcuts Modal
        this.closeShortcuts.addEventListener('click', () => {
            this.shortcutsModal.classList.remove('active');
        });
        
        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Controls visibility
        this.playerContainer.addEventListener('mousemove', () => this.showControls());
        this.playerContainer.addEventListener('mouseleave', () => this.hideControls());
        
        // Click to play/pause
        this.video.addEventListener('click', () => this.togglePlay());
        
        // Double-click to fullscreen
        this.video.addEventListener('dblclick', () => this.toggleFullscreen());
        
        // Fullscreen change
        document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
        document.addEventListener('webkitfullscreenchange', () => this.onFullscreenChange());
    }
    
    setupVideoEvents() {
        // Loading states
        this.video.addEventListener('loadstart', () => {
            this.loadStartTime = Date.now();
            this.maxWatchedPosition = 0; // Reset watched position
            this.bufferRanges = [];
            this.showLoading();
        });
        
        this.video.addEventListener('loadedmetadata', () => {
            // Clear load timeout
            if (this.loadTimeout) {
                clearTimeout(this.loadTimeout);
                this.loadTimeout = null;
            }

            this.durationEl.textContent = this.formatTime(this.video.duration);
            this.hideLoading();
            // Start buffer management once we have metadata
            this.startBufferManagement();
            // Initialize speed status
            this.updateSpeedStatus();

            // New feature initializations
            this.extractFilename();
            this.detectAudioTracks();
            this.analyzeVideoStreams();

            console.log(`Video loaded: ${this.formatTime(this.video.duration)} duration`);
        });
        
        this.video.addEventListener('canplay', () => {
            this.hideLoading();
            this.playOverlay.classList.remove('hidden');
        });
        
        this.video.addEventListener('canplaythrough', () => {
            this.hideLoading();
        });
        
        this.video.addEventListener('waiting', () => {
            this.showLoading();
        });
        
        this.video.addEventListener('playing', () => {
            this.hideLoading();
            this.isPlaying = true;
            this.playerContainer.classList.add('playing');
            this.playOverlay.classList.add('hidden');
        });
        
        this.video.addEventListener('pause', () => {
            this.isPlaying = false;
            this.playerContainer.classList.remove('playing');
            // Continue buffering even when paused - browser handles this
            // but we update the UI to show buffer progress
            this.updateBuffer();
        });
        
        this.video.addEventListener('ended', () => {
            this.isPlaying = false;
            this.playerContainer.classList.remove('playing');
            this.playOverlay.classList.remove('hidden');
        });
        
        // Time update
        this.video.addEventListener('timeupdate', () => {
            this.updateProgress();
            // Track max watched position for history buffer
            if (this.video.currentTime > this.maxWatchedPosition) {
                this.maxWatchedPosition = this.video.currentTime;
            }
        });
        
        // Buffer progress - fires when browser downloads more data
        this.video.addEventListener('progress', () => this.updateBuffer());
        
        // Also update buffer on seeking
        this.video.addEventListener('seeked', () => {
            this.updateBuffer();
        });
        
        // Error handling
        this.video.addEventListener('error', (e) => this.handleError(e));
        
        // Volume change
        this.video.addEventListener('volumechange', () => this.updateVolumeUI());
    }
    
    loadVideo() {
        let url = this.urlInput.value.trim();
        if (!url) {
            this.urlInput.focus();
            return;
        }
        
        // Check if proxy should be used
        const useProxy = this.useProxyCheckbox && this.useProxyCheckbox.checked;
        if (useProxy) {
            // Use local proxy server (run server.js with node)
            url = `http://localhost:4000/proxy?url=${encodeURIComponent(url)}`;
            console.log('🔄 Using local proxy server for URL');
        }
        
        this.currentUrl = url;
        this.originalUrl = this.urlInput.value.trim(); // Store original for display
        this.hideError();
        this.showPlayerSection();
        this.showLoading();
        
        // Reset network speed tracking
        this.lastBufferTime = 0;
        this.lastBufferedAmount = 0;
        this.networkSpeedSamples = [];
        this.loadStartTime = Date.now();
        
        // Reset CORS retry flags
        this.triedWithoutCors = false;
        this.triedWithCors = false;
        this.rangeRequestChecked = false;
        
        // Check if HLS stream
        if (url.includes('.m3u8')) {
            this.loadHLS(url);
        } else if (url.includes('.mpd')) {
            this.loadDASH(url);
        } else {
            // Direct video URL - try loading with best settings for streaming
            this.loadDirectVideo(url);
        }
        
        // Update URL params
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('url', encodeURIComponent(url));
        window.history.replaceState({}, '', newUrl);
    }
    
    async loadDirectVideo(url) {
        // Reset video element for fresh load
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
        
        // Configure for streaming
        this.video.preload = 'auto';
        
        // Check if it's a Google URL (they have specific requirements)
        const isGoogleUrl = url.includes('googleusercontent.com') || 
                           url.includes('googlevideo.com') ||
                           url.includes('google.com');
        
        if (isGoogleUrl) {
            console.log('🔗 Detected Google video URL - may expire after a few hours');
            // Google URLs work better without crossorigin attribute
            this.video.removeAttribute('crossorigin');
        }
        
        // Check if server supports Range requests (for seeking)
        if (!this.rangeRequestChecked) {
            this.checkRangeRequestSupport(url);
        }
        
        // Set the source and load
        this.video.src = url;
        this.video.load();
        
        // Add timeout for stuck loading
        this.loadTimeout = setTimeout(() => {
            if (this.video.readyState < 2) { // HAVE_CURRENT_DATA
                console.warn('Video loading is taking too long...');
                // Try without any special attributes
                this.video.removeAttribute('crossorigin');
                this.video.load();
            }
        }, 10000); // 10 second timeout
    }
    
    async checkRangeRequestSupport(url) {
        this.rangeRequestChecked = true;
        
        try {
            const response = await fetch(url, {
                method: 'HEAD',
                mode: 'cors'
            });
            
            const acceptRanges = response.headers.get('Accept-Ranges');
            const contentLength = response.headers.get('Content-Length');
            
            this.supportsRangeRequests = acceptRanges === 'bytes';
            
            if (this.supportsRangeRequests) {
                console.log(`✅ Server supports Range requests (byte-seeking enabled)`);
                if (contentLength) {
                    const sizeMB = (parseInt(contentLength) / 1024 / 1024).toFixed(1);
                    console.log(`📦 File size: ${sizeMB} MB`);
                }
            } else {
                console.warn(`⚠️ Server doesn't support Range requests - seeking may require re-download`);
                this.showRangeWarning();
            }
        } catch (error) {
            console.warn('Could not check Range request support:', error.message);
            // Assume it works - browser will handle it
            this.supportsRangeRequests = true;
        }
    }
    
    showRangeWarning() {
        // Show a subtle warning that seeking might not work well
        const warning = document.createElement('div');
        warning.className = 'range-warning';
        warning.innerHTML = `
            <span>⚠️ This video may not support seeking to unbuffered positions</span>
        `;
        warning.style.cssText = `
            position: absolute;
            top: 70px;
            right: 20px;
            padding: 10px 16px;
            background: rgba(255, 165, 0, 0.9);
            color: #000;
            border-radius: 8px;
            font-size: 0.85rem;
            z-index: 20;
            animation: slideInRight 0.3s ease, fadeOut 0.3s ease 4s forwards;
        `;
        
        this.playerContainer.appendChild(warning);
        
        setTimeout(() => {
            warning.remove();
        }, 5000);
    }
    
    loadHLS(url) {
        // Check if native HLS is supported (Safari)
        if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
            this.video.src = url;
            this.video.load();
        } else if (typeof Hls !== 'undefined') {
            // Use hls.js for other browsers
            const hls = new Hls({
                maxBufferLength: 60,
                maxMaxBufferLength: 120,
                maxBufferSize: 60 * 1000 * 1000, // 60MB
                maxBufferHole: 0.5,
            });
            hls.loadSource(url);
            hls.attachMedia(this.video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                this.hideLoading();
            });
            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    this.showError('HLS stream error: ' + data.type);
                }
            });
        } else {
            this.showError('HLS playback not supported. Please use Safari or add hls.js library.');
        }
    }
    
    loadDASH(url) {
        if (typeof dashjs !== 'undefined') {
            const player = dashjs.MediaPlayer().create();
            player.initialize(this.video, url, false);
            player.updateSettings({
                streaming: {
                    buffer: {
                        fastSwitchEnabled: true,
                        bufferTimeAtTopQuality: 30,
                        bufferTimeAtTopQualityLongForm: 60,
                    }
                }
            });
        } else {
            this.showError('DASH playback requires dash.js library.');
        }
    }
    
    togglePlay() {
        if (this.video.paused) {
            this.video.play().catch(e => {
                console.error('Play error:', e);
            });
        } else {
            this.video.pause();
        }
    }
    
    skip(seconds) {
        const newTime = this.video.currentTime + seconds;
        this.seekToTime(newTime);
        
        // Show seek indicator
        this.showSeekIndicator(seconds);
    }
    
    showSeekIndicator(seconds) {
        // Create indicator if doesn't exist
        let indicator = document.querySelector(`.seek-indicator.${seconds < 0 ? 'left' : 'right'}`);
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = `seek-indicator ${seconds < 0 ? 'left' : 'right'}`;
            this.playerContainer.appendChild(indicator);
        }
        
        indicator.textContent = `${seconds > 0 ? '+' : ''}${seconds}s`;
        indicator.classList.remove('active');
        void indicator.offsetWidth; // Force reflow
        indicator.classList.add('active');
    }
    
    seek(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const clampedPos = Math.max(0, Math.min(1, pos));
        this.seekToTime(clampedPos * this.video.duration);
    }
    
    seekToTime(targetTime) {
        if (!this.video.duration) return;
        
        // Check if target is within buffered range
        const isBuffered = this.isTimeBuffered(targetTime);
        
        if (!isBuffered) {
            // Show loading indicator for unbuffered seek
            this.showLoading();
            
            const timeStr = this.formatTime(targetTime);
            
            if (this.supportsRangeRequests === false) {
                console.warn(`⚠️ Seeking to ${timeStr} - server may not support Range requests`);
            } else {
                console.log(`🎯 Seeking to ${timeStr} - requesting chunk via HTTP Range header`);
            }
            
            // For Google URLs, add a note
            const isGoogleUrl = this.currentUrl.includes('googleusercontent.com');
            if (isGoogleUrl && !isBuffered) {
                console.log(`📥 Note: Google URLs support seeking, but may expire soon`);
            }
        }
        
        this.video.currentTime = Math.max(0, Math.min(targetTime, this.video.duration));
    }
    
    isTimeBuffered(time) {
        for (let i = 0; i < this.video.buffered.length; i++) {
            if (time >= this.video.buffered.start(i) && time <= this.video.buffered.end(i)) {
                return true;
            }
        }
        return false;
    }
    
    // Seek to a specific percentage (0-100)
    seekToPercent(percent) {
        if (!this.video.duration) return;
        const targetTime = (percent / 100) * this.video.duration;
        this.seekToTime(targetTime);
    }
    
    // Time input methods
    showTimeInput() {
        this.timeDisplay.style.display = 'none';
        this.timeInputWrapper.style.display = 'flex';
        this.timeInput.value = '';
        this.timeInput.placeholder = this.formatTime(this.video.currentTime);
        this.timeInput.focus();
    }
    
    hideTimeInput() {
        this.timeInputWrapper.style.display = 'none';
        this.timeDisplay.style.display = '';
    }
    
    jumpToInputTime() {
        const input = this.timeInput.value.trim();
        if (!input) {
            this.hideTimeInput();
            return;
        }
        
        const seconds = this.parseTimeInput(input);
        if (seconds !== null && seconds >= 0 && seconds <= this.video.duration) {
            this.seekToTime(seconds);
            this.hideTimeInput();
        } else {
            // Invalid input - shake the input
            this.timeInput.style.animation = 'shake 0.3s ease';
            setTimeout(() => {
                this.timeInput.style.animation = '';
            }, 300);
        }
    }
    
    parseTimeInput(input) {
        // Support formats: "1:30", "1:30:00", "90", "1h30m", "90s"
        input = input.toLowerCase().trim();
        
        // Try HH:MM:SS or MM:SS format
        if (input.includes(':')) {
            const parts = input.split(':').map(p => parseInt(p) || 0);
            if (parts.length === 2) {
                // MM:SS
                return parts[0] * 60 + parts[1];
            } else if (parts.length === 3) {
                // HH:MM:SS
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
        }
        
        // Try human readable format: 1h30m, 90s, 1h, 30m
        let totalSeconds = 0;
        const hourMatch = input.match(/(\d+)\s*h/);
        const minMatch = input.match(/(\d+)\s*m/);
        const secMatch = input.match(/(\d+)\s*s/);
        
        if (hourMatch || minMatch || secMatch) {
            if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 3600;
            if (minMatch) totalSeconds += parseInt(minMatch[1]) * 60;
            if (secMatch) totalSeconds += parseInt(secMatch[1]);
            return totalSeconds;
        }
        
        // Try plain number (seconds)
        const num = parseInt(input);
        if (!isNaN(num)) {
            return num;
        }
        
        return null;
    }
    
    updateTooltip(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const clampedPos = Math.max(0, Math.min(1, pos));
        const time = clampedPos * this.video.duration;
        
        this.progressTooltip.textContent = this.formatTime(time);
        this.progressTooltip.style.left = `${clampedPos * 100}%`;
    }
    
    updateProgress() {
        if (!this.video.duration) return;
        
        const progress = (this.video.currentTime / this.video.duration) * 100;
        this.progressPlayed.style.width = `${progress}%`;
        this.progressThumb.style.left = `${progress}%`;
        this.currentTimeEl.textContent = this.formatTime(this.video.currentTime);
    }
    
    updateBuffer() {
        if (!this.video.duration || this.video.buffered.length === 0) return;
        
        const duration = this.video.duration;
        const currentTime = this.video.currentTime;
        const now = Date.now();
        
        // Track max watched position for history buffer calculation
        if (currentTime > this.maxWatchedPosition) {
            this.maxWatchedPosition = currentTime;
        }
        
        // Collect all buffer ranges
        this.bufferRanges = [];
        for (let i = 0; i < this.video.buffered.length; i++) {
            this.bufferRanges.push({
                start: this.video.buffered.start(i),
                end: this.video.buffered.end(i)
            });
        }
        
        // Find buffer range containing current time
        let currentBufferEnd = currentTime;
        let currentBufferStart = currentTime;
        for (const range of this.bufferRanges) {
            if (currentTime >= range.start && currentTime <= range.end) {
                currentBufferEnd = range.end;
                currentBufferStart = range.start;
                break;
            }
        }
        
        // Calculate buffer ahead (from current position)
        const bufferAhead = currentBufferEnd - currentTime;
        
        // Calculate history buffer (from start of current buffer range)
        const historyBuffer = currentTime - currentBufferStart;
        
        // Calculate total buffered seconds
        let totalBuffered = 0;
        for (const range of this.bufferRanges) {
            totalBuffered += range.end - range.start;
        }
        
        // Update visual buffer bar - show the continuous buffer range around current position
        const bufferStartPercent = (currentBufferStart / duration) * 100;
        const bufferEndPercent = (currentBufferEnd / duration) * 100;
        
        this.progressBuffer.style.left = `${bufferStartPercent}%`;
        this.progressBuffer.style.width = `${bufferEndPercent - bufferStartPercent}%`;
        
        // Update stats display
        const aheadSeconds = Math.round(bufferAhead);
        this.bufferPercent.textContent = `${aheadSeconds}s ahead`;
        
        // Calculate real-time network speed using rolling average
        this.calculateNetworkSpeed(totalBuffered, now);
    }
    
    calculateNetworkSpeed(totalBuffered, now) {
        // Initialize on first call
        if (this.lastBufferTime === 0) {
            this.lastBufferTime = now;
            this.lastBufferedAmount = totalBuffered;
            return;
        }
        
        // Calculate speed based on buffer change over time
        const timeDelta = (now - this.lastBufferTime) / 1000; // seconds
        const bufferDelta = totalBuffered - this.lastBufferedAmount; // seconds of video
        
        if (timeDelta > 0.3) { // Update every 300ms minimum
            // Estimate bitrate: assume average video bitrate
            // For typical HD video: ~5 Mbps, 4K: ~15 Mbps, SD: ~2 Mbps
            const estimatedBitrate = 5000000; // 5 Mbps default assumption
            
            // bytes downloaded = seconds of video * (bitrate / 8)
            const bytesDownloaded = bufferDelta * (estimatedBitrate / 8);
            const speedBps = bytesDownloaded / timeDelta; // bytes per second
            
            if (bufferDelta > 0.1) {
                // Add to rolling average
                this.networkSpeedSamples.push(speedBps);
                if (this.networkSpeedSamples.length > this.maxSpeedSamples) {
                    this.networkSpeedSamples.shift();
                }
                
                // Calculate average speed
                const avgSpeed = this.networkSpeedSamples.reduce((a, b) => a + b, 0) / this.networkSpeedSamples.length;
                this.displayNetworkSpeed(avgSpeed);
            } else if (timeDelta > 2) {
                // No recent buffering activity
                const isFullyBuffered = totalBuffered >= this.video.duration - 1;
                if (isFullyBuffered) {
                    this.networkSpeed.textContent = 'Complete';
                    this.networkSpeed.style.color = 'var(--accent-primary)';
                } else {
                    this.networkSpeed.textContent = 'Waiting...';
                    this.networkSpeed.style.color = 'var(--text-tertiary)';
                }
            }
            
            // Update tracking
            this.lastBufferTime = now;
            this.lastBufferedAmount = totalBuffered;
        }
    }
    
    displayNetworkSpeed(bytesPerSecond) {
        this.networkSpeed.style.color = ''; // Reset to default color
        
        if (bytesPerSecond >= 1000000) {
            this.networkSpeed.textContent = `${(bytesPerSecond / 1000000).toFixed(1)} MB/s`;
        } else if (bytesPerSecond >= 1000) {
            this.networkSpeed.textContent = `${(bytesPerSecond / 1000).toFixed(0)} KB/s`;
        } else if (bytesPerSecond > 0) {
            this.networkSpeed.textContent = `${Math.round(bytesPerSecond)} B/s`;
        }
    }
    
    // Update speed status when not actively buffering
    updateSpeedStatus() {
        if (!this.video.duration) return;
        
        // Calculate total buffered
        let totalBuffered = 0;
        for (let i = 0; i < this.video.buffered.length; i++) {
            totalBuffered += this.video.buffered.end(i) - this.video.buffered.start(i);
        }
        
        const isFullyBuffered = totalBuffered >= this.video.duration - 1;
        const bufferPercent = Math.round((totalBuffered / this.video.duration) * 100);
        
        // Update based on current state
        if (isFullyBuffered) {
            this.networkSpeed.textContent = 'Complete';
            this.networkSpeed.style.color = 'var(--accent-primary)';
            this.bufferIndicator.classList.remove('active');
        } else if (this.networkSpeedSamples.length === 0) {
            // No speed data yet, show buffer progress
            this.networkSpeed.textContent = `${bufferPercent}% loaded`;
            this.networkSpeed.style.color = '';
        }
    }
    
    // Smart buffer management - continues buffering when paused
    startBufferManagement() {
        // Clear any existing interval
        if (this.bufferCheckInterval) {
            clearInterval(this.bufferCheckInterval);
        }
        
        // Check buffer status every 500ms
        this.bufferCheckInterval = setInterval(() => {
            this.manageBuffer();
        }, 500);
    }
    
    stopBufferManagement() {
        if (this.bufferCheckInterval) {
            clearInterval(this.bufferCheckInterval);
            this.bufferCheckInterval = null;
        }
    }
    
    manageBuffer() {
        if (!this.video.duration || !this.video.src) return;
        
        const currentTime = this.video.currentTime;
        const duration = this.video.duration;
        
        // Calculate required history buffer (10% of max watched position)
        const requiredHistoryBuffer = this.maxWatchedPosition * this.historyBufferRatio;
        
        // Find current buffer range
        let bufferAhead = 0;
        let bufferBehind = 0;
        let totalBuffered = 0;
        
        for (let i = 0; i < this.video.buffered.length; i++) {
            const start = this.video.buffered.start(i);
            const end = this.video.buffered.end(i);
            totalBuffered += end - start;
            
            if (currentTime >= start && currentTime <= end) {
                bufferAhead = end - currentTime;
                bufferBehind = currentTime - start;
            }
        }
        
        // Check if still buffering (not fully loaded)
        const isFullyBuffered = totalBuffered >= duration - 0.5;
        const needsMoreBuffer = bufferAhead < this.targetBufferAhead && !isFullyBuffered;
        
        // Show buffer indicator when paused and still buffering
        if (this.video.paused && needsMoreBuffer && !this.loadingOverlay.classList.contains('active')) {
            this.bufferIndicator.classList.add('active');
            this.encourageBuffering();
        } else {
            this.bufferIndicator.classList.remove('active');
        }
        
        // Update UI with buffer health indicator
        this.updateBufferHealth(bufferAhead, bufferBehind, requiredHistoryBuffer);
        
        // Update speed status display
        this.updateSpeedStatus();
    }
    
    encourageBuffering() {
        // Browsers automatically buffer when video is loaded
        // We ensure preload is set to auto for aggressive buffering
        if (this.video.preload !== 'auto') {
            this.video.preload = 'auto';
        }
        
        // Some browsers buffer more when we access buffered property
        // This is a hint to the browser that we care about buffering
        if (this.video.buffered.length > 0) {
            const lastBufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
            // Log buffer status for debugging
            console.debug(`Buffer: ${lastBufferedEnd.toFixed(1)}s / ${this.video.duration.toFixed(1)}s`);
        }
    }
    
    updateBufferHealth(ahead, behind, requiredHistory) {
        // Visual indicator of buffer health
        const bufferStat = document.getElementById('bufferStat');
        
        if (ahead >= 30) {
            bufferStat.classList.remove('warning', 'critical');
            bufferStat.classList.add('healthy');
        } else if (ahead >= 10) {
            bufferStat.classList.remove('healthy', 'critical');
            bufferStat.classList.add('warning');
        } else {
            bufferStat.classList.remove('healthy', 'warning');
            bufferStat.classList.add('critical');
        }
    }
    
    toggleMute() {
        if (this.video.muted) {
            this.video.muted = false;
            this.video.volume = this.lastVolume || 1;
        } else {
            this.lastVolume = this.video.volume;
            this.video.muted = true;
        }
    }
    
    setVolume(value) {
        this.video.volume = value;
        this.video.muted = value == 0;
        this.updateVolumeUI();
    }
    
    updateVolumeUI() {
        const volume = this.video.muted ? 0 : this.video.volume;
        const container = this.muteBtn.closest('.volume-container');
        
        this.volumeSlider.value = volume;
        this.volumeFill.style.width = `${volume * 100}%`;
        
        container.classList.remove('low', 'muted');
        if (volume === 0 || this.video.muted) {
            container.classList.add('muted');
        } else if (volume < 0.5) {
            container.classList.add('low');
        }
    }
    
    setPlaybackSpeed(speed) {
        try {
            this.video.playbackRate = speed;
            this.speedValue.textContent = `${speed}x`;
            
            document.querySelectorAll('.speed-option').forEach(option => {
                option.classList.toggle('active', parseFloat(option.dataset.speed) === speed);
            });
            
            this.speedMenu.classList.remove('active');
        } catch (error) {
            // Browser doesn't support this playback rate
            console.warn(`Playback rate ${speed}x not supported:`, error.message);
            this.showSpeedWarning(speed);
        }
    }
    
    showSpeedWarning(speed) {
        // Show temporary warning
        const warning = document.createElement('div');
        warning.className = 'speed-warning';
        warning.innerHTML = `⚠️ ${speed}x not supported. Browser limit: 0.0625x - 16x`;
        
        this.playerContainer.appendChild(warning);
        
        setTimeout(() => {
            warning.classList.add('fade-out');
            setTimeout(() => warning.remove(), 300);
        }, 2500);
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            if (this.playerContainer.requestFullscreen) {
                this.playerContainer.requestFullscreen();
            } else if (this.playerContainer.webkitRequestFullscreen) {
                this.playerContainer.webkitRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        }
    }
    
    onFullscreenChange() {
        this.isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
        this.playerContainer.classList.toggle('fullscreen', this.isFullscreen);
    }
    
    async togglePiP() {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled) {
                await this.video.requestPictureInPicture();
            }
        } catch (e) {
            console.error('PiP error:', e);
        }
    }
    
    showControls() {
        clearTimeout(this.controlsTimeout);
        clearTimeout(this.cursorTimeout);
        
        this.playerContainer.classList.add('show-controls');
        this.playerContainer.classList.remove('hide-cursor');
        
        if (this.isPlaying) {
            this.controlsTimeout = setTimeout(() => {
                this.playerContainer.classList.remove('show-controls');
            }, 3000);
            
            if (this.isFullscreen) {
                this.cursorTimeout = setTimeout(() => {
                    this.playerContainer.classList.add('hide-cursor');
                }, 3000);
            }
        }
    }
    
    hideControls() {
        if (this.isPlaying) {
            this.playerContainer.classList.remove('show-controls');
        }
    }
    
    handleKeyboard(e) {
        // Don't handle if typing in input
        if (e.target.tagName === 'INPUT') return;
        
        const key = e.key.toLowerCase();
        
        switch (key) {
            case ' ':
            case 'k':
                e.preventDefault();
                if (this.playerSection.classList.contains('active')) {
                    this.togglePlay();
                }
                break;
            case 'f':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'm':
                e.preventDefault();
                this.toggleMute();
                break;
            case 'p':
                e.preventDefault();
                this.togglePiP();
                break;
            case 'arrowleft':
            case 'j':
                e.preventDefault();
                this.skip(-10);
                break;
            case 'arrowright':
            case 'l':
                e.preventDefault();
                this.skip(10);
                break;
            case 'arrowup':
                e.preventDefault();
                this.setVolume(Math.min(1, this.video.volume + 0.1));
                break;
            case 'arrowdown':
                e.preventDefault();
                this.setVolume(Math.max(0, this.video.volume - 0.1));
                break;
            case '?':
                e.preventDefault();
                this.shortcutsModal.classList.toggle('active');
                break;
            case 'escape':
                this.shortcutsModal.classList.remove('active');
                break;
            default:
                // Number keys for seeking (0-9 = 0%-90%)
                if (key >= '0' && key <= '9') {
                    e.preventDefault();
                    const percent = parseInt(key) * 10;
                    this.seekToPercent(percent);
                }
        }
    }
    
    showLoading() {
        this.loadingOverlay.classList.add('active');
    }
    
    hideLoading() {
        this.loadingOverlay.classList.remove('active');
    }
    
    showError(message = 'Unable to load video') {
        this.hideLoading();
        this.errorText.textContent = message;
        this.errorOverlay.classList.add('active');
    }
    
    hideError() {
        this.errorOverlay.classList.remove('active');
    }
    
    handleError(e) {
        const error = this.video.error;
        let message = 'Unable to load video';
        
        if (error) {
            switch (error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                    message = 'Video playback aborted';
                    break;
                case MediaError.MEDIA_ERR_NETWORK:
                    message = 'Network error - check your connection or the URL may have expired';
                    break;
                case MediaError.MEDIA_ERR_DECODE:
                    message = 'Video format not supported by browser';
                    break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    // Try without crossorigin attribute if it was set
                    if (this.video.hasAttribute('crossorigin') && !this.triedWithoutCors) {
                        this.triedWithoutCors = true;
                        console.log('Retrying without CORS...');
                        this.video.removeAttribute('crossorigin');
                        this.video.load();
                        return;
                    }
                    // Try with crossorigin if it wasn't set
                    if (!this.video.hasAttribute('crossorigin') && !this.triedWithCors) {
                        this.triedWithCors = true;
                        console.log('Retrying with CORS anonymous...');
                        this.video.setAttribute('crossorigin', 'anonymous');
                        this.video.load();
                        return;
                    }
                    
                    // Check if it's a Google URL for specific message
                    const isGoogleUrl = this.currentUrl.includes('googleusercontent.com') || 
                                       this.currentUrl.includes('googlevideo.com');
                    if (isGoogleUrl) {
                        message = 'Google video URL has expired!\n\nGoogle download links are only valid for a few hours.\nPlease get a fresh download URL.';
                    } else {
                        message = 'Video cannot be played.\n\n• URL may be expired or invalid\n• Server may block external access\n• Format may not be supported';
                    }
                    break;
            }
        }
        
        this.showError(message);
    }
    
    showPlayerSection() {
        this.urlSection.classList.add('hidden');
        this.playerSection.classList.add('active');
    }
    
    showUrlSection() {
        this.urlSection.classList.remove('hidden');
        this.playerSection.classList.remove('active');
        
        // Stop buffer management
        this.stopBufferManagement();
        
        // Reset video
        this.video.pause();
        this.video.src = '';
        this.video.load();
        
        // Reset buffer tracking
        this.maxWatchedPosition = 0;
        this.bufferRanges = [];
        this.lastBufferTime = 0;
        this.lastBufferedAmount = 0;
        this.networkSpeedSamples = [];
        
        // Reset UI
        this.hideLoading();
        this.hideError();
        this.progressPlayed.style.width = '0%';
        this.progressBuffer.style.width = '0%';
        this.progressBuffer.style.left = '0%';
        this.progressThumb.style.left = '0%';
        this.currentTimeEl.textContent = '0:00';
        this.durationEl.textContent = '0:00';
        this.bufferPercent.textContent = '0%';
        this.networkSpeed.textContent = '—';
        
        // Remove buffer health classes
        const bufferStat = document.getElementById('bufferStat');
        bufferStat.classList.remove('healthy', 'warning', 'critical');
        
        // Hide buffer indicator
        this.bufferIndicator.classList.remove('active');
        
        // Clear URL params
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('url');
        window.history.replaceState({}, '', newUrl);
        
        this.urlInput.focus();
    }
    
    formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';

        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);

        if (h > 0) {
            return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // ========== NEW FEATURES ==========

    // Filename extraction and display
    async extractFilename() {
        try {
            const response = await fetch(this.currentUrl, { method: 'HEAD' });
            const filename = response.headers.get('X-Original-Filename') ||
                            this.parseFilenameFromUrl(this.originalUrl);
            this.originalFilename = filename;
            this.updateFilenameDisplay();
        } catch (error) {
            this.originalFilename = this.parseFilenameFromUrl(this.originalUrl);
            this.updateFilenameDisplay();
        }
    }

    parseFilenameFromUrl(url) {
        try {
            const urlObj = new URL(url);
            const pathSegments = urlObj.pathname.split('/');
            let filename = pathSegments[pathSegments.length - 1] || 'video';
            filename = decodeURIComponent(filename);
            // Remove query params from filename
            filename = filename.split('?')[0];
            return filename || 'Untitled Video';
        } catch {
            return 'Untitled Video';
        }
    }

    updateFilenameDisplay() {
        if (this.filenameText && this.originalFilename) {
            this.filenameText.textContent = this.originalFilename;
            if (this.videoInfoSection) {
                this.videoInfoSection.style.display = 'flex';
            }
        }
    }

    // Download functionality
    getDownloadUrl() {
        const filename = this.originalFilename || 'video.mp4';
        return `${window.location.origin}/download?url=${encodeURIComponent(this.originalUrl)}&filename=${encodeURIComponent(filename)}`;
    }

    downloadVideo() {
        const link = document.createElement('a');
        link.href = this.getDownloadUrl();
        link.download = this.originalFilename || 'video.mp4';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showNotification('Download started!');
    }

    copyToClipboard(text, message) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification(message);
        }).catch(() => {
            this.showNotification('Failed to copy to clipboard');
        });
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // Audio track management
    updateAudioTrackList() {
        if (!this.video.audioTracks || this.video.audioTracks.length === 0) {
            this.audioTracks.innerHTML = '<div class="no-tracks">No audio tracks detected</div>';
            return;
        }

        const tracksHTML = [];
        for (let i = 0; i < this.video.audioTracks.length; i++) {
            const track = this.video.audioTracks[i];
            const isActive = track.enabled;
            const trackLabel = track.label || track.language || `Track ${i + 1}`;

            tracksHTML.push(`
                <button class="audio-track-option ${isActive ? 'active' : ''}" data-track="${i}">
                    <span>${trackLabel}</span>
                    ${isActive ? '<svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' : ''}
                </button>
            `);
        }

        this.audioTracks.innerHTML = tracksHTML.join('');

        // Add click handlers
        this.audioTracks.querySelectorAll('.audio-track-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const trackIndex = parseInt(e.currentTarget.dataset.track);
                this.selectAudioTrack(trackIndex);
            });
        });
    }

    selectAudioTrack(trackIndex) {
        if (!this.video.audioTracks || trackIndex >= this.video.audioTracks.length) {
            return;
        }

        // Disable all tracks
        for (let i = 0; i < this.video.audioTracks.length; i++) {
            this.video.audioTracks[i].enabled = false;
        }

        // Enable selected track
        this.video.audioTracks[trackIndex].enabled = true;
        this.currentAudioTrack = trackIndex;

        // Update UI
        this.updateAudioTrackList();
        const trackLabel = this.video.audioTracks[trackIndex].label || 'Track ' + (trackIndex + 1);
        this.showNotification(`Audio track: ${trackLabel}`);
    }

    detectAudioTracks() {
        // Check if browser supports audioTracks API
        if (this.video.audioTracks && this.video.audioTracks.length > 0) {
            console.log(`📻 Detected ${this.video.audioTracks.length} audio tracks`);
            if (this.audioBtn) this.audioBtn.classList.add('available');
        } else {
            console.log('ℹ️ No multiple audio tracks detected or API not supported');
        }
    }

    // Subtitle management
    async loadSubtitleFromUrl() {
        const url = this.subtitleUrlInput.value.trim();
        if (!url) return;

        try {
            let subtitleUrl = url;

            // Check if ASS file (needs conversion)
            if (url.toLowerCase().endsWith('.ass')) {
                subtitleUrl = `${window.location.origin}/subtitle/convert?url=${encodeURIComponent(url)}`;
            } else {
                // VTT or SRT - proxy to handle CORS
                subtitleUrl = `${window.location.origin}/subtitle/proxy?url=${encodeURIComponent(url)}`;
            }

            this.addSubtitleTrack(subtitleUrl, `Subtitle ${this.loadedSubtitles.length + 1}`);
            this.showNotification('Subtitle loaded!');
            this.subtitleUrlInput.value = '';
        } catch (error) {
            console.error('Subtitle load error:', error);
            this.showNotification('Failed to load subtitle');
        }
    }

    async loadSubtitleFromFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            let vttContent = text;

            // Convert ASS to VTT if needed
            if (file.name.toLowerCase().endsWith('.ass')) {
                vttContent = await this.convertAssToVtt(text);
            }

            // Create blob URL
            const blob = new Blob([vttContent], { type: 'text/vtt' });
            const url = URL.createObjectURL(blob);

            this.addSubtitleTrack(url, file.name);
            this.showNotification(`Loaded: ${file.name}`);

            // Reset input
            event.target.value = '';
        } catch (error) {
            console.error('File load error:', error);
            this.showNotification('Failed to load subtitle file');
        }
    }

    addSubtitleTrack(url, label) {
        const track = document.createElement('track');
        track.kind = 'subtitles';
        track.label = label;
        track.srclang = 'en';
        track.src = url;

        this.video.appendChild(track);

        const trackInfo = {
            track: track,
            label: label,
            index: this.loadedSubtitles.length
        };

        this.loadedSubtitles.push(trackInfo);
        this.updateSubtitleTrackList();

        // Auto-enable first subtitle
        if (this.loadedSubtitles.length === 1) {
            this.selectSubtitle(0);
        }
    }

    updateSubtitleTrackList() {
        const tracksHTML = ['<div class="subtitle-track-option active" data-track="-1" style="cursor: pointer;"><span>Off</span></div>'];

        this.loadedSubtitles.forEach((sub, index) => {
            const isActive = index === this.currentSubtitle;
            tracksHTML.push(`
                <div class="subtitle-track-option ${isActive ? 'active' : ''}" data-track="${index}" style="cursor: pointer;">
                    <span>${sub.label}</span>
                    <button class="subtitle-remove-btn" data-index="${index}">×</button>
                </div>
            `);
        });

        this.subtitleTracks.innerHTML = tracksHTML.join('');

        // Add click handlers
        this.subtitleTracks.querySelectorAll('.subtitle-track-option').forEach(option => {
            option.addEventListener('click', (e) => {
                if (e.target.classList.contains('subtitle-remove-btn')) return;
                const trackIndex = parseInt(e.currentTarget.dataset.track);
                this.selectSubtitle(trackIndex);
            });
        });

        this.subtitleTracks.querySelectorAll('.subtitle-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.currentTarget.dataset.index);
                this.removeSubtitle(index);
            });
        });
    }

    selectSubtitle(index) {
        // Disable all tracks
        this.loadedSubtitles.forEach(sub => {
            sub.track.mode = 'disabled';
        });

        if (index >= 0 && index < this.loadedSubtitles.length) {
            this.loadedSubtitles[index].track.mode = 'showing';
            this.currentSubtitle = index;
            if (this.subtitleBtn) this.subtitleBtn.classList.add('active');
        } else {
            this.currentSubtitle = -1;
            if (this.subtitleBtn) this.subtitleBtn.classList.remove('active');
        }

        this.updateSubtitleTrackList();
    }

    removeSubtitle(index) {
        if (index < 0 || index >= this.loadedSubtitles.length) return;

        const sub = this.loadedSubtitles[index];
        this.video.removeChild(sub.track);

        // Revoke blob URL if it exists
        if (sub.track.src.startsWith('blob:')) {
            URL.revokeObjectURL(sub.track.src);
        }

        this.loadedSubtitles.splice(index, 1);

        // Update current subtitle index
        if (this.currentSubtitle === index) {
            this.currentSubtitle = -1;
        } else if (this.currentSubtitle > index) {
            this.currentSubtitle--;
        }

        this.updateSubtitleTrackList();
    }

    // Simple ASS to VTT conversion (client-side fallback)
    async convertAssToVtt(assContent) {
        // This is a simplified conversion - the server-side one is more robust
        let vtt = 'WEBVTT\n\n';

        const lines = assContent.split('\n');
        let inEvents = false;

        for (const line of lines) {
            if (line.trim() === '[Events]') {
                inEvents = true;
                continue;
            }

            if (inEvents && line.startsWith('Dialogue:')) {
                const parts = line.split(',');
                if (parts.length >= 10) {
                    const start = this.convertAssTime(parts[1].trim());
                    const end = this.convertAssTime(parts[2].trim());
                    const text = parts.slice(9).join(',').replace(/\\N/g, '\n').replace(/\{[^}]+\}/g, '');

                    vtt += `${start} --> ${end}\n${text}\n\n`;
                }
            }
        }

        return vtt;
    }

    convertAssTime(assTime) {
        // Convert ASS time (0:00:00.00) to VTT time (00:00:00.000)
        const parts = assTime.split(':');
        if (parts.length === 3) {
            const hours = parts[0].padStart(2, '0');
            const minutes = parts[1].padStart(2, '0');
            const secondsParts = parts[2].split('.');
            const seconds = secondsParts[0].padStart(2, '0');
            const ms = (secondsParts[1] || '0').padStart(3, '0');
            return `${hours}:${minutes}:${seconds}.${ms}`;
        }
        return assTime;
    }

    // Video stream analysis (automatic audio/subtitle detection)
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
}

// Initialize player when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.streamFlow = new StreamFlowPlayer();
});

// Service Worker for offline support (optional enhancement)
if ('serviceWorker' in navigator) {
    // Uncomment to enable service worker
    // navigator.serviceWorker.register('/sw.js');
}

