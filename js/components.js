// UI Components - All classes kept exactly as original
const Components = {
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

    // Main Container
    createMainContainer() {
        return `
            <div class="min-h-screen bg-gradient-soft">
                ${this.createHeader()}
                ${this.createMainContent()}
            </div>
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
                        <button id="create-course-btn" class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary hover:bg-primary/90 h-10 px-4 py-2 gap-2 gradient-primary text-white shadow-button hover:shadow-card-hover transition-all duration-300 hover:scale-105">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus h-4 w-4">
                                <path d="M5 12h14"></path>
                                <path d="M12 5v14"></path>
                            </svg>
                            Create course
                        </button>
                    </div>
                </div>
            </div>
        </header>
    `;
},

    // Navigation
    createNavigation(navigationItems) {
        const navItems = navigationItems.map(item => `
            <button class="pb-4 px-1 text-sm font-medium transition-all duration-300 relative ${item.active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}">
                ${item.name}
                ${item.active ? '<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-slide-up"></div>' : ''}
            </button>
        `).join('');

        return `
            <nav class="mb-8 animate-fade-in" style="animation-delay: 0.1s;">
                <div class="border-b">
                    <div class="flex gap-8">
                        ${navItems}
                    </div>
                </div>
            </nav>
        `;
    },

    // Search and Filters
    createSearchFilters(filters) {
        const currentSort = AppData.getCurrentSort();
        const searchTerm = AppData.getSearchTerm();
        const courses = AppData.getCourses();
        const currentView = AppData.getCurrentView();

        return `
            <div class="mb-8 flex items-center gap-4 animate-fade-in" style="animation-delay: 0.2s;">
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
        
        if (currentView === 'list') {
            return `
                <div class="group relative bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-1 cursor-pointer animate-slide-up flex" style="animation-delay: ${animationDelay}s;">
                    <div class="w-48 gradient-card relative overflow-hidden flex-shrink-0">
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
                    <div class="h-48 gradient-card relative overflow-hidden">
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
        <div class="mb-8 flex items-center gap-4 animate-fade-in" style="animation-delay: 0.2s;">
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

    // Main Content
    createMainContent() {
        return `
            <main class="container mx-auto px-4 py-8">
                ${this.createNavigation(AppData.getNavigation())}
                ${this.createSearchFilters(AppData.getFilters())}
                ${this.createCoursesContainer(AppData.getCourses())}
            </main>
        `;
    }
};