document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    
    mobileMenuBtn.addEventListener('click', function() {
        sidebar.classList.toggle('active');
        mobileMenuBtn.innerHTML = sidebar.classList.contains('active') 
            ? '<i class="fas fa-times"></i>' 
            : '<i class="fas fa-bars"></i>';
    });

    // Theme toggle via icon
    const body = document.body;
    const themeIconContainer = document.querySelector('.header-icon.theme-icon');
    const themeBtns = document.querySelectorAll('.theme-btn');

    // Click on theme icon toggles between light/dark
    themeIconContainer.addEventListener('click', function() {
        const newTheme = body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';

        // Update body and localStorage
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);

        // Update icon inside
        const icon = this.querySelector('i');
        icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

        // Sync .theme-btn active states
        themeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme') === newTheme);
        });
    });

    // Theme buttons (optional manual selectors)
    themeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const theme = this.getAttribute('data-theme');

            themeBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            body.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);

            const themeIcon = document.querySelector('.header-icon.theme-icon i');
            themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        });
    });
}); 

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', savedTheme);
    const activeThemeBtn = document.querySelector(`.theme-btn[data-theme="${savedTheme}"]`);
    if (activeThemeBtn) {
        themeBtns.forEach(b => b.classList.remove('active'));
        activeThemeBtn.classList.add('active');
    }
    const currentIcon = document.querySelector('.header-icon.theme-icon i');
    currentIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

// mở nút menu ở điện thoại
document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const body = document.body;
    
    function toggleMenu() {
        sidebar.classList.toggle('active');
        body.classList.toggle('sidebar-active');
        
        // Đổi icon
        const icon = menuBtn.querySelector('i');
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-times');
    }
    
    // Mở/đóng menu
    menuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleMenu();
    });
    
    // Đóng menu khi click bên ngoài
    document.addEventListener('click', function(e) {
        if (!sidebar.contains(e.target)) {
            sidebar.classList.remove('active');
            body.classList.remove('sidebar-active');
            
            // Reset icon
            const icon = menuBtn.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
    
    // Tự động đóng khi resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            body.classList.remove('sidebar-active');
            
            // Reset icon
            const icon = menuBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
    });
});