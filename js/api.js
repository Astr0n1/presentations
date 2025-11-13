// api.js - API Service Class
class ApiService {
    static async createCourse(courseData) {
        try {
            console.log('Creating course with data:', courseData);
            
            const response = await fetch('api/create_course.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(courseData)
            });

            // First check if the response is OK (network level)
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Raw API response:', result); // Debug log
            
            // Then check if the API returned success
            if (result.status !== 'success' && result.success !== true) {
                throw new Error(result.message || 'Failed to create course');
            }
            
            return result;

        } catch (error) {
            console.error('API Service Error:', error);
            throw error;
        }
    }

    // You can add other API methods here
    static async getCourses() {
        try {
            const response = await fetch('api/courses.php');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Service Error:', error);
            throw error;
        }
    }

    static async getStudents() {
        try {
            const response = await fetch('api/students.php');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Service Error:', error);
            throw error;
        }
    }

    static async getStudentProgress(studentId) {
        try {
            const response = await fetch(`api/student-progress.php?student_id=${studentId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Service Error:', error);
            throw error;
        }
    }
}