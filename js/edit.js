
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
                subtype: 'video',
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

    // 1. Common Fields (Slide Name, Title, Subtitle)
    let html = `
            <div class="space-y-6">
                <div class="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <h4 class="text-lg font-semibold mb-3 text-gray-800">إعدادات الشريحة الأساسية</h4>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">اسم الشريحة (الشريط الجانبي)</label>
                        <input type="text" id="edit-slide-name" 
                            value="${slide.title || ''}"
                            oninput="updateSlideContent(${slideId}, 'slideTitle', this.value)"
                            placeholder="اسم الشريحة"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">العنوان الرئيسي للشريحة</label>
                        <input type="text" id="edit-main-title" 
                            value="${slide.content.title || ''}"
                            oninput="updateSlideContent(${slideId}, 'title', this.value)"
                            placeholder="العنوان"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">العنوان الفرعي للشريحة (اختياري)</label>
                        <input type="text" id="edit-subtitle" 
                            value="${slide.content.subtitle || ''}"
                            oninput="updateSlideContent(${slideId}, 'subtitle', this.value)"
                            placeholder="العنوان الفرعي"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                </div>
            `;

    // 2. Subtype Specific Fields
    switch (`${slide.type}-${slide.subtype}`) {
        case 'text-bulleted-list':
            html += renderBulletedListEditor(slide);
            break;
        case 'text-comparison':
            html += renderComparisonTextEditor(slide);
            break;
        case 'text-expandable-list':
            html += renderExpandableListEditor(slide);
            break;

        // ... (ستتم إضافة باقي أنواع الشرائح لاحقاً)

        default:
            // Fallback for other types
            html += `<div class="text-center text-gray-500 py-12">
                            <i class="fas fa-tools text-4xl mb-4"></i>
                            <p>لا توجد واجهة تحرير مخصصة لهذا النوع حتى الآن.</p>
                    </div>`;
    }

    document.getElementById('slide-edit-content').innerHTML = html + '</div>';
}

// Load slide content into the preview area
function loadSlidePreview(slideId) {
    const currentLesson = lessons.find(lesson => lesson.id === currentLessonId);
    const slide = currentLesson ? currentLesson.slides.find(s => s.id === slideId) : null;

    if (slide) {
        // تحديث إعدادات المعاينة الافتراضية
        document.getElementById('slide-preview-container').className = 'slide-preview rounded-t-xl';

        // العنوان المشترك (العنوان الرئيسي والفرعي)
        let html = `
            <div class="max-w-4xl mx-auto p-8">
                ${slide.content.title ? `<h2 class="text-3xl font-bold mb-2 text-white">${slide.content.title}</h2>` : ''}
                ${slide.content.subtitle ? `<p class="text-xl opacity-90 text-white mb-6">${slide.content.subtitle}</p>` : ''}
                <div class="slide-content-body">
        `;

        switch (`${slide.type}-${slide.subtype}`) {
            case 'text-bulleted-list':
                html += renderBulletedListPreview(slide);
                break;
            case 'text-comparison':
                html += renderComparisonTextPreview(slide);
                break;
            case 'text-expandable-list':
                html += renderExpandableListPreview(slide);
                break;

            // سيتم إضافة الأنواع الأخرى هنا لاحقاً

            default:
                html += `<div class="text-white text-center py-10">
                            <i class="fas fa-magic text-5xl mb-4"></i>
                            <p>هذا النوع من الشرائح لا يحتوي على معاينة مصممة حتى الآن.</p>
                         </div>`;
        }

        html += `</div></div>`;
        document.getElementById('slide-preview-content').innerHTML = html;

        // **تهيئة المقارنة (إذا كانت الشريحة من نوع مقارنة)**
        if (slide.subtype === 'comparison') {
            initializeComparisonSlider(slideId);
        }

    } else {
        // إعادة تعيين المعاينة عند عدم اختيار شريحة
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

// Helper function to render bulleted list item HTML
function renderBulletedListItem(slideId, item, index) {
    return `
        <div class="flex items-center space-x-2 space-x-reverse mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <input type="text" 
                value="${item}"
                oninput="updateBulletedListItem(${slideId}, ${index}, this.value)"
                placeholder="محتوى النقطة"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
            <button onclick="deleteBulletedListItem(${slideId}, ${index})"
                class="p-2 text-red-600 hover:bg-red-100 rounded-full transition duration-150"
                title="حذف النقطة">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

// Editor for 'text-bulleted-list'
function renderBulletedListEditor(slide) {
    const itemsHtml = slide.content.items.map((item, index) =>
        renderBulletedListItem(slide.id, item, index)
    ).join('');

    return `
        <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-6">
            <h4 class="text-lg font-semibold mb-3 text-gray-800">محتوى القائمة النقطية</h4>
            <div id="bulleted-list-items-container-${slide.id}">
                ${itemsHtml}
            </div>
            <button onclick="addBulletedListItem(${slide.id})"
                class="w-full flex items-center justify-center space-x-2 space-x-reverse bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-150 mt-3">
                <i class="fas fa-plus"></i>
                <span>أضف نقطة جديدة</span>
            </button>
        </div>
    `;
}

// Editor for 'text-comparison'
function renderComparisonTextEditor(slide) {
    const content = slide.content;
    return `
        <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-6">
            <h4 class="text-lg font-semibold mb-3 text-gray-800">محتوى المقارنة</h4>
            <div class="grid grid-cols-2 gap-4">
                <div class="p-3 border border-gray-300 rounded-lg bg-gray-50">
                    <label class="block text-sm font-medium text-gray-700 mb-1">عنوان الجانب الأول</label>
                    <input type="text" value="${content.blockA_title || ''}"
                        oninput="updateSlideContent(${slide.id}, 'blockA_title', this.value)"
                        placeholder="العنوان الأول"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3" />
                    
                    <label class="block text-sm font-medium text-gray-700 mb-1">نص الجانب الأول</label>
                    <textarea rows="4"
                        oninput="updateSlideContent(${slide.id}, 'blockA_text', this.value)"
                        placeholder="أدخل محتوى المقارنة الأول"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg">${content.blockA_text || ''}</textarea>
                </div>

                <div class="p-3 border border-gray-300 rounded-lg bg-gray-50">
                    <label class="block text-sm font-medium text-gray-700 mb-1">عنوان الجانب الثاني</label>
                    <input type="text" value="${content.blockB_title || ''}"
                        oninput="updateSlideContent(${slide.id}, 'blockB_title', this.value)"
                        placeholder="العنوان الثاني"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3" />
                    
                    <label class="block text-sm font-medium text-gray-700 mb-1">نص الجانب الثاني</label>
                    <textarea rows="4"
                        oninput="updateSlideContent(${slide.id}, 'blockB_text', this.value)"
                        placeholder="أدخل محتوى المقارنة الثاني"
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg">${content.blockB_text || ''}</textarea>
                </div>
            </div>
        </div>
    `;
}

// Helper function to render expandable list item HTML
function renderExpandableListItem(slideId, item, index) {
    return `
        <div class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center justify-between mb-3">
                <label class="block text-sm font-medium text-gray-700">العنصر ${index + 1}</label>
                <button onclick="deleteExpandableListItem(${slideId}, ${index})"
                    class="p-1 text-red-600 hover:bg-red-100 rounded-full transition duration-150"
                    title="حذف العنصر">
                    <i class="fas fa-trash text-sm"></i>
                </button>
            </div>
            
            <input type="text" 
                value="${item.title || ''}"
                oninput="updateExpandableListItem(${slideId}, ${index}, 'title', this.value)"
                placeholder="عنوان المفهوم/الرأس"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2" />
            
            <textarea rows="3"
                oninput="updateExpandableListItem(${slideId}, ${index}, 'text', this.value)"
                placeholder="المحتوى القابل للتوسيع"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg">${item.text || ''}</textarea>
        </div>
    `;
}

// Editor for 'text-expandable-list'
function renderExpandableListEditor(slide) {
    const itemsHtml = slide.content.items.map((item, index) =>
        renderExpandableListItem(slide.id, item, index)
    ).join('');

    return `
        <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-6">
            <h4 class="text-lg font-semibold mb-3 text-gray-800">محتوى القائمة القابلة للتوسيع</h4>
            <div id="expandable-list-items-container-${slide.id}">
                ${itemsHtml}
            </div>
            <button onclick="addExpandableListItem(${slide.id})"
                class="w-full flex items-center justify-center space-x-2 space-x-reverse bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-150 mt-3">
                <i class="fas fa-plus"></i>
                <span>أضف عنصراً قابلاً للتوسيع</span>
            </button>
        </div>
    `;
}


// Editor for 'video-video'
function renderVideoEditor(slide) {
    const content = slide.content;
    return `
        <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-6">
            <h4 class="text-lg font-semibold mb-3 text-gray-800">إعدادات محتوى الفيديو</h4>

            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">رابط الفيديو (URL)</label>
                <input type="url" id="edit-video-url" 
                    value="${content.videoUrl || ''}"
                    oninput="updateSlideContent(${slide.id}, 'videoUrl', this.value)"
                    placeholder="https://example.com/your-video.mp4"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">مدة الفيديو (مثال: 10:30)</label>
                <input type="text" id="edit-video-duration" 
                    value="${content.duration || ''}"
                    oninput="updateSlideContent(${slide.id}, 'duration', this.value)"
                    placeholder="00:00"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" />
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea rows="4" id="edit-video-description"
                    oninput="updateSlideContent(${slide.id}, 'description', this.value)"
                    placeholder="أدخل وصفًا تفصيليًا للفيديو"
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">${content.description || ''}</textarea>
            </div>
        </div>
    `;
}
// --- DYNAMIC CONTENT MANIPULATION FUNCTIONS ---

// Function to update nested content (e.g., items in a list)
function updateNestedContent(slideId, contentKey, index, key, value) {
    const currentLesson = lessons.find(lesson => lesson.id === currentLessonId);
    const slide = currentLesson.slides.find(s => s.id === slideId);

    if (slide && slide.content && slide.content[contentKey] && slide.content[contentKey][index] !== undefined) {
        if (key === null) { // For simple string arrays (like bulleted list)
            slide.content[contentKey][index] = value;
        } else { // For object arrays (like expandable list)
            slide.content[contentKey][index][key] = value;
        }

        // Update local storage and preview after change
        saveLessonsToLocalStorage();
        loadSlidePreview(slideId);
    }
}

// ------------------------------------------------------------------
// 1. Bulleted List Functions
// ------------------------------------------------------------------

function updateBulletedListItem(slideId, index, value) {
    updateNestedContent(slideId, 'items', index, null, value);
}

function addBulletedListItem(slideId) {
    const currentLesson = lessons.find(lesson => lesson.id === currentLessonId);
    const slide = currentLesson.slides.find(s => s.id === slideId);

    if (slide && slide.content.items) {
        slide.content.items.push('نقطة جديدة');
        saveLessonsToLocalStorage();

        // Re-render the editor to show the new item
        loadSlideEditContent(slideId);
        loadSlidePreview(slideId);
    }
}

function deleteBulletedListItem(slideId, index) {
    const currentLesson = lessons.find(lesson => lesson.id === currentLessonId);
    const slide = currentLesson.slides.find(s => s.id === slideId);

    if (slide && slide.content.items && slide.content.items.length > 1) {
        slide.content.items.splice(index, 1);
        saveLessonsToLocalStorage();

        // Re-render the editor to remove the item
        loadSlideEditContent(slideId);
        loadSlidePreview(slideId);
    } else {
        Swal.fire('تنبيه', 'يجب أن تحتوي القائمة على نقطة واحدة على الأقل.', 'warning');
    }
}


// ------------------------------------------------------------------
// 2. Expandable List Functions
// ------------------------------------------------------------------

function updateExpandableListItem(slideId, index, key, value) {
    updateNestedContent(slideId, 'items', index, key, value);
}

function addExpandableListItem(slideId) {
    const currentLesson = lessons.find(lesson => lesson.id === currentLessonId);
    const slide = currentLesson.slides.find(s => s.id === slideId);

    if (slide && slide.content.items) {
        slide.content.items.push({ title: 'مفهوم جديد', text: 'محتوى المفهوم.' });
        saveLessonsToLocalStorage();

        // Re-render the editor
        loadSlideEditContent(slideId);
        loadSlidePreview(slideId);
    }
}

function deleteExpandableListItem(slideId, index) {
    const currentLesson = lessons.find(lesson => lesson.id === currentLessonId);
    const slide = currentLesson.slides.find(s => s.id === slideId);

    if (slide && slide.content.items && slide.content.items.length > 0) {
        slide.content.items.splice(index, 1);
        saveLessonsToLocalStorage();

        // Re-render the editor
        loadSlideEditContent(slideId);
        loadSlidePreview(slideId);
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

// Preview for 'video-video'
function renderVideoPreview(slide) {
    const content = slide.content;
    const videoUrl = content.videoUrl;
    let videoHtml = '';

    if (videoUrl) {
        // Simple heuristic: if it's YouTube, use the embed URL for better support
        let embedUrl = videoUrl;
        if (videoUrl.includes('youtube.com/watch?v=')) {
            const videoId = videoUrl.split('v=')[1].split('&')[0];
            embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0`;
        } else if (videoUrl.includes('youtu.be/')) {
            const videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
            embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0`;
        }

        videoHtml = `
            <div class="relative w-full overflow-hidden rounded-xl shadow-2xl" style="padding-top: 56.25%;">
                <iframe 
                    class="absolute top-0 left-0 w-full h-full" 
                    src="${embedUrl}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                ></iframe>
            </div>
        `;
    } else {
        videoHtml = `
            <div class="text-white text-center py-20 bg-gray-600/30 rounded-xl border border-dashed border-white/50">
                <i class="fas fa-video text-6xl mb-4 opacity-70"></i>
                <p class="text-xl font-medium">الرجاء إدخال رابط الفيديو للمعاينة</p>
            </div>
        `;
    }

    return `
        <div class="space-y-6">
            ${videoHtml}
            ${content.description ? `<p class="text-white mt-4 text-center text-lg">${content.description}</p>` : ''}
            ${content.duration ? `<p class="text-white/80 text-center text-sm"><i class="fas fa-clock ml-1"></i> المدة: ${content.duration}</p>` : ''}
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
        case 'video-video': // ADDED
            html += renderVideoEditor(slide); // ADDED
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
