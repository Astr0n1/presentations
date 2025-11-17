'use strict'
////////////////////////////////////////////////////
// importing modules
////////////////////////////////////////////////////
import { ApiService } from './modules/api.js';
import { Slide, Lesson } from './modules/models.js';
import { AssetsManager } from './modules/assets_manager.js';
import { SlideManager } from './modules/slide_manager.js';
import { UIRenderer } from './modules/ui_renderer.js';
import { DragDropManager } from './modules/drag_drop.js';
import { UIInteractions } from './modules/ui_interactions.js';
import { QuizManager } from './modules/quiz_manager.js';


// 🧩 Drag start handler
window.handleCategorizeDrag = (e, containerId) => {
    e.dataTransfer.setData('text/plain', containerId);
    const questionEl = document.getElementById(`${containerId}-question`);
    if (questionEl) questionEl.classList.add('scale-95');
};

window.handleCategorizeDrop = function (e, containerId, dropIndex) {
    e.preventDefault();
    const editor = window.courseEditor || window.editor;
    if (!editor) return;

    const slideId = parseInt(containerId.split('-')[1]);

    // Save choice using common function - this updates the data model
    if (editor && typeof editor.setQuizUserChoice === 'function') {
        editor.setQuizUserChoice(slideId, Number(dropIndex));

        // Force immediate UI update by re-rendering the preview
        const slide = editor.getCurrentSlide();
        if (slide) {
            editor.renderSlidePreview(slide);
        }
    }

    // Remove visual feedback
    const questionEl = document.getElementById(`${containerId}-question`);
    if (questionEl) questionEl.classList.remove('scale-95');
};

// ========== CONNECT QUIZ FUNCTIONS ==========

window.handleConnectQuizStart = function (event, side, index) {
    event.preventDefault();
    const editor = window.courseEditor || window.editor;
    if (!editor) return;

    const slide = editor.getCurrentSlide();
    if (!slide || slide.submitted) return;

    // Initialize user connections if not exists
    if (!slide.userConnections) {
        slide.userConnections = [];
    }

    // Store starting point for line drawing
    window.connectQuizStart = { side, index };

    // Add visual feedback
    event.target.classList.add('ring-2', 'ring-blue-400', 'ring-opacity-70');
};

window.handleConnectQuizEnd = function (event, side, index) {
    event.preventDefault();
    const editor = window.courseEditor || window.editor;
    if (!editor) return;

    const slide = editor.getCurrentSlide();
    if (!slide || slide.submitted || !window.connectQuizStart) return;

    const start = window.connectQuizStart;

    // Only allow connections from left to right
    if (start.side === 'left' && side === 'right') {
        // Remove any existing connection for this left item
        slide.userConnections = slide.userConnections.filter(conn => conn.leftIndex !== start.index);

        // Add new connection
        slide.userConnections.push({
            leftIndex: start.index,
            rightIndex: index
        });

        editor.saveToLocalStorage();
        editor.loadSlidePreview(slide.id);
    }

    // Clean up
    window.connectQuizStart = null;
    document.querySelectorAll('.quiz-connect-item').forEach(item => {
        item.classList.remove('ring-2', 'ring-blue-400', 'ring-opacity-70');
    });
};

window.drawConnectQuizLines = function (slideId) {
    const editor = window.courseEditor || window.editor;
    if (!editor) return;

    const slide = editor.findSlide(editor.currentLessonId, parseInt(slideId));
    if (!slide) return;

    const connectionsLayer = document.getElementById(`connections-${slideId}`);
    if (!connectionsLayer) return;

    // Clear existing lines
    connectionsLayer.innerHTML = '';

    const leftItems = document.querySelectorAll(`.quiz-connect-container .quiz-connect-item[data-side="left"]`);
    const rightItems = document.querySelectorAll(`.quiz-connect-container .quiz-connect-item[data-side="right"]`);

    const userConnections = slide.userConnections || [];
    const leftColumn = slide.content.leftColumn || [];
    const rightColumn = slide.content.rightColumn || [];

    userConnections.forEach(connection => {
        const leftItem = leftItems[connection.leftIndex];
        const rightItem = rightItems[connection.rightIndex];

        if (leftItem && rightItem) {
            const leftRect = leftItem.getBoundingClientRect();
            const rightRect = rightItem.getBoundingClientRect();
            const containerRect = connectionsLayer.getBoundingClientRect();

            const startX = leftRect.right - containerRect.left;
            const startY = leftRect.top + leftRect.height / 2 - containerRect.top;
            const endX = rightRect.left - containerRect.left;
            const endY = rightRect.top + rightRect.height / 2 - containerRect.top;

            // Calculate line length and angle
            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

            // Check if connection is correct
            const leftItemData = leftColumn[connection.leftIndex];
            const isCorrect = leftItemData && leftItemData.correctIndex === connection.rightIndex;

            // Use blue for active connections, green/red only after submission
            let lineColor, lineClass;
            if (slide.submitted) {
                lineColor = isCorrect ? '#10B981' : '#EF4444'; // Green for correct, red for incorrect
                lineClass = isCorrect ? 'correct-connection' : 'wrong-connection';
            } else {
                lineColor = '#3B82F6'; // Blue for active connections
                lineClass = 'active-connection';
            }

            // Create line element
            const line = document.createElement('div');
            line.className = `quiz-connection-line ${lineClass}`;
            line.style.cssText = `
                left: ${startX}px;
                top: ${startY}px;
                width: ${length}px;
                transform: rotate(${angle}deg);
                background: linear-gradient(90deg, ${lineColor}, ${lineColor});
            `;

            connectionsLayer.appendChild(line);

            // Add dots at connection points
            const startDot = document.createElement('div');
            startDot.className = `connection-dot ${lineClass}`;
            startDot.style.cssText = `
                left: ${startX - 6}px;
                top: ${startY - 6}px;
                background: ${lineColor};
            `;

            const endDot = document.createElement('div');
            endDot.className = `connection-dot ${lineClass}`;
            endDot.style.cssText = `
                left: ${endX - 6}px;
                top: ${endY - 6}px;
                background: ${lineColor};
            `;

            connectionsLayer.appendChild(startDot);
            connectionsLayer.appendChild(endDot);
        }
    });
};

// ========== IMAGE PAIRS FUNCTION ==========

window.handleImagePairsSelect = function (event, side, index) {
    event.stopPropagation();
    const editor = window.courseEditor || window.editor;
    if (!editor) return;

    const slide = editor.getCurrentSlide();
    if (!slide || slide.submitted) return;

    // Initialize user selections if not exists
    if (!slide.userSelections) {
        slide.userSelections = { left: [], right: [] };
    }

    const currentSelections = slide.userSelections[side];
    const itemIndex = currentSelections.indexOf(index);

    if (itemIndex > -1) {
        // Remove selection
        currentSelections.splice(itemIndex, 1);
    } else {
        // Add selection
        currentSelections.push(index);
    }

    console.log('Image Pairs Selection Updated:', {
        side,
        index,
        userSelections: slide.userSelections
    });

    editor.saveToLocalStorage();

    // Force complete re-render
    setTimeout(() => {
        editor.loadSlidePreview(slide.id);
    }, 50);
};

// ========== DRAG & DROP FUNCTIONS ==========

window.handleDragMatchStart = function (event, side, index) {
    const editor = window.courseEditor || window.editor;
    if (!editor) return;

    const slide = editor.getCurrentSlide();
    if (!slide || slide.submitted) return;

    event.dataTransfer.setData('text/plain', JSON.stringify({
        side: side,
        index: index,
        slideId: slide.id
    }));

    event.target.classList.add('scale-95', 'ring-2', 'ring-blue-400');

    // Store original position for potential return
    window.dragOriginalPosition = {
        element: event.target,
        parent: event.target.parentNode,
        side: side,
        index: index
    };
};

window.handleDragMatchOver = function (event) {
    event.preventDefault();
    event.currentTarget.classList.add('border-blue-400', 'bg-blue-500/10', 'scale-105');
};

window.handleDragMatchLeave = function (event) {
    event.currentTarget.classList.remove('border-blue-400', 'bg-blue-500/10', 'scale-105');
};

window.handleDragMatchDrop = function (event, slideId, dropIndex, dropSide = 'right') {
    event.preventDefault();
    const editor = window.courseEditor || window.editor;
    if (!editor) return;

    const slide = editor.findSlide(editor.currentLessonId, parseInt(slideId));
    if (!slide || slide.submitted) return;

    try {
        const dragData = JSON.parse(event.dataTransfer.getData('text/plain'));
        const draggedSide = dragData.side;
        const draggedIndex = dragData.index;

        // Remove visual feedback from all elements
        document.querySelectorAll('.quiz-drag-item').forEach(item => {
            item.classList.remove('scale-95', 'ring-2', 'ring-blue-400');
        });
        document.querySelectorAll('.quiz-drop-zone').forEach(zone => {
            zone.classList.remove('border-blue-400', 'bg-blue-500/10', 'scale-105');
        });

        // Initialize user matches if not exists
        if (!slide.userMatches) {
            slide.userMatches = [];
        }

        if (draggedSide === 'left' && dropSide === 'right') {
            // Moving from left to right
            // Remove any existing match for this dragged item
            slide.userMatches = slide.userMatches.filter(match => match.leftIndex !== draggedIndex);

            // Also remove any match that uses the target right slot
            slide.userMatches = slide.userMatches.filter(match => match.rightIndex !== dropIndex);

            // Add new match
            slide.userMatches.push({
                leftIndex: draggedIndex,
                rightIndex: dropIndex
            });

        } else if (draggedSide === 'right' && dropSide === 'left') {
            // Moving from right back to left - remove the match
            slide.userMatches = slide.userMatches.filter(match =>
                !(match.leftIndex === draggedIndex && match.rightIndex === dropIndex)
            );
        } else if (draggedSide === 'left' && dropSide === 'left') {
            // Moving within left column - remove any match for this item
            slide.userMatches = slide.userMatches.filter(match => match.leftIndex !== draggedIndex);
        }

        editor.saveToLocalStorage();

        // Force complete re-render by using the editor's render method
        editor.renderSlidePreview(slide);

        // Update submit button visibility
        window.updateDragMatchSubmitButton(slide);

    } catch (err) {
        console.error('Error handling drag drop:', err);
    }

    // Clean up
    window.dragOriginalPosition = null;
};

window.updateDragMatchSubmitButton = function (slide) {
    const submitButton = document.getElementById(`quiz-${slide.id}-submit`);
    if (!submitButton) return;

    const leftColumnLength = slide.content?.leftColumn?.length || 0;
    const userMatchesLength = slide.userMatches?.length || 0;

    // Show submit button only when ALL left items are placed in right column
    if (leftColumnLength > 0 && userMatchesLength === leftColumnLength) {
        submitButton.classList.remove('hidden');
    } else {
        submitButton.classList.add('hidden');
    }
};

window.handleQuizCategorizeSubmit = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const editor = window.courseEditor || window.editor;
    if (!editor || typeof editor.getCurrentSlide !== 'function') return;

    const slideId = parseInt(containerId.split('-')[1]);
    const slide = editor.getCurrentSlide();
    if (!slide || !slide.content) return;

    // Use QuizManager for submission logic
    editor.handleQuizSubmit(slideId, containerId);

    // Additional UI updates specific to categorize quiz
    const questionEl = document.getElementById(`${containerId}-question`);
    const dropZones = container.querySelectorAll('.quiz-category-zone');

    if (questionEl) {
        questionEl.setAttribute('draggable', 'false');
        questionEl.style.cursor = 'default';
    }

    // Remove submit button
    const btn = container.querySelector(`#quiz-${slideId}-submit`);
    if (btn) btn.remove();
};

// Add these new functions to handle connect quiz drawing
window.startConnectDrawing = function (event, side, index, slideId) {
    if (side !== 'left') return;

    event.preventDefault();
    const editor = window.courseEditor || window.editor;
    if (!editor) return;

    const slide = editor.getCurrentSlide();
    if (!slide || slide.submitted) return;

    // Initialize drawing state
    window.connectDrawing = {
        isDrawing: true,
        startSide: side,
        startIndex: index,
        slideId: slideId,
        points: [],
        tempLine: null
    };

    // Create temporary canvas for drawing
    const connectionsLayer = document.getElementById(`connections-${slideId}`);
    if (!connectionsLayer) return;

    // Remove any existing temp canvas
    const existingCanvas = connectionsLayer.querySelector('.temp-drawing-canvas');
    if (existingCanvas) existingCanvas.remove();

    const canvas = document.createElement('canvas');
    canvas.className = 'temp-drawing-canvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = '5';
    canvas.style.pointerEvents = 'none';

    // Set canvas size to match container
    const rect = connectionsLayer.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    connectionsLayer.appendChild(canvas);

    window.connectDrawing.canvas = canvas;
    window.connectDrawing.ctx = canvas.getContext('2d');
    window.connectDrawing.rect = rect;

    // Get start position from the left item
    const leftItem = event.currentTarget;
    const leftRect = leftItem.getBoundingClientRect();
    const startX = leftRect.left + leftRect.width / 2 - rect.left;
    const startY = leftRect.top + leftRect.height / 2 - rect.top;

    window.connectDrawing.startX = startX;
    window.connectDrawing.startY = startY;
    window.connectDrawing.points = [{ x: startX, y: startY }];

    // Start drawing
    updateConnectDrawing(event);

    // Add event listeners
    document.addEventListener('mousemove', updateConnectDrawing);
    document.addEventListener('mouseup', finishConnectDrawing);
    document.addEventListener('touchmove', updateConnectDrawing, { passive: false });
    document.addEventListener('touchend', finishConnectDrawing);
};

window.updateConnectDrawing = function (event) {
    if (!window.connectDrawing || !window.connectDrawing.isDrawing) return;

    event.preventDefault();
    const drawing = window.connectDrawing;
    const rect = drawing.rect;

    // Get current position
    let clientX, clientY;
    if (event.type.includes('touch')) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    // Add point to drawing path
    drawing.points.push({ x: currentX, y: currentY });

    // Draw the freehand line
    const ctx = drawing.ctx;
    ctx.clearRect(0, 0, drawing.canvas.width, drawing.canvas.height);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(drawing.startX, drawing.startY);

    // Draw smooth curve through points
    for (let i = 1; i < drawing.points.length; i++) {
        ctx.lineTo(drawing.points[i].x, drawing.points[i].y);
    }

    ctx.stroke();
};

window.finishConnectDrawing = function (event) {
    if (!window.connectDrawing || !window.connectDrawing.isDrawing) return;

    event.preventDefault();
    const drawing = window.connectDrawing;
    drawing.isDrawing = false;

    // Remove event listeners
    document.removeEventListener('mousemove', updateConnectDrawing);
    document.removeEventListener('mouseup', finishConnectDrawing);
    document.removeEventListener('touchmove', updateConnectDrawing);
    document.removeEventListener('touchend', finishConnectDrawing);

    const rect = drawing.rect;
    let clientX, clientY;

    if (event.type.includes('touch')) {
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    const endX = clientX - rect.left;
    const endY = clientY - rect.top;

    // Check if we ended on a right item
    // Check if we ended on a right item
    const rightItems = document.querySelectorAll('.quiz-connect-item[data-side="right"]');
    let targetRightIndex = -1;
    let closestDistance = Infinity;

    rightItems.forEach((item, index) => {
        const itemRect = item.getBoundingClientRect();

        // Check if the end point is within the item's bounding box with some tolerance
        const isWithinX = clientX >= itemRect.left - 10 && clientX <= itemRect.right + 10;
        const isWithinY = clientY >= itemRect.top - 10 && clientY <= itemRect.bottom + 10;

        if (isWithinX && isWithinY) {
            // Calculate center of the item for distance comparison
            const itemCenterX = itemRect.left + itemRect.width / 2;
            const itemCenterY = itemRect.top + itemRect.height / 2;

            const distance = Math.sqrt(
                Math.pow(clientX - itemCenterX, 2) +
                Math.pow(clientY - itemCenterY, 2)
            );

            // Find the closest item to the end point
            if (distance < closestDistance) {
                closestDistance = distance;
                targetRightIndex = index;
            }
        }
    });

    // Fallback: if no item found with bounding box check, use the original distance method
    if (targetRightIndex === -1) {
        rightItems.forEach((item, index) => {
            const itemRect = item.getBoundingClientRect();
            const itemCenterX = itemRect.left + itemRect.width / 2;
            const itemCenterY = itemRect.top + itemRect.height / 2;

            const distance = Math.sqrt(
                Math.pow(clientX - itemCenterX, 2) +
                Math.pow(clientY - itemCenterY, 2)
            );

            if (distance < Math.max(itemRect.width, itemRect.height) * 0.6 && distance < closestDistance) {
                closestDistance = distance;
                targetRightIndex = index;
            }
        });
    }

    // Remove temporary canvas
    if (drawing.canvas) {
        drawing.canvas.remove();
    }

    // If we found a valid right item, create the connection
    if (targetRightIndex !== -1) {
        const editor = window.courseEditor || window.editor;
        if (!editor) return;

        const slide = editor.findSlide(editor.currentLessonId, parseInt(drawing.slideId));
        if (!slide || slide.submitted) return;

        // Initialize user connections if not exists
        if (!slide.userConnections) {
            slide.userConnections = [];
        }

        // Remove any existing connection for this left item
        slide.userConnections = slide.userConnections.filter(conn => conn.leftIndex !== drawing.startIndex);

        // Add new connection
        slide.userConnections.push({
            leftIndex: drawing.startIndex,
            rightIndex: targetRightIndex
        });

        editor.saveToLocalStorage();
        editor.loadSlidePreview(slide.id);
    }

    // Clean up
    window.connectDrawing = null;
};

////////////////////////////////////////////////////
// Initiating course editor
////////////////////////////////////////////////////
async function checkForCourse() {
    try {
        // when the page tries to load use the api function in api.js module getCourseDetails sending the url attribute name as a parameter and console log the response use async await to avoid callback
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('name');

        if (courseId) {
            ApiService.getCourseDetails(courseId)
                .then(courseDetails => {
                    console.log('Course Details:', courseDetails.exists);
                    if (!courseDetails.exists) {

                        window.location.href = '404.html'
                    }
                    localStorage.setItem('C_id', courseDetails.course.id);
                })
                .catch(error => {
                    console.error('Error fetching course details:', error);
                    // Handle error, e.g., display a message to the user
                });
        }
        else {

            window.location.href = '404.html'
        }
    } catch (err) {
        console.error(err);
        //reload page        
        location.reload();
    }
};

/**
 * Show the loader modal with optional progress
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} message - Optional custom message
 */
window.showLoader = function (progress = 0, message = null) {
    const loaderModal = document.getElementById('loader-modal');
    const progressBar = document.querySelector('.loader-progress');
    const loadingText = loaderModal?.querySelector('p');

    if (loaderModal) {
        loaderModal.classList.remove('hidden');

        // Update progress if provided
        if (progressBar && progress >= 0) {
            progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        }

        // Update message if provided
        if (message && loadingText) {
            loadingText.textContent = message;
        }
    }
};

/**
 * Hide the loader modal
 */
window.hideLoader = function () {
    const loaderModal = document.getElementById('loader-modal');
    if (loaderModal) {
        loaderModal.classList.add('hidden');

        // Reset progress
        const progressBar = document.querySelector('.loader-progress');
        if (progressBar) {
            progressBar.style.width = '0%';
        }

        // Reset message
        const loadingText = loaderModal.querySelector('p');
        if (loadingText) {
            loadingText.textContent = 'يرجى الانتظار...';
        }
    }
};


/**
 * Update loader progress and message
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} message - Optional custom message
 */
window.updateLoader = function (progress, message = null) {
    const progressBar = document.querySelector('.loader-progress');
    const loadingText = document.querySelector('#loader-modal p');

    if (progressBar && progress >= 0) {
        progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }

    if (message && loadingText) {
        loadingText.textContent = message;
    }
};

////////////////////////////////////////////////////
// CourseEditor — orchestrator
////////////////////////////////////////////////////
export default class CourseEditor {
    constructor(options = {}) {
        this.preview = this.setInitialPreview();
        this.page = 'editor';
        // state
        this.lessons = [];
        this.currentLessonId = null;
        this.currentSlideId = null;
        this.expandedLessons = new Set(); // Track expanded lesson IDs

        // dom refs
        this.dom = {
            lessonsList: document.getElementById('lessons-list'),
            currentLessonTitle: document.getElementById('current-lesson-title'),
            // currentLessonCode: document.getElementById('current-lesson-code'),
            slideEditContent: document.getElementById('slide-edit-content'),
            slidePreviewContainer: document.getElementById('slide-preview-container'),
            slidePreviewContent: document.getElementById('slide-preview-content'),
            addSlideModal: document.getElementById('add-slide-modal'),
            slideTemplatesContainer: document.getElementById('slide-templates-container'),
        };

        // templates (same as before)
        this.slideTemplates = options.slideTemplates || {
            text: [
                { subtype: 'bulleted-list', title: 'قائمة نقطية', description: 'عرض قائمة نقطية', icon: 'fa-list-ul' },
                { subtype: 'comparison', title: 'مقارنة', description: 'مقارنة نصية', icon: 'fa-columns' },
                { subtype: 'expandable-list', title: 'قائمة قابلة للتوسيع', description: 'قائمة قابلة للتوسيع', icon: 'fa-layer-group' },
                { subtype: 'text-series', title: 'سلسلة نصوص', description: 'عرض سلسلة نصوص قابلة للتمرير', icon: 'fa-ellipsis-h' },
            ],
            image: [
                { subtype: 'comparison', title: 'مقارنة صور', description: '', icon: 'fa-image' },
                { subtype: 'image-series', title: 'سلسلة الصور', description: 'عرض سلسلة صور قابلة للتمرير', icon: 'fa-images' },
                { subtype: 'image-collection', title: 'مجموعة صور', description: 'مجموعة صور قابلة للنقر لعرض التفاصيل', icon: 'fa-th' }
            ],
            pdf: [
                { subtype: 'pdf', title: 'ملف PDF', description: 'عرض ملف PDF', icon: 'fa-file-pdf' }
            ],
            video: [{ subtype: 'video', title: 'فيديو', description: '', icon: 'fa-video' }],
            quiz: [
                { subtype: 'multiple-choice-carousel', title: 'اختبار من متعدد', description: 'قم باختيار الاجابة الصحيحة', icon: 'fa-layer-group' },
                { subtype: 'categorize', title: 'اختبار تصنيفي', description: 'صنف العبارة التالية', icon: 'fa-layer-group' },
                { subtype: 'connect-quiz', title: 'اختبار التوصيل', description: 'قم بتوصيل العناصر المتشابهة', icon: 'fa-link' },
                { subtype: 'drag-match-quiz', title: 'اختبار السحب والتوصيل', description: 'اسحب الصور إلى النصوص المناسبة', icon: 'fa-hand-paper' },
                { subtype: 'image-pairs-quiz', title: 'اختبار اختيار الصور', description: 'اختر العناصر الصحيحة من القائمتين', icon: 'fa-check-double' }
            ]
        };

        // create helpers
        this.slideManager = new SlideManager(this);
        this.ui = new UIRenderer(this);

        // Load/persist and initial state
        this.loadFromLocalStorage();
        // If current lesson exists, expand it by default
        if (this.currentLessonId) {
            this.expandedLessons.add(this.currentLessonId);
        }

        // Render initial UI
        this.setupSidebarToggles();
        this.setupSlideNavigation();
        this.renderLessonsSidebar();
        this.updateLessonHeader();
        this.setUnitSize();

        // interactions & drag system
        this.assetsManager = new AssetsManager(this);
        this.quizManager = new QuizManager(this);
        this.interactions = new UIInteractions(this);
        this.dragManager = new DragDropManager(this);

        // mobile rendering
        this.renderMobileSlidesBar();

        // run smoke tests
        this.runSmokeTests();

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', this.debounce(() => {
                this.setUnitSize();
            }, 250));
            window.visualViewport.addEventListener('scroll', this.debounce(() => {
                this.setUnitSize();
            }, 250));
        } else {
            // Fallback: use resize and orientationchange
            window.addEventListener('resize', this.debounce(() => {
                this.setUnitSize();
            }, 250));
            window.addEventListener('orientationchange', this.debounce(() => {
                this.setUnitSize();
            }, 250));
        }
    }

    setInitialPreview() {
        const width = Math.max(
            document.documentElement.clientWidth || 0,
            window.innerWidth || 0
        );
        const height = Math.max(
            document.documentElement.clientHeight || 0,
            window.innerHeight || 0);

        if (width > height) {
            document.documentElement.style.setProperty('--aspect-ratio', '16/9');

            return 'pc-preview'
        }
        document.documentElement.style.setProperty('--aspect-ratio', '9/16');
        return 'mobile-preview'
    }

    setPreview(preview) {
        this.preview = preview
        if (preview === 'pc-preview') {
            document.documentElement.style.setProperty('--aspect-ratio', '16/9');
        } else {
            document.documentElement.style.setProperty('--aspect-ratio', '9/16');
        }

        // Update unit size for the new preview mode
        this.setUnitSize();

        return preview;
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    setUnitSize() {
        this.ui.setUnitSize();
    }

    // bootstrap helpers delegating to managers
    loadFromLocalStorage() {
        this.slideManager.loadFromLocalStorage();
        this.loadExpansionState();
        return;
    }
    saveToLocalStorage() {
        this.slideManager.saveToLocalStorage();
        this.saveExpansionState();
        return;
    }
    ensureInitialState() { return this.slideManager.ensureInitialState(); }
    getQuizTypeText(subtype) {
        const types = {
            'multiple-choice-carousel': 'اختبار من متعدد',
            'categorize': 'اختبار تصنيفي',
            'connect-quiz': 'اختبار التوصيل',
            'drag-match-quiz': 'اختبار السحب والتوصيل',
            'image-pairs-quiz': 'اختبار اختيار الصور'
        };
        return types[subtype] || subtype;
    }


    // re-expose slide manager methods so old callers still work
    addNewLesson() { return this.slideManager.addNewLesson(); }
    createNewSlide(type, subtype) { return this.slideManager.createNewSlide(type, subtype); }
    initializeNewSlideContent(type, subtype) { return this.slideManager.initializeNewSlideContent(type, subtype); }
    deleteSlideById(slideId) { return this.slideManager.deleteSlideById(slideId); }
    updateSlideContent(slideId, field, value) { return this.slideManager.updateSlideContent(slideId, field, value); }
    updateNestedContent(slideId, contentKey, index, key, value) { return this.slideManager.updateNestedContent(slideId, contentKey, index, key, value); }
    addBulletedListItem(slideId) { return this.slideManager.addBulletedListItem(slideId); }
    deleteBulletedListItem(slideId, index) { return this.slideManager.deleteBulletedListItem(slideId, index); }
    addExpandableListItem(slideId) { return this.slideManager.addExpandableListItem(slideId); }
    deleteExpandableListItem(slideId, index) { return this.slideManager.deleteExpandableListItem(slideId, index); }
    addTextSeriesItem(slideId) { return this.slideManager.addTextSeriesItem(slideId); }
    deleteTextSeriesItem(slideId, index) { return this.slideManager.deleteTextSeriesItem(slideId, index); }
    addImageSeriesItem(slideId) { return this.slideManager.addImageSeriesItem(slideId); }
    deleteImageSeriesItem(slideId, index) { return this.slideManager.deleteImageSeriesItem(slideId, index); }
    addImageCollectionSection(slideId) { return this.slideManager.addImageCollectionSection(slideId); }
    deleteImageCollectionSection(slideId, index) { return this.slideManager.deleteImageCollectionSection(slideId, index); }

    isQuizAnswerCorrect(slide) { return this.quizManager.isAnswerCorrect(slide); }
    setQuizUserChoice(slideId, choice) { return this.quizManager.setUserChoice(slideId, choice); }
    resetQuiz(slideId) { return this.quizManager.resetQuiz(slideId); }
    shouldShowQuizSubmit(slide) { return this.quizManager.shouldShowSubmitButton(slide); }
    handleQuizSubmit(slideId, containerId = null) { return this.quizManager.handleQuizSubmit(slideId, containerId); }
    isLessonExpanded(lessonId) {
        return this.expandedLessons.has(lessonId);
    }

    // Replace the entire setupSidebarToggles method with this:
    setupSidebarToggles() {
        const leftSidebar = document.querySelector('.edit-sidebar');
        const rightSidebar = document.querySelector('.sidebar');
        const leftToggle = document.getElementById('collapse-edit-sidebar');
        const rightToggle = document.getElementById('collapse-lessons-sidebar');
        const leftInternalToggle = document.getElementById('toggle-edit-sidebar');
        const rightInternalToggle = document.getElementById('toggle-sidebar');

        // Initialize button states based on current sidebar visibility
        this.updateToggleButtonStates();

        if (leftToggle && leftSidebar) {
            leftToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = leftSidebar.classList.contains('-translate-x-full');

                if (isCollapsed) {
                    // Expand left sidebar
                    leftSidebar.classList.remove('-translate-x-full', 'opacity-0', 'pointer-events-none');
                    this.saveSidebarStateForLesson(this.currentLessonId, 'left', false);
                } else {
                    // Collapse left sidebar
                    leftSidebar.classList.add('-translate-x-full', 'opacity-0', 'pointer-events-none');
                    this.saveSidebarStateForLesson(this.currentLessonId, 'left', true);
                }

                this.updateToggleButtonStates();
            });
        }

        if (rightToggle && rightSidebar) {
            rightToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isCollapsed = rightSidebar.classList.contains('translate-x-full');

                if (isCollapsed) {
                    // Expand right sidebar
                    rightSidebar.classList.remove('translate-x-full', 'opacity-0', 'pointer-events-none');
                    this.saveSidebarStateForLesson(this.currentLessonId, 'right', false);
                } else {
                    // Collapse right sidebar
                    rightSidebar.classList.add('translate-x-full', 'opacity-0', 'pointer-events-none');
                    this.saveSidebarStateForLesson(this.currentLessonId, 'right', true);
                }

                this.updateToggleButtonStates();
            });
        }

        // Keep existing internal toggle functionality
        if (leftInternalToggle && leftSidebar) {
            leftInternalToggle.addEventListener('click', () => {
                const currentlyCollapsed = leftSidebar.classList.contains('-translate-x-full');
                if (currentlyCollapsed) {
                    leftSidebar.classList.remove('-translate-x-full', 'opacity-0', 'pointer-events-none');
                    this.saveSidebarStateForLesson(this.currentLessonId, 'left', false);
                } else {
                    leftSidebar.classList.add('-translate-x-full', 'opacity-0', 'pointer-events-none');
                    this.saveSidebarStateForLesson(this.currentLessonId, 'left', true);
                }
                this.updateToggleButtonStates();
            });
        }

        if (rightInternalToggle && rightSidebar) {
            rightInternalToggle.addEventListener('click', () => {
                const currentlyCollapsed = rightSidebar.classList.contains('translate-x-full');
                if (currentlyCollapsed) {
                    rightSidebar.classList.remove('translate-x-full', 'opacity-0', 'pointer-events-none');
                    this.saveSidebarStateForLesson(this.currentLessonId, 'right', false);
                } else {
                    rightSidebar.classList.add('translate-x-full', 'opacity-0', 'pointer-events-none');
                    this.saveSidebarStateForLesson(this.currentLessonId, 'right', true);
                }
                this.updateToggleButtonStates();
            });
        }
    }

    // Add this new method to update button icons and visibility
    updateToggleButtonStates() {
        const leftSidebar = document.querySelector('.edit-sidebar');
        const rightSidebar = document.querySelector('.sidebar');
        const leftToggle = document.getElementById('collapse-edit-sidebar');
        const rightToggle = document.getElementById('collapse-lessons-sidebar');

        if (leftToggle && leftSidebar) {
            const isLeftCollapsed = leftSidebar.classList.contains('-translate-x-full');
            const icon = leftToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-chevron-right', isLeftCollapsed);
                icon.classList.toggle('fa-chevron-left', !isLeftCollapsed);
            }
            // Always show left toggle button
            leftToggle.classList.remove('hidden');
        }

        if (rightToggle && rightSidebar) {
            const isRightCollapsed = rightSidebar.classList.contains('translate-x-full');
            const icon = rightToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-chevron-left', isRightCollapsed);
                icon.classList.toggle('fa-chevron-right', !isRightCollapsed);
            }
            // Always show right toggle button
            rightToggle.classList.remove('hidden');
        }
    }

    toggleLessonExpansion(lessonId) {
        if (this.expandedLessons.has(lessonId)) {
            this.expandedLessons.delete(lessonId);
        } else {
            this.expandedLessons.add(lessonId);
        }
        this.saveExpansionState();
    }

    saveExpansionState() {
        try {
            localStorage.setItem('course_expanded_lessons', JSON.stringify(Array.from(this.expandedLessons)));
        } catch (err) {
            console.warn('Failed saving expansion state', err);
        }
    }

    loadExpansionState() {
        try {
            const raw = localStorage.getItem('course_expanded_lessons');
            if (raw) {
                const parsed = JSON.parse(raw);
                this.expandedLessons = new Set(parsed);
            }
        } catch (err) {
            console.warn('Failed loading expansion state', err);
        }
    }
    // renderers
    renderLessonsSidebar() { return this.ui.renderLessonsSidebar(); }
    renderSlidePreview(slide) { return this.ui.renderSlidePreview(slide); }
    renderUniversalComparison(slide, type) { return this.ui.renderUniversalComparison(slide, type); }
    renderQuizCarousel(slide) { return this.ui.renderQuizCarousel(slide); }
    renderQuizCategorize(slide) { return this.ui.renderQuizCategorize(slide); }
    renderExpandableListPreview(slide) { return this.ui.renderExpandableListPreview(slide); }
    renderVideoPreview(slide) { return this.ui.renderVideoPreview(slide); }
    renderBulletedListEditor(slide) { return this.ui.renderBulletedListEditor(slide); }
    renderComparisonTextEditor(slide) { return this.ui.renderComparisonTextEditor(slide); }
    renderExpandableListEditor(slide) { return this.ui.renderExpandableListEditor(slide); }
    renderVideoEditor(slide) { return this.ui.renderVideoEditor(slide); }
    renderQuizCarouselEditor(slide) { return this.ui.renderQuizCarouselEditor(slide); }
    renderImageComparisonEditor(slide) { return this.ui.renderImageComparisonEditor(slide); }
    renderSlideTemplates(category) { return this.ui.renderSlideTemplates(category); }
    loadSlideEditContent(slideId) { return this.ui.loadSlideEditContent(slideId); }
    loadSlidePreview(slideId) {
        const slide = this.findSlide(this.currentLessonId, slideId);
        return this.renderSlidePreview(slide);
    }

    // Return the currently active slide object or null if none
    getCurrentSlide() {
        if (!this.currentLessonId || this.currentSlideId == null) return null;
        return this.findSlide(this.currentLessonId, this.currentSlideId);
    }

    // ---------- Lost functions ----------
    showLessonEditForm() {
        const currentLesson = this.findLessonById(this.currentLessonId);
        if (!currentLesson) return;
        document.getElementById('lesson-title-input').value = currentLesson.title;
        document.getElementById('lesson-code-input').value = currentLesson.code;
        document.getElementById('edit-lesson-form').classList.remove('hidden');
        document.getElementById('lesson-title-display').classList.add('hidden');
    }

    hideLessonEditForm() {
        document.getElementById('edit-lesson-form').classList.add('hidden');
        document.getElementById('lesson-title-display').classList.remove('hidden');
    }

    saveLessonTitle() {
        const newTitle = document.getElementById('lesson-title-input').value.trim();
        // const newCode = document.getElementById('lesson-code-input').value.trim();
        const currentLesson = this.findLessonById(this.currentLessonId);
        if (!currentLesson) return;
        if (newTitle) currentLesson.title = newTitle;
        // currentLesson.code = newCode;
        // call updateLessonName function in api.js
        ApiService.updateLessonName(currentLesson.id, newTitle)
            .then(response => {
                console.log('Lesson updated successfully:', response);
                // Optionally, update local storage or re-render UI based on response
            })
            .catch(error => {
                console.error('Error updating lesson:', error);
                // Handle error
            });
        this.saveToLocalStorage();
        this.updateLessonHeader();
        this.renderLessonsSidebar();
        this.hideLessonEditForm();
    }
    showAddSlideModal() {
        if (this.dom.addSlideModal) this.dom.addSlideModal.classList.remove('hidden');
        // render default category
        this.renderSlideTemplates('text');
    }

    hideAddSlideModal() {
        if (this.dom.addSlideModal) this.dom.addSlideModal.classList.add('hidden');
    }

    // finders
    findLessonById(id) { return this.lessons.find(l => l.id === id); }
    findSlide(lessonId, slideId) {
        const lesson = this.findLessonById(lessonId);
        if (!lesson) return null;
        return lesson.slides.find(s => s.id === slideId) || null;
    }

    // ← ADD THIS
    getCurrentSlide() {
        if (!this.currentLessonId || this.currentSlideId == null) return null;
        return this.findSlide(this.currentLessonId, this.currentSlideId);
    }

    updateLessonHeader() {
        const curr = this.findLessonById(this.currentLessonId);
        if (!curr) return;
        if (this.dom.currentLessonTitle) this.dom.currentLessonTitle.textContent = curr.title;
        // if (this.dom.currentLessonCode) this.dom.currentLessonCode.textContent = `(الكود: ${curr.code})`;
    }

    // expose some UI methods used by UIInteractions
    getSlideTypeText(type) {
        const types = {
            'title': 'سلايد عنوان',
            'image': 'صورة',
            'video': 'فيديو',
            'quiz': 'اختبار',
            'interactive': 'تفاعلي',
            'content': 'محتوى',
            'pdf': 'ملف PDF'
        };
        return types[type] || type;
    }

    // Sidebar persistence helpers (delegated originally)
    saveSidebarStateForLesson(lessonId, side, collapsed) {
        if (!lessonId) return;
        try {
            const key = `sidebarState_${lessonId}_${side}`;
            localStorage.setItem(key, collapsed ? '1' : '0');
        } catch (err) {
            console.warn('Failed saving sidebar state', err);
        }
    }

    getSidebarStateForLesson(lessonId, side) {
        if (!lessonId) return false;
        try {
            const key = `sidebarState_${lessonId}_${side}`;
            return localStorage.getItem(key) === '1';
        } catch (err) {
            return false;
        }
    }

    applySidebarStateForLesson(lessonId) {
        try {
            const leftCollapsed = this.getSidebarStateForLesson(lessonId, 'left');
            const rightCollapsed = this.getSidebarStateForLesson(lessonId, 'right');

            const leftEl = document.querySelector('.edit-sidebar');
            const rightEl = document.querySelector('.sidebar');

            if (leftEl) {
                if (leftCollapsed) {
                    leftEl.classList.add('-translate-x-full', 'opacity-0', 'pointer-events-none');
                } else {
                    leftEl.classList.remove('-translate-x-full', 'opacity-0', 'pointer-events-none');
                }
            }

            if (rightEl) {
                if (rightCollapsed) {
                    rightEl.classList.add('translate-x-full', 'opacity-0', 'pointer-events-none');
                } else {
                    rightEl.classList.remove('translate-x-full', 'opacity-0', 'pointer-events-none');
                }
            }

            // ADD THIS LINE to update button states when applying saved state
            this.updateToggleButtonStates();
        } catch (err) {
            console.warn('Failed applying sidebar state', err);
        }
    }
    // TODO
    // --- Mobile UI wiring (delegated to UIRenderer)
    renderMobileSlidesBar() { return this.ui.renderMobileSlidesBar(); }
    syncMobileActiveSlide() {
        const slides = document.querySelectorAll('#mobile-slides-scroll .slide-square');
        slides.forEach(btn => {
            const sid = parseInt(btn.dataset.slideId, 10);
            btn.classList.toggle('active', sid === this.currentSlideId);
        });
        const lessonTabs = document.querySelectorAll('#mobile-lessons-tabs .lesson-tab');
        lessonTabs.forEach(tab => {
            const lid = parseInt(tab.dataset.lessonId, 10);
            tab.classList.toggle('active', lid === this.currentLessonId);
        });
    }
    attachMobileSlidesEvents() {
        const slidesScroll = document.getElementById('mobile-slides-scroll');
        const lessonsTabs = document.getElementById('mobile-lessons-tabs');
        const prevBtn = document.getElementById('mobile-slide-prev');
        const nextBtn = document.getElementById('mobile-slide-next');
        if (!slidesScroll || !lessonsTabs) return;

        slidesScroll.addEventListener('click', (e) => {
            const slideBtn = e.target.closest('.slide-square');
            if (!slideBtn) return;
            const sid = parseInt(slideBtn.dataset.slideId);
            const lid = parseInt(slideBtn.dataset.lessonId);
            if (!isNaN(lid)) this.currentLessonId = lid;
            if (!isNaN(sid)) {
                this.currentSlideId = sid;
                this.loadSlideEditContent(sid);
                this.syncMobileActiveSlide();
            }
        });

        lessonsTabs.addEventListener('click', (e) => {
            const tab = e.target.closest('.lesson-tab');
            if (!tab) return;
            const lid = parseInt(tab.dataset.lessonId);
            if (isNaN(lid)) return;
            this.currentLessonId = lid;
            const lesson = this.findLessonById(lid);
            this.currentSlideId = lesson.slides[0]?.id || null;
            this.renderMobileSlidesBar();
            this.loadSlideEditContent(this.currentSlideId);
        });

        if (prevBtn) prevBtn.addEventListener('click', () => this.navigateMobileSlide(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.navigateMobileSlide(1));
    }

    navigateMobileSlide(direction) {
        const lesson = this.findLessonById(this.currentLessonId);
        if (!lesson) return;
        const slides = lesson.slides;
        const idx = slides.findIndex(s => s.id === this.currentSlideId);
        let nextIndex = idx + direction;

        if (nextIndex < 0) {
            const currIdx = this.lessons.findIndex(l => l.id === this.currentLessonId);
            if (currIdx > 0) {
                this.currentLessonId = this.lessons[currIdx - 1].id;
                const prevLesson = this.findLessonById(this.currentLessonId);
                this.currentSlideId = prevLesson.slides[prevLesson.slides.length - 1].id;
            } else return;
        } else if (nextIndex >= slides.length) {
            const currIdx = this.lessons.findIndex(l => l.id === this.currentLessonId);
            if (currIdx < this.lessons.length - 1) {
                this.currentLessonId = this.lessons[currIdx + 1].id;
                const nextLesson = this.findLessonById(this.currentLessonId);
                this.currentSlideId = nextLesson.slides[0].id;
            } else return;
        } else {
            this.currentSlideId = slides[nextIndex].id;
        }

        this.renderMobileSlidesBar();
        this.loadSlideEditContent(this.currentSlideId);
        this.syncMobileActiveSlide();
    }

    // ---------- Resize Handles (kept as original)
    // TODO
    setupResizeHandles() {
        const resizeEdit = document.getElementById('resize-edit-sidebar');
        const resizeSidebar = document.getElementById('resize-sidebar');
        const leftSidebar = document.querySelector('.edit-sidebar');
        const rightSidebar = document.querySelector('.sidebar');

        if (!resizeEdit && !resizeSidebar) return;

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        let targetSide = null;

        const onMouseMove = (e) => {
            const viewportWidth = window.innerWidth;
            if (!isResizing || !targetSide) return;
            const deltaX = e.clientX - startX;
            let newWidth = startWidth;

            if (targetSide === 'left') {
                newWidth = Math.max(320, Math.min(500, startWidth + deltaX));
                leftSidebar.style.width = newWidth + 'px';
            } else if (targetSide === 'right') {
                newWidth = Math.max(320, Math.min(400, startWidth - deltaX));
                rightSidebar.style.width = newWidth + 'px';
            }
        };

        const onMouseUp = () => {
            isResizing = false;
            targetSide = null;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        if (resizeEdit) {
            resizeEdit.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isResizing = true;
                startX = e.clientX;
                startWidth = leftSidebar ? leftSidebar.getBoundingClientRect().width : 400;
                targetSide = 'left';
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });
        }

        if (resizeSidebar) {
            resizeSidebar.addEventListener('mousedown', (e) => {
                e.preventDefault();
                isResizing = true;
                startX = e.clientX;
                startWidth = rightSidebar ? rightSidebar.getBoundingClientRect().width : 380;
                targetSide = 'right';
                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';
                window.addEventListener('mousemove', onMouseMove);
                window.addEventListener('mouseup', onMouseUp);
            });
        }
    }

    attachDragAndDrop() {
        const lessonsContainer = this.dom.lessonsList;
        if (!lessonsContainer) return;

        let draggingLessonEl = null;
        let draggingSlideEl = null;
        let sourceLessonIdOfDraggingSlide = null;

        // LESSON drag with visual indicators
        lessonsContainer.querySelectorAll('.lesson-item').forEach(lessonEl => {
            lessonEl.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                draggingLessonEl = lessonEl;
                e.dataTransfer.effectAllowed = 'move';
                lessonEl.classList.add('dragging-lesson');
            });

            lessonEl.addEventListener('dragend', (e) => {
                e.stopPropagation();
                if (draggingLessonEl) draggingLessonEl.classList.remove('dragging-lesson');
                draggingLessonEl = null;

                // Clean up all indicators
                this.cleanupDropIndicators();
            });

            lessonEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';

                if (draggingLessonEl && draggingLessonEl !== lessonEl) {
                    this.showLessonDropIndicator(lessonEl, e);
                }
            });

            lessonEl.addEventListener('dragleave', (e) => {
                // Only remove indicator if we're leaving the lesson element entirely
                if (!lessonEl.contains(e.relatedTarget)) {
                    this.cleanupDropIndicators();
                }
            });

            lessonEl.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!draggingLessonEl || draggingLessonEl === lessonEl) return;

                const draggedLessonId = parseInt(draggingLessonEl.dataset.lessonId, 10);
                const targetLessonId = parseInt(lessonEl.dataset.lessonId, 10); // The lesson we are dropping ON

                const draggedLesson = this.lessons.find(l => l.id === draggedLessonId);
                if (!draggedLesson) return;

                // Determine if the drop is before or after the target lesson
                const rect = lessonEl.getBoundingClientRect();
                const isBefore = e.clientY < rect.top + rect.height / 2;

                // Remove the dragged lesson from its current position in the array
                this.lessons = this.lessons.filter(l => l.id !== draggedLessonId);

                // Find the new index for insertion
                let newIndex = this.lessons.findIndex(l => l.id === targetLessonId);
                if (newIndex === -1) newIndex = this.lessons.length; // If target not found, append
                if (!isBefore && newIndex < this.lessons.length) newIndex++; // Insert after if specified

                // Insert the dragged lesson at the calculated new position
                this.lessons.splice(newIndex, 0, draggedLesson);

                // Prepare data for API call
                const updatedOrder = this.lessons.map((lesson, index) => ({
                    id: lesson.id,
                    order_index: index + 1 // Assuming order_index is 1-based
                }));

                // Call API to update lesson order
                ApiService.updateLessonOrder(updatedOrder)
                    .then(response => {
                        console.log('Lesson order updated successfully:', response);
                        this.saveToLocalStorage();
                        this.renderLessonsSidebar();
                    })
                    .catch(error => {
                        console.error('Error updating lesson order:', error);
                        // Revert UI changes or show error message
                        this.loadFromLocalStorage(); // Revert to last saved state
                        this.renderLessonsSidebar();
                    });

                // Clean up indicators before processing drop
                this.cleanupDropIndicators();
            });
        });

        // SLIDE drag with visual indicators
        lessonsContainer.querySelectorAll('.lesson-item').forEach(lessonEl => {
            const slidesContainer = lessonEl.querySelector('.lesson-slides');
            if (!slidesContainer) return;

            slidesContainer.querySelectorAll('.slide-item').forEach(slideEl => {
                slideEl.addEventListener('dragstart', (e) => {
                    e.stopPropagation();
                    draggingSlideEl = slideEl;
                    sourceLessonIdOfDraggingSlide = parseInt(slideEl.dataset.lessonId, 10);
                    e.dataTransfer.effectAllowed = 'move';
                    slideEl.classList.add('dragging-slide');
                    e.dataTransfer.setData('text/plain', JSON.stringify({
                        slideId: slideEl.dataset.slideId,
                        sourceLessonId: sourceLessonIdOfDraggingSlide
                    }));
                });

                slideEl.addEventListener('dragend', (e) => {
                    e.stopPropagation();
                    if (draggingSlideEl) draggingSlideEl.classList.remove('dragging-slide');
                    draggingSlideEl = null;
                    sourceLessonIdOfDraggingSlide = null;

                    // Clean up all indicators
                    this.cleanupDropIndicators();
                });

                slideEl.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';

                    if (draggingSlideEl) {
                        this.showSlideDropIndicator(slideEl, e);
                    }
                });

                slideEl.addEventListener('dragleave', (e) => {
                    // Only remove indicator if we're leaving the slide element entirely
                    if (!slideEl.contains(e.relatedTarget)) {
                        this.cleanupDropIndicators();
                    }
                });

                // Handle dropping slides onto other slides
                slideEl.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Clean up indicators before processing drop
                    this.cleanupDropIndicators();

                    let payload = null;
                    try {
                        const txt = e.dataTransfer.getData('text/plain');
                        if (txt) payload = JSON.parse(txt);
                    } catch (err) { }

                    const draggedSlideId = payload ? parseInt(payload.slideId, 10) : (draggingSlideEl ? parseInt(draggingSlideEl.dataset.slideId, 10) : null);
                    const draggedFromLessonId = payload ? parseInt(payload.sourceLessonId, 10) : sourceLessonIdOfDraggingSlide;

                    if (!draggedSlideId) return;

                    const targetSlideId = parseInt(slideEl.dataset.slideId, 10);
                    const targetLessonId = parseInt(slideEl.dataset.lessonId, 10);

                    // Don't allow dropping on itself
                    if (draggedSlideId === targetSlideId) return;

                    // Determine drop position based on mouse Y position
                    const rect = slideEl.getBoundingClientRect();
                    const isDropBefore = e.clientY < rect.top + rect.height / 2;

                    // Find and remove the dragged slide from its source lesson
                    const srcLesson = this.findLessonById(draggedFromLessonId);
                    let draggedSlideObj = null;

                    if (srcLesson) {
                        const srcIndex = srcLesson.slides.findIndex(s => s.id === draggedSlideId);
                        if (srcIndex > -1) {
                            draggedSlideObj = srcLesson.slides.splice(srcIndex, 1)[0];
                        }
                    }

                    // Fallback: search all lessons if not found
                    if (!draggedSlideObj && draggingSlideEl) {
                        for (const l of this.lessons) {
                            const idx = l.slides.findIndex(s => s.id === draggedSlideId);
                            if (idx > -1) {
                                draggedSlideObj = l.slides.splice(idx, 1)[0];
                                break;
                            }
                        }
                    }

                    if (!draggedSlideObj) return;

                    // Update the lesson ID if moving to a different lesson
                    if (draggedFromLessonId !== targetLessonId) {
                        draggedSlideObj.lessonId = targetLessonId;
                    }

                    // Find target lesson and calculate insertion index
                    const targetLesson = this.findLessonById(targetLessonId);
                    if (!targetLesson) return;

                    // Find the current position of the target slide
                    let insertionIndex = targetLesson.slides.findIndex(s => s.id === targetSlideId);

                    if (insertionIndex === -1) {
                        // Target slide not found, append to end
                        insertionIndex = targetLesson.slides.length;
                    } else {
                        // Insert before or after based on drop position
                        if (!isDropBefore) {
                            insertionIndex++;
                        }
                    }

                    // Ensure index is within valid range
                    insertionIndex = Math.max(0, Math.min(targetLesson.slides.length, insertionIndex));

                    // Insert the slide at the calculated position
                    targetLesson.slides.splice(insertionIndex, 0, draggedSlideObj);

                    this.saveToLocalStorage();
                    this.renderLessonsSidebar();
                    this.currentLessonId = targetLessonId;
                    this.currentSlideId = draggedSlideObj.id;
                    this.loadSlideEditContent(this.currentSlideId);
                });
            });

            // Handle dropping slides into empty lesson areas
            slidesContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'move';

                if (draggingSlideEl) {
                    // Show indicator at the end of the slides list
                    this.showLessonEmptyAreaIndicator(slidesContainer, e);
                }
            });

            slidesContainer.addEventListener('dragleave', (e) => {
                if (!slidesContainer.contains(e.relatedTarget)) {
                    this.cleanupDropIndicators();
                }
            });

            slidesContainer.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Clean up indicators before processing drop
                this.cleanupDropIndicators();

                let payload = null;
                try {
                    const txt = e.dataTransfer.getData('text/plain');
                    if (txt) payload = JSON.parse(txt);
                } catch (err) { }
                const draggedSlideId = payload ? parseInt(payload.slideId, 10) : (draggingSlideEl ? parseInt(draggingSlideEl.dataset.slideId, 10) : null);
                const draggedFromLessonId = payload ? parseInt(payload.sourceLessonId, 10) : sourceLessonIdOfDraggingSlide;
                if (!draggedSlideId) return;

                const srcLesson = this.findLessonById(draggedFromLessonId);
                let draggedSlideObj = null;
                if (srcLesson) {
                    const srcIndex = srcLesson.slides.findIndex(s => s.id === draggedSlideId);
                    if (srcIndex > -1) draggedSlideObj = srcLesson.slides.splice(srcIndex, 1)[0];
                }
                if (!draggedSlideObj) {
                    for (const l of this.lessons) {
                        const idx = l.slides.findIndex(s => s.id === draggedSlideId);
                        if (idx > -1) {
                            draggedSlideObj = l.slides.splice(idx, 1)[0];
                            break;
                        }
                    }
                }
                if (!draggedSlideObj) return;

                const lessonId = parseInt(lessonEl.dataset.lessonId, 10);
                const targetLesson = this.findLessonById(lessonId);
                if (!targetLesson) return;
                targetLesson.slides.push(draggedSlideObj);
                this.saveToLocalStorage();
                this.renderLessonsSidebar();
                this.currentLessonId = lessonId;
                this.currentSlideId = draggedSlideObj.id;
                this.loadSlideEditContent(this.currentSlideId);
            });
        });
    }

    // Add these new helper methods to the CourseEditor class:

    /**
     * Show drop indicator for lesson reordering
     */
    showLessonDropIndicator(lessonEl, e) {
        this.cleanupDropIndicators();

        const rect = lessonEl.getBoundingClientRect();
        const isBefore = e.clientY < rect.top + rect.height / 2;

        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator lesson-drop-indicator';
        indicator.style.cssText = `
        position: absolute;
        ${isBefore ? 'top: -2px' : 'bottom: -2px'};
        left: 10px;
        right: 10px;
        height: 3px;
        background: linear-gradient(90deg, #3b82f6, #60a5fa);
        border-radius: 2px;
        z-index: 100;
        animation: pulse-glow 1.5s ease-in-out infinite;
    `;

        lessonEl.parentNode.insertBefore(indicator, isBefore ? lessonEl : lessonEl.nextSibling);

        // Also highlight the target lesson
        lessonEl.classList.add('drop-target');
    }

    /**
     * Show drop indicator for slide reordering
     */
    showSlideDropIndicator(slideEl, e) {
        this.cleanupDropIndicators();

        const rect = slideEl.getBoundingClientRect();
        const isBefore = e.clientY < rect.top + rect.height / 2;

        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator slide-drop-indicator';
        indicator.style.cssText = `
        position: absolute;
        ${isBefore ? 'top: -2px' : 'bottom: -2px'};
        left: 20px;
        right: 20px;
        height: 3px;
        background: linear-gradient(90deg, #10b981, #34d399);
        border-radius: 2px;
        z-index: 100;
        animation: pulse-glow 1.5s ease-in-out infinite;
    `;

        slideEl.parentNode.insertBefore(indicator, isBefore ? slideEl : slideEl.nextSibling);

        // Also highlight the target slide
        slideEl.classList.add('drop-target');
    }

    /**
     * Show indicator for dropping into empty lesson area
     */
    showLessonEmptyAreaIndicator(slidesContainer, e) {
        this.cleanupDropIndicators();

        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator lesson-empty-indicator';
        indicator.style.cssText = `
        width: 100%;
        height: 4px;
        background: linear-gradient(90deg, #8b5cf6, #a78bfa);
        border-radius: 2px;
        margin: 8px 0;
        animation: pulse-glow 1.5s ease-in-out infinite;
    `;

        // Add to the end of slides container
        slidesContainer.appendChild(indicator);
        slidesContainer.classList.add('drop-target');
    }

    /**
     * Clean up all drop indicators
     */
    cleanupDropIndicators() {
        // Remove all indicator elements
        document.querySelectorAll('.drop-indicator').forEach(ind => ind.remove());

        // Remove all drop target highlighting
        document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
        document.querySelectorAll('.lesson-slides').forEach(el => el.classList.remove('drop-target'));
    }

    saveLessonOrderFromDOM() {
        const container = this.dom.lessonsList;
        if (!container) return;
        const newOrder = Array.from(container.querySelectorAll('.lesson-item')).map(el => parseInt(el.dataset.lessonId, 10));
        if (!newOrder.length) return;
        this.lessons.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
        this.saveToLocalStorage();
    }

    saveSlideOrderFromDOMForLesson(lessonId) {
        const lessonEl = this.dom.lessonsList.querySelector(`.lesson-item[data-lesson-id="${lessonId}"]`);
        if (!lessonEl) return;
        const slidesContainer = lessonEl.querySelector('.lesson-slides');
        if (!slidesContainer) return;
        const slideEls = Array.from(slidesContainer.querySelectorAll('.slide-item'));
        const newOrder = slideEls.map(el => parseInt(el.dataset.slideId, 10));
        const lesson = this.findLessonById(parseInt(lessonId, 10));
        if (!lesson) return;
        lesson.slides.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
        this.saveToLocalStorage();
    }

    // smoke tests (kept)
    runSmokeTests() {
        try {
            // console.group('%cSMOKE TESTS', 'color:#1e90ff; font-weight:bold;');
            const errors = [];

            if (!this.lessons.length) errors.push('لا توجد دروس في النظام (expected >=1)');

            const lessonIds = this.lessons.map(l => l.id);
            const dupLesson = findDuplicate(lessonIds);
            if (dupLesson) errors.push(`معرف درس مكرر: ${dupLesson}`);

            this.lessons.forEach(l => {
                const sids = l.slides.map(s => s.id);
                const dup = findDuplicate(sids);
                if (dup) errors.push(`درس "${l.title}" يحتوي معرف شريحة مكرر: ${dup}`);
            });

            const tempLesson = new Lesson({ id: -999, title: 'temp', slides: [new Slide({ id: 1 })] });
            tempLesson.slides.pop();
        } catch (err) {
        }

        function findDuplicate(arr) {
            const seen = new Set();
            for (const x of arr) {
                if (seen.has(x)) return x;
                seen.add(x);
            }
            return null;
        }

    }

    setupSlideNavigation() {
        const prevBtn = document.getElementById('prev-slide-btn');
        const nextBtn = document.getElementById('next-slide-btn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.navigateToAdjacentSlide(-1));
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.navigateToAdjacentSlide(1));
        }

        // Add keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.navigateToAdjacentSlide(-1);
            } else if (e.key === 'ArrowRight') {
                this.navigateToAdjacentSlide(1);
            }
        });

        // Initial update of button states
        this.updateNavigationButtons();
    }

    /**
     * Navigate to previous or next slide
     * @param {number} direction - -1 for previous, 1 for next
     */
    navigateToAdjacentSlide(direction) {
        if (!this.currentLessonId || !this.currentSlideId) return;

        const lesson = this.findLessonById(this.currentLessonId);
        if (!lesson || !lesson.slides.length) return;

        const currentIndex = lesson.slides.findIndex(slide => slide.id === this.currentSlideId);
        if (currentIndex === -1) return;

        const newIndex = currentIndex + direction;

        // Check bounds
        if (newIndex >= 0 && newIndex < lesson.slides.length) {
            const newSlide = lesson.slides[newIndex];

            // Add animation class
            this.addSlideTransitionAnimation(direction);

            // Small delay to allow animation to play
            setTimeout(() => {
                this.currentSlideId = newSlide.id;
                this.loadSlideEditContent(newSlide.id);
                this.loadSlidePreview(newSlide.id);
                this.updateNavigationButtons();
                this.syncMobileActiveSlide();

                this.renderLessonsSidebar();
            }, 150);
        }
    }

    /**
     * Add slide transition animation
     * @param {number} direction - -1 for left, 1 for right
     */
    addSlideTransitionAnimation(direction) {
        const previewContent = document.getElementById('slide-preview-content');
        if (!previewContent) return;

        // Remove any existing animation classes
        previewContent.classList.remove('slide-transition-prev', 'slide-transition-next');

        // Force reflow
        void previewContent.offsetWidth;

        // Add appropriate animation class
        if (direction === -1) {
            previewContent.classList.add('slide-transition-prev');
        } else {
            previewContent.classList.add('slide-transition-next');
        }

        // Remove animation class after animation completes
        setTimeout(() => {
            previewContent.classList.remove('slide-transition-prev', 'slide-transition-next');
        }, 300);
    }

    /**
     * Update navigation button states based on current position
     */
    updateNavigationButtons() {
        const prevBtn = document.getElementById('prev-slide-btn');
        const nextBtn = document.getElementById('next-slide-btn');

        if (!prevBtn || !nextBtn) return;

        if (!this.currentLessonId || !this.currentSlideId) {
            // No slide selected - hide buttons
            prevBtn.classList.add('disabled');
            nextBtn.classList.add('disabled');
            return;
        }

        const lesson = this.findLessonById(this.currentLessonId);
        if (!lesson || !lesson.slides.length) {
            prevBtn.classList.add('disabled');
            nextBtn.classList.add('disabled');
            return;
        }

        const currentIndex = lesson.slides.findIndex(slide => slide.id === this.currentSlideId);

        // Update previous button
        if (currentIndex <= 0) {
            prevBtn.classList.add('disabled');
        } else {
            prevBtn.classList.remove('disabled');
        }

        // Update next button
        if (currentIndex >= lesson.slides.length - 1) {
            nextBtn.classList.add('disabled');
        } else {
            nextBtn.classList.remove('disabled');
        }
    }
}

// auto-init in browser and keep backward-compatibility on window
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
        // check if the the screen is mobile screen redirect to preview.html page with same name attribute in the url and add ps=presenter attribute
        if (window.innerWidth < 768) {
            const urlParams = new URLSearchParams(window.location.search);
            const courseName = urlParams.get('name');
            if (courseName) {
                window.location.href = `preview.html?name=${courseName}&ps=presenter`;
                return;
            }
        }
        // Show loader immediately when page starts loading
        showLoader(10, 'جاري التحقق من بيانات الدورة...');

        try {
            // Check for course (this might be async)
            await checkForCourse();

            // Update loader progress
            updateLoader(50, 'جاري تحميل المحتوى...');

            // Initialize editor
            const editor = new CourseEditor();
            window.courseEditor = editor;

            // Hide loader when everything is ready
            setTimeout(() => {
                updateLoader(100, 'تم التحميل بنجاح!');
                setTimeout(hideLoader, 500);
            }, 500);

        } catch (err) {
            console.error('Initialization error:', err);
            updateLoader(0, 'حدث خطأ في التحميل');
            setTimeout(hideLoader, 2000);
        }
    });
}