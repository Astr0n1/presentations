// get user data from local storage user_data -> role
const user = JSON.parse(localStorage.getItem('user_data'));

if (user === null || user === undefined || user === ''){
    window.location.href = 'login.html';
}


// UI Components - All classes kept exactly as original
const Components = {


    // Main Container
    createMainContainer() {
        return `
            <div class="min-h-screen bg-gradient-soft" onload="${user.role === "admin"? "requireAdmin()": "requireAuth()"}">
                ${this.createHeader()}
                ${this.createMainContent()}
                ${this.createCourseModal()}
                ${this.createStudentDetailsModal()}  <!-- Add this line -->
                ${this.createLoadingSpinner()}
            </div>
        `;
    },

    // Toast Container
    createToastContainer() {
        return `
            <div role="region" aria-label="Notifications (F8)" tabindex="-1" style="pointer-events: none;">
                <ol tabindex="-1" class="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
                </ol>
            </div>
            <section aria-label="Notifications alt+T" tabindex="-1" aria-live="polite" aria-relevant="additions text" aria-atomic="false"></section>
        `;
    },


    // Header
    createHeader() {
        return `
        <header class="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm animate-slide-up">
            <div class="container mx-auto px-4 py-4">
                <div class="flex items-center justify-between">
                    <h1 class="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Content</h1>
                    <div class="flex items-center gap-3 animate-slide-in-right">
                    ${user.role === 'admin' ? `<button id="create-course-btn" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary hover:bg-primary/90 h-10 px-4 py-2 gap-2 gradient-primary text-white shadow-button hover:shadow-card-hover transition-all duration-300 hover:scale-105">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus h-4 w-4">
                                                        <path d="M5 12h14"></path>
                                                        <path d="M12 5v14"></path>
                                                    </svg>
                                                    Create course
                                                </button>`: ``}
                    </div>
                </div>
            </div>
        </header>
    `;
    },

    // Navigation
    createNavigation(navigationItems) {
        const navItems = navigationItems.map(item => `
            <button class="pb-4 px-1 text-sm font-medium transition-all duration-300 relative ${item.active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}" data="${item.name}">
                ${item.name}
                ${item.active ? '<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-slide-up"></div>' : ''}
            </button>
        `).join('');

        if (user.role === 'admin') {

        return `
            <nav class="mb-8 animate-fade-in" style="animation-delay: 0.1s;">
                <div class="border-b">
                    <div class="flex gap-8">
                        ${navItems}
                    </div>
                </div>
            </nav>
        `;
        } else {
            return ``;
        }
    },

    // Search and Filters
    createSearchFilters(filters) {
        const currentSort = AppData.getCurrentSort();
        const searchTerm = AppData.getSearchTerm();
        const courses = AppData.getCourses();
        const currentView = AppData.getCurrentView();

        return `
            <div class="mb-8 flex items-center gap-4 animate-fade-in" style="animation-delay: 0.2s;" id="search-bar">
                <div class="relative flex-1 max-w-md">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.3-4.3"></path>
                    </svg>
                    <input 
                        id="search-input"
                        value="${searchTerm}"
                        class="flex h-10 w-full rounded-md border px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10 bg-card border-border focus:ring-2 focus:ring-primary/20 transition-all duration-300" 
                        placeholder="${filters.searchPlaceholder}"
                    >
                </div>
                <div class="flex-1"></div>
                <div class="flex items-center gap-3">
                    <span class="text-sm text-muted-foreground">${courses.length} result${courses.length !== 1 ? 's' : ''}</span>
                    <div class="relative">
                        <button id="sort-button" class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 gap-2 hover:shadow-button transition-all duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-down h-4 w-4">
                                <path d="m21 16-4 4-4-4"></path>
                                <path d="M17 20V4"></path>
                                <path d="m3 8 4-4 4 4"></path>
                                <path d="M7 4v16"></path>
                            </svg>
                            ${currentSort}
                        </button>
                        <div id="sort-dropdown" class="hidden absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-md shadow-lg z-10">
                            ${filters.sortOptions.map(option => `
                                <button class="sort-option w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors duration-200 ${option === currentSort ? 'bg-accent text-accent-foreground' : ''}" data-sort="${option}">
                                    ${option}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                    <div class="flex gap-1 border rounded-lg p-1">
                        <button id="grid-view-btn" class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ${currentView === 'grid' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-accent hover:text-accent-foreground'} rounded-md h-8 w-8 p-0 transition-all duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grid3x3 h-4 w-4">
                                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                                <path d="M3 9h18"></path>
                                <path d="M3 15h18"></path>
                                <path d="M9 3v18"></path>
                                <path d="M15 3v18"></path>
                            </svg>
                        </button>
                        <button id="list-view-btn" class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ${currentView === 'list' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-accent hover:text-accent-foreground'} rounded-md h-8 w-8 p-0 transition-all duration-300">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list h-4 w-4">
                                <path d="M3 12h.01"></path>
                                <path d="M3 18h.01"></path>
                                <path d="M3 6h.01"></path>
                                <path d="M8 12h13"></path>
                                <path d="M8 18h13"></path>
                                <path d="M8 6h13"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Create Course Modal
    createCourseModal() {
        return `
            <div id="create-course-modal" class="fixed inset-0 z-50 flex items-center justify-center hidden">
                <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" data-modal-backdrop></div>
                <div class="relative bg-card rounded-xl shadow-xl w-full max-w-md mx-4 animate-slide-up">
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-xl font-semibold">Create New Course</h2>
                            <button id="close-modal" class="rounded-lg p-2 hover:bg-muted transition-colors duration-200">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x h-5 w-5">
                                    <path d="M18 6 6 18"></path>
                                    <path d="m6 6 12 12"></path>
                                </svg>
                            </button>
                        </div>
                        
                        <form id="create-course-form" class="space-y-4">
                            <div>
                                <label for="course-name" class="block text-sm font-medium mb-2">Course Name</label>
                                <input 
                                    type="text" 
                                    id="course-name" 
                                    required
                                    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Enter course name"
                                >
                            </div>
                            
                            <div>
                                <label for="course-description" class="block text-sm font-medium mb-2">Description</label>
                                <textarea 
                                    id="course-description" 
                                    rows="3"
                                    class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Enter course description"
                                ></textarea>
                            </div>
                            
                            <div class="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    id="cancel-create"
                                    class="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 transition-all duration-300"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    id="submit-course"
                                    class="flex-1 inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 gap-2 gradient-primary text-white shadow-button hover:shadow-card-hover transition-all duration-300"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus h-4 w-4">
                                        <path d="M5 12h14"></path>
                                        <path d="M12 5v14"></path>
                                    </svg>
                                    Create Course
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    },

    // Loading Spinner
    createLoadingSpinner() {
        return `
            <div id="loading-spinner" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm hidden">
                <div class="bg-card rounded-xl p-6 shadow-xl">
                    <div class="flex items-center gap-3">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span class="text-sm font-medium">Creating course...</span>
                    </div>
                </div>
            </div>
        `;
    },

    // Course Card
    createCourseCard(course, index) {
        const animationDelay = 0.3 + (index * 0.1);
        const currentView = AppData.getCurrentView();

        // check if course.cover is empty string

        if (course.cover || course.cover === undefined || course.cover === 'undefined') {
            if (currentView === 'list') {
                return `
                <div class="group relative bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-1 cursor-pointer animate-slide-up flex" style="animation-delay: ${animationDelay}s;">
                    <div class="w-48 gradient-card relative overflow-hidden flex-shrink-0" style="${course.cover ? `background-image: url(${course.cover}); background-size: cover; background-position: center; background-repeat: no-repeat;` : ''}">
                        <div class="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-all duration-500"></div>
                        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open h-12 w-12 text-white/30 animate-float">
                                <path d="M12 7v14"></path>
                                <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="p-5 bg-card flex-1">
                        <div class="flex items-start gap-2 mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open h-4 w-4 text-primary mt-1 flex-shrink-0">
                                <path d="M12 7v14"></path>
                                <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                            </svg>
                            <div class="flex-1">
                                <span class="text-xs font-medium text-primary uppercase tracking-wide">${course.type}</span>
                                <h3 class="text-lg font-semibold mt-1 group-hover:text-primary transition-colors duration-300" dir="rtl">${course.title}</h3>
                                <p class="text-sm text-muted-foreground mt-1">${course.description}</p>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-4 border-t border-border">
                            <div class="flex items-center gap-4 text-sm text-muted-foreground">
                                <div class="flex items-center gap-2">
                                    <div class="h-5 w-5 rounded bg-primary/10 flex items-center justify-center">
                                        <span class="text-xs font-medium text-primary">${course.author}</span>
                                    </div>
                                    <span>${course.author}</span>
                                </div>
                                <span class="flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open h-3 w-3">
                                        <path d="M12 7v14"></path>
                                        <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                                    </svg>
                                    ${course.lessons} Lesson${course.lessons !== 1 ? 's' : ''}
                                </span>
                                <span class="text-xs text-muted-foreground">Modified: ${course.lastModified}</span>
                            </div>
                            <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${course.status === 'published' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'} transition-colors duration-300">
                                ${course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                            </div>
                        </div>
                    </div>
                    <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    </div>
                </div>
            `;
            } else {
                // Grid view (original)
                return `
                <div class="group relative bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 cursor-pointer animate-slide-up" style="animation-delay: ${animationDelay}s;"> 
                    <div class="h-48 gradient-card relative overflow-hidden" style="background-image: url(${course.cover}); background-size: cover; background-position: center; background-repeat: no-repeat;">
                        <div class="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-all duration-500"></div>
                        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open h-16 w-16 text-white/30 animate-float">
                                <path d="M12 7v14"></path>
                                <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="p-5 bg-card">
                        <div class="flex items-start gap-2 mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open h-4 w-4 text-primary mt-1 flex-shrink-0">
                                <path d="M12 7v14"></path>
                                <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                            </svg>
                            <div class="flex-1">
                                <span class="text-xs font-medium text-primary uppercase tracking-wide">${course.type}</span>
                                <h3 class="text-lg font-semibold mt-1 group-hover:text-primary transition-colors duration-300" dir="rtl">${course.title}</h3>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-4 border-t border-border">
                            <div class="flex items-center gap-2 text-sm text-muted-foreground">
                                <div class="h-5 w-5 rounded bg-primary/10 flex items-center justify-center">
                                    <span class="text-xs font-medium text-primary">${course.author}</span>
                                </div>
                                <span class="flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open h-3 w-3">
                                        <path d="M12 7v14"></path>
                                        <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                                    </svg>
                                    ${course.lessons} Lesson${course.lessons !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${course.status === 'published' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'} transition-colors duration-300">
                                ${course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                            </div>
                        </div>
                    </div>
                    <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    </div>
                </div>
            `;
            }
        }
        else {
            if (currentView === 'list') {
                return `
                <div class="group relative bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-1 cursor-pointer animate-slide-up flex" style="animation-delay: ${animationDelay}s;">
                    <div class="w-48 gradient-card relative overflow-hidden flex-shrink-0" style="${course.cover ? `background-image: url(${course.cover}); background-size: cover; background-position: center; background-repeat: no-repeat;` : ''}">
                        <div class="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-all duration-500"></div>
                        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open h-12 w-12 text-white/30 animate-float">
                                <path d="M12 7v14"></path>
                                <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="p-5 bg-card flex-1">
                        <div class="flex items-start gap-2 mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open h-4 w-4 text-primary mt-1 flex-shrink-0">
                                <path d="M12 7v14"></path>
                                <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                            </svg>
                            <div class="flex-1">
                                <span class="text-xs font-medium text-primary uppercase tracking-wide">${course.type}</span>
                                <h3 class="text-lg font-semibold mt-1 group-hover:text-primary transition-colors duration-300" dir="rtl">${course.title}</h3>
                                <p class="text-sm text-muted-foreground mt-1">${course.description}</p>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-4 border-t border-border">
                            <div class="flex items-center gap-4 text-sm text-muted-foreground">
                                <div class="flex items-center gap-2">
                                    <div class="h-5 w-5 rounded bg-primary/10 flex items-center justify-center">
                                        <span class="text-xs font-medium text-primary">${course.author}</span>
                                    </div>
                                    <span>${course.author}</span>
                                </div>
                                <span class="flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open h-3 w-3">
                                        <path d="M12 7v14"></path>
                                        <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                                    </svg>
                                    ${course.lessons} Lesson${course.lessons !== 1 ? 's' : ''}
                                </span>
                                <span class="text-xs text-muted-foreground">Modified: ${course.lastModified}</span>
                            </div>
                            <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${course.status === 'published' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'} transition-colors duration-300">
                                ${course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                            </div>
                        </div>
                    </div>
                    <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    </div>
                </div>
            `;
            } else {
                // Grid view (original)
                return `
                <div class="group relative bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 cursor-pointer animate-slide-up" style="animation-delay: ${animationDelay}s;"> 
                    <div class="h-48 gradient-card relative overflow-hidden" style="${course.cover ? `background-image: url(${course.cover}); background-size: cover; background-position: center; background-repeat: no-repeat;` : ''}">
                        <div class="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-all duration-500"></div>
                        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)] opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open h-16 w-16 text-white/30 animate-float">
                                <path d="M12 7v14"></path>
                                <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                            </svg>
                        </div>
                    </div>
                    <div class="p-5 bg-card">
                        <div class="flex items-start gap-2 mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open h-4 w-4 text-primary mt-1 flex-shrink-0">
                                <path d="M12 7v14"></path>
                                <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                            </svg>
                            <div class="flex-1">
                                <span class="text-xs font-medium text-primary uppercase tracking-wide">${course.type}</span>
                                <h3 class="text-lg font-semibold mt-1 group-hover:text-primary transition-colors duration-300" dir="rtl">${course.title}</h3>
                            </div>
                        </div>
                        <div class="flex items-center justify-between pt-4 border-t border-border">
                            <div class="flex items-center gap-2 text-sm text-muted-foreground">
                                <div class="h-5 w-5 rounded bg-primary/10 flex items-center justify-center">
                                    <span class="text-xs font-medium text-primary">${course.author}</span>
                                </div>
                                <span class="flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open h-3 w-3">
                                        <path d="M12 7v14"></path>
                                        <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"></path>
                                    </svg>
                                    ${course.lessons} Lesson${course.lessons !== 1 ? 's' : ''}
                                </span>
                            </div>
                            <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${course.status === 'published' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'} transition-colors duration-300">
                                ${course.status.charAt(0).toUpperCase() + course.status.slice(1)}
                            </div>
                        </div>
                    </div>
                    <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    </div>
                </div>
            `;
            }
        }
    },

    // Courses Grid/List
    // In the createCoursesContainer method, add an ID:
    createCoursesContainer(courses) {
        const currentView = AppData.getCurrentView();
        const coursesHtml = courses.map((course, index) => this.createCourseCard(course, index)).join('');

        if (currentView === 'list') {
            return `
            <div id="courses-container" class="space-y-4">
                ${coursesHtml}
            </div>
        `;
        } else {
            return `
            <div id="courses-container" class="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                ${coursesHtml}
            </div>
        `;
        }
    },

    // In the createSearchFilters method, make sure the results count has a proper structure:
    createSearchFilters(filters) {
        const currentSort = AppData.getCurrentSort();
        const searchTerm = AppData.getSearchTerm();
        const courses = AppData.getCourses();
        const currentView = AppData.getCurrentView();

        return `
        <div class="mb-8 flex items-center gap-4 animate-fade-in" style="animation-delay: 0.2s;" id="search-bar">
            <div class="relative flex-1 max-w-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.3-4.3"></path>
                </svg>
                <input 
                    id="search-input"
                    value="${searchTerm}"
                    class="flex h-10 w-full rounded-md border px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10 bg-card border-border focus:ring-2 focus:ring-primary/20 transition-all duration-300" 
                    placeholder="${filters.searchPlaceholder}"
                >
            </div>
            <div class="flex-1"></div>
            <div class="flex items-center gap-3">
                <span class="text-sm text-muted-foreground">${courses.length} result${courses.length !== 1 ? 's' : ''}</span>
                <div class="relative">
                    <button id="sort-button" class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 gap-2 hover:shadow-button transition-all duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-up-down h-4 w-4">
                            <path d="m21 16-4 4-4-4"></path>
                            <path d="M17 20V4"></path>
                            <path d="m3 8 4-4 4 4"></path>
                            <path d="M7 4v16"></path>
                        </svg>
                        ${currentSort}
                    </button>
                    <div id="sort-dropdown" class="hidden absolute top-full right-0 mt-1 w-48 bg-card border border-border rounded-md shadow-lg z-10">
                        ${filters.sortOptions.map(option => `
                            <button class="sort-option w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors duration-200 ${option === currentSort ? 'bg-accent text-accent-foreground' : ''}" data-sort="${option}">
                                ${option}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="flex gap-1 border rounded-lg p-1">
                    <button id="grid-view-btn" class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ${currentView === 'grid' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-accent hover:text-accent-foreground'} rounded-md h-8 w-8 p-0 transition-all duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grid3x3 h-4 w-4">
                            <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                            <path d="M3 9h18"></path>
                            <path d="M3 15h18"></path>
                            <path d="M9 3v18"></path>
                            <path d="M15 3v18"></path>
                        </svg>
                    </button>
                    <button id="list-view-btn" class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ${currentView === 'list' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-accent hover:text-accent-foreground'} rounded-md h-8 w-8 p-0 transition-all duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list h-4 w-4">
                            <path d="M3 12h.01"></path>
                            <path d="M3 18h.01"></path>
                            <path d="M3 6h.01"></path>
                            <path d="M8 12h13"></path>
                            <path d="M8 18h13"></path>
                            <path d="M8 6h13"></path>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
    },

    // Student Container Component - FIXED VERSION
    createStudentContainer(students) {
        if (user.role !== 'admin'){
            return ``;
        }
        else {
            if (students.length > 0) {
                return `
                    <div id="student-container" class="hidden animate-fade-in">
                        <div class="mb-6">
                            <h2 class="text-2xl font-bold text-foreground mb-2">إدارة الطلاب</h2>
                            <p class="text-muted-foreground">عرض وإدارة جميع الطلاب المسجلين في النظام</p>
                        </div>
                        
                        ${this.createStudentFilters(students)}  <!-- Pass students parameter -->
                        ${this.createStudentsTable(students)}
                    </div>
                `;
            
            }
        }
        return ``;
    },

    // Student Filters - FIXED VERSION
    createStudentFilters(students) {  // Add students parameter
        return `
        <div class="mb-6 flex items-center justify-between animate-fade-in" style="animation-delay: 0.1s;">
            <div class="flex items-center gap-4">
                <div class="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.3-4.3"></path>
                    </svg>
                    <input 
                        id="student-search-input"
                        class="flex h-10 w-80 rounded-md border px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm pl-10 bg-card border-border focus:ring-2 focus:ring-primary/20 transition-all duration-300" 
                        placeholder="البحث عن طالب..."
                    >
                </div>
            </div>
            
            <div class="flex items-center gap-3">
                <span class="text-sm text-muted-foreground" id="student-count">${students.length} طالب</span>
                <button id="refresh-students" class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 rounded-md px-3 gap-2 hover:shadow-button transition-all duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw h-4 w-4">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                        <path d="M21 3v5h-5"></path>
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                        <path d="M3 21v-5h5"></path>
                    </svg>
                    تحديث
                </button>
            </div>
        </div>
    `;
    },

    // Students Table
    createStudentsTable(students) {
        // console.log(students);

        if (students.length === 0) {
            return `
            <div class="text-center py-12 bg-card rounded-lg border border-border animate-fade-in">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users mx-auto h-12 w-12 text-muted-foreground mb-4">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <h3 class="text-lg font-medium text-foreground mb-2">لا يوجد طلاب</h3>
                <p class="text-muted-foreground">لم يتم العثور على أي طلاب مسجلين في النظام.</p>
            </div>
        `;
        }

        return `
        <div class="bg-card rounded-lg border border-border overflow-hidden shadow-card animate-fade-in">
            <div class="overflow-scroll">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-border bg-muted/50">
                            <th class="text-right py-3 px-4 font-semibold text-foreground">الاسم</th>
                            <th class="text-right py-3 px-4 font-semibold text-foreground">البريد الإلكتروني</th>
                            <th class="text-right py-3 px-4 font-semibold text-foreground">النتيجة</th>
                            <th class="text-right py-3 px-4 font-semibold text-foreground">آخر تسجيل دخول</th>
                            <th class="text-right py-3 px-4 font-semibold text-foreground">تاريخ الإنشاء</th>
                            <th class="text-right py-3 px-4 font-semibold text-foreground">الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-border">
                        ${students.map((student, index) => this.createStudentRow(student, index)).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    },

    // Student Row
    createStudentRow(student, index) {
        const animationDelay = 0.2 + (index * 0.05);

        const formatDate = (dateString) => {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        };

        const formatDateTime = (dateString) => {
            if (!dateString) return '-';
            const date = new Date(dateString);
            return date.toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        return `
            <tr class="hover:bg-muted/30 transition-colors duration-200 animate-slide-up" style="animation-delay: ${animationDelay}s;">
                <td class="py-3 px-4">
                    <div class="flex items-center gap-3">
                        <div class="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold text-sm">
                            ${student.name ? student.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div class="text-right">
                            <div class="font-medium text-foreground">${student.name || 'غير معروف'}</div>
                            <div class="text-xs text-muted-foreground">ID: ${student.id}</div>
                        </div>
                    </div>
                </td>
                <td class="py-3 px-4 text-foreground">${student.email || '-'}</td>
                <td class="py-3 px-4">
                    <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${student.score >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                student.score >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    'bg-red-50 text-red-700 border-red-200'
            } border">
                        ${student.score || 0}%
                    </span>
                </td>
                <td class="py-3 px-4 text-muted-foreground">${formatDateTime(student.last_login)}</td>
                <td class="py-3 px-4 text-muted-foreground">${formatDate(student.created_at)}</td>
                <td class="py-3 px-4">
                    <div class="flex items-center justify-end gap-2">
                        <button class="student-action-btn view-student inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 gap-1 transition-all duration-200" data-student-id="${student.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye h-3 w-3">
                                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            عرض
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    // Update Main Content to include student container
    // Main Content - FIXED VERSION
    createMainContent() {
        return `
            <main class="container mx-auto px-4 py-8">
                ${this.createNavigation(AppData.getNavigation())}
                ${this.createSearchFilters(AppData.getFilters())}
                ${this.createCoursesContainer(AppData.getCourses())}
                ${this.createStudentContainer(AppData.getStudents())}  <!-- This should now work -->
            </main>
        `;
    },

    // Add this method to Components
    createStudentDetailsModal() {
        return `
            <div id="student-details-modal" class="fixed inset-0 z-50 flex items-center justify-center hidden">
                <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" data-student-modal-backdrop></div>
                <div class="relative bg-card rounded-xl shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] overflow-hidden animate-slide-up">
                    <div class="p-6 border-b border-border">
                        <div class="flex items-center justify-between">
                            <h2 class="text-xl font-semibold" id="student-modal-title">تفاصيل الطالب</h2>
                            <button id="close-student-modal" class="rounded-lg p-2 hover:bg-muted transition-colors duration-200">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x h-5 w-5">
                                    <path d="M18 6 6 18"></path>
                                    <path d="m6 6 12 12"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="p-6 overflow-auto max-h-[calc(90vh-120px)]">
                        <!-- Student Info Header -->
                        <div id="student-info-header" class="mb-6 p-4 bg-muted/30 rounded-lg">
                            <!-- Student info will be populated here -->
                        </div>
                        
                        <!-- close button -->
                        <button onclick="closeStudentModal()" class="inline-flex items-center justify-center whitespace-nowrap text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                        </button>
                        
                        <!-- Progress Stats -->
                        
                        <div id="student-stats" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <!-- Stats will be populated here -->
                        </div>
                        
                        <!-- Courses Progress Table -->
                        <div class="mb-4">
                            <h3 class="text-lg font-semibold mb-3">تقدم الطالب في الدورات</h3>
                            <div class="overflow-scroll">
                                <table class="w-full">
                                    <thead>
                                        <tr class="border-b border-border bg-muted/50">
                                            <th class="text-right py-3 px-4 font-semibold text-foreground">اسم الدورة</th>
                                            <th class="text-right py-3 px-4 font-semibold text-foreground">اسم الدرس</th>
                                            <th class="text-right py-3 px-4 font-semibold text-foreground">النتيجة</th>
                                            <th class="text-right py-3 px-4 font-semibold text-foreground">إجمالي الأسئلة</th>
                                            <th class="text-right py-3 px-4 font-semibold text-foreground">الإجابات الصحيحة</th>
                                            <th class="text-right py-3 px-4 font-semibold text-foreground">الشريحة</th>
                                            <th class="text-right py-3 px-4 font-semibold text-foreground">تاريخ الإكمال</th>
                                        </tr>
                                    </thead>
                                    <tbody id="student-progress-table" class="divide-y divide-border">
                                        <!-- Progress data will be populated here -->
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <!-- Empty State -->
                        <div id="student-progress-empty" class="hidden text-center py-8">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-list mx-auto h-12 w-12 text-muted-foreground mb-4">
                                <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect>
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <path d="M12 11h4"></path>
                                <path d="M12 16h4"></path>
                                <path d="M8 11h.01"></path>
                                <path d="M8 16h.01"></path>
                            </svg>
                            <h3 class="text-lg font-medium text-foreground mb-2">لا توجد بيانات تقدم</h3>
                            <p class="text-muted-foreground">لم يتم العثور على أي سجلات تقدم لهذا الطالب.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
};

// close Student Modal 
function closeStudentModal() {
    const studentModal = document.getElementById('student-details-modal');
    if (studentModal) {
        studentModal.classList.add('hidden');
    }

}