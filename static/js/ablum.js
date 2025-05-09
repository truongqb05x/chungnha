const PhotoGallery = () => {
    // Demo data with additional fields
    const demoPhotos = [
        {
            id: 1,
            src: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
            caption: 'Món salad trộn đầy màu sắc',
            date: '2025-04-20T10:00:00Z',
            uploader: 'Lan',
            likes: 5,
            liked: false,
            tags: ['Lan', 'Minh'],
            comments: [
                { author: 'Minh', text: 'Nhìn ngon quá!', date: '2025-04-20T11:30:00Z' },
                { author: 'Hùng', text: 'Lần sau làm thêm nhé', date: '2025-04-20T12:15:00Z' }
            ],
            album: 'Bữa trưa'
        },
        {
            id: 2,
            src: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe',
            caption: 'Bữa tối cùng cả nhà',
            date: '2025-04-25T18:30:00Z',
            uploader: 'Minh',
            likes: 8,
            liked: true,
            tags: ['Cả nhà'],
            comments: [
                { author: 'Lan', text: 'Hôm nay vui quá!', date: '2025-04-25T19:45:00Z' }
            ],
            album: 'Bữa tối'
        },
        {
            id: 3,
            src: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
            caption: 'Pizza tự làm cuối tuần',
            date: '2025-04-28T19:00:00Z',
            uploader: 'Hùng',
            likes: 12,
            liked: false,
            tags: ['Hùng', 'Lan'],
            comments: [],
            album: 'Cuối tuần'
        },
        {
            id: 4,
            src: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187',
            caption: 'Bữa sáng healthy',
            date: '2025-05-01T08:15:00Z',
            uploader: 'Lan',
            likes: 7,
            liked: false,
            tags: ['Lan', 'Sáng'],
            comments: [
                { author: 'Minh', text: 'Công thức là gì vậy?', date: '2025-05-01T09:30:00Z' }
            ],
            album: 'Bữa sáng'
        },
        {
            id: 5,
            src: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543',
            caption: 'Bánh mì sandwich đơn giản',
            date: '2025-05-02T12:30:00Z',
            uploader: 'Minh',
            likes: 3,
            liked: true,
            tags: ['Minh', 'Nhanh'],
            comments: [],
            album: 'Bữa trưa'
        },
        {
            id: 6,
            src: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
            caption: 'Món tráng miệng hôm nay',
            date: '2025-05-02T19:45:00Z',
            uploader: 'Hùng',
            likes: 10,
            liked: false,
            tags: ['Hùng', 'Tráng miệng'],
            comments: [
                { author: 'Lan', text: 'Ngọt vừa phải, rất ngon!', date: '2025-05-02T20:15:00Z' },
                { author: 'Minh', text: 'Công thức chia sẻ nhé!', date: '2025-05-02T20:30:00Z' }
            ],
            album: 'Bữa tối'
        }
    ];

    const [photos, setPhotos] = React.useState(() => {
        const saved = localStorage.getItem('photos');
        return saved ? JSON.parse(saved) : demoPhotos;
    });
    const [caption, setCaption] = React.useState('');
    const [filter, setFilter] = React.useState('');
    const [sortBy, setSortBy] = React.useState('date-desc');
    const [activeAlbum, setActiveAlbum] = React.useState('Tất cả');
    const [viewerPhoto, setViewerPhoto] = React.useState(null);
    const [newTag, setNewTag] = React.useState('');
    const [commentText, setCommentText] = React.useState('');
    const [showUploadModal, setShowUploadModal] = React.useState(false);
    const [selectedFiles, setSelectedFiles] = React.useState([]);
    const [timeRange, setTimeRange] = React.useState('all');
    const [currentPage, setCurrentPage] = React.useState(1);
    const photosPerPage = 9;

    // Get unique albums
    const albums = ['Tất cả', ...new Set(photos.map(photo => photo.album))];

    React.useEffect(() => {
        localStorage.setItem('photos', JSON.stringify(photos));
    }, [photos]);

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const newPhotos = [];

        files.forEach((file, index) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    newPhotos.push({
                        id: Date.now() + index,
                        src: event.target.result,
                        caption: caption || `Ảnh ${index + 1}`,
                        date: new Date().toISOString(),
                        uploader: 'Người dùng',
                        likes: 0,
                        liked: false,
                        tags: [],
                        comments: [],
                        album: activeAlbum === 'Tất cả' ? 'Chung' : activeAlbum
                    });

                    // When all files are processed
                    if (index === files.length - 1) {
                        setPhotos([...newPhotos, ...photos]);
                        setCaption('');
                        setSelectedFiles([]);
                        setShowUploadModal(false);
                    }
                };
                reader.readAsDataURL(file);
            }
        });
    };

    const handleFolderUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Group by folder name (assuming folder is in file path)
        const folderGroups = {};
        files.forEach(file => {
            const pathParts = file.webkitRelativePath.split('/');
            const folderName = pathParts.length > 1 ? pathParts[0] : 'Chung';

            if (!folderGroups[folderName]) {
                folderGroups[folderName] = [];
            }
            folderGroups[folderName].push(file);
        });

        // Process each folder
        Object.entries(folderGroups).forEach(([folderName, folderFiles]) => {
            const newPhotos = [];

            folderFiles.forEach((file, index) => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        newPhotos.push({
                            id: Date.now() + index,
                            src: event.target.result,
                            caption: file.name.split('.')[0],
                            date: new Date().toISOString(),
                            uploader: 'Người dùng',
                            likes: 0,
                            liked: false,
                            tags: [],
                            comments: [],
                            album: folderName
                        });

                        if (index === folderFiles.length - 1) {
                            setPhotos(prev => [...newPhotos, ...prev]);
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        });

        setSelectedFiles([]);
    };

    const handleDelete = (id) => {
        setPhotos(photos.filter(photo => photo.id !== id));
        if (viewerPhoto && viewerPhoto.id === id) {
            setViewerPhoto(null);
        }
    };

    const toggleLike = (id) => {
        setPhotos(photos.map(photo => {
            if (photo.id === id) {
                return {
                    ...photo,
                    likes: photo.liked ? photo.likes - 1 : photo.likes + 1,
                    liked: !photo.liked
                };
            }
            return photo;
        }));
    };

    const addComment = (photoId, text) => {
        if (!text.trim()) return;

        setPhotos(photos.map(photo => {
            if (photo.id === photoId) {
                return {
                    ...photo,
                    comments: [
                        ...photo.comments,
                        {
                            author: 'Người dùng',
                            text: text.trim(),
                            date: new Date().toISOString()
                        }
                    ]
                };
            }
            return photo;
        }));

        setCommentText('');
    };

    const addTag = (photoId, tag) => {
        if (!tag.trim()) return;

        setPhotos(photos.map(photo => {
            if (photo.id === photoId) {
                return {
                    ...photo,
                    tags: [...photo.tags, tag.trim()]
                };
            }
            return photo;
        }));

        setNewTag('');
    };

    const removeTag = (photoId, tagToRemove) => {
        setPhotos(photos.map(photo => {
            if (photo.id === photoId) {
                return {
                    ...photo,
                    tags: photo.tags.filter(tag => tag !== tagToRemove)
                };
            }
            return photo;
        }));
    };

    const openPhotoViewer = (photo) => {
        setViewerPhoto(photo);
        document.body.style.overflow = 'hidden';
    };

    const closePhotoViewer = () => {
        setViewerPhoto(null);
        document.body.style.overflow = '';
    };

    const navigatePhotos = (direction) => {
        const currentIndex = filteredPhotos.findIndex(p => p.id === viewerPhoto.id);
        let newIndex;

        if (direction === 'prev') {
            newIndex = currentIndex - 1 < 0 ? filteredPhotos.length - 1 : currentIndex - 1;
        } else {
            newIndex = currentIndex + 1 >= filteredPhotos.length ? 0 : currentIndex + 1;
        }

        setViewerPhoto(filteredPhotos[newIndex]);
    };

    const filterByTimeRange = (photo) => {
        const now = new Date();
        const photoDate = new Date(photo.date);

        switch (timeRange) {
            case 'today':
                return photoDate.toDateString() === now.toDateString();
            case 'week':
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                return photoDate >= weekStart;
            case 'month':
                return photoDate.getMonth() === now.getMonth() &&
                    photoDate.getFullYear() === now.getFullYear();
            case 'year':
                return photoDate.getFullYear() === now.getFullYear();
            default:
                return true;
        }
    };

    const filteredPhotos = photos.filter(photo => {
        const matchesFilter = photo.caption.toLowerCase().includes(filter.toLowerCase()) ||
            photo.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase())) ||
            photo.uploader.toLowerCase().includes(filter.toLowerCase());
        const matchesAlbum = activeAlbum === 'Tất cả' || photo.album === activeAlbum;
        const matchesTimeRange = filterByTimeRange(photo);

        return matchesFilter && matchesAlbum && matchesTimeRange;
    });

    const sortedPhotos = [...filteredPhotos].sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
        if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
        if (sortBy === 'caption-asc') return a.caption.localeCompare(b.caption);
        if (sortBy === 'caption-desc') return b.caption.localeCompare(a.caption);
        if (sortBy === 'likes-desc') return b.likes - a.likes;
        if (sortBy === 'likes-asc') return a.likes - b.likes;
        if (sortBy === 'comments-desc') return b.comments.length - a.comments.length;
        return 0;
    });

    // Pagination
    const totalPages = Math.ceil(sortedPhotos.length / photosPerPage);
    const paginatedPhotos = sortedPhotos.slice(
        (currentPage - 1) * photosPerPage,
        currentPage * photosPerPage
    );

    // Stats
    const totalPhotos = photos.length;
    const totalLikes = photos.reduce((sum, photo) => sum + photo.likes, 0);
    const totalComments = photos.reduce((sum, photo) => sum + photo.comments.length, 0);

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="breadcrumb">
                <span className="breadcrumb-item">Bếp Chung</span>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-item font-medium text-[var(--primary)]">Thư viện ảnh</span>
            </div>

            {/* Stats Section */}
            <div className="bg-[var(--card-bg)] p-6 rounded-[var(--radius-md)] shadow-[var(--shadow-md)]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Thống kê ảnh</h2>
                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-[var(--text-light)]">Xem theo:</span>
                        <select
                            className="text-sm p-1 border rounded bg-[var(--bg)]"
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                        >
                            <option value="all">Tất cả thời gian</option>
                            <option value="today">Hôm nay</option>
                            <option value="week">Tuần này</option>
                            <option value="month">Tháng này</option>
                            <option value="year">Năm nay</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="stats-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-[var(--primary)]">{totalPhotos}</div>
                                <div className="text-[var(--text-light)]">Tổng ảnh</div>
                            </div>
                            <div className="stats-icon bg-[rgba(255,109,40,0.1)] text-[var(--primary)]">
                                <i className="fas fa-camera"></i>
                            </div>
                        </div>
                        <div className="mt-2 text-sm text-[var(--success)] flex items-center">
                            <i className="fas fa-arrow-up mr-1"></i> 12% so với tháng trước
                        </div>
                    </div>

                    <div className="stats-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-[var(--primary)]">{totalLikes}</div>
                                <div className="text-[var(--text-light)]">Lượt thích</div>
                            </div>
                            <div className="stats-icon bg-[rgba(239,68,68,0.1)] text-[var(--error)]">
                                <i className="fas fa-heart"></i>
                            </div>
                        </div>
                        <div className="mt-2 text-sm text-[var(--success)] flex items-center">
                            <i className="fas fa-arrow-up mr-1"></i> 8% so với tháng trước
                        </div>
                    </div>

                    <div className="stats-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-[var(--primary)]">{totalComments}</div>
                                <div className="text-[var(--text-light)]">Bình luận</div>
                            </div>
                            <div className="stats-icon bg-[rgba(58,152,185,0.1)] text-[var(--secondary)]">
                                <i className="fas fa-comment"></i>
                            </div>
                        </div>
                        <div className="mt-2 text-sm text-[var(--error)] flex items-center">
                            <i className="fas fa-arrow-down mr-1"></i> 5% so với tháng trước
                        </div>
                    </div>

                    <div className="stats-card">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-[var(--primary)]">{albums.length - 1}</div>
                                <div className="text-[var(--text-light)]">Album</div>
                            </div>
                            <div className="stats-icon bg-[rgba(255,184,48,0.1)] text-[var(--accent)]">
                                <i className="fas fa-folder"></i>
                            </div>
                        </div>
                        <div className="mt-2 text-sm text-[var(--success)] flex items-center">
                            <i className="fas fa-arrow-up mr-1"></i> 3 album mới
                        </div>
                    </div>
                </div>
            </div>

            {/* Album Navigation */}
            <div className="bg-[var(--card-bg)] p-6 rounded-[var(--radius-md)] shadow-[var(--shadow-md)]">
                <h2 className="text-xl font-semibold mb-4">Album ảnh</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div
                        className={`album-card p-4 rounded-[var(--radius-sm)] cursor-pointer transition-[var(--transition)] ${activeAlbum === 'Tất cả' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg)] hover:bg-[rgba(255,109,40,0.1)]'}`}
                        onClick={() => setActiveAlbum('Tất cả')}
                    >
                        <div className="flex flex-col items-center">
                            <div className="relative mb-2">
                                <div className="w-16 h-16 bg-[rgba(255,109,40,0.2)] rounded-[var(--radius-sm)] flex items-center justify-center">
                                    <i className="fas fa-images text-2xl text-[var(--primary)]"></i>
                                </div>
                            </div>
                            <span className="text-sm font-medium text-center">Tất cả</span>
                            <span className="text-xs text-[var(--text-light)]">{photos.length} ảnh</span>
                        </div>
                    </div>

                    {albums.filter(a => a !== 'Tất cả').map(album => {
                        const albumPhotos = photos.filter(p => p.album === album);
                        const coverPhoto = albumPhotos[0]?.src || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836';

                        return (
                            <div
                                key={album}
                                className={`album-card p-4 rounded-[var(--radius-sm)] cursor-pointer transition-[var(--transition)] ${activeAlbum === album ? 'bg-[var(--primary)] text-white' : 'bg-[var(--bg)] hover:bg-[rgba(255,109,40,0.1)]'}`}
                                onClick={() => setActiveAlbum(album)}
                            >
                                <div className="flex flex-col items-center">
                                    <div className="relative mb-2">
                                        <img
                                            src={coverPhoto}
                                            alt={album}
                                            className="w-16 h-16 object-cover rounded-[var(--radius-sm)]"
                                        />
                                        <div className="absolute inset-0 bg-black bg-opacity-20 rounded-[var(--radius-sm)] flex items-center justify-center">
                                            <span className="text-white text-xs font-bold">{albumPhotos.length}</span>
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-center">{album}</span>
                                    <span className="text-xs text-[var(--text-light)]">{albumPhotos.length} ảnh</span>
                                </div>
                            </div>
                        );
                    })}

                    <div
                        className="album-card p-4 rounded-[var(--radius-sm)] cursor-pointer transition-[var(--transition)] bg-[var(--bg)] hover:bg-[rgba(255,109,40,0.1)] border-2 border-dashed border-[var(--border)] flex flex-col items-center justify-center"
                        onClick={() => {
                            setShowUploadModal(true);
                            setActiveAlbum('Chung');
                        }}
                    >
                        <i className="fas fa-plus text-[var(--primary)] mb-1"></i>
                        <span className="text-sm font-medium">Tạo album mới</span>
                    </div>
                </div>
            </div>

            {/* Upload Section */}
            <div className="bg-[var(--card-bg)] p-6 rounded-[var(--radius-md)] shadow-[var(--shadow-md)]">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Tải ảnh lên</h2>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="bg-[var(--primary)] text-white px-4 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--primary-dark)] transition-[var(--transition)] flex items-center"
                        >
                            <i className="fas fa-plus mr-2"></i>Tải lên nhiều ảnh
                        </button>
                        <button
                            className="bg-[var(--secondary)] text-white px-4 py-2 rounded-[var(--radius-sm)] hover:bg-[#2c7d9a] transition-[var(--transition)] flex items-center"
                            onClick={() => document.getElementById('folder-upload').click()}
                        >
                            <i className="fas fa-folder-open mr-2"></i>Tải lên thư mục
                            <input
                                type="file"
                                id="folder-upload"
                                webkitdirectory="true"
                                directory="true"
                                style={{ display: 'none' }}
                                onChange={handleFolderUpload}
                            />
                        </button>
                    </div>
                </div>

                <div
                    id="drop-area"
                    className="drop-area"
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add('active');
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('active');
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('active');
                        if (e.dataTransfer.files.length > 0) {
                            setSelectedFiles(Array.from(e.dataTransfer.files));
                            setShowUploadModal(true);
                        }
                    }}
                    onClick={() => document.getElementById('file-upload').click()}
                >
                    <div className="flex flex-col items-center justify-center space-y-2">
                        <i className="fas fa-cloud-upload-alt text-4xl text-[var(--primary)]"></i>
                        <h3 className="text-lg font-medium">Kéo thả ảnh vào đây hoặc click để chọn</h3>
                        <p className="text-sm text-[var(--text-light)]">Hỗ trợ JPG, PNG, GIF (tối đa 10MB mỗi ảnh)</p>
                    </div>
                    <input
                        type="file"
                        id="file-upload"
                        accept="image/*"
                        multiple
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            if (e.target.files.length > 0) {
                                setSelectedFiles(Array.from(e.target.files));
                                setShowUploadModal(true);
                            }
                        }}
                    />
                </div>
            </div>

            {/* Filter and Sort Section */}
            <div className="bg-[var(--card-bg)] p-4 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)]">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo mô tả, tag, người tải lên..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="w-full p-3 pl-10 border border-[var(--border)] rounded-[var(--radius-sm)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                            />
                            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-light)]"></i>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="p-3 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--bg)]"
                        >
                            <option value="date-desc">Mới nhất</option>
                            <option value="date-asc">Cũ nhất</option>
                            <option value="caption-asc">Mô tả A-Z</option>
                            <option value="caption-desc">Mô tả Z-A</option>
                            <option value="likes-desc">Nhiều like nhất</option>
                            <option value="likes-asc">Ít like nhất</option>
                            <option value="comments-desc">Nhiều bình luận nhất</option>
                        </select>

                        <select
                            className="p-3 border border-[var(--border)] rounded-[var(--radius-sm)] bg-[var(--bg)]"
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                        >
                            <option value="all">Tất cả thời gian</option>
                            <option value="today">Hôm nay</option>
                            <option value="week">Tuần này</option>
                            <option value="month">Tháng này</option>
                            <option value="year">Năm nay</option>
                        </select>
                    </div>
                </div>

                {/* Selected filters */}
                {(filter || activeAlbum !== 'Tất cả' || timeRange !== 'all') && (
                    <div className="mt-3 flex items-center flex-wrap gap-2">
                        <span className="text-sm text-[var(--text-light)]">Bộ lọc:</span>
                        {filter && (
                            <div className="bg-[var(--primary)] text-white px-3 py-1 rounded-full text-sm flex items-center">
                                <span>Tìm kiếm: "{filter}"</span>
                                <button
                                    onClick={() => setFilter('')}
                                    className="ml-2 hover:text-white"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        )}
                        {activeAlbum !== 'Tất cả' && (
                            <div className="bg-[var(--secondary)] text-white px-3 py-1 rounded-full text-sm flex items-center">
                                <span>Album: {activeAlbum}</span>
                                <button
                                    onClick={() => setActiveAlbum('Tất cả')}
                                    className="ml-2 hover:text-white"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        )}
                        {timeRange !== 'all' && (
                            <div className="bg-[var(--accent)] text-white px-3 py-1 rounded-full text-sm flex items-center">
                                <span>Thời gian: {
                                    timeRange === 'today' ? 'Hôm nay' :
                                        timeRange === 'week' ? 'Tuần này' :
                                            timeRange === 'month' ? 'Tháng này' : 'Năm nay'
                                }</span>
                                <button
                                    onClick={() => setTimeRange('all')}
                                    className="ml-2 hover:text-white"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Photo Grid */}
            <div className="mb-6">
                {sortedPhotos.length === 0 ? (
                    <div className="bg-[var(--card-bg)] p-12 rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] text-center">
                        <i className="fas fa-images text-5xl text-[var(--text-light)] mb-4"></i>
                        <h3 className="text-xl font-medium text-[var(--text)] mb-2">Không có ảnh nào</h3>
                        <p className="text-[var(--text-light)] mb-4">Hãy tải lên ảnh đầu tiên của bạn!</p>
                        <button
                            onClick={() => setShowUploadModal(true)}
                            className="bg-[var(--primary)] text-white px-6 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--primary-dark)]"
                        >
                            <i className="fas fa-upload mr-2"></i>Tải ảnh lên
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedPhotos.map(photo => (
                                <div
                                    key={photo.id}
                                    className="photo-card bg-[var(--card-bg)] rounded-[var(--radius-md)] shadow-[var(--shadow-sm)] overflow-hidden"
                                >
                                    <div className="relative">
                                        <img
                                            src={photo.src}
                                            alt={photo.caption}
                                            className="w-full h-48 object-cover cursor-pointer"
                                            onClick={() => openPhotoViewer(photo)}
                                        />
                                        <div className="photo-actions">
                                            <button onClick={() => toggleLike(photo.id)}>
                                                <i className={`fas fa-heart ${photo.liked ? 'liked' : ''}`}></i>
                                            </button>
                                            <button onClick={() => openPhotoViewer(photo)}>
                                                <i className="fas fa-expand"></i>
                                            </button>
                                            <button onClick={() => handleDelete(photo.id)}>
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <p className="text-[var(--text)] font-medium">{photo.caption}</p>
                                        <div className="flex flex-wrap mt-2">
                                            {photo.tags.map(tag => (
                                                <span key={tag} className="tag">
                                                    {tag}
                                                    <span className="tag-remove" onClick={() => removeTag(photo.id, tag)}>
                                                        <i className="fas fa-times"></i>
                                                    </span>
                                                </span>
                                            ))}
                                        </div>
                                        <div className="photo-stats">
                                            <span><i className={`fas fa-heart ${photo.liked ? 'liked' : ''}`}></i> {photo.likes}</span>
                                            <span><i className="fas fa-comment"></i> {photo.comments.length}</span>
                                            <span className="text-sm text-[var(--text-lighter)] ml-auto">
                                                {new Date(photo.date).toLocaleDateString('vi-VN')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-8">
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-2 rounded-l-md border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] hover:bg-[var(--bg)] disabled:opacity-50"
                                    >
                                        <i className="fas fa-chevron-left"></i>
                                    </button>

                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`px-4 py-2 border-t border-b border-[var(--border)] ${currentPage === pageNum ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card-bg)] text-[var(--text)] hover:bg-[var(--bg)]'}`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-2 rounded-r-md border border-[var(--border)] bg-[var(--card-bg)] text-[var(--text)] hover:bg-[var(--bg)] disabled:opacity-50"
                                    >
                                        <i className="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 z-[99999] ">
                    <div className="bg-[var(--card-bg)] rounded-[var(--radius-md)] p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Tải lên ảnh mới</h3>
                            <button
                                onClick={() => {
                                    setShowUploadModal(false);
                                    setSelectedFiles([]);
                                }}
                                className="text-[var(--text-light)] hover:text-[var(--text)]"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <div className="mb-4">
                                    <label className="block mb-2 font-medium">Album:</label>
                                    <div className="flex gap-2">
                                        <select
                                            value={activeAlbum === 'Tất cả' ? 'Chung' : activeAlbum}
                                            onChange={(e) => setActiveAlbum(e.target.value)}
                                            className="flex-1 p-2 border border-[var(--border)] rounded-[var(--radius-sm)]"
                                        >
                                            {albums.filter(a => a !== 'Tất cả').map(album => (
                                                <option key={album} value={album}>{album}</option>
                                            ))}
                                        </select>
                                        <button
                                            className="bg-[var(--bg)] p-2 border border-[var(--border)] rounded-[var(--radius-sm)] hover:bg-[var(--primary)] hover:text-white"
                                            onClick={() => {
                                                const newAlbumName = prompt('Nhập tên album mới:');
                                                if (newAlbumName && !albums.includes(newAlbumName)) {
                                                    setActiveAlbum(newAlbumName);
                                                }
                                            }}
                                        >
                                            <i className="fas fa-plus"></i>
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <label className="block mb-2 font-medium">Mô tả chung (nếu có):</label>
                                    <textarea
                                        placeholder="Mô tả cho tất cả ảnh..."
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        className="w-full p-3 border border-[var(--border)] rounded-[var(--radius-sm)] min-h-[100px]"
                                    ></textarea>
                                </div>

                                <div className="mb-4">
                                    <label className="block mb-2 font-medium">Thêm tag chung (cách nhau bằng dấu phẩy):</label>
                                    <input
                                        type="text"
                                        placeholder="Ví dụ: Nhà mình, Bữa tối, Sinh nhật"
                                        className="w-full p-3 border border-[var(--border)] rounded-[var(--radius-sm)]"
                                    />
                                </div>

                                <div className="mb-4">
                                    <label className="block mb-2 font-medium">Chọn ảnh:</label>
                                    <div
                                        className="drop-area"
                                        onClick={() => document.getElementById('modal-file-upload').click()}
                                    >
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <i className="fas fa-cloud-upload-alt text-4xl text-[var(--primary)]"></i>
                                            <h3 className="text-lg font-medium">Chọn ảnh hoặc kéo thả vào đây</h3>
                                            <p className="text-sm text-[var(--text-light)]">Đã chọn {selectedFiles.length} ảnh</p>
                                        </div>
                                        <input
                                            type="file"
                                            id="modal-file-upload"
                                            accept="image/*"
                                            multiple
                                            style={{ display: 'none' }}
                                            onChange={(e) => setSelectedFiles(Array.from(e.target.files))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-1">
                                <h4 className="font-medium mb-3">Xem trước ảnh ({selectedFiles.length})</h4>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                                    {selectedFiles.length > 0 ? (
                                        selectedFiles.map((file, index) => (
                                            <div key={index} className="preview-item">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={file.name}
                                                    className="preview-thumbnail"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                                    <p className="text-xs text-[var(--text-light)]">{(file.size / 1024).toFixed(1)} KB</p>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedFiles(selectedFiles.filter((_, i) => i !== index))}
                                                    className="text-[var(--error)] hover:text-[var(--error)]"
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-[var(--text-light)]">
                                            <i className="fas fa-image text-3xl mb-2"></i>
                                            <p>Chưa có ảnh nào được chọn</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                                    <div className="flex justify-between mb-2">
                                        <span className="text-sm text-[var(--text-light)]">Tổng kích thước:</span>
                                        <span className="text-sm font-medium">
                                            {(selectedFiles.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024).toFixed(2))} MB
                                        </span>
                                    </div>
                                    <div className="flex justify-between mb-4">
                                        <span className="text-sm text-[var(--text-light)]">Số lượng ảnh:</span>
                                        <span className="text-sm font-medium">{selectedFiles.length}</span>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setShowUploadModal(false);
                                                setSelectedFiles([]);
                                            }}
                                            className="flex-1 px-4 py-2 rounded-[var(--radius-sm)] border border-[var(--border)] hover:bg-[var(--bg)]"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            onClick={() => {
                                                const event = { target: { files: selectedFiles } };
                                                handleFileUpload(event);
                                            }}
                                            className="flex-1 px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]"
                                            disabled={selectedFiles.length === 0}
                                        >
                                            <i className="fas fa-upload mr-2"></i>Tải lên
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Viewer */}
            {viewerPhoto && (
                <div className="photo-viewer active">
                    <button className="photo-viewer-close" onClick={closePhotoViewer}>
                        <i className="fas fa-times"></i>
                    </button>
                    <img id="viewer-image" src={viewerPhoto.src} alt={viewerPhoto.caption} />
                    <div id="viewer-caption" className="photo-viewer-caption">{viewerPhoto.caption}</div>
                    <div id="viewer-info" className="photo-viewer-info">
                        Tải lên bởi {viewerPhoto.uploader} vào {new Date(viewerPhoto.date).toLocaleString('vi-VN')} | Album: {viewerPhoto.album}
                    </div>
                    <div className="photo-viewer-nav">
                        <button id="prev-photo" onClick={() => navigatePhotos('prev')}>
                            <i className="fas fa-chevron-left"></i>
                        </button>
                        <button onClick={() => toggleLike(viewerPhoto.id)} className={viewerPhoto.liked ? 'liked' : ''}>
                            <i className="fas fa-heart"></i>
                        </button>
                        <button id="next-photo" onClick={() => navigatePhotos('next')}>
                            <i className="fas fa-chevron-right"></i>
                        </button>
                    </div>

                    {/* Tags */}
                    <div className="w-full max-w-md px-4">
                        <div className="flex flex-wrap mb-2">
                            {viewerPhoto.tags.map(tag => (
                                <span key={tag} className="tag">
                                    {tag}
                                    <span className="tag-remove" onClick={() => removeTag(viewerPhoto.id, tag)}>
                                        <i className="fas fa-times"></i>
                                    </span>
                                </span>
                            ))}
                        </div>
                        <div className="flex mb-4">
                            <input
                                type="text"
                                value={newTag}
                                onChange={(e) => setNewTag(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addTag(viewerPhoto.id, newTag)}
                                placeholder="Thêm tag..."
                                className="flex-1 p-2 border border-[var(--border)] rounded-l-[var(--radius-sm)]"
                            />
                            <button
                                onClick={() => addTag(viewerPhoto.id, newTag)}
                                className="bg-[var(--primary)] text-white px-3 rounded-r-[var(--radius-sm)]"
                            >
                                Thêm
                            </button>
                        </div>
                    </div>

                    {/* Comments */}
                    <div id="viewer-comments" className="comments-section w-full max-w-md px-4">
                        {viewerPhoto.comments.length > 0 ? (
                            viewerPhoto.comments.map((comment, index) => (
                                <div key={index} className="comment">
                                    <span className="comment-author">{comment.author}:</span>
                                    <span>{comment.text}</span>
                                    <div className="text-xs text-[var(--text-lighter)] mt-1">
                                        {new Date(comment.date).toLocaleString('vi-VN')}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-[var(--text-light)] text-center">Chưa có bình luận nào</p>
                        )}
                    </div>
                    <div className="comment-input w-full max-w-md">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addComment(viewerPhoto.id, commentText)}
                            placeholder="Viết bình luận..."
                            className="flex-1 p-2 border border-[var(--border)] rounded-l-[var(--radius-sm)]"
                        />
                        <button
                            onClick={() => addComment(viewerPhoto.id, commentText)}
                            className="bg-[var(--primary)] text-white px-3 rounded-r-[var(--radius-sm)]"
                        >
                            <i className="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

ReactDOM.render(<PhotoGallery />, document.getElementById('photo-gallery'));
