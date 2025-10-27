
// Sample data with different content for each slide type
let lessons = [
    {
        id: 1,
        title: 'الدرس الأول',
        code: '400 014',
        slides: [
            {
                id: 1,
                title: 'مرحباً بكم!',
                type: 'title',
                content: {
                    title: 'مرحباً بكم!',
                    subtitle: 'نظام التحكم الآلي',
                    buttonText: 'ابدأ التعلم',
                }
            },
            {
                id: 2,
                title: 'شرح الفيديو',
                type: 'video',
                content: {
                    title: 'كيفية تركيب المرحل',
                    videoUrl: 'https://example.com/video1',
                    duration: '10:30',
                    description: 'شاهد هذا الفيديو لتعلم طريقة التركيب الصحيحة'
                }
            },
            {
                id: 3,
                title: 'معرض الصور',
                type: 'image',
                content: {
                    title: 'أنواع المراحل المختلفة',
                    images: ['img1.jpg', 'img2.jpg', 'img3.jpg'],
                    description: 'تصميمات متنوعة للمراحل الكهربائية'
                }
            },
            {
                id: 4,
                title: 'اختبار المعلومات',
                type: 'quiz',
                content: {
                    title: 'اختبر معرفتك',
                    questions: [
                        {
                            question: 'ما هو دور المرحل في الدائرة الكهربائية؟',
                            options: ['التحكم في الجهد', 'حماية الدائرة', 'تكبير الإشارة', 'جميع ما سبق'],
                            correctAnswer: 3
                        }
                    ],
                    description: 'اختبر فهمك للمفاهيم الأساسية'
                }
            },
            {
                id: 5,
                title: 'التفاعل العملي',
                type: 'interactive',
                content: {
                    title: 'حاكي الدائرة الكهربائية',
                    simulation: 'circuit-simulator',
                    instructions: 'اسحب المكونات واربطها لبناء الدائرة',
                    description: 'تجربة عملية مع محاكي الدوائر'
                }
            },
            {
                id: 6,
                title: 'المحتوى النصي',
                type: 'content',
                content: {
                    title: 'الأساسيات النظرية',
                    text: `المرحل (Relay) هو مفتاح كهربائي يعمل بالكهرباء. يتكون من:
                            
• ملف electromagnet
• مجموعة من Contacts
• نابض يعيد Contacts إلى وضعها الأصلي

مبدأ العمل: عندما يمر تيار في الملف، ينشأ مجال مغناطيسي يجذب الـ Contacts فيغلق أو يفتح الدائرة.`,
                    description: 'الأسس النظرية لأنظمة المراحل'
                }
            }
        ]
    },
    {
        id: 2,
        title: 'الدرس الثاني',
        code: '400 015',
        slides: [
            {
                id: 7,
                title: 'مقدمة الدرس',
                type: 'title',
                content: {
                    title: 'التحكم المتقدم',
                    subtitle: 'أنظمة التحكم الذكية',
                    buttonText: 'تابع التعلم',
                    description: 'انتقال إلى المستوى المتقدم في أنظمة التحكم'
                }
            }
        ]
    }
];

// Data for all available slide templates
const slideTemplates = {
    text: [
        {
            subtype: 'bulleted-list',
            title: 'قائمة نقطية',
            description: 'عرض قائمة من النقاط',
            icon: 'fa-list-ul',
        },
        {
            subtype: 'comparison',
            title: 'مقارنة',
            description: 'مقارنة بين كتلتين نصيتين',
            icon: 'fa-columns',
        },
        {
            subtype: 'expandable-list',
            title: 'قائمة قابلة للتوسيع',
            description: 'عرض قائمة من المفاهيم',
            icon: 'fa-layer-group',
        },
    ],
    image: [
        {
            subtype: 'comparison',
            title: 'مقارنة صور',
            description: 'مقارنة بين صورتين',
            icon: 'fa-image',
        },
    ],
    video: [
        {
            subtype: 'video',
            title: 'فيديو',
            description: 'شريحة فيديو كاملة',
            icon: 'fa-video',
        },
    ],
    quiz: [
        {
            subtype: 'multiple-choice-carousel',
            title: 'اختبار دوّار (Carousel)',
            description: 'أسئلة اختيار من متعدد',
            icon: 'fa-layer-group',
        },
        {
            subtype: 'multiple-choice-categorize',
            title: 'تصنيف',
            description: 'تصنيف العناصر في مجموعات',
            icon: 'fa-sitemap',
        },
        {
            subtype: 'multiple-choice-chat',
            title: 'محادثة',
            description: 'سؤال كتابي',
            icon: 'fa-comments',
        },
        {
            subtype: 'match-connect',
            title: 'توصيل',
            description: 'توصيل العناصر المتطابقة',
            icon: 'fa-link',
        },
        {
            subtype: 'match-drag-drop',
            title: 'سحب وإفلات',
            description: 'سحب وإفلات الإجابات',
            icon: 'fa-hand-pointer',
        },
    ],
};

let currentLessonId = 1;
let currentSlideId = null;
let draggedSlide = null;
let isResizing = false;
let currentResizeHandle = null;
let startX = 0;
let startWidth = 0;

// Initialize the app
function initApp() {
    renderLessonsSidebar();
    updateLessonHeader();
    setupEventListeners();
    setupResizeHandles();
}

// Setup resize handles
function setupResizeHandles() {
    const resizeHandles = document.querySelectorAll('.resize-handle');

    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', startResize);
    });

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
}

function startResize(e) {
    e.preventDefault();
    isResizing = true;
    currentResizeHandle = e.target;
    startX = e.clientX;

    const sidebar = currentResizeHandle.parentElement;
    startWidth = parseInt(document.defaultView.getComputedStyle(sidebar).width, 10);

    currentResizeHandle.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
}

function handleResize(e) {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    let newWidth = startWidth;

    if (currentResizeHandle.id === 'resize-sidebar') {
        newWidth = startWidth - deltaX;
    } else if (currentResizeHandle.id === 'resize-edit-sidebar') {
        newWidth = startWidth + deltaX;
    }

    const sidebar = currentResizeHandle.parentElement;
    const minWidth = 300;
    const maxWidth = 600;

    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    sidebar.style.width = newWidth + 'px';
    updateMainContentMargins();
}

function stopResize() {
    if (!isResizing) return;

    isResizing = false;
    if (currentResizeHandle) {
        currentResizeHandle.classList.remove('resizing');
    }
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    currentResizeHandle = null;
}

function updateMainContentMargins() {
    const mainContent = document.querySelector('.main-content');
    const leftSidebar = document.querySelector('.edit-sidebar');
    const rightSidebar = document.querySelector('.sidebar');

    const leftWidth = leftSidebar.style.width || '400px';
    const rightWidth = rightSidebar.style.width || '380px';

    mainContent.style.marginLeft = leftWidth;
    mainContent.style.marginRight = rightWidth;
}

// Render lessons in sidebar with expandable slides
function renderLessonsSidebar() {
    const lessonsList = document.getElementById('lessons-list');
    lessonsList.innerHTML = '';

    lessons.forEach(lesson => {
        const isCurrent = lesson.id === currentLessonId;
        const isExpanded = isCurrent;

        const lessonElement = document.createElement('div');
        lessonElement.className = `lesson-item bg-white border border-gray-200 rounded-lg overflow-hidden ${isExpanded ? 'lesson-expanded' : ''}`;
        lessonElement.dataset.lessonId = lesson.id;

        lessonElement.innerHTML = `
                    <div class="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
                        <div class="flex-1">
                            <h4 class="font-medium text-gray-900">${lesson.title}</h4>
                            <p class="text-sm text-gray-500 mt-1">${lesson.slides.length} سلايد</p>
                        </div>
                        <div class="flex items-center space-x-2 space-x-reverse">
                            <button class="add-slide-to-lesson p-2 text-gray-400 hover:text-green-600" data-lesson-id="${lesson.id}">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="expand-lesson p-2 text-gray-400 hover:text-blue-600">
                                <i class="fas fa-chevron-down ${isExpanded ? 'rotate-180' : ''} transition-transform"></i>
                            </button>
                        </div>
                    </div>
                    <div class="lesson-slides ${isExpanded ? '' : 'hidden'}">
                        <div class="border-t border-gray-200">
                            ${lesson.slides.map((slide, index) => `
                                <div class="slide-item p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer flex items-center justify-between ${slide.id === currentSlideId ? 'active' : ''}" data-slide-id="${slide.id}" data-lesson-id="${lesson.id}">
                                    <div class="flex items-center space-x-3 space-x-reverse">
                                        <div class="w-6 h-6 bg-blue-100 text-blue-600 rounded text-xs flex items-center justify-center">${index + 1}</div>
                                        <div>
                                            <h5 class="text-sm font-medium text-gray-900">${slide.title}</h5>
                                            <p class="text-xs text-gray-500">${getSlideTypeText(slide.type)}</p>
                                        </div>
                                    </div>
                                    <div class="slide-actions flex space-x-1 space-x-reverse">
                                        <button class="edit-slide p-1 text-gray-400 hover:text-blue-600" data-slide-id="${slide.id}">
                                            <i class="fas fa-edit text-xs"></i>
                                        </button>
                                        <button class="delete-slide p-1 text-gray-400 hover:text-red-600" data-slide-id="${slide.id}">
                                            <i class="fas fa-trash text-xs"></i>
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                            <div class="p-3">
                                <button class="add-slide-inside-lesson w-full flex items-center justify-center space-x-2 space-x-reverse py-2 px-3 border border-dashed border-gray-300 rounded text-gray-600 hover:border-green-500 hover:text-green-600 transition-colors text-sm" data-lesson-id="${lesson.id}">
                                    <i class="fas fa-plus"></i>
                                    <span>إضافة سلايد</span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;

        lessonsList.appendChild(lessonElement);
    });
}

// Update lesson header
function updateLessonHeader() {
    const currentLesson = lessons.find(lesson => lesson.id === currentLessonId);
    if (currentLesson) {
        document.getElementById('current-lesson-title').textContent = currentLesson.title;
        document.getElementById('current-lesson-code').textContent = currentLesson.code;
    }
}

// Load slide edit content and update preview
function loadSlideEditContent(slideId) {
    const currentLesson = lessons.find(lesson => lesson.id === currentLessonId);
    const slide = currentLesson.slides.find(s => s.id === slideId);

    const editContent = document.getElementById('slide-edit-content');

    if (!slide) return;

    // Update preview first
    updateSlidePreview(slide);

    // Then load edit content
    if (slide.type === 'title') {
        editContent.innerHTML = `
                    <div class="space-y-6">
                        <h3 class="text-lg font-semibold text-gray-900 border-b pb-2">إعدادات سلايد العنوان</h3>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">العنوان الرئيسي</label>
                            <input type="text" value="${slide.content.title || ''}" class="slide-edit-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" data-field="title">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">العنوان الفرعي</label>
                            <input type="text" value="${slide.content.subtitle || ''}" class="slide-edit-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" data-field="subtitle">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">نص الزر</label>
                            <input type="text" value="${slide.content.buttonText || ''}" class="slide-edit-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" data-field="buttonText">
                        </div>
                    </div>
                `;
    } else if (slide.type === 'video') {
        editContent.innerHTML = `
                    <div class="space-y-6">
                        <h3 class="text-lg font-semibold text-gray-900 border-b pb-2">إعدادات سلايد الفيديو</h3>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">عنوان الفيديو</label>
                            <input type="text" value="${slide.content.title || ''}" class="slide-edit-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" data-field="title">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">رابط الفيديو</label>
                            <input type="url" value="${slide.content.videoUrl || ''}" class="slide-edit-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" data-field="videoUrl">
                        </div>
                    </div>
                `;
    } else {
        editContent.innerHTML = `
                    <div class="space-y-6">
                        <h3 class="text-lg font-semibold text-gray-900 border-b pb-2">إعدادات ${getSlideTypeText(slide.type)}</h3>
                        
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">عنوان السلايد</label>
                            <input type="text" value="${slide.title}" class="slide-edit-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" data-field="slideTitle">
                        </div>
                    </div>
                `;
    }
}

// Update slide preview based on slide type
function updateSlidePreview(slide) {
    const previewContainer = document.getElementById('slide-preview-container');
    const previewContent = document.getElementById('slide-preview-content');

    // Reset classes and set type-specific background
    previewContainer.className = 'slide-preview rounded-t-xl';
    previewContainer.classList.add(`slide-type-${slide.type}`);

    switch (slide.type) {
        case 'title':
            previewContent.innerHTML = `
                        <div class="max-w-2xl mx-auto text-center">
                            <h2 class="text-4xl font-bold mb-4">${slide.content.title || 'عنوان السلايد'}</h2>
                            <p class="text-xl opacity-90 mb-8">${slide.content.subtitle || 'وصف اختياري'}</p>
                            <button class="px-8 py-3 bg-white text-purple-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold">
                                ${slide.content.buttonText || 'ابدأ الآن'}
                            </button>
                        </div>
                    `;
            break;

        case 'video':
            previewContent.innerHTML = `
                        <div class="max-w-2xl mx-auto text-center">
                            <div class="bg-black bg-opacity-30 rounded-xl p-6 mb-4">
                                <i class="fas fa-play-circle text-6xl mb-4"></i>
                                <h2 class="text-3xl font-bold mb-2">${slide.content.title || 'فيديو تعليمي'}</h2>
                                <p class="text-lg opacity-90 mb-4">${slide.content.duration || '10:00'}</p>
                            </div>
                            <button class="px-6 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors">
                                تشغيل الفيديو
                            </button>
                            ${slide.content.description ? `<p class="mt-4 text-sm opacity-75">${slide.content.description}</p>` : ''}
                        </div>
                    `;
            break;

        case 'image':
            previewContent.innerHTML = `
                        <div class="max-w-4xl mx-auto text-center">
                            <h2 class="text-3xl font-bold mb-6">${slide.content.title || 'معرض الصور'}</h2>
                            <div class="grid grid-cols-2 gap-4 mb-6">
                                <div class="bg-white bg-opacity-20 rounded-lg p-4 h-32 flex items-center justify-center">
                                    <i class="fas fa-image text-3xl"></i>
                                </div>
                                <div class="bg-white bg-opacity-20 rounded-lg p-4 h-32 flex items-center justify-center">
                                    <i class="fas fa-image text-3xl"></i>
                                </div>
                                <div class="bg-white bg-opacity-20 rounded-lg p-4 h-32 flex items-center justify-center">
                                    <i class="fas fa-image text-3xl"></i>
                                </div>
                                <div class="bg-white bg-opacity-20 rounded-lg p-4 h-32 flex items-center justify-center">
                                    <i class="fas fa-image text-3xl"></i>
                                </div>
                            </div>
                            ${slide.content.description ? `<p class="text-sm opacity-75">${slide.content.description}</p>` : ''}
                        </div>
                    `;
            break;

        case 'quiz':
            previewContent.innerHTML = `
                        <div class="max-w-2xl mx-auto text-center">
                            <h2 class="text-3xl font-bold mb-6">${slide.content.title || 'اختبار المعرفة'}</h2>
                            <div class="bg-white bg-opacity-20 rounded-xl p-6 mb-4 text-right">
                                <h3 class="text-xl font-semibold mb-4">${slide.content.questions?.[0]?.question || 'سؤال الاختبار'}</h3>
                                <div class="space-y-3">
                                    ${(slide.content.questions?.[0]?.options || ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع']).map((option, index) => `
                                        <div class="flex items-center space-x-3 space-x-reverse">
                                            <input type="radio" id="option-${index}" name="quiz" class="h-4 w-4">
                                            <label for="option-${index}" class="text-lg">${option}</label>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            <button class="px-6 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors">
                                تحقق من الإجابة
                            </button>
                            ${slide.content.description ? `<p class="mt-4 text-sm opacity-75">${slide.content.description}</p>` : ''}
                        </div>
                    `;
            break;

        case 'interactive':
            previewContent.innerHTML = `
                        <div class="max-w-4xl mx-auto text-center">
                            <h2 class="text-3xl font-bold mb-4">${slide.content.title || 'نشاط تفاعلي'}</h2>
                            <p class="text-lg mb-6">${slide.content.instructions || 'اسحب وأسقط العناصر لبناء النموذج'}</p>
                            <div class="bg-white bg-opacity-20 rounded-xl p-6 mb-4">
                                <div class="grid grid-cols-3 gap-4 mb-4">
                                    <div class="bg-white bg-opacity-30 rounded p-3 cursor-grab">عنصر 1</div>
                                    <div class="bg-white bg-opacity-30 rounded p-3 cursor-grab">عنصر 2</div>
                                    <div class="bg-white bg-opacity-30 rounded p-3 cursor-grab">عنصر 3</div>
                                </div>
                                <div class="bg-black bg-opacity-30 rounded p-8 min-h-32 border-2 border-dashed border-white border-opacity-30">
                                    <p class="text-sm opacity-75">اسقط العناصر هنا</p>
                                </div>
                            </div>
                            ${slide.content.description ? `<p class="text-sm opacity-75">${slide.content.description}</p>` : ''}
                        </div>
                    `;
            break;

        case 'content':
            previewContent.innerHTML = `
                        <div class="max-w-4xl mx-auto">
                            <h2 class="text-3xl font-bold mb-6 text-center">${slide.content.title || 'المحتوى التعليمي'}</h2>
                            <div class="bg-white bg-opacity-20 rounded-xl p-6 text-right">
                                <div class="prose prose-invert max-w-none">
                                    <p class="text-lg leading-relaxed whitespace-pre-line">${slide.content.text || 'المحتوى النصي للدرس يظهر هنا...'}</p>
                                </div>
                            </div>
                            ${slide.content.description ? `<p class="mt-4 text-sm opacity-75 text-center">${slide.content.description}</p>` : ''}
                        </div>
                    `;
            break;

        default:
            previewContent.innerHTML = `
                        <div class="text-center">
                            <i class="fas fa-sliders-h text-6xl mb-6 opacity-50"></i>
                            <h2 class="text-3xl font-bold mb-4">${slide.title}</h2>
                            <p class="text-xl opacity-90">نوع السلايد: ${getSlideTypeText(slide.type)}</p>
                        </div>
                    `;
    }
}

// Get slide type text
function getSlideTypeText(type) {
    const types = {
        'title': 'سلايد عنوان',
        'image': 'صورة',
        'video': 'فيديو',
        'quiz': 'اختبار',
        'interactive': 'تفاعلي',
        'content': 'محتوى'
    };
    return types[type] || type;
}

// Setup event listeners
function setupEventListeners() {
    // Toggle sidebars
    document.getElementById('toggle-sidebar').addEventListener('click', function () {
        document.body.classList.toggle('sidebar-collapsed');
    });

    document.getElementById('toggle-edit-sidebar').addEventListener('click', function () {
        document.body.classList.toggle('edit-sidebar-collapsed');
    });

    // Save changes button
    document.getElementById('save-changes').addEventListener('click', function () {
        // alert('تم حفظ التغييرات بنجاح!');
        Swal.fire({
            icon: 'success',
            text: 'تم حفظ التغييرات بنجاح!'
        })
    });

    // Add lesson button
    document.getElementById('add-lesson-btn').addEventListener('click', addNewLesson);

    // Add slide buttons
    document.getElementById('cancel-add-slide').addEventListener('click', hideAddSlideModal);

    // Listen for clicks on category buttons in the slide library
    document.getElementById('slide-category-nav').addEventListener('click', (e) => {
        e.preventDefault();
        const categoryBtn = e.target.closest('.slide-category-btn');
        if (categoryBtn) {
            renderSlideTemplates(categoryBtn.dataset.category);
        }
    });

    // Listen for clicks on template cards to create a new slide
    document.getElementById('slide-templates-container').addEventListener('click', (e) => {
        const templateCard = e.target.closest('.template-card');
        if (templateCard) {
            const type = templateCard.dataset.type;
            const subtype = templateCard.dataset.subtype;
            createNewSlide(type, subtype);
        }
    });

    // Lesson title editing
    document.getElementById('edit-lesson-title').addEventListener('click', showLessonEditForm);
    document.getElementById('save-lesson-title').addEventListener('click', saveLessonTitle);
    document.getElementById('cancel-lesson-edit').addEventListener('click', hideLessonEditForm);

    // Event delegation for dynamic elements
    document.addEventListener('click', function (e) {
        // Lesson header click
        if (e.target.closest('.lesson-item > div:first-child')) {
            const lessonItem = e.target.closest('.lesson-item');
            const lessonId = parseInt(lessonItem.dataset.lessonId);

            // Toggle expansion
            lessonItem.classList.toggle('lesson-expanded');
            const icon = lessonItem.querySelector('.expand-lesson i');
            icon.classList.toggle('rotate-180');

            // If this is a different lesson, make it current
            if (lessonId !== currentLessonId) {
                currentLessonId = lessonId;
                currentSlideId = null;
                renderLessonsSidebar();
                updateLessonHeader();
                document.getElementById('slide-edit-content').innerHTML = `
                            <div class="text-center text-gray-500 py-12">
                                <i class="fas fa-edit text-4xl mb-4"></i>
                                <p>اختر سلايداً للتعديل</p>
                            </div>
                        `;
                // Reset preview
                document.getElementById('slide-preview-container').className = 'slide-preview rounded-t-xl';
                document.getElementById('slide-preview-content').innerHTML = `
                            <div class="max-w-2xl mx-auto text-center">
                                <i class="fas fa-sliders-h text-6xl mb-6 opacity-50"></i>
                                <h2 class="text-3xl font-bold mb-4">اختر سلايداً للمعاينة</h2>
                                <p class="text-xl opacity-90">انقر على أي سلايد من القائمة لرؤية محتواه هنا</p>
                            </div>
                        `;
            }
        }

        // Add slide to specific lesson
        if (e.target.closest('.add-slide-to-lesson') || e.target.closest('.add-slide-inside-lesson')) {
            const button = e.target.closest('.add-slide-to-lesson, .add-slide-inside-lesson');
            const lessonId = parseInt(button.dataset.lessonId);
            currentLessonId = lessonId;
            showAddSlideModal();
        }

        // Slide selection
        if (e.target.closest('.slide-item')) {
            const slideItem = e.target.closest('.slide-item');
            const slideId = parseInt(slideItem.dataset.slideId);
            const lessonId = parseInt(slideItem.dataset.lessonId) || currentLessonId;

            // If slide is from different lesson, switch to that lesson
            if (lessonId !== currentLessonId) {
                currentLessonId = lessonId;
                renderLessonsSidebar();
                updateLessonHeader();
            }

            // Remove active class from all slides
            document.querySelectorAll('.slide-item').forEach(item => {
                item.classList.remove('active');
            });

            // Add active class to clicked slide
            slideItem.classList.add('active');

            currentSlideId = slideId;
            loadSlideEditContent(slideId);

            // Ensure edit sidebar is open
            document.body.classList.remove('edit-sidebar-collapsed');
        }

        // Edit slide button
        if (e.target.closest('.edit-slide')) {
            const slideId = parseInt(e.target.closest('.edit-slide').dataset.slideId);
            currentSlideId = slideId;
            loadSlideEditContent(slideId);
            document.body.classList.remove('edit-sidebar-collapsed');
        }

        // Delete slide button
        if (e.target.closest('.delete-slide')) {
            const slideId = parseInt(e.target.closest('.delete-slide').dataset.slideId);
            Swal.fire({
                title: 'هل أنت متأكد؟',
                text: "لن تتمكن من التراجع عن هذا!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'نعم، قم بالحذف!',
                cancelButtonText: 'إلغاء'
            }).then((result) => {
                if (result.isConfirmed) {
                    const currentLesson = lessons.find(lesson => lesson.id === currentLessonId);
                    currentLesson.slides = currentLesson.slides.filter(s => s.id !== slideId);

                    // If the deleted slide was the currently selected one, deselect it
                    if (currentSlideId === slideId) {
                        currentSlideId = null;
                        loadSlideEditContent(null);
                    }

                    renderLessonsSidebar();

                    // Show success message
                    Swal.fire(
                        'تم الحذف!',
                        'تم حذف الشريحة بنجاح.',
                        'success'
                    );
                }
            });
        }
    });

    // Real-time editing
    document.addEventListener('input', function (e) {
        if (e.target.classList.contains('slide-edit-input') && currentSlideId) {
            updateSlideContent(currentSlideId, e.target.dataset.field, e.target.value);
        }
    });
}

// Function to render templates based on the selected category
function renderSlideTemplates(category) {
    const container = document.getElementById('slide-templates-container');
    const templates = slideTemplates[category] || [];

    // Update active button style
    document.querySelectorAll('.slide-category-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });

    if (templates.length === 0) {
        container.innerHTML = `<p class="text-gray-500">لا توجد قوالب متاحة لهذا القسم.</p>`;
        return;
    }

    container.innerHTML = `
        <div class="template-grid">
            ${templates
            .map(
                (template) => `
                <div class="template-card" data-type="${category}" data-subtype="${template.subtype}">
                    <div class="template-preview">
                        <i class="fas ${template.icon} template-preview-icon"></i>
                    </div>
                    <div class="template-info">
                        <h4 class="template-title">${template.title}</h4>
                        <p class="template-description">${template.description}</p>
                    </div>
                </div>
            `
            )
            .join('')}
        </div>
    `;
}

// Add new slide with a specific type and subtype
function createNewSlide(type, subtype) {
    const template = slideTemplates[type]?.find((t) => t.subtype === subtype);
    if (!template) return;

    let content = {};
    // Customize default content based on subtype
    switch (`${type}-${subtype}`) {
        case 'text-bulleted-list':
            content = {
                title: 'قائمة نقطية',
                items: ['نقطة 1', 'نقطة 2', 'نقطة 3'],
            };
            break;
        case 'text-comparison':
            content = {
                title: 'مقارنة',
                blockA_title: 'عنصر أ',
                blockA_text: 'وصف للعنصر أ.',
                blockB_title: 'عنصر ب',
                blockB_text: 'وصف للعنصر ب.',
            };
            break;
        case 'text-expandable-list':
            content = {
                title: 'قائمة قابلة للتوسيع',
                items: [{ title: 'مفهوم 1', text: 'تفاصيل حول المفهوم 1.' }],
            };
            break;
        case 'image-comparison':
            content = {
                title: 'مقارنة صور',
                imageA: 'path/to/imageA.jpg',
                imageB: 'path/to/imageB.jpg',
            };
            break;
        case 'video-video':
            content = {
                title: 'شريحة فيديو',
                videoUrl: 'https://example.com/video',
            };
            break;
        case 'quiz-multiple-choice-carousel':
            content = {
                title: 'اختبار دوّار',
                questions: [{ question: 'سؤال تجريبي؟', options: ['أ', 'ب'], answer: 'أ' }],
            };
            break;
        case 'quiz-multiple-choice-categorize':
            content = {
                title: 'تصنيف العناصر',
                categories: ['تصنيف 1', 'تصنيف 2'],
                items: [{ item: 'عنصر أ', category: 'تصنيف 1' }],
            };
            break;
        case 'quiz-multiple-choice-chat':
            content = {
                title: 'سؤال محادثة',
                question: 'ما هي عاصمة مصر؟',
                answer: 'القاهرة',
            };
            break;
        case 'quiz-match-connect':
            content = {
                title: 'توصيل متطابق',
                pairs: [{ item1: 'مصطلح أ', item2: 'تعريف أ' }],
            };
            break;
        case 'quiz-match-drag-drop':
            content = {
                title: 'سحب وإفلات',
                question: 'اسحب الإجابة الصحيحة إلى المربع.',
                options: ['خيار 1', 'خيار 2'],
                correctAnswer: 'خيار 1',
            };
            break;
        default:
            content = { title: template.title };
    }

    const newSlide = {
        id: Date.now(),
        title: template.title,
        type: type,
        subtype: subtype, // Store the subtype
        content: content,
    };

    const currentLesson = lessons.find((lesson) => lesson.id === currentLessonId);
    currentLesson.slides.push(newSlide);

    hideAddSlideModal();
    renderLessonsSidebar();

    // Auto-select the new slide
    currentSlideId = newSlide.id;
    loadSlideEditContent(newSlide.id);
    document.body.classList.remove('edit-sidebar-collapsed');
}

// Show lesson edit form
function showLessonEditForm() {
    const currentLesson = lessons.find(lesson => lesson.id === currentLessonId);
    document.getElementById('lesson-title-input').value = currentLesson.title;
    document.getElementById('lesson-code-input').value = currentLesson.code;
    document.getElementById('edit-lesson-form').classList.remove('hidden');
    document.getElementById('lesson-title-display').classList.add('hidden');
}

// Hide lesson edit form
function hideLessonEditForm() {
    document.getElementById('edit-lesson-form').classList.add('hidden');
    document.getElementById('lesson-title-display').classList.remove('hidden');
}

// Save lesson title
function saveLessonTitle() {
    const newTitle = document.getElementById('lesson-title-input').value;
    const newCode = document.getElementById('lesson-code-input').value;

    const currentLesson = lessons.find(lesson => lesson.id === currentLessonId);
    currentLesson.title = newTitle;
    currentLesson.code = newCode;

    updateLessonHeader();
    renderLessonsSidebar();
    hideLessonEditForm();
}

// Add new lesson
function addNewLesson() {
    const newLesson = {
        id: Date.now(),
        title: `درس جديد ${lessons.length + 1}`,
        code: `400 ${String(lessons.length + 14).padStart(3, '0')}`,
        slides: []
    };

    lessons.push(newLesson);
    renderLessonsSidebar();
}

// Show add slide modal
function showAddSlideModal() {
    document.getElementById('add-slide-modal').classList.remove('hidden');
    // Render the default 'text' category templates when the modal opens
    renderSlideTemplates('text');
}

// Hide add slide modal
// Hide add slide modal
function hideAddSlideModal() {
    document.getElementById('add-slide-modal').classList.add('hidden');
}

// Add new slide


// Delete slide
function deleteSlide(slideId) {
    const currentLesson = lessons.find(lesson => lesson.id === currentLessonId);
    const slideIndex = currentLesson.slides.findIndex(slide => slide.id === slideId);

    if (slideIndex > -1) {
        currentLesson.slides.splice(slideIndex, 1);
        currentSlideId = null;
        renderLessonsSidebar();

        document.getElementById('slide-edit-content').innerHTML = `
                    <div class="text-center text-gray-500 py-12">
                        <i class="fas fa-edit text-4xl mb-4"></i>
                        <p>اختر سلايداً للتعديل</p>
                    </div>
                `;

        // Reset preview
        document.getElementById('slide-preview-container').className = 'slide-preview rounded-t-xl';
        document.getElementById('slide-preview-content').innerHTML = `
                    <div class="max-w-2xl mx-auto text-center">
                        <i class="fas fa-sliders-h text-6xl mb-6 opacity-50"></i>
                        <h2 class="text-3xl font-bold mb-4">اختر سلايداً للمعاينة</h2>
                        <p class="text-xl opacity-90">انقر على أي سلايد من القائمة لرؤية محتواه هنا</p>
                    </div>
                `;
    }
}

// Update slide content
function updateSlideContent(slideId, field, value) {
    const currentLesson = lessons.find(lesson => lesson.id === currentLessonId);
    const slide = currentLesson.slides.find(s => s.id === slideId);

    if (slide) {
        if (field === 'slideTitle') {
            slide.title = value;
        } else if (slide.content) {
            slide.content[field] = value;
            // Update preview in real-time
            updateSlidePreview(slide);
        }
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', initApp);
