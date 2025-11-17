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
const urlParams = new URLSearchParams(window.location.search);
////////////////////////////////////////////////////
async function checkForCourse() {
    try {
        // when the page tries to load use the api function in api.js module getCourseDetails sending the url attribute name as a parameter and console log the response use async await to avoid callback
        const courseId = urlParams.get('name');

        if (courseId) {
            ApiService.getCourseDetails(courseId)
                .then(courseDetails => {
                    if (!courseDetails.exists) window.location.href = '404.html'
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
        this.page = 'preview';
        document.body.classList.add('preview-page')
        // state
        this.lessons = [];
        this.currentLessonId = null;
        this.currentSlideId = null;
        this.expandedLessons = new Set();

        this.progressMap = {}; // Stores all courses progress
        this.mostRecentSlide = null; // { lessonId, slideId } for current course
        this.currentCourseId = localStorage.getItem('C_id');
        this.quizScores = {}; // Stores quiz scores by slide ID
        this.isLoadingScores = false; // Prevent multiple simultaneous loads

        // dom refs
        this.dom = {
            previewActions: document.getElementById('preview-actions'),
            previewContainer: document.getElementById('preview-container'),
            totalSlidesNumber: document.getElementById('total-slides'),
            currentSlideNumber: document.getElementById('current-slide'),
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

        // Get ps parameter from url
        this.authority = urlParams.get('ps'); // 'ps' for preview size
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
        this.initializeProgressSystem();

        // interactions & drag system
        this.assetsManager = new AssetsManager(this);
        this.quizManager = new QuizManager(this);
        this.interactions = new UIInteractions(this);
        this.dragManager = new DragDropManager(this);

        // mobile rendering
        this.renderMobileSlidesBar();

        // run smoke tests
        this.runSmokeTests();

        // Initialize progress system AFTER lessons are loaded (async)
        this.initProgressAfterLessonsLoad();

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
    setLessonSizes() {
        this.lessonSizes = this.lessons.map(l => l.slides.length)
        this.slidesLocks = this.lessons.map((l, i) => {
            return l.slides.map((s, j) => {
                if (i < this.progress.lessonIndex) { return true }
                if (i == this.progress.lessonIndex && j <= this.progress.slideIndex + 1) { return true }
                if (i == this.progress.lessonIndex + 1 && j === 0) {
                    if (this.lessons.at(i - 1)?.slides.length - 1 === this.progress.slideIndex) {
                        return true
                    }
                }
                return false
            })

        })
    }

    async loadQuizScores() {
        if (this.isLoadingScores) return;

        this.isLoadingScores = true;
        try {
            const scores = await ApiService.getQuizScores();
            this.quizScores = {};

            scores.forEach(score => {
                this.quizScores[score.slide_n] = {
                    submitted: true,
                    content: score.content ? JSON.parse(score.content) : null,
                    score: score.score,
                    correctAnswers: score.correct_answers,
                    totalQuestions: score.total_questions
                };
            });

            console.log('Loaded quiz scores:', this.quizScores);
        } catch (error) {
            console.error('Failed to load quiz scores:', error);
        } finally {
            this.isLoadingScores = false;
        }
    }

    // NEW: Save quiz score to backend
    async saveQuizScore(slide) {
        if (!slide || !slide.submitted) return;

        try {
            const isCorrect = this.isQuizAnswerCorrect(slide);
            const totalQuestions = 1; // Each quiz slide counts as one question

            const scoreData = {
                course_id: this.currentCourseId,
                lesson_id: this.currentLessonId,
                score: isCorrect ? 100 : 0,
                total_questions: totalQuestions,
                correct_answers: isCorrect ? 1 : 0,
                slide_n: slide.id,
                content: JSON.stringify(slide)
            };

            await ApiService.saveQuizScore(scoreData);

            // Update local cache
            this.quizScores[slide.id] = {
                submitted: true,
                content: slide,
                score: scoreData.score,
                correctAnswers: scoreData.correct_answers,
                totalQuestions: scoreData.total_questions
            };

            console.log('Quiz score saved successfully');
        } catch (error) {
            console.error('Failed to save quiz score:', error);
        }
    }

    // NEW: Check if a quiz slide has been answered
    isQuizAnswered(slideId) {
        return !!this.quizScores[slideId];
    }

    // NEW: Get quiz result for a slide
    getQuizResult(slideId) {
        return this.quizScores[slideId] || null;
    }

    loadQuizStateFromScores() {
        console.log('Loading quiz state from scores...', this.quizScores);

        // Iterate through all lessons and their slides
        this.lessons.forEach(lesson => {
            lesson.slides.forEach(slide => {
                if (slide.type === 'quiz') {
                    const score = this.quizScores[slide.id];
                    if (score && score.content) {
                        console.log(`Restoring quiz state for slide ${slide.id}`, score);

                        // Restore quiz state from saved content
                        slide.submitted = true;

                        // Restore user answers based on quiz type
                        switch (slide.subtype) {
                            case 'multiple-choice-carousel':
                            case 'categorize':
                                slide.userChoice = score.content.userChoice;
                                console.log(`Restored userChoice for slide ${slide.id}:`, slide.userChoice);
                                break;
                            case 'connect-quiz':
                                slide.userConnections = score.content.userConnections || [];
                                console.log(`Restored userConnections for slide ${slide.id}:`, slide.userConnections);
                                break;
                            case 'drag-match-quiz':
                                slide.userMatches = score.content.userMatches || [];
                                console.log(`Restored userMatches for slide ${slide.id}:`, slide.userMatches);
                                break;
                            case 'image-pairs-quiz':
                                slide.userSelections = score.content.userSelections || { left: [], right: [] };
                                console.log(`Restored userSelections for slide ${slide.id}:`, slide.userSelections);
                                break;
                        }
                    }
                }
            });
        });

        // Save to localStorage to persist the restored states
        this.saveToLocalStorage();
        console.log('Quiz state loading complete');
    }

    async initProgressAfterLessonsLoad() {
        // Wait for lessons to be loaded
        if (this.lessons.length === 0) {
            // Retry after a short delay
            setTimeout(() => this.initProgressAfterLessonsLoad(), 100);
            return;
        }

        await this.initializeProgressSystem();

        // After initialization, refresh the current slide to show proper quiz state
        if (this.currentSlideId) {
            const slide = this.findSlide(this.currentLessonId, this.currentSlideId);
            if (slide && slide.type === 'quiz') {
                this.loadSlidePreview(this.currentSlideId);
            }
        }
    }

    async initializeProgressSystem() {
        try {
            console.log('Starting progress initialization...');
            // Load progress map from API
            this.progressMap = await ApiService.getUserProgress();

            // Ensure progressMap is a valid object
            if (!this.progressMap || typeof this.progressMap !== 'object') {
                console.warn('Invalid progressMap received, initializing empty object');
                this.progressMap = {};
            }

            // Initialize current course progress if doesn't exist
            if (!this.progressMap[this.currentCourseId]) {
                console.log('Initializing progress for course:', this.currentCourseId);
                this.progressMap[this.currentCourseId] = {};
            }

            // NEW: Load quiz scores
            await this.loadQuizScores();
            this.loadQuizStateFromScores();

            // Set most recent slide
            await this.findAndSetMostRecentSlide();
            console.log('Most recent slide:', this.mostRecentSlide);

            // Re-render sidebar to show unlocked status
            this.renderLessonsSidebar();

            // If there's a most recent slide, load it
            if (this.mostRecentSlide) {
                this.currentLessonId = this.mostRecentSlide.lessonId;
                this.currentSlideId = this.mostRecentSlide.slideId;

                // NEW: Ensure quiz state is loaded before rendering
                const slide = this.findSlide(this.currentLessonId, this.currentSlideId);
                const processedSlide = this.ensureQuizStateBeforeRender(slide);
                this.renderSlidePreview(processedSlide);

                this.setSlideCounter();
            }

            // Start periodic saving
            this.startProgressAutoSave();

        } catch (error) {
            console.error('Error initializing progress system:', error);
            // Fallback: initialize empty progress
            this.progressMap = {};
            this.progressMap[this.currentCourseId] = {};
            await this.findAndSetMostRecentSlide();
            this.renderLessonsSidebar();
        }
    }

    // Replace the findAndSetMostRecentSlide method with this:
    async findAndSetMostRecentSlide() {
        const courseProgress = this.progressMap[this.currentCourseId] || {};
        const nonDraftLessons = this.lessons.filter(lesson => lesson.status !== 'Draft');

        // If no non-draft lessons, set mostRecentSlide to null
        if (nonDraftLessons.length === 0) {
            this.mostRecentSlide = null;
            return;
        }

        // Case 1: Find first lesson with unvisited slides
        for (const lesson of nonDraftLessons) {
            const visitedSlides = courseProgress[lesson.id] || [];
            const unvisitedSlides = lesson.slides.filter(slide => !visitedSlides.includes(slide.id));

            if (unvisitedSlides.length > 0) {
                // Take first unvisited slide in this lesson
                this.mostRecentSlide = {
                    lessonId: lesson.id,
                    slideId: unvisitedSlides[0].id
                };
                return;
            }
        }

        // Case 2: All slides visited or no progress - unlock first slide of first lesson
        const firstLesson = nonDraftLessons[0];
        if (firstLesson && firstLesson.slides.length > 0) {
            this.mostRecentSlide = {
                lessonId: firstLesson.id,
                slideId: firstLesson.slides[0].id
            };

            // Initialize lesson progress if needed
            if (!courseProgress[firstLesson.id]) {
                courseProgress[firstLesson.id] = [];
                this.progressMap[this.currentCourseId] = courseProgress;
            }
            return;
        }

        // Case 3: No lessons or slides available
        this.mostRecentSlide = null;
    }

    // Add this helper method to check initial state
    ensureProgressInitialized() {
        // Ensure progressMap exists
        if (!this.progressMap) {
            this.progressMap = {};
        }

        // Ensure current course exists in progressMap
        if (!this.progressMap[this.currentCourseId]) {
            this.progressMap[this.currentCourseId] = {};
        }

        // If no mostRecentSlide set, find it
        if (!this.mostRecentSlide) {
            this.findAndSetMostRecentSlide();
        }
    }


    // NEW: Check if a slide is unlocked
    isSlideUnlocked(lessonId, slideId) {
        const courseProgress = this.progressMap[this.currentCourseId] || {};
        const lessonProgress = courseProgress[lessonId] || [];

        // Check if slide is visited
        if (lessonProgress.includes(slideId)) {
            return true;
        }

        // Check if this is the most recent slide
        if (this.mostRecentSlide &&
            this.mostRecentSlide.lessonId === lessonId &&
            this.mostRecentSlide.slideId === slideId) {
            return true;
        }

        return false;
    }

    // NEW: Check if a lesson is unlocked
    isLessonUnlocked(lessonId) {
        const courseProgress = this.progressMap[this.currentCourseId] || {};
        const lessonProgress = courseProgress[lessonId] || [];

        // Lesson is unlocked if it has any visited slides OR it contains the most recent slide
        if (lessonProgress.length > 0) {
            return true;
        }

        if (this.mostRecentSlide && this.mostRecentSlide.lessonId === lessonId) {
            return true;
        }

        return false;
    }

    // NEW: Mark slide as visited and progress to next
    async markSlideVisited(lessonId, slideId) {
        const courseProgress = this.progressMap[this.currentCourseId] || {};

        // Initialize lesson progress if doesn't exist
        if (!courseProgress[lessonId]) {
            courseProgress[lessonId] = [];
        }

        // Add slide to visited if not already there
        if (!courseProgress[lessonId].includes(slideId)) {
            courseProgress[lessonId].push(slideId);
        }

        // Update progress map
        this.progressMap[this.currentCourseId] = courseProgress;

        // If this was the most recent slide, find next one
        if (this.mostRecentSlide &&
            this.mostRecentSlide.lessonId === lessonId &&
            this.mostRecentSlide.slideId === slideId) {
            await this.findAndSetMostRecentSlide();

            // If we found a new most recent slide, mark its lesson as visited
            if (this.mostRecentSlide) {
                const newLessonId = this.mostRecentSlide.lessonId;
                if (!courseProgress[newLessonId]) {
                    courseProgress[newLessonId] = [];
                }
                this.progressMap[this.currentCourseId] = courseProgress;
            }
        }

        // Save progress
        await this.saveProgress();
    }

    // NEW: Save progress to backend
    async saveProgress() {
        try {
            await ApiService.saveUserProgress(this.progressMap);
        } catch (error) {
            console.error('Failed to save progress:', error);
            // Store in localStorage as fallback
            localStorage.setItem('progressMapBackup', JSON.stringify(this.progressMap));
        }
    }

    // NEW: Auto-save progress every 15 seconds
    startProgressAutoSave() {
        setInterval(() => {
            this.saveProgress();
        }, 15000);
    }

    async updateProress(cid, lid, sid) {
        // console.log(cid, lid, sid)
        await ApiService.saveUserProgress(cid, lid, sid);
        this.progress = await ApiService.getUserProgress(localStorage.getItem('C_id'))
        this.ui.renderLessonsSidebar();
    }

    getIndices() {

        // 1. Find lesson index
        const lessonIndex = this.lessons.findIndex(l => l.id === this.currentLessonId);
        if (lessonIndex === -1) return null;

        const lesson = this.lessons[lessonIndex];
        const slides = lesson.slides;
        const slidesLength = slides.length;

        // 2. Find slide index inside this lesson
        const slideIndex = slides.findIndex(s => s.id === this.currentSlideId);
        if (slideIndex === -1) return { lessonIndex, lessonsLength: this.lessons.length, slidesLength, slideIndex: -1 };

        return { lessonIndex, lessonsLength: this.lessons.length, slideIndex, slidesLength };
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

        // NEW: Ensure quiz state is loaded before rendering
        const processedSlide = this.ensureQuizStateBeforeRender(slide);

        // Save the updated slide state
        this.saveToLocalStorage();

        return this.renderSlidePreview(processedSlide);
    }

    // Return the currently active slide object or null if none
    getCurrentSlide() {
        if (!this.currentLessonId || this.currentSlideId == null) return null;
        return this.findSlide(this.currentLessonId, this.currentSlideId);
    }

    // NEW: Ensure quiz state is loaded before rendering
    ensureQuizStateBeforeRender(slide) {
        if (!slide || slide.type !== 'quiz') return slide;

        const slideId = slide.id;

        // Check if this quiz has been answered
        if (this.isQuizAnswered(slideId)) {
            const quizResult = this.getQuizResult(slideId);
            if (quizResult && quizResult.content) {
                console.log('Restoring quiz state for slide', slideId, quizResult);

                // Restore the quiz state from saved score
                slide.submitted = true;

                // Restore user answers based on quiz type
                switch (slide.subtype) {
                    case 'multiple-choice-carousel':
                    case 'categorize':
                        slide.userChoice = quizResult.content.userChoice;
                        console.log('Restored userChoice:', slide.userChoice);
                        break;
                    case 'connect-quiz':
                        slide.userConnections = quizResult.content.userConnections || [];
                        console.log('Restored userConnections:', slide.userConnections);
                        break;
                    case 'drag-match-quiz':
                        slide.userMatches = quizResult.content.userMatches || [];
                        console.log('Restored userMatches:', slide.userMatches);
                        break;
                    case 'image-pairs-quiz':
                        slide.userSelections = quizResult.content.userSelections || { left: [], right: [] };
                        console.log('Restored userSelections:', slide.userSelections);
                        break;
                }
            }
        }

        return slide;
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
        console.log('navigateMobileSlide')
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
            } else {
                this.setSlideCounter();
                return
            };
        } else if (nextIndex >= slides.length) {
            const currIdx = this.lessons.findIndex(l => l.id === this.currentLessonId);
            if (currIdx < this.lessons.length - 1) {
                this.currentLessonId = this.lessons[currIdx + 1].id;
                const nextLesson = this.findLessonById(this.currentLessonId);
                this.currentSlideId = nextLesson.slides[0].id;
            } else {
                this.setSlideCounter();
                return
            };
        } else {
            this.currentSlideId = slides[nextIndex].id;
        }
        this.renderMobileSlidesBar();
        this.loadSlideEditContent(this.currentSlideId);
        this.syncMobileActiveSlide();
        this.setSlideCounter();
    }

    // ---------- Resize Handles (kept as original)
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
                newWidth = Math.max(250, Math.min(400, startWidth + deltaX));
                leftSidebar.style.width = newWidth + 'px';
            } else if (targetSide === 'right') {
                newWidth = Math.max(250, Math.min(400, startWidth - deltaX));
                rightSidebar.style.width = newWidth + 'px';
            }
            // const mainContent = document.querySelector('.main-content');
            // if (mainContent) {
            //     mainContent.style.marginLeft = leftSidebar ? getComputedStyle(leftSidebar).width : '0px';
            //     mainContent.style.marginRight = rightSidebar ? getComputedStyle(rightSidebar).width : '0px';
            // }
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
                this.setSlideCounter();
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
            prevBtn.disabled = true;
            nextBtn.classList.add('disabled');
            nextBtn.disabled = true;
            return;
        }

        const lesson = this.findLessonById(this.currentLessonId);
        if (!lesson || !lesson.slides.length) {
            prevBtn.classList.add('disabled');
            prevBtn.disabled = true;
            nextBtn.classList.add('disabled');
            nextBtn.disabled = true;
            return;
        }

        const currentIndex = lesson.slides.findIndex(slide => slide.id === this.currentSlideId);

        // Update previous button
        if (currentIndex <= 0) {
            prevBtn.classList.add('disabled');
            prevBtn.disabled = true;
        } else {
            prevBtn.classList.remove('disabled');
            prevBtn.disabled = false;
        }

        // Update next button
        if (currentIndex >= lesson.slides.length - 1) {
            nextBtn.classList.add('disabled');
            nextBtn.disabled = true;
        } else {
            nextBtn.classList.remove('disabled');
            nextBtn.disabled = false;
        }
    }

    // TODO
    // get the index of the current slide in the active lesson , total slides number in the same lesson    getSlideCounter() {
    setSlideCounter() {
        if (!this.currentLessonId || this.currentSlideId == null) {
            return
        };
        const lesson = this.findLessonById(this.currentLessonId);
        if (!lesson) {
            return
        };
        const currentIndex = lesson.slides.findIndex(slide => slide.id === this.currentSlideId);
        this.dom.currentSlideNumber.textContent = currentIndex + 1;
        this.dom.totalSlidesNumber.textContent = lesson.slides.length;
        return { currentIndex, totalSlides: lesson.slides.length }

    }

    updateSlideCounter(currentIndex) {
        const slideCounter = document.getElementById('current-slide');
        if (!slideCounter) return;
        slideCounter.textContent = `${currentIndex + 1}/${this.currentLesson.slides.length}`;
    }
}

// auto-init in browser and keep backward-compatibility on window
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
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