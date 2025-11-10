// In your ApiService class
class ApiService {
    // TODO done
    static async getCourseDetails(courseName) {
        try {
            const response = await fetch(`https://barber.herova.net/api/edit/checkCourse.php?name=${encodeURIComponent(courseName)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            // //console.log('Raw API response for course details:', result); // Debug log

            return result.data;

        } catch (error) {
            console.error('API Service Error (getCourseDetails):', error);
            throw error;
        }
    }

    // TODO done
    static async getCourseLessons(courseId) {
        try {
            const response = await fetch(`https://barber.herova.net/api/edit/allLessons.php?C_id=${encodeURIComponent(courseId)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            // //console.log('Raw API response for course lessons:', result); // Debug log

            return result.data;

        } catch (error) {
            console.error('API Service Error (getCourseLessons):', error);
            throw error;
        }
    }

    // TODO not needed
    static async getLessonDetails(lessonId) {
        try {
            const response = await fetch(`https://barber.herova.net/api/edit/GetLessonDetails.php?id=${encodeURIComponent(lessonId)}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            // //console.log('Raw API response for lesson details:', result); // Debug log

            return result.data;

        } catch (error) {
            console.error('API Service Error (getLessonDetails):', error);
            throw error;
        }
    }

    // TODO done
    static async addNewLesson(name, C_id) {
        try {
            const response = await fetch(`https://barber.herova.net/api/edit/addNewLesson.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, C_id })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            //console.log('Raw API response for addNewLesson:', result); // Debug log

            return result;

        } catch (error) {
            console.error('API Service Error (addNewLesson):', error);
            throw error;
        }
    }

    // TODO done
    static async updateLessonName(id, name) {
        try {
            const response = await fetch(`https://barber.herova.net/api/edit/LessonNameEdit.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, name })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            //console.log('Raw API response for updateLessonName:', result); // Debug log

            return result;

        } catch (error) {
            console.error('API Service Error (updateLessonName):', error);
            throw error;
        }
    }

    // TODO done
    static async changeLessonStatus(id) {
        try {
            const response = await fetch(`https://barber.herova.net/api/edit/ChangeLessonStatus.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            //console.log('Raw API response for changeLessonStatus:', result); // Debug log

            return result;

        } catch (error) {
            console.error('API Service Error (changeLessonStatus):', error);
            throw error;
        }
    }

    // TODO done
    static async updateLessonContent(id, content, background) {
        try {
            const response = await fetch(`https://barber.herova.net/api/edit/changeLessonDetails.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id, content, background })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            //console.log('Raw API response for updateLessonContent:', result); // Debug log

            return result;

        } catch (error) {
            console.error('API Service Error (updateLessonContent):', error);
            throw error;
        }
    }

    // TODO done
    static async deleteLesson(id) {
        try {
            const response = await fetch(`https://barber.herova.net/api/edit/DeleteLesson.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ id })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            //console.log('Raw API response for deleteLesson:', result); // Debug log

            return result;

        } catch (error) {
            console.error('API Service Error (deleteLesson):', error);
            throw error;
        }
    }

    // TODO done
    static async updateLessonOrder(lessons) {
        try {
            const response = await fetch(`https://barber.herova.net/api/edit/changeOrder.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ lessons })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            //console.log('Raw API response for updateLessonOrder:', result); // Debug log

            return result;

        } catch (error) {
            console.error('API Service Error (updateLessonOrder):', error);
            throw error;

        }
    }


    static async uploadImage(formData) {
        // Enhanced logging
        console.log('📤 Uploading image...');
        console.log('FormData entries:');
        for (let [key, value] of formData.entries()) {
            console.log(`${key}:`, value);
        }

        try {
            const response = await fetch(`https://barber.herova.net/api/edit/media/uploadImage.php`, {
                method: 'POST',
                body: formData
            });

            // Get the raw response text first
            const responseText = await response.text();
            console.log('📥 Raw server response:', responseText);

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ Failed to parse server response as JSON:', responseText);
                throw new Error(`Server returned invalid JSON: ${responseText}`);
            }

            if (!response.ok) {
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }

            console.log('✅ Upload successful:', result);
            return result;

        } catch (error) {
            console.error('❌ API Service Error (uploadImage):', error);
            throw error;
        }
    }

    static async uploadVideo(formData) {
        try {
            const response = await fetch(`https://barber.herova.net/api/edit/media/uploadVedio.php`, {
                method: 'POST',
                body: formData
            });

            // Get raw response first
            const responseText = await response.text();
            console.log('📥 Raw server response (video):', responseText);

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ Failed to parse server response as JSON:', responseText);
                throw new Error(`Server returned invalid JSON: ${responseText}`);
            }

            if (!response.ok) {
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }

            console.log('✅ Video upload successful:', result);
            return result;

        } catch (error) {
            console.error('❌ API Service Error (uploadVideo):', error);
            throw error;
        }
    }
}

export { ApiService };
