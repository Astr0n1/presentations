// In your ApiService class
class ApiService {
    static async createCourse(courseData) {
        try {
            const response = await fetch('api/create_course', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(courseData)
            });

            // Check if response is OK (status 200-299)
            if (!response.status === 'success') {
                throw new Error(`${response.message}`);
            }

            const result = await response.json();
            console.log('Raw API response:', result); // Debug log
            
            return result;

        } catch (error) {
            console.error('API Service Error:', error);
            throw error;
        }
    }
}