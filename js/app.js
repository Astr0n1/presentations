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

            // Debug: Check if students are loaded
            // console.log('Students after load:', AppData.getStudents());
            // console.log('Students length:', AppData.getStudents().length);

            // Then render the application
            this.render();

            // Add event listeners
            this.bindEvents();

            // console.log('Course Manager initialized successfully');
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
            this.addCreateCourseListeners();
            this.addStudentModalListeners(); // Add this line
        }, 100);
    }

    addCourseCardListeners() {
        const courseCards = document.querySelectorAll('.group.relative.bg-card');
        courseCards.forEach(card => {
            card.addEventListener('click', () => {
                const courseTitle = card.querySelector('h3').textContent;
                // console.log('Course card clicked:', courseTitle);
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
                    // console.log('Searching for:', searchTerm);
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
                const navText = e.target.getAttribute('data');
                // console.log('Navigation clicked:', navText);

                const coursesContainer = document.getElementById('courses-container');
                const searchBar = document.getElementById('search-bar');
                const studentContainer = document.getElementById('student-container');

                if (navText === 'الطلاب') {
                    // Show student container, hide courses
                    coursesContainer.classList.add('hidden');
                    searchBar.classList.add('hidden');
                    studentContainer.classList.remove('hidden');
                } else if (navText === 'الدورات') {
                    // Show courses, hide student container
                    coursesContainer.classList.remove('hidden');
                    searchBar.classList.remove('hidden');
                    studentContainer.classList.add('hidden');
                }

                // Update active state
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
                    // console.log('Sort by:', sortValue);
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

    addCreateCourseListeners() {
        // Use the ID selector
        const createCourseBtn = document.getElementById('create-course-btn');
        const closeModalBtn = document.getElementById('close-modal');
        const cancelCreateBtn = document.getElementById('cancel-create');
        const modalBackdrop = document.querySelector('[data-modal-backdrop]');
        const createCourseForm = document.getElementById('create-course-form');
        const modal = document.getElementById('create-course-modal');

        // console.log('Create course button found:', createCourseBtn);
        // console.log('Modal found:', modal);

        // Open modal
        if (createCourseBtn) {
            createCourseBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // console.log('Create course button clicked');
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

        // console.log('Opening modal:', modal);
        // console.log('Form found:', form);

        if (modal && form) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling

            // Clear form
            form.reset();

            // Focus on first input
            const firstInput = form.querySelector('input, textarea, select');
            if (firstInput) firstInput.focus();

            // console.log('Modal opened successfully');
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
            // console.log('API Response:', response); // Debug log

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

    // Add this method to the CourseManager class to handle student rendering
    renderStudents() {
        const studentContainer = document.getElementById('student-container');
        if (!studentContainer) return;

        const students = AppData.getStudents();
        // console.log('Rendering students:', students); // Debug log

        // Update student count
        const studentCount = document.getElementById('student-count');
        if (studentCount) {
            studentCount.textContent = `${students.length} طالب`;
        }

        // Update student table
        const studentTable = studentContainer.querySelector('tbody');
        if (studentTable && students.length > 0) {
            studentTable.innerHTML = students.map((student, index) =>
                Components.createStudentRow(student, index)
            ).join('');
        }

        // Add student event listeners
        this.addStudentEventListeners();
    }

    // Add this method to bind student events
    addStudentEventListeners() {
        // Refresh students button
        const refreshBtn = document.getElementById('refresh-students');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                try {
                    refreshBtn.disabled = true;
                    refreshBtn.innerHTML = `
                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    جاري التحديث...
                `;

                    await AppData.refreshStudents();
                    this.renderStudents();
                    this.showToast('تم تحديث بيانات الطلاب بنجاح', 'success');
                } catch (error) {
                    console.error('Error refreshing students:', error);
                    this.showToast('فشل في تحديث بيانات الطلاب', 'error');
                } finally {
                    refreshBtn.disabled = false;
                    refreshBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw h-4 w-4">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                        <path d="M21 3v5h-5"></path>
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                        <path d="M3 21v-5h5"></path>
                    </svg>
                    تحديث
                `;
                }
            });
        }

        // Student search functionality
        const studentSearchInput = document.getElementById('student-search-input');
        if (studentSearchInput) {
            let searchTimeout;
            studentSearchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filterStudents(e.target.value);
                }, 300);
            });
        }

        // Student action buttons
        this.bindStudentActionButtons();
    }

    // Add student filtering method
    filterStudents(searchTerm) {
        const students = AppData.getStudents();
        const filteredStudents = students.filter(student =>
            student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const studentTable = document.querySelector('#student-container tbody');
        if (studentTable) {
            if (filteredStudents.length === 0) {
                studentTable.innerHTML = `
                <tr>
                    <td colspan="6" class="py-8 text-center text-muted-foreground">
                        لا توجد نتائج مطابقة للبحث
                    </td>
                </tr>
            `;
            } else {
                studentTable.innerHTML = filteredStudents.map((student, index) =>
                    Components.createStudentRow(student, index)
                ).join('');
            }
        }

        // Update student count
        const studentCount = document.getElementById('student-count');
        if (studentCount) {
            studentCount.textContent = `${filteredStudents.length} طالب`;
        }

        this.bindStudentActionButtons();
    }

    // Add method to bind student action buttons
    bindStudentActionButtons() {
        // View student buttons
        const viewButtons = document.querySelectorAll('.view-student');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const studentId = btn.getAttribute('data-student-id');
                this.viewStudent(studentId);
            });
        });

        // Edit student buttons
        const editButtons = document.querySelectorAll('.edit-student');
        editButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const studentId = btn.getAttribute('data-student-id');
                this.editStudent(studentId);
            });
        });
    }

    // Add student view method
    // View student method - updated
    async viewStudent(studentId) {
        try {
            const students = AppData.getStudents();
            const student = students.find(s => s.id == studentId);

            if (student) {
                this.showToast(`جاري تحميل بيانات الطالب: ${student.name}`, 'info');

                // Show loading state
                this.showStudentModalLoading(true);

                // Open modal first
                this.openStudentModal(student);

                // Load student progress data
                const progressData = await this.loadStudentProgress(studentId);

                // Populate modal with data
                this.populateStudentModal(student, progressData);

            }
        } catch (error) {
            console.error('Error viewing student:', error);
            this.showToast('فشل في تحميل بيانات الطالب', 'error');
        }
    }

    // Load student progress data from API
    async loadStudentProgress(studentId) {
        try {
            const response = await fetch(`api/student-progress.php?student_id=${studentId}`);
            const data = await response.json();

            // console.log('Student progress API response:', data);

            // Handle the specific API response format
            if (data.status === 'success' && data.data && data.data.scores) {
                return data.data.scores;
            } else if (data.scores) {
                return data.scores;
            } else if (data.data) {
                return data.data;
            } else {
                console.warn('Unexpected API response format:', data);
                return [];
            }
        } catch (error) {
            console.error('Error loading student progress:', error);
            // Return mock data for demonstration
            return this.getMockProgressData(studentId);
        }
    }

    // Mock data for demonstration (remove when real API is available)
    getMockProgressData(studentId) {
        const courses = ['الروبوت الافتراضي', 'برمجة بايثون', 'الذكاء الاصطناعي', 'تعلم الآلة'];
        const lessons = ['المقدمة', 'الأساسيات', 'المتغيرات', 'الدوال', 'المشاريع'];

        return Array.from({ length: 8 }, (_, i) => ({
            course_name: courses[i % courses.length],
            lesson_name: lessons[i % lessons.length],
            score: Math.floor(Math.random() * 40) + 60, // 60-100
            total_questions: 10,
            correct_answers: Math.floor(Math.random() * 8) + 3, // 3-10
            created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            slide_n: (i % 5) + 1,
            course_id: (i % 4) + 1,
            lesson_id: (i % 5) + 1
        }));
    }

    // Open student modal
    openStudentModal(student) {
        const modal = document.getElementById('student-details-modal');
        if (modal) {
            modal.classList.remove('hidden');

            // Set basic student info
            const title = document.getElementById('student-modal-title');
            if (title) {
                title.textContent = `تفاصيل الطالب: ${student.name}`;
            }
        }
    }

    // Populate modal with student data
    populateStudentModal(student, progressData) {
        // Populate student info header
        this.populateStudentInfo(student);

        // Populate statistics
        this.populateStudentStats(progressData);

        // Populate progress table
        this.populateProgressTable(progressData);

        // Hide loading state
        this.showStudentModalLoading(false);
    }

    // Populate student information
    populateStudentInfo(student) {
        const header = document.getElementById('student-info-header');
        if (header) {
            header.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold text-xl">
                        ${student.name ? student.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div class="text-right">
                        <h3 class="text-xl font-semibold">${student.name || 'غير معروف'}</h3>
                        <p class="text-muted-foreground">${student.email || 'لا يوجد بريد إلكتروني'}</p>
                        <div class="flex items-center gap-4 mt-2 text-sm">
                            <span class="text-muted-foreground">ID: ${student.id}</span>
                            <span class="text-muted-foreground">آخر تسجيل دخول: ${this.formatDateTime(student.last_login)}</span>
                        </div>
                    </div>
                </div>
                <div class="text-left">
                    <span class="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${student.score >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                    student.score >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-red-50 text-red-700 border-red-200'
                } border">
                        النتيجة الإجمالية: ${student.score || 0}%
                    </span>
                </div>
            </div>
        `;
        }

        header.classList.add('hidden');
    }

    // Populate student statistics

    populateStudentStats(progressData) {
        const statsContainer = document.getElementById('student-stats');
        if (!statsContainer) return;

        const totalCourses = new Set(progressData.map(p => p.course_id)).size;
        const totalLessons = new Set(progressData.map(p => p.lesson_id)).size;
        const averageScore = progressData.length > 0
            ? Math.round(progressData.reduce((sum, p) => sum + (p.score * 100), 0) / progressData.length)
            : 0;
        const totalQuestions = progressData.reduce((sum, p) => sum + p.total_questions, 0);

        statsContainer.innerHTML = `
        <div class="bg-card border border-border rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-primary">${totalCourses}</div>
            <div class="text-sm text-muted-foreground">الدورات المسجلة</div>
        </div>
        <div class="bg-card border border-border rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-primary">${totalLessons}</div>
            <div class="text-sm text-muted-foreground">الدروس المكتملة</div>
        </div>
        <div class="bg-card border border-border rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-primary">${averageScore}%</div>
            <div class="text-sm text-muted-foreground">متوسط النتائج</div>
        </div>
        <div class="bg-card border border-border rounded-lg p-4 text-center">
            <div class="text-2xl font-bold text-primary">${totalQuestions}</div>
            <div class="text-sm text-muted-foreground">إجمالي الأسئلة</div>
        </div>
    `;
    }

    populateProgressTable(progressData) {
        const tableBody = document.getElementById('student-progress-table');
        const emptyState = document.getElementById('student-progress-empty');

        if (!tableBody || !emptyState) return;

        if (progressData.length === 0) {
            tableBody.innerHTML = '';
            emptyState.classList.remove('hidden');
            return;
        }

        emptyState.classList.add('hidden');

        tableBody.innerHTML = progressData.map((progress, index) => {
            // Convert score to percentage (if it's a decimal like 0.75 = 75%)
            const scorePercentage = progress.score <= 1 ? Math.round(progress.score * 100) : progress.score;

            return `
            <tr class="hover:bg-muted/30 transition-colors duration-200 animate-slide-up" style="animation-delay: ${0.1 + (index * 0.05)}s;">
                <td class="py-3 px-4 font-medium text-foreground">${progress.course_name}</td>
                <td class="py-3 px-4 text-foreground">${progress.lesson_name}</td>
                <td class="py-3 px-4">
                    <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${scorePercentage >= 80 ? 'bg-green-50 text-green-700 border-green-200' :
                    scorePercentage >= 60 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        'bg-red-50 text-red-700 border-red-200'
                } border">
                        ${scorePercentage}%
                    </span>
                </td>
                <td class="py-3 px-4 text-muted-foreground">${progress.total_questions}</td>
                <td class="py-3 px-4 text-muted-foreground">${progress.correct_answers}</td>
                <td class="py-3 px-4 text-muted-foreground">${progress.slide_n}</td>
                <td class="py-3 px-4 text-muted-foreground">${this.formatDateTime(progress.created_at)}</td>
            </tr>
            `;
        }).join('');
    }

    // Show/hide loading state in modal
    showStudentModalLoading(show) {
        const tableBody = document.getElementById('student-progress-table');
        const emptyState = document.getElementById('student-progress-empty');

        if (show) {
            tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="py-8 text-center">
                    <div class="flex items-center justify-center gap-2">
                        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span class="text-muted-foreground">جاري تحميل بيانات التقدم...</span>
                    </div>
                </td>
            </tr>
        `;
            if (emptyState) emptyState.classList.add('hidden');
        }
    }

    // Date formatting helper methods
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Add event listeners for student modal
    addStudentModalListeners() {
        const modal = document.getElementById('student-details-modal');
        const closeBtn = document.getElementById('close-student-modal');
        const backdrop = document.querySelector('[data-student-modal-backdrop]');

        modal.style.overflow = 'scroll';
        modal.style.paddingTop = '100px'


        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeStudentModal());
        }

        if (backdrop) {
            backdrop.addEventListener('click', () => this.closeStudentModal());
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
                this.closeStudentModal();
            }
        });
    }

    closeStudentModal() {
        const modal = document.getElementById('student-details-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    // Add student edit method
    editStudent(studentId) {
        const students = AppData.getStudents();
        const student = students.find(s => s.id == studentId);
        if (student) {
            this.showToast(`تعديل بيانات الطالب: ${student.name}`, 'info');
            // You can implement an edit modal
            // console.log('Edit student:', student);
        }
    }

    // Update the navigation handler in bindEvents method
    addNavigationListeners() {
        const navButtons = document.querySelectorAll('nav button');
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const navText = e.target.getAttribute('data');
                // console.log('Navigation clicked:', navText);

                const coursesContainer = document.getElementById('courses-container');
                const searchBar = document.getElementById('search-bar');
                const studentContainer = document.getElementById('student-container');

                if (navText === 'الطلاب') {
                    // Show student container, hide courses
                    coursesContainer.classList.add('hidden');
                    searchBar.classList.add('hidden');
                    studentContainer.classList.remove('hidden');

                    // Render students when switching to students tab
                    this.renderStudents();
                } else if (navText === 'الدورات') {
                    // Show courses, hide student container
                    coursesContainer.classList.remove('hidden');
                    searchBar.classList.remove('hidden');
                    studentContainer.classList.add('hidden');
                }

                // Update active state
                navButtons.forEach(btn => {
                    btn.classList.remove('text-primary');
                    btn.classList.add('text-muted-foreground', 'hover:text-foreground');
                    const indicator = btn.querySelector('div');
                    if (indicator) indicator.remove();
                });

                e.target.classList.remove('text-muted-foreground', 'hover:text-foreground');
                e.target.classList.add('text-primary');
                e.target.innerHTML += '<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-slide-up"></div>';
            });
        });
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