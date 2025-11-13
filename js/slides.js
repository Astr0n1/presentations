
document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const backButton = document.getElementById('back-button');
    const deleteButton = document.getElementById('delete-button');
    const editButton = document.getElementById('edit-button');
    const previewButton = document.getElementById('preview-button');
    const toggleStatusButton = document.getElementById('toggle-status-button');
    const notificationBanner = document.getElementById('notification-banner');
    const closeNotification = document.getElementById('close-notification');
    const confirmationModal = document.getElementById('confirmation-modal');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');

    // Current course data
    let currentCourse = null;

    // Get course slug from URL
    const urlParams = new URLSearchParams(window.location.search);
    const courseSlug = urlParams.get('name');

    // Back button
    backButton.addEventListener('click', function () {
        window.history.back();
    });

    // Edit button
    editButton.addEventListener('click', function () {
        if (currentCourse) {
            window.location.href = `edit-course.html?name=${encodeURIComponent(currentCourse.name)}`;
        }
    });

    // Preview button
    previewButton.addEventListener('click', function () {
        if (currentCourse) {
            // Open preview in new tab
            window.open(`preview-course.html?name=${encodeURIComponent(currentCourse.name)}&role=presenter`, '_blank');
        }
    });

    // Toggle status button
    toggleStatusButton.addEventListener('click', function () {
        if (currentCourse) {
            toggleCourseStatus(currentCourse);
        }
    });

    // Delete button
    deleteButton.addEventListener('click', function () {
        if (currentCourse) {
            showConfirmationModal(
                'حذف الدورة',
                'هل أنت متأكد من رغبتك في حذف هذه الدورة؟ لا يمكن التراجع عن هذا الإجراء.',
                deleteCourse
            );
        }
    });

    // Close notification
    closeNotification.addEventListener('click', function () {
        hideNotification();
    });

    // Modal buttons
    modalCancel.addEventListener('click', function () {
        hideConfirmationModal();
    });

    // Load course data
    if (courseSlug) {
        loadCourseData(courseSlug);
    } else {
        showError('لم يتم العثور على معرف الدورة في الرابط');
    }

    // Functions
    function loadCourseData(slug) {
        fetch(`api/courses.php?slug=${encodeURIComponent(slug)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`خطأ في الشبكة: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    currentCourse = data.data.course;
                    updateUIWithCourseData(currentCourse);
                } else {
                    throw new Error(data.message || 'فشل في تحميل بيانات الدورة');
                }
            })
            .catch(error => {
                console.error('Error fetching course data:', error);
                showError(`فشل في تحميل بيانات الدورة: ${error.message}`);
            });
    }

    function updateUIWithCourseData(course) {
        // Update basic info
        document.getElementById('course-name').textContent = course.name;
        document.getElementById('course-number').textContent = course.lessons || 0;
        document.getElementById('course-description').textContent = course.description || 'لا يوجد وصف';
        document.getElementById('course-instructor').textContent = course.author || 'غير محدد';
        document.getElementById('course-category').textContent = course.category || 'غير محدد';

        // Update dates
        document.getElementById('publish-time').textContent = formatDate(course.published_at) || 'غير منشور';
        document.getElementById('last-updated').textContent = formatDate(course.last_modified) || 'غير محدد';
        document.getElementById('created-at').textContent = formatDate(course.created_at) || 'غير محدد';

        // Update status
        updateStatusUI(course.status);

    }

    function updateStatusUI(status) {
        const statusText = document.getElementById('status-text');
        const statusLabel = document.getElementById('status-label');
        const statusActionText = document.getElementById('status-action-text');
        const courseStatus = document.getElementById('course-status');

        // Remove all status classes
        courseStatus.classList.remove('status-draft', 'status-published', 'status-archived');
        statusLabel.classList.remove('status-draft', 'status-published', 'status-archived');

        let statusDisplay, actionText, statusClass;

        switch (status) {
            case 'published':
                statusDisplay = 'منشور';
                actionText = 'إرجاع إلى مسودة';
                statusClass = 'status-published';
                break;
            case 'draft':
                statusDisplay = 'مسودة';
                actionText = 'نشر الدورة';
                statusClass = 'status-draft';
                break;
            case 'archived':
                statusDisplay = 'مؤرشف';
                actionText = 'استعادة الدورة';
                statusClass = 'status-archived';
                break;
            default:
                statusDisplay = 'غير معروف';
                actionText = 'تغيير الحالة';
                statusClass = 'status-draft';
        }

        // Update elements
        statusText.textContent = statusDisplay;
        statusLabel.textContent = statusDisplay;
        statusActionText.textContent = actionText;

        // Apply status classes
        courseStatus.classList.add(statusClass);
        statusLabel.classList.add(statusClass);
    }

    function toggleCourseStatus(course) {
        const newStatus = course.status === 'published' ? 'draft' : 'published';

        fetch(`api/courses.php?slug=${course.name}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                slug: course.slug,
                status: newStatus
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`خطأ في الشبكة: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    // Update local course data
                    currentCourse.status = newStatus;
                    updateStatusUI(newStatus);

                    // Show success notification
                    showNotification(`تم ${newStatus === 'published' ? 'نشر' : 'إرجاع'} الدورة بنجاح`);
                } else {
                    throw new Error(data.message || 'فشل في تغيير حالة الدورة');
                }
            })
            .catch(error => {
                console.error('Error updating course status:', error);
                showError(`فشل في تغيير حالة الدورة: ${error.message}`);
            });
    }

    function deleteCourse() {
        const courseId = currentCourse.id;

        fetch(`api/courses.php?id=${courseId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                slug: currentCourse.slug
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`خطأ في الشبكة: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    showNotification('تم حذف الدورة بنجاح');
                    // Redirect to courses list after a delay
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    throw new Error(data.message || 'فشل في حذف الدورة');
                }
            })
            .catch(error => {
                console.error('Error deleting course:', error);
                showError(`فشل في حذف الدورة: ${error.message}`);
            })
            .finally(() => {
                hideConfirmationModal();
            });
    }

    function duplicateCourse() {
        fetch(`api/courses.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'duplicate',
                slug: currentCourse.slug
            })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`خطأ في الشبكة: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'success') {
                    showNotification('تم نسخ الدورة بنجاح');
                    // Redirect to the new course edit page
                    setTimeout(() => {
                        window.location.href = `edit-course.html?name=${encodeURIComponent(data.data.new_slug)}`;
                    }, 1500);
                } else {
                    throw new Error(data.message || 'فشل في نسخ الدورة');
                }
            })
            .catch(error => {
                console.error('Error duplicating course:', error);
                showError(`فشل في نسخ الدورة: ${error.message}`);
            })
            .finally(() => {
                hideConfirmationModal();
            });
    }

    function showConfirmationModal(title, message, confirmAction) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;

        // Set up confirm button
        modalConfirm.onclick = confirmAction;

        // Show modal
        confirmationModal.classList.remove('hidden');
    }

    function hideConfirmationModal() {
        confirmationModal.classList.add('hidden');
    }

    function showNotification(message) {
        document.getElementById('notification-message').textContent = message;
        notificationBanner.classList.remove('hidden');
        notificationBanner.classList.add('animate-slide-up');

        // Auto hide after 5 seconds
        setTimeout(() => {
            hideNotification();
        }, 5000);
    }

    function hideNotification() {
        notificationBanner.classList.add('hidden');
        notificationBanner.classList.remove('animate-slide-up');
    }

    function showError(message) {
        // You could implement a dedicated error notification style
        document.getElementById('notification-message').textContent = message;
        notificationBanner.classList.remove('hidden', 'bg-blue-600');
        notificationBanner.classList.add('animate-slide-up', 'bg-red-600');

        // Auto hide after 5 seconds
        setTimeout(() => {
            hideNotification();
        }, 5000);
    }

    function formatDate(dateString) {
        if (!dateString) return '';

        const date = new Date(dateString);
        return date.toLocaleDateString('ar-EG', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatRelativeTime(timestamp) {
        // Implement relative time formatting (e.g., "منذ ساعتين")
        // This is a simplified version
        const now = new Date();
        const time = new Date(timestamp);
        const diffInMinutes = Math.floor((now - time) / (1000 * 60));

        if (diffInMinutes < 1) return 'الآن';
        if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
        if (diffInMinutes < 1440) return `منذ ${Math.floor(diffInMinutes / 60)} ساعة`;
        return `منذ ${Math.floor(diffInMinutes / 1440)} يوم`;
    }
});