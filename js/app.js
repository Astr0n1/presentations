// Main Application
class CourseManager {
    constructor() {
        this.init();
    }


    handleApiError(error) {
        console.error('API Error:', error);

        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            return {
                message: 'Network error: Cannot connect to the server. Please check your internet connection and try again.',
                type: 'network'
            };
        }

        if (error.message.includes('500')) {
            return {
                message: 'Server error: The server encountered an internal error. Please try again later.',
                type: 'server'
            };
        }

        if (error.message.includes('404')) {
            return {
                message: 'API endpoint not found. Please contact support.',
                type: 'not_found'
            };
        }

        return {
            message: error.message || 'An unexpected error occurred. Please try again.',
            type: 'unknown'
        };
    }

    async init() {
        try {
            // Load data first
            await AppData.loadData();

            // Then render the application
            this.render();

            // Add event listeners
            this.bindEvents();

            console.log('Course Manager initialized successfully');
        } catch (error) {
            console.error('Error initializing Course Manager:', error);
            this.renderError();
        }
    }

    render() {
        const root = document.getElementById('root');
        if (!root) {
            console.error('Root element not found');
            return;
        }

        root.innerHTML = `
            ${Components.createToastContainer()}
            ${Components.createMainContainer()}
            ${Components.createCourseModal()}
            ${Components.createLoadingSpinner()}
        `;
    }

    renderError() {
        const root = document.getElementById('root');
        root.innerHTML = `
            <div class="min-h-screen bg-gradient-soft flex items-center justify-center">
                <div class="text-center">
                    <h1 class="text-2xl font-bold text-red-600 mb-4">Error Loading Application</h1>
                    <p class="text-muted-foreground">Please check your internet connection and try again.</p>
                </div>
            </div>
        `;
    }

    // New method to update only courses and results count
    updateCourses() {
        const coursesContainer = document.getElementById('courses-container');
        const resultsCount = document.querySelector('.text-sm.text-muted-foreground');
        const courses = AppData.getCourses();

        if (coursesContainer) {
            // Remove all current course cards
            coursesContainer.innerHTML = '';

            // Add new course cards
            courses.forEach((course, index) => {
                const courseElement = this.createCourseElement(course, index);
                coursesContainer.appendChild(courseElement);
            });
        }

        if (resultsCount) {
            resultsCount.textContent = `${courses.length} result${courses.length !== 1 ? 's' : ''}`;
        }

        // Re-bind course card events after update
        this.addCourseCardListeners();
    }

    // New method to create course element
    createCourseElement(course, index) {
        const animationDelay = 0.3 + (index * 0.1);
        const currentView = AppData.getCurrentView();

        const courseDiv = document.createElement('div');

        if (currentView === 'list') {
            courseDiv.className = 'group relative bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-1 cursor-pointer animate-slide-up flex';
            courseDiv.style.animationDelay = `${animationDelay}s`;

            courseDiv.innerHTML = `
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
            `;
        } else {
            // Grid view
            courseDiv.className = 'group relative bg-card rounded-xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-500 hover:-translate-y-2 cursor-pointer animate-slide-up';
            courseDiv.style.animationDelay = `${animationDelay}s`;

            courseDiv.innerHTML = `
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
            `;
        }

        return courseDiv;
    }

    // New method to update container classes only
    updateContainerLayout() {
        const coursesContainer = document.getElementById('courses-container');
        const currentView = AppData.getCurrentView();

        if (coursesContainer) {
            // Remove all layout classes
            coursesContainer.classList.remove('space-y-4', 'grid', 'gap-6', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');

            // Add appropriate classes based on current view
            if (currentView === 'list') {
                coursesContainer.classList.add('space-y-4');
            } else {
                coursesContainer.classList.add('grid', 'gap-6', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'xl:grid-cols-4');
            }
        }
    }

    bindEvents() {
        // Add event listeners for interactive elements
        setTimeout(() => {
            this.addCourseCardListeners();
            this.addSearchListener();
            this.addNavigationListeners();
            this.addViewToggleListeners();
            this.addSortListeners();
            this.addCreateCourseListeners(); // New modal listeners
        }, 100);
    }

    addCourseCardListeners() {
        const courseCards = document.querySelectorAll('.group.relative.bg-card');
        courseCards.forEach(card => {
            card.addEventListener('click', () => {
                const courseTitle = card.querySelector('h3').textContent;
                console.log('Course card clicked:', courseTitle);
                // go to slides.php?name=courseTitle
                window.location.href = `slides.html?name=${encodeURIComponent(courseTitle)}`;
            });
        });
    }

    addSearchListener() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            // Debounced search function
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    const searchTerm = e.target.value;
                    console.log('Searching for:', searchTerm);
                    AppData.setSearchTerm(searchTerm);

                    // Only update courses and results count, not the entire page
                    this.updateCourses();
                }, 300);
            });

            // Clear search when X is clicked (if browser supports it)
            searchInput.addEventListener('search', (e) => {
                if (e.target.value === '') {
                    AppData.setSearchTerm('');
                    this.updateCourses();
                }
            });
        }
    }

    addNavigationListeners() {
        const navButtons = document.querySelectorAll('nav button');
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const navText = e.target.textContent;
                console.log('Navigation clicked:', navText);

                // Update active state without re-rendering
                navButtons.forEach(btn => {
                    btn.classList.remove('text-primary');
                    btn.classList.add('text-muted-foreground', 'hover:text-foreground');
                    const indicator = btn.querySelector('div');
                    if (indicator) indicator.remove();
                });

                e.target.classList.remove('text-muted-foreground', 'hover:text-foreground');
                e.target.classList.add('text-primary');
                e.target.innerHTML += '<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-slide-up"></div>';

                // Add navigation functionality here
            });
        });
    }

    addViewToggleListeners() {
        const gridViewBtn = document.getElementById('grid-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');

        if (gridViewBtn) {
            gridViewBtn.addEventListener('click', () => {
                AppData.setCurrentView('grid');
                // Only update container classes and course cards layout
                this.updateContainerLayout();
                this.updateCourses();
                this.updateViewToggleButtons();
            });
        }

        if (listViewBtn) {
            listViewBtn.addEventListener('click', () => {
                AppData.setCurrentView('list');
                // Only update container classes and course cards layout
                this.updateContainerLayout();
                this.updateCourses();
                this.updateViewToggleButtons();
            });
        }
    }

    // New method to update view toggle buttons state
    updateViewToggleButtons() {
        const gridViewBtn = document.getElementById('grid-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        const currentView = AppData.getCurrentView();

        if (gridViewBtn && listViewBtn) {
            // Reset both buttons
            gridViewBtn.className = gridViewBtn.className.replace(/bg-primary text-primary-foreground hover:bg-primary\/90|hover:bg-accent hover:text-accent-foreground/g, '');
            listViewBtn.className = listViewBtn.className.replace(/bg-primary text-primary-foreground hover:bg-primary\/90|hover:bg-accent hover:text-accent-foreground/g, '');

            // Set active state
            const baseClasses = 'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-md h-8 w-8 p-0 transition-all duration-300';

            if (currentView === 'grid') {
                gridViewBtn.className = `${baseClasses} bg-primary text-primary-foreground hover:bg-primary/90`;
                listViewBtn.className = `${baseClasses} hover:bg-accent hover:text-accent-foreground`;
            } else {
                listViewBtn.className = `${baseClasses} bg-primary text-primary-foreground hover:bg-primary/90`;
                gridViewBtn.className = `${baseClasses} hover:bg-accent hover:text-accent-foreground`;
            }
        }
    }

    addSortListeners() {
        const sortButton = document.getElementById('sort-button');
        const sortDropdown = document.getElementById('sort-dropdown');

        if (sortButton && sortDropdown) {
            // Toggle dropdown
            sortButton.addEventListener('click', (e) => {
                e.stopPropagation();
                sortDropdown.classList.toggle('hidden');
            });

            // Sort option selection
            const sortOptions = document.querySelectorAll('.sort-option');
            sortOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const sortValue = e.target.getAttribute('data-sort');
                    console.log('Sort by:', sortValue);
                    AppData.setCurrentSort(sortValue);
                    sortDropdown.classList.add('hidden');

                    // Update sort button text
                    const buttonContent = sortButton.querySelector('svg').outerHTML + ` ${sortValue}`;
                    sortButton.innerHTML = buttonContent;

                    // Only update courses, not the entire page
                    this.updateCourses();
                    this.updateSortDropdownOptions();
                });
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', () => {
                sortDropdown.classList.add('hidden');
            });

            // Prevent dropdown from closing when clicking inside
            sortDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
    }

    // New method to update sort dropdown options highlight
    updateSortDropdownOptions() {
        const sortOptions = document.querySelectorAll('.sort-option');
        const currentSort = AppData.getCurrentSort();

        sortOptions.forEach(option => {
            const sortValue = option.getAttribute('data-sort');
            if (sortValue === currentSort) {
                option.classList.add('bg-accent', 'text-accent-foreground');
                option.classList.remove('hover:bg-accent', 'hover:text-accent-foreground');
            } else {
                option.classList.remove('bg-accent', 'text-accent-foreground');
                option.classList.add('hover:bg-accent', 'hover:text-accent-foreground');
            }
        });
    }

    // New method for create course modal
    addCreateCourseListeners() {
        // Use the ID selector
        const createCourseBtn = document.getElementById('create-course-btn');
        const closeModalBtn = document.getElementById('close-modal');
        const cancelCreateBtn = document.getElementById('cancel-create');
        const modalBackdrop = document.querySelector('[data-modal-backdrop]');
        const createCourseForm = document.getElementById('create-course-form');
        const modal = document.getElementById('create-course-modal');

        console.log('Create course button found:', createCourseBtn);
        console.log('Modal found:', modal);

        // Open modal
        if (createCourseBtn) {
            createCourseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Create course button clicked');
                this.openCreateCourseModal();
            });
        } else {
            console.error('Create course button not found with ID');
        }

        // Close modal events
        const closeModal = () => this.closeCreateCourseModal();

        if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
        if (cancelCreateBtn) cancelCreateBtn.addEventListener('click', closeModal);
        if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

        // Form submission
        if (createCourseForm) {
            createCourseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateCourseSubmit(e);
            });
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                closeModal();
            }
        });
    }

    openCreateCourseModal() {
        const modal = document.getElementById('create-course-modal');
        const form = document.getElementById('create-course-form');

        console.log('Opening modal:', modal);
        console.log('Form found:', form);

        if (modal && form) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling

            // Clear form
            form.reset();

            // Focus on first input
            const firstInput = form.querySelector('input, textarea, select');
            if (firstInput) firstInput.focus();

            console.log('Modal opened successfully');
        } else {
            console.error('Modal or form not found');
        }
    }

    closeCreateCourseModal() {
        const modal = document.getElementById('create-course-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = ''; // Restore scrolling
        }
    }

    async handleCreateCourseSubmit(e) {
        e.preventDefault();

        // Get form values safely
        const courseNameInput = document.getElementById('course-name');
        const courseDescriptionInput = document.getElementById('course-description');
        const courseCategoryInput = document.getElementById('course-category');

        // Validate that elements exist
        if (!courseNameInput) {
            this.showToast('Form elements not found. Please refresh the page.', 'error');
            console.error('Course name input not found');
            return;
        }

        const courseData = {
            name: courseNameInput.value.trim(),
            description: courseDescriptionInput ? courseDescriptionInput.value.trim() : '',
            category: courseCategoryInput ? courseCategoryInput.value : 'programming',
            type: 'Course',
            lessons: 0,
            status: 'draft',
            author: 'You'
        };

        // Validate form
        if (!courseData.name) {
            this.showToast('Please enter a course name', 'error');
            courseNameInput.focus();
            return;
        }

        // Show loading spinner and disable submit button
        this.showLoadingSpinner(true);
        const submitButton = document.getElementById('submit-course');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = `
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Creating...
        `;
        }

        try {
            // Use the API service to create course
            const response = await ApiService.createCourse(courseData);
            console.log('API Response:', response); // Debug log

            // FIXED: Check for success in different possible response formats
            if (response && (response.success === true || response.status === 'success' || response.id)) {
                this.showToast('Course created successfully!', 'success');
                this.closeCreateCourseModal();

                // Get the course slug from response or generate from name
                const courseSlug = response.slug || response.data?.slug ||
                    courseData.name.toLowerCase().replace(/\s+/g, '-');

                // Redirect to slides page
                setTimeout(() => {
                    window.location.href = `slides.html?name=${encodeURIComponent(courseSlug)}`;
                }, 1000);

            } else {
                // API returned but with error message
                const errorMessage = response.message || response.error || 'Failed to create course. Please try again.';
                throw new Error(errorMessage);
            }

        } catch (error) {
            console.error('Error creating course:', error);

            // Handle different types of errors
            let errorMessage = 'Failed to create course. Please try again.';

            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error: Cannot connect to server. Please check your internet connection.';
            } else if (error.message.includes('500')) {
                errorMessage = 'Server error: Please try again later.';
            } else if (error.message.includes('404')) {
                errorMessage = 'API endpoint not found. Please contact support.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            this.showToast(errorMessage, 'error');

        } finally {
            this.showLoadingSpinner(false);
            // Re-enable submit button
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus h-4 w-4">
                    <path d="M5 12h14"></path>
                    <path d="M12 5v14"></path>
                </svg>
                Create Course
            `;
            }
        }
    }

    showLoadingSpinner(show) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            spinner.classList.toggle('hidden', !show);
        }
    }

    showToast(message, type = 'info') {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg text-white ${type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
                'bg-blue-500'
            }`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CourseManager();
});

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CourseManager, Components, AppData };
}


