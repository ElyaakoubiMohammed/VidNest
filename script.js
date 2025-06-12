// YouTube API Configuration
const API_KEY = 'AIzaSyA-10-abWpUz28yMnTKl_DiV_BoO808rZ8'; // Replace with your actual YouTube Data API v3 key
let nextPageToken = '';
let currentQuery = '';
let isLoading = false;
let currentViewMode = 'grid';
let currentTheme = localStorage.getItem('theme') || 'light';
let currentFilter = 'all';
let currentSort = 'relevance';
let currentPlayingVideoId = '';
// DOM Elements
const searchBar = document.getElementById('search-bar');
const videoContainer = document.getElementById('video-container');
const loadMoreBtn = document.getElementById('load-more');
const loadingContainer = document.getElementById('loading-container');
const contentSection = document.getElementById('content-section');
const resultsCount = document.getElementById('results-count');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('main-content');
const heroSection = document.getElementById('hero-section');
const filterBar = document.getElementById('filter-bar');
const resultsHeader = document.getElementById('results-header');

// Initialize the application
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

function initializeApp() {
    // Apply saved theme
    applyTheme(currentTheme);

    // Check if API key is configured
    if (API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE' || !API_KEY || API_KEY.length < 10) {
        showApiKeyError();
        return;
    }

    showHome();

    // Add event listeners
    setupEventListeners();

    // Initialize sidebar state
    if (window.innerWidth <= 768) {
        sidebar.classList.add('collapsed');
        mainContent.classList.add('sidebar-collapsed');
    }
}

// LocalStorage Helper Functions
function getSavedData(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}


function addToWatchLater(videoId) {
    const videoContainer = document.getElementById('video-container');
    const videoElement = videoContainer.querySelector(`[onclick*="'${videoId}'"]`);
    const title = videoElement?.querySelector('.video-title')?.textContent || 'Video';

    const watchLaterList = getSavedData('watchLater');
    if (!watchLaterList.some(v => v.id === videoId)) {
        saveData('watchLater', [...watchLaterList, { id: videoId, title }]);
        showToast('Added to Watch Later');
    } else {
        showToast('Already in Watch Later');
    }
}

function showWatchLater() {
    updateActiveNavItem('watch-later');
    hideHeroSection();
    showLoading();
    clearResults();
    updateResultsTitle('Watch Later');

    const watchLaterList = getSavedData('watchLater');
    hideLoading();

    if (watchLaterList.length === 0) {
        videoContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-clock"></i>
                <h3>No videos in Watch Later</h3>
                <p>Add videos using the ⏰ icon.</p>
            </div>`;
        return;
    }

    videoContainer.innerHTML = '';
    watchLaterList.forEach((item, index) => {
        const videoElement = document.createElement('div');
        videoElement.classList.add('video-card');
        videoElement.style.animationDelay = `${index * 0.1}s`;
        videoElement.innerHTML = `
            <div class="video-thumbnail" onclick="playVideo('${item.id}', '${item.title}')">
                <img src="https://i.ytimg.com/vi/${item.id}/hqdefault.jpg"  alt="${item.title}" loading="lazy">
                <div class="video-overlay"><i class="fas fa-play-circle play-icon"></i></div>
            </div>
            <div class="video-info">
                <div class="video-details">
                    <h4 class="video-title">${item.title}</h4>
                    <button class="action-btn" onclick="removeFromWatchLater('${item.id}')">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
        videoContainer.appendChild(videoElement);
    });
}



function toggleLike() {
    const likeBtn = document.querySelector('.like-btn');
    const videoTitle = document.getElementById('video-title-modal')?.textContent || 'Unknown Video';

    const likedVideos = getSavedData('likedVideos');
    const isLiked = likedVideos.some(v => v.id === currentPlayingVideoId);

    if (!isLiked) {
        likedVideos.push({ id: currentPlayingVideoId, title: videoTitle });
        saveData('likedVideos', likedVideos);
        showToast('Liked!');
        likeBtn.classList.add('active');
    } else {
        const updatedList = likedVideos.filter(v => v.id !== currentPlayingVideoId);
        saveData('likedVideos', updatedList);
        showToast('Like removed');
        likeBtn.classList.remove('active');
    }
}


function removeFromWatchLater(videoId) {
    const watchLaterList = getSavedData('watchLater').filter(v => v.id !== videoId);
    saveData('watchLater', watchLaterList);
    showWatchLater();
}

function showApiKeyError() {
    hideHeroSection();
    showContentSection();
    updateResultsTitle('API Configuration Required');

    videoContainer.innerHTML = `
        <div class="api-key-error">
            <div class="error-icon">
                <i class="fas fa-key"></i>
            </div>
            <h3>YouTube API Key Required</h3>
            <p>To use VidNest, you need to configure a valid YouTube Data API v3 key.</p>
            <div class="setup-steps">
                <h4>Setup Instructions:</h4>
                <ol>
                    <li>Go to the <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a></li>
                    <li>Create a new project or select an existing one</li>
                    <li>Enable the YouTube Data API v3</li>
                    <li>Create credentials (API Key)</li>
                    <li>Copy the API key and replace 'YOUR_YOUTUBE_API_KEY_HERE' in script.js</li>
                </ol>
                <div class="api-note">
                    <i class="fas fa-info-circle"></i>
                    <p>The YouTube Data API is free with generous quotas. You'll need a Google account to get started.</p>
                </div>
            </div>
        </div>
    `;
}

function showLikedVideos() {
    updateActiveNavItem('liked');
    hideHeroSection();
    showLoading();
    clearResults();
    updateResultsTitle('Liked Videos');

    const likedVideos = getSavedData('likedVideos');
    hideLoading();

    if (likedVideos.length === 0) {
        videoContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-thumbs-up"></i>
                <h3>No liked videos yet</h3>
                <p>Tap ❤️ on any video to add it to your likes.</p>
            </div>`;
        return;
    }

    videoContainer.innerHTML = '';
    likedVideos.forEach((item, index) => {
        const videoElement = document.createElement('div');
        videoElement.classList.add('video-card');
        videoElement.style.animationDelay = `${index * 0.1}s`;
        videoElement.innerHTML = `
            <div class="video-thumbnail" onclick="playVideo('${item.id}', '${item.title}')">
                <img src="https://i.ytimg.com/vi/${item.id}/hqdefault.jpg"  alt="${item.title}" loading="lazy">
                <div class="video-overlay"><i class="fas fa-play-circle play-icon"></i></div>
            </div>
            <div class="video-info">
                <div class="video-details">
                    <h4 class="video-title">${item.title}</h4>
                    <button class="action-btn" onclick="removeFromLiked('${item.id}')">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
        videoContainer.appendChild(videoElement);
    });
}

function removeFromLiked(videoId) {
    const likedVideos = getSavedData('likedVideos').filter(v => v.id !== videoId);
    saveData('likedVideos', likedVideos);
    showLikedVideos();
}

function setupEventListeners() {
    // Search functionality
    searchBar.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            searchVideos();
        }
    });

    searchBar.addEventListener('input', function () {
        if (this.value.length > 2) {
            showSearchSuggestions(this.value);
        }
    });

    // Responsive sidebar
    window.addEventListener('resize', function () {
        if (window.innerWidth <= 768) {
            sidebar.classList.add('collapsed');
            mainContent.classList.add('sidebar-collapsed');
        } else {
            sidebar.classList.remove('collapsed');
            mainContent.classList.remove('sidebar-collapsed');
        }
    });

    // Scroll effects
    window.addEventListener('scroll', handleScroll);

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.notification-btn')) {
            document.getElementById('notifications-panel').classList.remove('show');
        }
    });
}

function handleScroll() {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.classList.add('scrolled');
    } else {
        header.classList.remove('scrolled');
    }
}

// Theme Management
function toggleTheme() {
    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(currentTheme);
    localStorage.setItem('theme', currentTheme);
}

function applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    const themeIcon = document.querySelector('.theme-toggle i');
    if (theme === 'dark') {
        themeIcon.className = 'fas fa-sun';
    } else {
        themeIcon.className = 'fas fa-moon';
    }
}

// Sidebar Management
function toggleSidebar() {
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('sidebar-collapsed');
}

// Navigation Functions
function showHome() {
    updateActiveNavItem('home');

    hideHeroSection();
    showLoading();
    clearResults();
    updateResultsTitle('Recommended Videos');

    // Use empty query for more general results
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=&key=${API_KEY}&type=video&maxResults=50`;

    fetchVideos(url);
}


function showTrending() {
    updateActiveNavItem('trending');
    loadTrendingVideos();
}

function showSubscriptions() {
    updateActiveNavItem('subscriptions');
    hideHeroSection();
    showLoading();
    clearResults();
    updateResultsTitle('Subscriptions');
    // TODO: Add real subscription feed
    videoContainer.innerHTML = '<div class="no-results"><i class="fas fa-users"></i><h3>No Subscriptions</h3><p>Subscribe to channels to see their videos here.</p></div>';
}

function showHistory() {
    updateActiveNavItem('history');
    hideHeroSection();
    showLoading();
    clearResults();
    updateResultsTitle('Watch History');
    videoContainer.innerHTML = '<div class="no-results"><i class="fas fa-history"></i><h3>No Watch History</h3><p>Videos you watch will appear here.</p></div>';
    hideLoading();
}

function showWatchLater() {
    updateActiveNavItem('watch-later');
    hideHeroSection();
    showLoading();
    clearResults();
    updateResultsTitle('Watch Later');
    videoContainer.innerHTML = '<div class="no-results"><i class="fas fa-clock"></i><h3>Empty Watch Later</h3><p>Save videos for later using the ⏰ icon.</p></div>';
    hideLoading();
}

function showLikedVideos() {
    updateActiveNavItem('liked');
    hideHeroSection();
    showLoading();
    clearResults();
    updateResultsTitle('Liked Videos');
    videoContainer.innerHTML = '<div class="no-results"><i class="fas fa-thumbs-up"></i><h3>No Liked Videos</h3><p>Tap ❤️ on any video to add it to your likes.</p></div>';
    hideLoading();
}

function showPlaylists() {
    updateActiveNavItem('playlists');
    hideHeroSection();
    showLoading();
    clearResults();
    updateResultsTitle('Playlists');

    videoContainer.innerHTML = `
        <div class="no-results">
            <i class="fas fa-list"></i>
            <h3>No Playlists</h3>
            <p>Create or save videos to playlists to organize your content.</p>
        </div>`;
    hideLoading();
}


function exploreCategory(category) {
    updateActiveNavItem(category);
    quickSearch(category);
}

function updateActiveNavItem(activeItem) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    // Add active class to clicked item if needed
}

function showComingSoon(feature) {
    hideHeroSection();
    showContentSection();
    updateResultsTitle(feature);

    videoContainer.innerHTML = `
        <div class="coming-soon">
            <div class="coming-soon-icon">
                <i class="fas fa-rocket"></i>
            </div>
            <h3>${feature} Coming Soon!</h3>
            <p>We're working hard to bring you this feature. Stay tuned for updates!</p>
            <button class="back-btn" onclick="showHome()">
                <i class="fas fa-arrow-left"></i>
                Back to Home
            </button>
        </div>
    `;
}

// Search Functionality
function searchVideos() {
    const query = searchBar.value.trim();
    if (!query || isLoading) return;

    if (API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE' || !API_KEY || API_KEY.length < 10) {
        showApiKeyError();
        return;
    }

    currentQuery = query;
    nextPageToken = '';
    hideHeroSection();
    showLoading();
    clearResults();
    updateResultsTitle(`Search results for "${query}"`);

    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${API_KEY}&type=video&maxResults=24&order=${currentSort}`;

    const today = new Date();

    if (currentFilter === 'today') {
        url += `&publishedAfter=${today.toISOString()}`;
    } else if (currentFilter === 'week') {
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);
        url += `&publishedAfter=${lastWeek.toISOString()}`;
    } else if (currentFilter === 'month') {
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        url += `&publishedAfter=${lastMonth.toISOString()}`;
    } else if (currentFilter === 'duration') {
        url += '&videoDuration=long'; // Example: long videos (you can change to short/medium)
    } else if (currentFilter === 'quality') {
        url += '&videoDefinition=high'; // HD videos
    }

    fetchVideos(url);
}



function quickSearch(query) {
    searchBar.value = query;
    hideHeroSection();
    showContentSection();
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    currentQuery = query;
    nextPageToken = '';
    showLoading();
    clearResults();
    updateResultsTitle(`${query.charAt(0).toUpperCase() + query.slice(1)} Videos`);

    let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${API_KEY}&type=video&maxResults=24&order=${currentSort}`;

    const today = new Date();

    if (currentFilter === 'today') {
        url += `&publishedAfter=${today.toISOString()}`;
    } else if (currentFilter === 'week') {
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);
        url += `&publishedAfter=${lastWeek.toISOString()}`;
    } else if (currentFilter === 'month') {
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        url += `&publishedAfter=${lastMonth.toISOString()}`;
    } else if (currentFilter === 'duration') {
        url += '&videoDuration=long';
    } else if (currentFilter === 'quality') {
        url += '&videoDefinition=high';
    }

    fetchVideos(url);
}
function loadTrendingVideos() {
    currentQuery = 'trending';
    nextPageToken = '';

    hideHeroSection();
    showLoading();
    clearResults();
    updateResultsTitle('Trending Videos');

    // Use popular videos endpoint for trending
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=24&key=${API_KEY}`;

    fetchTrendingVideos(url);
}

function fetchTrendingVideos(url) {
    isLoading = true;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                if (response.status === 400) {
                    throw new Error('Invalid API request. Please check your YouTube API key.');
                } else if (response.status === 403) {
                    throw new Error('API quota exceeded or invalid API key. Please check your YouTube API key and quota limits.');
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            return response.json();
        })
        .then(data => {
            hideLoading();
            displayTrendingVideos(data);
            updateResultsCount(data.pageInfo?.totalResults || 0);
            showContentSection();
        })
        .catch(error => {
            console.error('Error fetching videos:', error);
            hideLoading();
            showError(error.message || 'Failed to load trending videos. Please check your API key and try again.');
        })
        .finally(() => {
            isLoading = false;
        });
}

function fetchVideos(url) {
    isLoading = true;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                if (response.status === 400) {
                    throw new Error('Invalid API request. Please check your YouTube API key.');
                } else if (response.status === 403) {
                    throw new Error('API quota exceeded or invalid API key. Please check your YouTube API key and quota limits.');
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            return response.json();
        })
        .then(data => {
            hideLoading();
            displayVideos(data);
            updateResultsCount(data.pageInfo?.totalResults || 0);
            showContentSection();
        })
        .catch(error => {
            console.error('Error fetching videos:', error);
            hideLoading();
            showError(error.message || 'Failed to fetch videos. Please check your API key and try again.');
        })
        .finally(() => {
            isLoading = false;
        });
}

function displayTrendingVideos(data) {
    if (!nextPageToken) {
        videoContainer.innerHTML = '';
    }

    nextPageToken = data.nextPageToken || '';

    if (data.items && data.items.length > 0) {
        data.items.forEach((item, index) => {
            const videoElement = createTrendingVideoElement(item, index);
            videoContainer.appendChild(videoElement);
        });

        // Show/hide load more button
        if (nextPageToken) {
            loadMoreBtn.classList.add('visible');
        } else {
            loadMoreBtn.classList.remove('visible');
        }
    } else {
        showNoResults();
    }
}

function displayVideos(data) {
    if (!nextPageToken) {
        videoContainer.innerHTML = '';
    }

    nextPageToken = data.nextPageToken || '';

    if (data.items && data.items.length > 0) {
        data.items.forEach((item, index) => {
            const videoElement = createVideoElement(item, index);
            videoContainer.appendChild(videoElement);
        });

        // Show/hide load more button
        if (nextPageToken) {
            loadMoreBtn.classList.add('visible');
        } else {
            loadMoreBtn.classList.remove('visible');
        }
    } else {
        showNoResults();
    }
}

function createTrendingVideoElement(item, index) {
    const videoId = item.id;
    const videoTitle = item.snippet.title;
    const videoThumbnail = item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url;
    const channelTitle = item.snippet.channelTitle;
    const publishedAt = formatDate(item.snippet.publishedAt);
    const viewCount = item.statistics?.viewCount ? formatViewCount(item.statistics.viewCount) : '';

    const videoElement = document.createElement('div');
    videoElement.classList.add('video-card');
    videoElement.style.animationDelay = `${index * 0.1}s`;

    videoElement.innerHTML = `
        <div class="video-thumbnail" onclick="playVideo('${videoId}', '${escapeHtml(videoTitle)}')">
            <img src="${videoThumbnail}" alt="${escapeHtml(videoTitle)}" loading="lazy">
            <div class="video-overlay">
                <i class="fas fa-play-circle play-icon"></i>
            </div>
            <div class="video-duration">12:34</div>
        </div>
        <div class="video-info">
            <div class="channel-avatar">
                <img src="https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&dpr=1" alt="Channel">
            </div>
            <div class="video-details">
                <h4 class="video-title" onclick="playVideo('${videoId}', '${escapeHtml(videoTitle)}')">${escapeHtml(videoTitle)}</h4>
                <div class="video-meta">
                    <span class="video-channel">${escapeHtml(channelTitle)}</span>
                    <div class="video-stats">
                        <span class="video-views">${viewCount} views</span>
                        <span class="video-date">${publishedAt}</span>
                    </div>
                </div>
            </div>
            <div class="video-actions">
                <button class="action-btn" onclick="addToWatchLater('${videoId}')" title="Watch Later">
                    <i class="fas fa-clock"></i>
                </button>
                <button class="action-btn" onclick="addToPlaylist('${videoId}')" title="Add to Playlist">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="action-btn" onclick="showVideoOptions('${videoId}')" title="More Options">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
        </div>
    `;

    return videoElement;
}

function createVideoElement(item, index) {
    const videoId = item.id.videoId;
    const videoTitle = item.snippet.title;
    const videoThumbnail = item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url;
    const channelTitle = item.snippet.channelTitle;
    const publishedAt = formatDate(item.snippet.publishedAt);

    const videoElement = document.createElement('div');
    videoElement.classList.add('video-card');
    videoElement.style.animationDelay = `${index * 0.1}s`;

    videoElement.innerHTML = `
        <div class="video-thumbnail" onclick="playVideo('${videoId}', '${escapeHtml(videoTitle)}')">
            <img src="${videoThumbnail}" alt="${escapeHtml(videoTitle)}" loading="lazy">
            <div class="video-overlay">
                <i class="fas fa-play-circle play-icon"></i>
            </div>
            <div class="video-duration">12:34</div>
        </div>
        <div class="video-info">
            <div class="channel-avatar">
                <img src="https://images.pexels.com/photos/771742/pexels-photo-771742.jpeg?auto=compress&cs=tinysrgb&w=40&h=40&dpr=1" alt="Channel">
            </div>
            <div class="video-details">
                <h4 class="video-title" onclick="playVideo('${videoId}', '${escapeHtml(videoTitle)}')">${escapeHtml(videoTitle)}</h4>
                <div class="video-meta">
                    <span class="video-channel">${escapeHtml(channelTitle)}</span>
                    <div class="video-stats">
                        <span class="video-date">${publishedAt}</span>
                    </div>
                </div>
            </div>
            <div class="video-actions">
                <button class="action-btn" onclick="addToWatchLater('${videoId}')" title="Watch Later">
                    <i class="fas fa-clock"></i>
                </button>
                <button class="action-btn" onclick="addToPlaylist('${videoId}')" title="Add to Playlist">
                    <i class="fas fa-plus"></i>
                </button>
                <button class="action-btn" onclick="showVideoOptions('${videoId}')" title="More Options">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
        </div>
    `;

    return videoElement;
}

// Video Player Functions
function playVideo(videoId, title) {
    currentPlayingVideoId = videoId;

    const modal = document.getElementById('video-modal');
    const player = document.getElementById('video-player');
    const titleElement = document.getElementById('video-title-modal');

    player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    titleElement.textContent = title;
    modal.classList.add('show');

    // Add to watch history
    const history = getSavedData('watchHistory');
    const videoEntry = { id: videoId, title: title, timestamp: Date.now() };

    // Avoid duplicates
    if (!history.some(v => v.id === videoId)) {
        saveData('watchHistory', [videoEntry, ...history].slice(0, 50)); // Limit to 50
    }

    document.body.style.overflow = 'hidden';
}



function showHistory() {
    updateActiveNavItem('history');
    hideHeroSection();
    showLoading();
    clearResults();
    updateResultsTitle('Watch History');

    const history = getSavedData('watchHistory');
    hideLoading();

    if (history.length === 0) {
        videoContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-history" style="font-size: 48px;"></i>
                <h3>No watch history yet</h3>
                <p>Start watching videos and they'll appear here.</p>
            </div>`;
        return;
    }

    videoContainer.innerHTML = '';
    history.forEach((item, index) => {
        const videoElement = document.createElement('div');
        videoElement.classList.add('video-card');
        videoElement.style.animationDelay = `${index * 0.1}s`;
        videoElement.innerHTML = `
            <div class="video-thumbnail" onclick="playVideo('${item.id}', '${item.title}')">
                <img src="https://i.ytimg.com/vi/${item.id}/hqdefault.jpg" alt="${item.title}" loading="lazy">
                <div class="video-overlay"><i class="fas fa-play-circle play-icon"></i></div>
            </div>
            <div class="video-info">
                <div class="video-details">
                    <h4 class="video-title">${item.title}</h4>
                    <small>${new Date(item.timestamp).toLocaleString()}</small>
                    <br><br>
                    <button class="action-btn" onclick="removeFromHistory('${item.id}')">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                </div>
            </div>
        `;
        videoContainer.appendChild(videoElement);
    });
}

function removeFromHistory(videoId) {
    const history = getSavedData('watchHistory').filter(v => v.id !== videoId);
    saveData('watchHistory', history);
    showHistory(); // Refresh list
}


function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    const player = document.getElementById('video-player');

    player.src = '';
    modal.classList.remove('show');

    // Restore body scroll
    document.body.style.overflow = '';
}



function showVideoOptions(videoId) {
    showToast('More options coming soon!');
}

function toggleLike() {
    const likeBtn = document.querySelector('.like-btn');
    const videoTitle = document.getElementById('video-title-modal')?.textContent || 'Unknown Video';

    const likedVideos = getSavedData('likedVideos');
    const isLiked = likedVideos.some(v => v.id === currentPlayingVideoId);

    if (!isLiked) {
        likedVideos.push({ id: currentPlayingVideoId, title: videoTitle });
        saveData('likedVideos', likedVideos);
        showToast('Liked!');
        likeBtn.classList.add('active');
    } else {
        const updatedList = likedVideos.filter(v => v.id !== currentPlayingVideoId);
        saveData('likedVideos', updatedList);
        showToast('Like removed');
        likeBtn.classList.remove('active');
    }
}

function toggleDislike() {
    showToast('Dislike recorded');
}

function shareVideo() {
    if (navigator.share) {
        navigator.share({
            title: 'Check out this video!',
            url: window.location.href
        });
    } else {
        showToast('Share link copied to clipboard!');
    }
}

function saveToPlaylist() {
    showToast('Saved to playlist!');
}

// Filter and Sort Functions
function filterContent(filter) {
    currentFilter = filter;

    // Update active filter chip UI
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });
    event.target.classList.add('active');

    // Apply filter and reload content
    if (currentQuery === '') {
        loadTrendingVideos();
    } else {
        searchVideos();
    }
}

function setViewMode(mode) {
    currentViewMode = mode;

    // Update active view button
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Update video grid class
    videoContainer.className = `video-grid ${mode}-view`;
}

function sortResults(sortBy) {
    currentSort = sortBy;

    if (currentQuery) {
        // Re-fetch with new sort order
        if (currentQuery === 'trending') {
            loadTrendingVideos();
        } else {
            searchVideos();
        }
    }
}

// Utility Functions
function loadMoreVideos() {
    if (!nextPageToken || !currentQuery || isLoading) return;

    let url;
    if (currentQuery === 'trending') {
        url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=US&maxResults=24&pageToken=${nextPageToken}&key=${API_KEY}`;
        fetchTrendingVideos(url);
    } else {
        url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(currentQuery)}&key=${API_KEY}&type=video&maxResults=24&pageToken=${nextPageToken}&order=${currentSort}`;
        fetchVideos(url);
    }

    // Show loading state on button
    const btnText = loadMoreBtn.querySelector('.btn-text');
    const btnIcon = loadMoreBtn.querySelector('.btn-icon');
    const originalText = btnText.textContent;

    btnText.textContent = 'Loading...';
    btnIcon.className = 'fas fa-spinner fa-spin btn-icon';
    loadMoreBtn.disabled = true;

    // Reset button state
    setTimeout(() => {
        btnText.textContent = originalText;
        btnIcon.className = 'fas fa-chevron-down btn-icon';
        loadMoreBtn.disabled = false;
    }, 1000);
}

function showLoading() {
    loadingContainer.classList.add('visible');
}

function hideLoading() {
    loadingContainer.classList.remove('visible');
}

function showContentSection() {
    contentSection.classList.add('visible');
}

function hideHeroSection() {
    heroSection.style.display = 'none';
}

function clearResults() {
    videoContainer.innerHTML = '';
    loadMoreBtn.classList.remove('visible');
}

function updateResultsTitle(title) {
    document.querySelector('.results-title').textContent = title;
}

function updateResultsCount(count) {
    if (count > 0) {
        resultsCount.textContent = `${count.toLocaleString()} results`;
        resultsCount.style.display = 'block';
    } else {
        resultsCount.style.display = 'none';
    }
}

function showNoResults() {
    videoContainer.innerHTML = `
        <div class="no-results">
            <div class="no-results-icon">
                <i class="fas fa-search"></i>
            </div>
            <h3>No videos found</h3>
            <p>Try searching with different keywords or check your spelling.</p>
            <button class="retry-btn" onclick="showHome()">
                <i class="fas fa-home"></i>
                Back to Home
            </button>
        </div>
    `;
}

function showError(message) {
    videoContainer.innerHTML = `
        <div class="error-message">
            <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Oops! Something went wrong</h3>
            <p>${message}</p>
            <button onclick="location.reload()" class="retry-btn">
                <i class="fas fa-redo"></i>
                Try Again
            </button>
        </div>
    `;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        return 'Today';
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
        const years = Math.floor(diffDays / 365);
        return `${years} year${years > 1 ? 's' : ''} ago`;
    }
}

function formatViewCount(count) {
    const num = parseInt(count);
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Notification Functions
function toggleNotifications() {
    const panel = document.getElementById('notifications-panel');
    panel.classList.toggle('show');
}

function markAllRead() {
    document.querySelectorAll('.notification-item').forEach(item => {
        item.classList.remove('unread');
    });
    showToast('All notifications marked as read');
}

// Voice Search
function startVoiceSearch() {
    if ('webkitSpeechRecognition' in window) {
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = function () {
            document.querySelector('.voice-search-btn i').className = 'fas fa-microphone-slash';
            showToast('Listening...');
        };

        recognition.onresult = function (event) {
            const transcript = event.results[0][0].transcript;
            searchBar.value = transcript;
            searchVideos();
        };

        recognition.onend = function () {
            document.querySelector('.voice-search-btn i').className = 'fas fa-microphone';
        };

        recognition.start();
    } else {
        showToast('Voice search not supported in this browser');
    }
}

// Toast Notifications
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

// Footer Functions
function showHelp() {
    showToast('Help Center coming soon!');
}

function showGuidelines() {
    showToast('Community Guidelines coming soon!');
}

function showPrivacy() {
    showToast('Privacy Policy coming soon!');
}

function showTerms() {
    showToast('Terms of Service coming soon!');
}

function showCreatorHub() {
    showToast('Creator Hub coming soon!');
}

function showAnalytics() {
    showToast('Analytics coming soon!');
}

function showMonetization() {
    showToast('Monetization coming soon!');
}

function showResources() {
    showToast('Resources coming soon!');
}

function showUploadModal() {
    showToast('Upload feature coming soon!');
}

// Keyboard Shortcuts
document.addEventListener('keydown', function (e) {
    if (e.key === '/' && e.target !== searchBar) {
        e.preventDefault();
        searchBar.focus();
    }

    if (e.key === 'Escape') {
        if (document.getElementById('video-modal').classList.contains('show')) {
            closeVideoModal();
        } else if (e.target === searchBar) {
            searchBar.blur();
        }
    }

    if (e.key === 't' && e.ctrlKey) {
        e.preventDefault();
        toggleTheme();
    }
});

// Initialize intersection observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animationPlayState = 'running';
        }
    });
}, observerOptions);

// Observe video elements as they're added
const videoObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.classList.contains('video-card')) {
                observer.observe(node);
            }
        });
    });
});

videoObserver.observe(videoContainer, { childList: true });