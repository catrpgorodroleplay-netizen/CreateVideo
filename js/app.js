class VideoHosting {
    constructor() {
        this.videos = [];
        this.currentCategory = 'all';
        this.init();
    }

    async init() {
        await this.loadVideos();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Поиск по Enter
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Форма добавления видео
        document.getElementById('videoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addVideo();
        });
    }

    async loadVideos(category = 'all') {
        try {
            this.showLoading();
            this.currentCategory = category;
            
            let url = `${SUPABASE_URL}/rest/v1/videos?select=*`;
            
            if (category !== 'all') {
                url += `&category=eq.${category}`;
            }
            
            url += `&order=created_at.desc`;

            const response = await fetch(url, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`
                }
            });

            if (!response.ok) {
                throw new Error('Ошибка загрузки видео');
            }

            this.videos = await response.json();
            this.displayVideos();
            
        } catch (error) {
            this.showError('Ошибка загрузки видео: ' + error.message);
        }
    }

    async searchVideos(query) {
        try {
            this.showLoading();
            
            const response = await fetch(
                `${SUPABASE_URL}/rest/v1/videos?select=*&title=ilike.%25${encodeURIComponent(query)}%25`,
                {
                    headers: {
                        'apikey': SUPABASE_KEY,
                        'Authorization': `Bearer ${SUPABASE_KEY}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Ошибка поиска');
            }

            this.videos = await response.json();
            this.displayVideos();
            
        } catch (error) {
            this.showError('Ошибка поиска: ' + error.message);
        }
    }

    displayVideos() {
        const grid = document.getElementById('videosGrid');
        
        if (this.videos.length === 0) {
            grid.innerHTML = '<div class="error">Видео не найдены</div>';
            return;
        }

        grid.innerHTML = this.videos.map(video => `
            <div class="video-card" onclick="videoApp.openVideo('${video.youtube_id}', '${this.escapeHtml(video.title)}', '${this.escapeHtml(video.channel_name)}', ${video.views})">
                <div class="thumbnail">
                    <img src="${video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`}" 
                         alt="${video.title}"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDMyMCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMjAiIGhlaWdodD0iMTgwIiBmaWxsPSIjMjcyNzI3Ii8+Cjx0ZXh0IHg9IjE2MCIgeT0iOTAiIGZpbGw9IiM2NjYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+UFJFVklFVzwvdGV4dD4KPC9zdmc+'">
                    <div class="duration">${video.duration || '--:--'}</div>
                </div>
                <div class="video-info">
                    <div class="channel-avatar">${video.channel_name ? video.channel_name.charAt(0).toUpperCase() : 'C'}</div>
                    <div class="video-details">
                        <div class="video-title">${video.title}</div>
                        <div class="channel-name">${video.channel_name}</div>
                        <div class="video-meta">${this.formatNumber(video.views || 0)} просмотров • ${this.formatDate(video.created_at)}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    openVideo(youtubeId, title, channel, views) {
        const modal = document.getElementById('videoModal');
        const player = document.getElementById('videoPlayer');
        const titleElement = document.getElementById('videoTitleModal');
        const viewsElement = document.getElementById('videoViewsModal');
        const channelElement = document.getElementById('channelNameModal');
        const avatarElement = document.getElementById('channelAvatarModal');

        // Создаем YouTube плеер
        player.innerHTML = `
            <iframe width="100%" height="100%" 
                    src="https://www.youtube.com/embed/${youtubeId}?autoplay=1" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
            </iframe>
        `;

        titleElement.textContent = title;
        viewsElement.textContent = `${this.formatNumber(views)} просмотров`;
        channelElement.textContent = channel;
        avatarElement.textContent = channel ? channel.charAt(0).toUpperCase() : 'C';

        modal.style.display = 'block';
    }

    closeVideo() {
        document.getElementById('videoModal').style.display = 'none';
        // Останавливаем видео
        const iframe = document.querySelector('#videoPlayer iframe');
        if (iframe) {
            iframe.src = iframe.src.replace('&autoplay=1', '');
        }
    }

    async addVideo() {
        try {
            const formData = {
                title: document.getElementById('videoTitle').value,
                youtube_id: document.getElementById('youtubeId').value,
                channel_name: document.getElementById('channelName').value,
                category: document.getElementById('videoCategory').value,
                description: document.getElementById('videoDescription').value,
                views: Math.floor(Math.random() * 100000),
                duration: '10:30',
                thumbnail_url: `https://img.youtube.com/vi/${document.getElementById('youtubeId').value}/hqdefault.jpg`
            };

            const response = await fetch(`${SUPABASE_URL}/rest/v1/videos`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Ошибка добавления видео');
            }

            this.closeUploadForm();
            await this.loadVideos(this.currentCategory);
            alert('Видео успешно добавлено!');
            
        } catch (error) {
            alert('Ошибка добавления видео: ' + error.message);
        }
    }

    showUploadForm() {
        document.getElementById('uploadModal').style.display = 'block';
    }

    closeUploadForm() {
        document.getElementById('uploadModal').style.display = 'none';
        document.getElementById('videoForm').reset();
    }

    performSearch() {
        const query = document.getElementById('searchInput').value.trim();
        if (query) {
            this.searchVideos(query);
        }
    }

    loadHomePage() {
        this.loadVideos('all');
        this.updateActiveNav('home');
    }

    loadTrending() {
        this.loadVideos('all');
        this.updateActiveNav('trending');
    }

    loadCategory(category) {
        this.loadVideos(category);
        this.updateActiveNav(category);
    }

    updateActiveNav(activeItem) {
        // Обновляем активные элементы навигации
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelectorAll('.category-filter').forEach(item => {
            item.classList.remove('active');
        });
    }

    showLoading() {
        document.getElementById('videosGrid').innerHTML = '<div class="loading">Загрузка видео...</div>';
    }

    showError(message) {
        document.getElementById('videosGrid').innerHTML = `<div class="error">${message}</div>`;
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + ' млн';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + ' тыс';
        }
        return num;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (days === 0) return 'сегодня';
        if (days === 1) return 'вчера';
        if (days < 7) return `${days} дней назад`;
        if (days < 30) return `${Math.floor(days / 7)} недель назад`;
        return `${Math.floor(days / 30)} месяцев назад`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация приложения
const videoApp = new VideoHosting();

// Закрытие модальных окон по клику вне контента
window.onclick = function(event) {
    const videoModal = document.getElementById('videoModal');
    const uploadModal = document.getElementById('uploadModal');
    
    if (event.target === videoModal) {
        videoApp.closeVideo();
    }
    if (event.target === uploadModal) {
        videoApp.closeUploadForm();
    }
        }
