// Data management
const AppData = {
    courses: [],
    navigation: [],
    filters: {},
    currentView: 'grid',
    currentSort: 'Last modified (Newest)',
    searchTerm: '',

    async loadData() {
        try {
            const response = await fetch('data/courses.json');
            const Course_response = await fetch('api/courses');
            const data = await response.json();
            const C_data = await Course_response.json();
            this.courses = C_data.courses || [];
            this.navigation = data.navigation || [];
            this.filters = data.filters || {};
            return data;
        } catch (error) {
            console.error('Error loading data:', error);
            return this.getDefaultData();
        }
    },

    getDefaultData() {
        return {
            courses: [
                {
                    id: 1,
                    title: "الروبوت الأفتراضي",
                    type: "Course",
                    description: "Virtual Robot Course",
                    lessons: 1,
                    status: "published",
                    author: "SS",
                    image: "gradient-card",
                    category: "programming",
                    lastModified: "2024-01-15"
                },
                {
                    id: 2,
                    title: "Web Development Basics",
                    type: "Course",
                    description: "Learn HTML, CSS, and JavaScript",
                    lessons: 12,
                    status: "published",
                    author: "JD",
                    image: "gradient-card",
                    category: "programming",
                    lastModified: "2024-01-10"
                },
                {
                    id: 3,
                    title: "Data Science Fundamentals",
                    type: "Course",
                    description: "Introduction to data analysis",
                    lessons: 8,
                    status: "draft",
                    author: "ML",
                    image: "gradient-card",
                    category: "data-science",
                    lastModified: "2024-01-05"
                },
                {
                    id: 4,
                    title: "Mobile App Development",
                    type: "Course",
                    description: "Build iOS and Android apps",
                    lessons: 15,
                    status: "published",
                    author: "AR",
                    image: "gradient-card",
                    category: "mobile",
                    lastModified: "2024-01-12"
                }
            ],
            navigation: [
                { name: "Courses", active: true },
                { name: "Rapid Refresh Quizzes", active: false },
                { name: "Brain Boost", active: false },
                { name: "Paths", active: false }
            ],
            filters: {
                searchPlaceholder: "Search courses...",
                sortOptions: ["Last modified (Newest)", "Last modified (Oldest)", "Title A-Z", "Title Z-A", "Lessons (Most)", "Lessons (Least)"],
                viewTypes: ["grid", "list"]
            }
        };
    },

    getCourses() {
        let filteredCourses = [...this.courses];

        // Apply search filter
        if (this.searchTerm) {
            const searchLower = this.searchTerm.toLowerCase();
            filteredCourses = filteredCourses.filter(course =>
                course.title.toLowerCase().includes(searchLower) ||
                course.description.toLowerCase().includes(searchLower) ||
                course.author.toLowerCase().includes(searchLower) ||
                course.category.toLowerCase().includes(searchLower)
            );
        }

        // Apply sorting
        filteredCourses = this.sortCourses(filteredCourses);

        return filteredCourses;
    },

    sortCourses(courses) {
        const sortedCourses = [...courses];

        switch (this.currentSort) {
            case 'Last modified (Newest)':
                return [...sortedCourses].sort((a, b) => {
                    const dateA = new Date(a.last_modified || a.lastModified || '');
                    const dateB = new Date(b.last_modified || b.lastModified || '');
                    return dateB - dateA;
                });

            case 'Last modified (Oldest)':
                return [...sortedCourses].sort((a, b) => {
                    const dateA = new Date(a.last_modified || a.lastModified || '');
                    const dateB = new Date(b.last_modified || b.lastModified || '');
                    return dateA - dateB;
                });
            case 'Title A-Z':
                return sortedCourses.sort((a, b) => a.title.localeCompare(b.title));
            case 'Title Z-A':
                return sortedCourses.sort((a, b) => b.title.localeCompare(a.title));
            case 'Lessons (Most)':
                return sortedCourses.sort((a, b) => b.lessons - a.lessons);
            case 'Lessons (Least)':
                return sortedCourses.sort((a, b) => a.lessons - b.lessons);
            default:
                return sortedCourses;
        }
    },

    getNavigation() {
        return this.navigation;
    },

    getFilters() {
        return this.filters;
    },

    setSearchTerm(term) {
        this.searchTerm = term;
    },

    setCurrentView(view) {
        this.currentView = view;
    },

    setCurrentSort(sort) {
        this.currentSort = sort;
    },

    getCurrentView() {
        return this.currentView;
    },

    getCurrentSort() {
        return this.currentSort;
    },

    getSearchTerm() {
        return this.searchTerm;
    }
};