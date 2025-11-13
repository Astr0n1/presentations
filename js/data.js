// Data management
const AppData = {
    courses: [],
    students: [],
    navigation: [],
    filters: {},
    currentView: 'grid',
    currentSort: 'Last modified (Newest)',
    searchTerm: '',

    async loadData() {
        try {
            const response = await fetch('data/courses.json');
            const Course_response = await fetch('api/courses.php');
            const Students_response = await fetch('api/students.php');

            const data = await response.json();
            const C_data = await Course_response.json();
            const S_data = await Students_response.json();

            // console.log('Courses API response:', C_data); // Debug
            // console.log('Students API response:', S_data); // Debug

            // FIX: Properly handle different response formats
            this.courses = C_data.courses || C_data.data || [];
            this.students = S_data.students || S_data.data || [];
            this.navigation = data.navigation || [];
            this.filters = data.filters || {};

            // console.log('Loaded courses:', this.courses); // Debug
            // console.log('Loaded students:', this.students); // Debug

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
            ],
            students: [
                {
                    id: 1,
                    name: "فاطمة علي",
                    email: "fatima@example.com",
                    score: 92,
                    last_login: "2024-01-14 10:15:00",
                    created_at: "2024-01-02",
                    updated_at: "2024-01-14"
                },

            ],
            navigation: [
                { name: "الدورات", active: true },
                { name: "#", active: false },
                { name: "الطلاب", active: false },
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
    },
    getStudents() {
        // console.log('Students data:', this.students); // Debug log
        return Array.isArray(this.students) ? this.students : [];
    },

    async refreshStudents() {
        try {
            const response = await fetch('api/students.php');
            const data = await response.json();

            // console.log('Refresh students response:', data); // Debug

            // FIX: Handle different response formats
            this.students = data.students || data.data || [];

            // console.log('Refreshed students:', this.students); // Debug
            return this.students;
        } catch (error) {
            console.error('Error refreshing students:', error);
            // Fallback to default students if API fails
            const defaultData = this.getDefaultData();
            this.students = defaultData.students || [];
            return this.students;
        }
    },

    // Add this method to AppData
    async forceLoadStudents() {
        try {
            const response = await fetch('api/students.php');
            const data = await response.json();

            // console.log('Force load students response:', data);

            // Try different possible response formats
            this.students = data.students || data.data || data || [];

            if (!Array.isArray(this.students)) {
                console.warn('Students data is not an array, converting...');
                this.students = [this.students].filter(Boolean);
            }

            // console.log('Force loaded students:', this.students);
            return this.students;
        } catch (error) {
            console.error('Error force loading students:', error);
            const defaultData = this.getDefaultData();
            this.students = defaultData.students;
            return this.students;
        }
    }

};