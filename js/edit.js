
////////////////////////////////////////////////////
// Utils
////////////////////////////////////////////////////
class Utils {
    static escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    static triggerResizeEvent() {
        window.dispatchEvent(new Event('resize'));
    }
}

////////////////////////////////////////////////////
// Models
////////////////////////////////////////////////////
class Slide {
    constructor({ id, title = 'سلايد جديد', type = 'content', subtype = 'undefined', content = {} } = {}) {
        this.id = id;
        this.title = title;
        this.type = type;
        this.subtype = subtype;
        this.content = content;
        this.userChoice = this.userChoice ?? null;
        this.submitted = this.submitted ?? false;
    }
}

class Lesson {
    constructor({ id, title = 'درس جديد', code = '', slides = [] } = {}) {
        this.id = id;
        this.title = title;
        this.code = code;
        this.slides = slides.map(s => new Slide(s));
    }

    nextSlideId() {
        if (!this.slides.length) return 1;
        return Math.max(...this.slides.map(s => s.id)) + 1;
    }
}

////////////////////////////////////////////////////
// SlideManager — data + persistence + CRUD
////////////////////////////////////////////////////
class SlideManager {
    constructor(editor) {
        this.editor = editor;
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('course_lessons', JSON.stringify(this.editor.lessons));
        } catch (err) {
            console.warn('Failed saving lessons to localStorage', err);
        }
    }

    loadFromLocalStorage() {
        try {
            const raw = localStorage.getItem('course_lessons');
            if (raw) {
                const parsed = JSON.parse(raw);
                this.editor.lessons = parsed.map(l => new Lesson(l));
                if (this.editor.lessons.length && !this.editor.currentLessonId) {
                    this.editor.currentLessonId = this.editor.lessons[0].id;
                }
            } else {
                this.editor.lessons = [];
            }
        } catch (err) {
            console.warn('Failed loading lessons from localStorage', err);
            this.editor.lessons = [];
        }
    }

    ensureInitialState() {
        if (!this.editor.lessons || !this.editor.lessons.length) {
            const sample = new Lesson({
                id: Date.now(),
                title: 'الدرس الأول',
                code: '400 014',
                slides: [
                    new Slide({
                        id: 1,
                        title: 'مرحباً',
                        type: 'title',
                        subtype: 'undefined',
                        content: { title: 'مرحباً بكم!', subtitle: 'مرحبا بكم في الدرس الجديد قم باضافة بعد الشرائح للدرس', buttonText: 'ابدأ التعلم' }
                    })
                ]
            });
            this.editor.lessons = [sample];
            this.editor.currentLessonId = sample.id;
            this.editor.currentSlideId = sample.slides[0].id;
            this.saveToLocalStorage();
        } else {
            if (!this.editor.currentLessonId || !this.editor.findLessonById(this.editor.currentLessonId)) {
                this.editor.currentLessonId = this.editor.lessons[0].id;
            }
            const lesson = this.editor.findLessonById(this.editor.currentLessonId);
            if (lesson && lesson.slides.length) {
                this.editor.currentSlideId = lesson.slides[0].id;
            } else {
                this.editor.currentSlideId = null;
            }
        }
    }

    addNewLesson() {
        const newLesson = new Lesson({
            id: Date.now(),
            title: `درس جديد ${this.editor.lessons.length + 1}`,
            code: `400 ${String(this.editor.lessons.length + 14).padStart(3, '0')}`,
            slides: []
        });
        this.editor.lessons.push(newLesson);
        this.editor.currentLessonId = newLesson.id;
        this.editor.currentSlideId = null;
        this.saveToLocalStorage();
        this.editor.renderLessonsSidebar();
        this.editor.updateLessonHeader();
    }

    /**
 * Delete an entire lesson by its id, update current pointers, re-number remaining lessons,
 * persist and re-render.
 */
    deleteLessonById(lessonId) {
        const idx = this.editor.lessons.findIndex(l => l.id === lessonId);
        if (idx === -1) return;

        // Remove lesson
        this.editor.lessons.splice(idx, 1);

        // If no lessons left, ensure initial state
        if (!this.editor.lessons.length) {
            this.ensureInitialState();
            this.saveToLocalStorage();
            this.editor.renderLessonsSidebar();
            this.editor.renderSlidePreview(null);
            if (this.editor.dom.slideEditContent) this.editor.dom.slideEditContent.innerHTML = this.editor.ui.getChooseSlidePlaceholder();
            this.editor.renderMobileSlidesBar();
            return;
        }

        // Re-number lesson titles to keep a simple sequential naming (optional - keep consistent)
        this.editor.lessons.forEach((l, i) => {
            // Only rename if it follows your numbering convention; adjust if you prefer preserving custom titles
            if (l.title && /^الدرس\s+\d+/.test(l.title)) {
                l.title = `الدرس ${i + 1}`;
            }
        });

        // Fix currentLessonId/currentSlideId if needed
        if (this.editor.currentLessonId === lessonId) {
            // prefer the previous lesson if exists, otherwise the first lesson
            const newIndex = Math.max(0, idx - 1);
            const newLesson = this.editor.lessons[newIndex];
            this.editor.currentLessonId = newLesson.id;
            this.editor.currentSlideId = newLesson.slides[0]?.id ?? null;
        }

        // Persist and re-render
        this.saveToLocalStorage();
        this.editor.renderLessonsSidebar();
        this.editor.updateLessonHeader();
        this.editor.renderMobileSlidesBar();
    }


    createNewSlide(type, subtype) {
        const lesson = this.editor.findLessonById(this.editor.currentLessonId);
        if (!lesson) return;
        const nextId = lesson.nextSlideId();
        const slide = new Slide({
            id: nextId,
            title: 'سلايد جديد',
            type,
            subtype,
            content: this.initializeNewSlideContent(type, subtype)
        });
        lesson.slides.push(slide);
        this.editor.currentSlideId = slide.id;
        this.saveToLocalStorage();
        this.editor.hideAddSlideModal();
        this.editor.renderLessonsSidebar();
        this.editor.loadSlideEditContent(slide.id);
    }

    addImageCollectionSection(slideId) {
        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide) return;
        slide.content.sections = slide.content.sections || [];

        // Check if maximum limit reached
        if (slide.content.sections.length >= 4) {
            Swal.fire('حد أقصى', 'لا يمكن إضافة أكثر من 4 أقسام في مجموعة الصور.', 'warning');
            return;
        }

        slide.content.sections.push({ imageUrl: '', description: '' });
        this.saveToLocalStorage();
        this.editor.loadSlideEditContent(slideId);
        this.editor.loadSlidePreview(slideId);
    }

    deleteImageCollectionSection(slideId, index) {
        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide || !Array.isArray(slide.content.sections)) return;
        if (slide.content.sections.length <= 1) {
            Swal.fire('تنبيه', 'يجب أن تحتوي المجموعة على قسم واحد على الأقل.', 'warning');
            return;
        }
        slide.content.sections.splice(index, 1);
        this.saveToLocalStorage();
        this.editor.loadSlideEditContent(slideId);
        this.editor.loadSlidePreview(slideId);
    }

    initializeNewSlideContent(type, subtype) {
        if (type === 'text') {
            if (subtype === 'bulleted-list') {
                return { title: 'قائمة نقطية جديدة', subtitle: '', items: ['البند الأول', 'البند الثاني', 'البند الثالث'] };
            }
            if (subtype === 'comparison') {
                return { title: 'مقارنة جديدة', subtitle: '', leftTitle: 'الجانب الأول', rightTitle: 'الجانب الثاني', leftText: 'نص أ', rightText: 'نص ب' };
            }
            if (subtype === 'expandable-list') {
                return { title: 'قائمة قابلة للتوسيع', subtitle: '', items: [{ title: 'عنوان المفهوم', text: 'شرح المفهوم' }] };
            }
            if (subtype === 'text-series') {
                return {
                    title: 'سلسلة نصوص',
                    subtitle: '',
                    items: [
                        { title: 'النص الأول', content: 'محتوى النص الأول يظهر هنا...' },
                        { title: 'النص الثاني', content: 'محتوى النص الثاني يظهر هنا...' }
                    ]
                };
            }
            return { title: 'محتوى', subtitle: '', text: 'أدخل المحتوى هنا...' };
        }
        if (type === 'video' && subtype === 'video') {
            return { title: 'فيديو جديد', subtitle: '', videoUrl: '', duration: '', description: '' };
        }
        if (type === 'image') {
            if (subtype === 'comparison') {
                return { title: 'مقارنة صور', subtitle: '', imageA: '', imageB: '' };
            }
            if (subtype === 'image-series') { // ADD THIS CASE
                return {
                    title: 'سلسلة الصور',
                    subtitle: '',
                    items: [
                        { title: 'الصورة الأولى', imageUrl: '' },
                        { title: 'الصورة الثانية', imageUrl: '' }
                    ]
                };
            }
            if (subtype === 'image-collection') {
                return {
                    title: 'مجموعة صور',
                    subtitle: '',
                    sections: [
                        { imageUrl: '', description: '' }
                    ]
                };
            }
        }
        if (type === 'title') {
            return { title: 'عنوان', subtitle: '', buttonText: 'ابدأ' };
        }
        if (type === 'quiz') {
            if (subtype === 'connect-quiz') {
                return {
                    question: 'قم بتوصيل العناصر المتشابهة',
                    leftColumn: [
                        { type: 'text', value: 'عنصر 1', correctIndex: 0 },
                        { type: 'text', value: 'عنصر 2', correctIndex: 1 },
                        { type: 'text', value: 'عنصر 3', correctIndex: 2 }
                    ],
                    rightColumn: [
                        { type: 'text', value: 'عنصر 1' },
                        { type: 'text', value: 'عنصر 2' },
                        { type: 'text', value: 'عنصر 3' }
                    ],
                    leftColumnType: 'text',  // Add this
                    rightColumnType: 'text'  // Add this
                };
            }
            if (subtype === 'drag-match-quiz') {
                return {
                    question: 'اسحب الصور إلى النصوص المناسبة',
                    leftColumn: [
                        { type: 'image', value: '', correctIndex: 0 },
                        { type: 'image', value: '', correctIndex: 1 },
                        { type: 'image', value: '', correctIndex: 2 }
                    ],
                    rightColumn: [
                        { type: 'text', value: 'نص 1' },
                        { type: 'text', value: 'نص 2' },
                        { type: 'text', value: 'نص 3' }
                    ],
                    leftColumnType: 'image',  // Add this
                    rightColumnType: 'text'   // Add this
                };
            }
            if (subtype === 'image-pairs-quiz') {
                return {
                    question: 'اختر الصور الصحيحة من القائمتين',
                    leftColumn: [
                        { type: 'image', value: '', isCorrect: true }
                    ],
                    rightColumn: [
                        { type: 'image', value: '', isCorrect: true },
                        { type: 'image', value: '', isCorrect: false }
                    ],
                    leftColumnType: 'image',  // Force image type
                    rightColumnType: 'image'  // Force image type
                };
            }
        }
        return { title: 'شريحة جديدة', subtitle: '' };
    }

    // ADD THESE METHODS TO THE SlideManager CLASS:

    addTextSeriesItem(slideId) {
        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide) return;
        slide.content.items = slide.content.items || [];

        // Check if maximum limit reached
        if (slide.content.items.length >= 6) {
            Swal.fire('حد أقصى', 'لا يمكن إضافة أكثر من 6 نصوص في السلسلة.', 'warning');
            return;
        }

        slide.content.items.push({ title: '', content: 'محتوى النص الجديد...' });
        this.saveToLocalStorage();
        this.editor.loadSlideEditContent(slideId);
        this.editor.loadSlidePreview(slideId);
    }

    deleteTextSeriesItem(slideId, index) {
        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide || !Array.isArray(slide.content.items)) return;
        if (slide.content.items.length <= 1) {
            Swal.fire('تنبيه', 'يجب أن تحتوي السلسلة على نص واحد على الأقل.', 'warning');
            return;
        }
        slide.content.items.splice(index, 1);
        this.saveToLocalStorage();
        this.editor.loadSlideEditContent(slideId);
        this.editor.loadSlidePreview(slideId);
    }

    addSeriesItem(slideId, contentType, itemTemplate, maxItems = 6) {
        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide) return;
        slide.content.items = slide.content.items || [];

        if (slide.content.items.length >= maxItems) {
            Swal.fire('حد أقصى', `لا يمكن إضافة أكثر من ${maxItems} عناصر في السلسلة.`, 'warning');
            return;
        }

        slide.content.items.push(itemTemplate);
        this.saveToLocalStorage();
        this.editor.loadSlideEditContent(slideId);
        this.editor.loadSlidePreview(slideId);
    }

    deleteSeriesItem(slideId, index, minItems = 1) {
        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide || !Array.isArray(slide.content.items)) return;
        if (slide.content.items.length <= minItems) {
            Swal.fire('تنبيه', `يجب أن تحتوي السلسلة على ${minItems} عنصر واحد على الأقل.`, 'warning');
            return;
        }
        slide.content.items.splice(index, 1);
        this.saveToLocalStorage();
        this.editor.loadSlideEditContent(slideId);
        this.editor.loadSlidePreview(slideId);
    }

    // Image series methods
    addImageSeriesItem(slideId) {
        this.addSeriesItem(slideId, 'image', { title: '', imageUrl: '' });
    }

    deleteImageSeriesItem(slideId, index) {
        this.deleteSeriesItem(slideId, index, 1);
    }

    deleteSlideById(slideId) {
        const lesson = this.editor.findLessonById(this.editor.currentLessonId);
        if (!lesson) return;
        const idx = lesson.slides.findIndex(s => s.id === slideId);
        if (idx > -1) {
            lesson.slides.splice(idx, 1);
            if (this.editor.currentSlideId === slideId) this.editor.currentSlideId = null;
            this.saveToLocalStorage();
            this.editor.renderLessonsSidebar();
            this.editor.renderSlidePreview(null);
            if (this.editor.dom.slideEditContent) {
                this.editor.dom.slideEditContent.innerHTML = `
                <div class="text-center text-gray-500 py-12">
                    <i class="fas fa-edit text-4xl mb-4"></i>
                    <p>اختر سلايداً للتعديل</p>
                </div>`;
            }
        }
    }

    updateSlideContent(slideId, field, value) {
        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide) return;

        if (field === 'slideTitle') {
            slide.title = value;
            const slideItem = document.querySelector(`.slide-item[data-slide-id="${slideId}"] h5`);
            if (slideItem) {
                slideItem.textContent = value;
            } else {
                this.editor.renderLessonsSidebar();
            }
        } else {
            slide.content = slide.content || {};
            slide.content[field] = value;
        }

        this.saveToLocalStorage();

        if (document.hasFocus()) {
            this.editor.renderSlidePreview(slide);
        }
    }

    updateNestedContent(slideId, contentKey, index, key, value) {
        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide) return;
        slide.content = slide.content || {};
        slide.content[contentKey] = slide.content[contentKey] || [];

        if (typeof key === 'number' || key === null) {
            slide.content[contentKey][index] = value;
        } else {
            slide.content[contentKey][index] = slide.content[contentKey][index] || {};
            slide.content[contentKey][index][key] = value;
        }
        this.saveToLocalStorage();
        this.editor.loadSlidePreview(slideId);
    }

    addBulletedListItem(slideId) {
        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide) return;
        slide.content.items = slide.content.items || [];
        // Check if maximum limit reached
        if (slide.content.items.length >= 4) {
            Swal.fire('حد أقصى', 'لا يمكن إضافة أكثر من 4 نقاط في القائمة النقطية.', 'warning');
            return;
        }
        slide.content.items.push('نقطة جديدة');
        this.saveToLocalStorage();
        this.editor.loadSlideEditContent(slideId);
        this.editor.loadSlidePreview(slideId);
    }

    deleteBulletedListItem(slideId, index) {
        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide || !Array.isArray(slide.content.items)) return;
        if (slide.content.items.length <= 1) {
            Swal.fire('تنبيه', 'يجب أن تحتوي القائمة على نقطة واحدة على الأقل.', 'warning');
            return;
        }
        slide.content.items.splice(index, 1);
        this.saveToLocalStorage();
        this.editor.loadSlideEditContent(slideId);
        this.editor.loadSlidePreview(slideId);
    }

    addExpandableListItem(slideId) {
        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide) return;
        slide.content.items = slide.content.items || [];

        // Check if maximum limit reached
        if (slide.content.items.length >= 4) {
            Swal.fire('حد أقصى', 'لا يمكن إضافة أكثر من 4 عناصر في القائمة القابلة للتوسيع.', 'warning');
            return;
        }

        slide.content.items.push({ title: 'مفهوم جديد', text: 'محتوى المفهوم.' });
        this.saveToLocalStorage();
        this.editor.loadSlideEditContent(slideId);
        this.editor.loadSlidePreview(slideId);
    }

    deleteExpandableListItem(slideId, index) {
        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide || !Array.isArray(slide.content.items)) return;
        slide.content.items.splice(index, 1);
        this.saveToLocalStorage();
        this.editor.loadSlideEditContent(slideId);
        this.editor.loadSlidePreview(slideId);
    }
}

////////////////////////////////////////////////////
// UIRenderer — renders preview & editors & templates
////////////////////////////////////////////////////
class UIRenderer {
    constructor(editor) {
        this.editor = editor;
    }

    // Main preview rendering method (keeps your original templates with cleaned wrappers)
    renderSlidePreview(slide) {
        const previewContainer = this.editor.dom.slidePreviewContainer;
        const previewContent = this.editor.dom.slidePreviewContent;
        if (!previewContent) return;

        if (!slide) {
            previewContent.innerHTML = `
        <div class="flex flex-col items-center justify-center text-center h-full text-white opacity-80">
            <i class="fas fa-sliders-h text-5xl mb-4"></i>
            <h2 class="text-xl font-bold mb-2">اختر سلايداً للمعاينة</h2>
            <p class="text-sm">انقر على أي سلايد لرؤية محتواه هنا</p>
        </div>`;
            previewContainer.className = 'slide-preview rounded-t-xl fixed-slide-size mx-auto flex items-center justify-center';
            return;
        }

        previewContent.innerHTML = '';
        previewContainer.className = `slide-preview rounded-t-xl fixed-slide-size mx-auto slide-${slide.type}`;

        const headerHtml = `
            <div class="slide-header w-full">
                <h1 class="font-extrabold mb-2">${Utils.escapeHTML(slide.content.title || slide.title)}</h1>
                ${slide.content.subtitle ? `<h2 class="mb-4">${Utils.escapeHTML(slide.content.subtitle)}</h2>` : ''}
            </div>
        `;

        let bodyHtml = '';
        const key = `${slide.type}-${slide.subtype}`;

        switch (key) {
            case 'text-bulleted-list':
                bodyHtml += `<ul class="space-y-2 mt-2 max-h-96 overflow-y-auto break-words">`;
                if (Array.isArray(slide.content.items)) {
                    slide.content.items.forEach(it => {
                        bodyHtml += `<li class="text-white">${Utils.escapeHTML(it)}</li>`;
                    });
                }
                bodyHtml += `</ul>`;
                break;
            case 'text-comparison':
                bodyHtml += this.renderUniversalComparison(slide, 'text');
                break;
            case 'text-expandable-list':
                bodyHtml += this.renderExpandableListPreview(slide);
                break;
            case 'text-text-series':
                bodyHtml += this.renderTextSeriesPreview(slide);
                break;

            case 'video-video':
                bodyHtml += this.renderVideoPreview(slide);
                break;

            case 'title-undefined':
                bodyHtml += `<div class="mt-4 text-center self-center">
                                <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg px-6 py-2">
                                    ${Utils.escapeHTML(slide.content.buttonText || 'البدء')}
                                </button>
                            </div>`;
                break;

            case 'image-comparison':
                bodyHtml += this.renderUniversalComparison(slide, 'image');
                break;
            case 'image-image-series':
                bodyHtml += this.renderImageSeriesPreview(slide);
                break;
            case 'image-image-collection':
                bodyHtml += this.renderImageCollectionPreview(slide);
                break;

            case 'quiz-multiple-choice-carousel': {
                bodyHtml += this.renderQuizCarousel(slide);
                break;
            }
            case 'quiz-categorize':
                bodyHtml += this.renderQuizCategorize(slide);
                break;
            case 'quiz-connect-quiz':
                bodyHtml += this.renderConnectQuizPreview(slide);
                setTimeout(() => window.drawConnectQuizLines(slide.id), 100);
                break;

            case 'quiz-drag-match-quiz':
                bodyHtml += this.renderDragMatchQuizPreview(slide);
                break;

            case 'quiz-image-pairs-quiz':
                bodyHtml += this.renderImagePairsQuizPreview(slide);
                break;

            default:
                if (slide.content.text) {
                    bodyHtml += `<div class="prose max-w-none text-base text-white mt-3 max-h-96 overflow-y-auto break-words hyphens-auto">${Utils.escapeHTML(slide.content.text).replace(/\n/g, '<br>')}</div>`;
                } else {
                    bodyHtml += `<div class="text-center text-gray-200 py-12">لا توجد واجهة معاينة مخصصة لهذا النوع بعد.</div>`;
                }
        }

        previewContent.innerHTML = `
            <div class="slide-content w-full  overflow-y-auto break-words hyphens-auto">
                ${headerHtml + bodyHtml}
            </div>
        `;
        const preview = document.getElementById("slide-preview-container");
        if (preview) preview.classList.add("fixed-slide-size");
    }

    renderExpandableListPreview(slide) {
        const items = slide.content.items || [];
        let html = `<div class="space-y-3 mt-3 w-full max-h-96 overflow-y-auto break-words">`;

        items.forEach((item, idx) => {
            html += `
            <div class="expandable-item bg-black/40 p-3 rounded-lg shadow cursor-pointer text-white" data-index="${idx}">
                <div class="flex justify-between items-center">
                    <h3 class="text-base font-semibold text-white">${Utils.escapeHTML(item.title || 'العنوان')}</h3>
                    <i class="fas fa-chevron-down text-gray-200 transition-transform duration-300"></i>
                </div>
                <div class="expandable-content mt-2 text-gray-200 hidden">
                    <p class="text-sm leading-relaxed">${Utils.escapeHTML(item.text || 'لا يوجد محتوى')}</p>
                </div>
            </div>`;
        });

        html += `</div>`;
        return html;
    }

    renderImageCollectionPreview(slide) {
        const sections = slide.content.sections || [];
        if (!sections.length) {
            return `<div class="text-center text-white/70 py-12">لا توجد صور في المجموعة</div>`;
        }

        const isDetailView = slide.content._selectedSection !== undefined && slide.content._selectedSection !== null;

        if (isDetailView) {
            const selectedIndex = slide.content._selectedSection;
            const selectedSection = sections[selectedIndex];

            return `
        <div class="image-collection-detail w-full h-full absolute inset-0 flex flex-col items-center justify-center p-4 cursor-pointer bg-gradient-to-br from-purple-600/90 to-blue-600/90 backdrop-blur-sm overflow-hidden" 
             data-action="close-detail">
            ${selectedSection.imageUrl ? `
                <div class="image-container flex-1 flex items-center justify-center w-full max-w-4xl overflow-hidden">
                    <img src="${Utils.escapeHTML(selectedSection.imageUrl)}" 
                         alt="الصورة المحددة" 
                         class="max-h-full max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-300"
                         onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='block';" />
                    <div class="fallback-placeholder hidden text-center text-white/70 py-8">
                        <i class="fas fa-image text-4xl mb-3 opacity-50"></i>
                        <p class="text-center">تعذر تحميل الصورة</p>
                    </div>
                </div>
                ${selectedSection.description ? `
                    <div class="description-container bg-black/40 rounded-xl p-4 max-w-2xl w-full border border-white/20 overflow-y-auto mt-2" style="max-height: min(300px, 30vh);">
                        <p class="text-white text-lg leading-relaxed text-center font-medium break-words">${Utils.escapeHTML(selectedSection.description)}</p>
                    </div>
                ` : ''}
            ` : `
                <div class="text-white/70 text-center py-8">
                    <i class="fas fa-image text-4xl mb-3 opacity-50"></i>
                    <p>لم يتم إدخال رابط الصورة بعد</p>
                </div>
            `}
            <div class="absolute bottom-4 text-white/60 text-sm">
                انقر في أي مكان للعودة
            </div>
        </div>
    `;
        }

        // Normal mode - Calculate dynamic heights with extra space
        const sectionsCount = sections.length;
        const gapHeight = 0.75;
        const totalGapsHeight = (sectionsCount - 1) * gapHeight;
        const extraPadding = 2;
        const availableHeight = `calc((100% - ${totalGapsHeight}rem - ${extraPadding}rem) / ${sectionsCount})`;

        const sectionsHtml = sections.map((section, index) => `
    <div class="image-collection-item cursor-pointer transition-all duration-300 transform hover:scale-[1.02] hover:brightness-110 hover:shadow-xl w-4/5 mx-auto" 
         data-action="open-detail" 
         data-index="${index}"
         style="height: ${availableHeight}; max-height: ${availableHeight};">
        ${section.imageUrl ? `
            <div class="image-container bg-black/20 rounded-xl border-2 border-transparent hover:border-white/30 w-full h-full flex items-center justify-center p-2">
                <img src="${Utils.escapeHTML(section.imageUrl)}" 
                     alt="صورة ${index + 1}" 
                     class="w-full h-full object-contain rounded-lg max-w-full"
                     style="max-width: 80%; max-height: 100%;"
                     onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div class="fallback-placeholder hidden h-full w-full items-center justify-center text-white/70 bg-black/10 rounded-lg">
                    <i class="fas fa-image text-xl mb-1 opacity-50"></i>
                    <p class="text-xs text-center">تعذر تحميل الصورة</p>
                </div>
            </div>
        ` : `
            <div class="h-full bg-black/20 rounded-xl flex items-center justify-center text-white/70 border-2 border-dashed border-white/30 hover:border-white/50 hover:bg-black/30 w-full p-2">
                <div class="text-center">
                    <i class="fas fa-image text-xl mb-1 opacity-50"></i>
                    <p class="text-xs">لا توجد صورة</p>
                </div>
            </div>
        `}
    </div>
`).join('');

        return `
    <div class="image-collection-grid w-full h-full">
        <div class="flex flex-col items-center justify-center h-full space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent py-2">
            ${sectionsHtml}
        </div>
    </div>
`;
    }

    // For connect quiz - update the container:
    renderConnectQuizPreview(slide) {
        const c = slide.content || {};
        const leftColumn = c.leftColumn || [];
        const rightColumn = c.rightColumn || [];
        const leftColumnType = c.leftColumnType || 'text';
        const rightColumnType = c.rightColumnType || 'text';
        const submitted = slide.submitted || false;

        let html = `
    <div class="quiz-connect-container mt-6 relative w-full h-full flex flex-col">
        <h3 class="text-xl font-bold text-center mb-6 text-white">${Utils.escapeHTML(c.question || 'قم بتوصيل العناصر المتشابهة')}</h3>
        <div class="flex-1 flex justify-center items-center">
            <div class="flex gap-10 w-full max-w-4xl dir-ltr">
                <div class="flex-1 flex flex-col h-full">
                    <div class="flex-1 flex flex-col gap-4 justify-start items-center">
    `;

        // Left column items - max 3, using column type
        leftColumn.slice(0, 3).forEach((item, index) => {
            html += this.renderQuizItem(item, index, 'left', 'connect', submitted, leftColumnType);
        });

        html += `
                    </div>
                </div>
                <div class="flex-1 flex flex-col h-full">
                    <div class="flex-1 flex flex-col gap-4 justify-start items-center">
    `;

        // Right column items - max 3, using column type
        rightColumn.slice(0, 3).forEach((item, index) => {
            html += this.renderQuizItem(item, index, 'right', 'connect', submitted, rightColumnType);
        });

        html += `
                    </div>
                </div>
            </div>
        </div>
        <div class="quiz-connections-layer absolute inset-0 pointer-events-none z-10" id="connections-${slide.id}"></div>
    `;

        // Submit button
        const showSubmit = this.editor.shouldShowQuizSubmit(slide);
        if (showSubmit) {
            html += `
        <div class="text-center mt-6 pt-4 border-t border-white/20">
            <button class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:transform hover:scale-105" 
                    id="quiz-${slide.id}-submit">
                تأكيد الإجابة
            </button>
        </div>
    `;
        }

        html += `
        <div id="quiz-${slide.id}-feedback" class="quiz-feedback-icon"></div>
    </div>
    `;

        return html;
    }

    renderDragMatchQuizPreview(slide) {
        const c = slide.content || {};
        const leftColumn = c.leftColumn || [];
        const rightColumn = c.rightColumn || [];
        const leftColumnType = c.leftColumnType || 'image';
        const rightColumnType = c.rightColumnType || 'text';
        const submitted = slide.submitted || false;

        let html = `
    <div class="quiz-drag-match-container mt-6 relative w-full h-full flex flex-col">
        <h3 class="text-xl font-bold text-center mb-6 text-white">${Utils.escapeHTML(c.question || 'اسحب الصور إلى النصوص المناسبة')}</h3>
        <div class="flex-1 flex justify-center items-center">
            <div class="flex gap-10 w-full max-w-4xl h-full">
                <div class="flex-1 flex flex-col h-full">
                    <div class="text-white text-center font-bold text-lg bg-black/40 py-2 px-4 rounded-lg border border-white/20 mb-4">اسحب من هنا</div>
                    <div class="flex-1 flex flex-col gap-4 justify-start items-center">
    `;

        // Left column - make them drop zones too
        leftColumn.slice(0, 3).forEach((item, index) => {
            const isPlaced = slide.userMatches?.some(match => match.leftIndex === index);

            // FIX: If item is placed in right column, show empty zone in left
            let itemHtml = '';
            if (!isPlaced) {
                itemHtml = this.renderQuizItem(item, index, 'left', 'drag', submitted, leftColumnType);
            }

            const zoneClass = isPlaced ? 'quiz-drop-zone border-blue-400 bg-blue-500/10' : 'quiz-drop-zone border-white/40';

            html += `
        <div class="${zoneClass} h-[30%] border-2 border-dashed rounded-xl transition-all duration-300 flex items-center justify-center hover:border-blue-400 hover:bg-blue-500/10" 
             data-index="${index}" 
             data-side="left"
             ondragover="window.handleDragMatchOver(event)"
             ondragleave="window.handleDragMatchLeave(event)"
             ondrop="window.handleDragMatchDrop(event, '${slide.id}', ${index}, 'left')">
            ${itemHtml}
        </div>
    `;
        });

        html += `
                    </div>
                </div>
                <div class="flex-1 flex flex-col h-full">
                    <div class="text-white text-center font-bold text-lg bg-black/40 py-2 px-4 rounded-lg border border-white/20 mb-4">أسقط هنا</div>
                    <div class="flex-1 flex flex-col gap-4 justify-start items-center">
    `;

        // Right column - drop zones
        rightColumn.slice(0, 3).forEach((item, index) => {
            // FIX: Find which left item is placed in this right zone
            const match = slide.userMatches?.find(match => match.rightIndex === index);
            let itemHtml = '';

            if (match) {
                // If there's a match, render the left item in the right zone
                const leftItem = leftColumn[match.leftIndex];
                if (leftItem) {
                    itemHtml = this.renderQuizItem(leftItem, match.leftIndex, 'left', 'drag', submitted, leftColumnType);
                }
            } else {
                // If no match, render the original right item
                itemHtml = this.renderQuizItem(item, index, 'right', 'drag', submitted, rightColumnType);
            }

            const zoneClass = match ? 'quiz-drop-zone border-green-400 bg-green-500/10' : 'quiz-drop-zone border-white/40';

            html += `
        <div class="${zoneClass} h-[30%] border-2 border-dashed rounded-xl transition-all duration-300 flex items-center justify-center hover:border-green-400 hover:bg-green-500/10" 
             data-index="${index}" 
             data-side="right"
             ondragover="window.handleDragMatchOver(event)"
             ondragleave="window.handleDragMatchLeave(event)"
             ondrop="window.handleDragMatchDrop(event, '${slide.id}', ${index}, 'right')">
            ${itemHtml}
        </div>
    `;
        });

        html += `
                    </div>
                </div>
            </div>
        </div>
    `;

        // Submit button
        const showSubmit = this.editor.shouldShowQuizSubmit(slide);
        if (showSubmit) {
            html += `
        <div class="text-center mt-6 pt-4 border-t border-white/20">
            <button class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:transform hover:scale-105 ${showSubmit ? '' : 'hidden'}" 
                    id="quiz-${slide.id}-submit">
                تأكيد الإجابة
            </button>
        </div>
    `;
        }

        html += `
        <div id="quiz-${slide.id}-feedback" class="quiz-feedback-icon"></div>
    </div>
    `;

        return html;
    }


    // For image pairs quiz - update the container:
    renderImagePairsQuizPreview(slide) {
        const c = slide.content || {};
        const leftColumn = c.leftColumn || [];
        const rightColumn = c.rightColumn || [];
        const leftColumnType = c.leftColumnType || 'image'; // Force image type
        const rightColumnType = c.rightColumnType || 'image'; // Force image type
        const submitted = slide.submitted || false;

        console.log('Image Pairs Debug:', {
            leftColumn,
            rightColumn,
            leftColumnType,
            rightColumnType
        });

        let html = `
    <div class="quiz-image-pairs-container mt-6 relative w-full h-full flex flex-col">
        <h3 class="text-xl font-bold text-center mb-6 text-white">${Utils.escapeHTML(c.question || 'اختر الصور الصحيحة من القائمتين')}</h3>
        <div class="flex-1 flex justify-center items-center">
            <div class="flex gap-10 w-full max-w-4xl h-full">
                <div class="flex-1 flex flex-col h-full">
                    <div class="text-white text-center font-bold text-lg bg-black/40 py-2 px-4 rounded-lg border border-white/20 mb-4">القائمة اليسرى</div>
                    <div class="flex-1 flex flex-col gap-4 justify-center items-center">
    `;

        // Left column - selectable items - max 3, using column type
        leftColumn.slice(0, 3).forEach((item, index) => {
            console.log('Left item:', item, 'Type:', leftColumnType);
            html += this.renderQuizItem(item, index, 'left', 'pairs', submitted, leftColumnType);
        });

        html += `
                    </div>
                </div>
                <div class="flex-1 flex flex-col h-full">
                    <div class="text-white text-center font-bold text-lg bg-black/40 py-2 px-4 rounded-lg border border-white/20 mb-4">القائمة اليمنى</div>
                    <div class="flex-1 flex flex-col gap-4 justify-center items-center">
    `;

        // Right column - selectable items - max 3, using column type
        rightColumn.slice(0, 3).forEach((item, index) => {
            console.log('Right item:', item, 'Type:', rightColumnType);
            html += this.renderQuizItem(item, index, 'right', 'pairs', submitted, rightColumnType);
        });

        html += `
                    </div>
                </div>
            </div>
        </div>
    `;

        // Submit button
        const showSubmit = this.editor.shouldShowQuizSubmit(slide);
        if (showSubmit) {
            html += `
        <div class="text-center mt-6 pt-4 border-t border-white/20">
            <button class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:transform hover:scale-105" 
                    id="quiz-${slide.id}-submit">
                تأكيد الإجابة
            </button>
        </div>
    `;
        }

        html += `
        <div id="quiz-${slide.id}-feedback" class="quiz-feedback-icon"></div>
    </div>
    `;

        return html;
    }

    renderDragMatchQuizPreview(slide) {
        const c = slide.content || {};
        const leftColumn = c.leftColumn || [];
        const rightColumn = c.rightColumn || [];
        const submitted = slide.submitted || false;

        let html = `
        <div class="quiz-drag-match-container mt-4 mx-auto">
            <h3 class="text-lg font-bold text-center mb-4 text-white">${Utils.escapeHTML(c.question || 'اسحب الصور إلى النصوص المناسبة')}</h3>
            <div class="quiz-columns-container gap-20 dir-ltr">
                <div class="quiz-column">
    `;

        // Left column - draggable items
        leftColumn.forEach((item, index) => {
            html += this.renderQuizItem(item, index, 'left', 'drag', submitted);
        });

        html += `
                </div>
                <div class="quiz-column">
    `;

        // Right column - drop zones
        rightColumn.forEach((item, index) => {
            html += `
            <div class="quiz-drop-zone" data-index="${index}" 
                 ondragover="event.preventDefault()" 
                 ondrop="window.handleDragMatchDrop(event, '${slide.id}', ${index})">
                ${this.renderQuizItem(item, index, 'right', 'drag', submitted)}
            </div>
        `;
        });

        html += `
                </div>
            </div>
    `;

        // Submit button
        const showSubmit = this.editor.shouldShowQuizSubmit(slide);
        if (showSubmit) {
            html += `
            <div class="text-center mt-4">
                <button class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition" 
                        id="quiz-${slide.id}-submit">
                    تأكيد الإجابة
                </button>
            </div>
        `;
        }

        html += `
            <!-- Feedback icon container -->
            <div id="quiz-${slide.id}-feedback" class="quiz-feedback-icon"></div>
        </div>
    `;

        return html;
    }

    renderImagePairsQuizPreview(slide) {
        const c = slide.content || {};
        const leftColumn = c.leftColumn || [];
        const rightColumn = c.rightColumn || [];
        const submitted = slide.submitted || false;

        let html = `
        <div class="quiz-image-pairs-container mt-4 mx-auto">
            <h3 class="text-lg font-bold text-center mb-4 text-white">${Utils.escapeHTML(c.question || 'اختر العناصر الصحيحة من القائمتين')}</h3>
            <div class="quiz-columns-container gap-20 dir-ltr">
                <div class="quiz-column">
    `;

        // Left column - selectable items
        leftColumn.forEach((item, index) => {
            html += this.renderQuizItem(item, index, 'left', 'pairs', submitted);
        });

        html += `
                </div>
                <div class="quiz-column">
    `;

        // Right column - selectable items
        rightColumn.forEach((item, index) => {
            html += this.renderQuizItem(item, index, 'right', 'pairs', submitted);
        });

        html += `
                </div>
            </div>
    `;

        // Submit button
        const showSubmit = this.editor.shouldShowQuizSubmit(slide);
        if (showSubmit) {
            html += `
            <div class="text-center mt-4">
                <button class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition" 
                        id="quiz-${slide.id}-submit">
                    تأكيد الإجابة
                </button>
            </div>
        `;
        }

        html += `
            <!-- Feedback icon container -->
            <div id="quiz-${slide.id}-feedback" class="quiz-feedback-icon"></div>
        </div>
    `;

        return html;
    }

    renderQuizItem(item, index, side, quizType, submitted = false, columnType = null) {
        // Use column type if provided, otherwise fall back to item.type
        const type = columnType || item.type;
        const isSelected = item._selected || false;
        const isCorrect = item.isCorrect || false;

        // Base Tailwind classes for all quiz items - FIXED sizing
        let itemClass = "w-32 h-32 bg-black/40 border-2 border-white/30 rounded-xl p-3 flex items-center justify-center transition-all duration-300 shadow-lg";

        // Hover effects for interactive items
        if (quizType === 'connect' || quizType === 'pairs') {
            itemClass += " cursor-pointer hover:border-white/50 hover:shadow-xl";
        }
        if (quizType === 'drag' && side === 'left' && !submitted && type === 'image') {
            itemClass += " cursor-grab active:cursor-grabbing hover:bg-blue-600/20 hover:border-blue-400";
        }

        // Selected state for image pairs
        if (quizType === 'pairs' && isSelected && !submitted) {
            itemClass += " bg-blue-500/40 border-blue-400 shadow-blue-500/30 transform scale-105";
        }

        // Submitted state styling
        if (submitted) {
            if (quizType === 'pairs') {
                itemClass += isCorrect ? " bg-green-600/40 border-green-500 shadow-green-500/30" : " bg-red-600/40 border-red-500 shadow-red-500/30";
            }
        }

        let content = '';
        if (type === 'text') {
            content = `<div class="text-white text-center font-semibold text-sm leading-relaxed break-words hyphens-auto px-2">${Utils.escapeHTML(item.value || `عنصر ${index + 1}`)}</div>`;
        } else if (type === 'image') {
            if (item.value) {
                content = `
            <div class="w-full h-full flex items-center justify-center">
                <img src="${Utils.escapeHTML(item.value)}" alt="صورة ${index + 1}" 
                     class="max-w-full max-h-full object-contain rounded-lg"
                     onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div class="fallback-placeholder hidden flex-col items-center justify-center text-white/60">
                    <i class="fas fa-image text-xl mb-1 opacity-50"></i>
                    <p class="text-xs text-center">تعذر تحميل الصورة</p>
                </div>
            </div>
        `;
            } else {
                content = `
            <div class="flex flex-col items-center justify-center text-white/60">
                <i class="fas fa-image text-xl mb-1 opacity-50"></i>
                <p class="text-xs">لا توجد صورة</p>
            </div>
        `;
            }
        }

        // Add interactive elements based on quiz type
        if (quizType === 'connect') {
            const isConnected = this.editor.getCurrentSlide()?.userConnections?.some(conn =>
                conn.leftIndex === index && side === 'left'
            );
            const connectionClass = isConnected ? 'ring-2 ring-blue-400 bg-blue-500/20' : '';

            // For left items, use the new drawing system
            if (side === 'left') {
                const slideId = this.editor.getCurrentSlide()?.id;
                return `
        <div class="${itemClass} ${connectionClass} quiz-connect-item" data-side="${side}" data-index="${index}"
             onmousedown="window.startConnectDrawing(event, '${side}', ${index}, '${slideId}')"
             ontouchstart="window.startConnectDrawing(event, '${side}', ${index}, '${slideId}')">
            ${content}
        </div>
    `;
            } else {
                // Right items don't need interactive events for drawing
                return `
        <div class="${itemClass} ${connectionClass} quiz-connect-item" data-side="${side}" data-index="${index}">
            ${content}
        </div>
    `;
            }
        } else if (quizType === 'drag') {
            const draggable = side === 'left' && !submitted && type === 'image';
            return `
        <div class="${itemClass} quiz-drag-item" data-side="${side}" data-index="${index}" 
             ${draggable ? 'draggable="true"' : ''}
             ondragstart="${draggable ? `window.handleDragMatchStart(event, '${side}', ${index})` : ''}">
            ${content}
        </div>
    `;
        } else if (quizType === 'pairs') {
            const selectable = !submitted;
            return `
        <div class="${itemClass} quiz-pairs-item" data-side="${side}" data-index="${index}" 
             ${selectable ? `onclick="window.handleImagePairsSelect(event, '${side}', ${index})"` : ''}>
            ${content}
        </div>
    `;
        }

        return `<div class="${itemClass}">${content}</div>`;
    }

    // Replace renderConnectQuizEditor method:
    renderConnectQuizEditor(slide) {
        const c = slide.content || {};
        const leftColumn = c.leftColumn || [];
        const rightColumn = c.rightColumn || [];
        const leftColumnType = c.leftColumnType || 'text';
        const rightColumnType = c.rightColumnType || 'text';

        const leftItemsHtml = leftColumn.map((item, index) => `
        <div class="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">العنصر ${index + 1}</span>
                <button data-action="delete-connect-left" data-index="${index}" 
                        ${leftColumn.length <= 1 ? 'disabled' : ''}
                        class="p-1 text-red-600 hover:bg-red-100 rounded-full transition duration-150 ${leftColumn.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
            <div class="space-y-2">
                ${leftColumnType === 'text' ? `
                    <div>
                        <input type="text" data-connect-left="${index}" data-field="value" value="${Utils.escapeHTML(item.value || '')}" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                            placeholder="النص..." />
                    </div>
                ` : `
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">رابط الصورة:</label>
                        <input type="url" data-connect-left="${index}" data-field="value" value="${Utils.escapeHTML(item.value || '')}" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                            placeholder="https://example.com/image.jpg" />
                    </div>
                `}
                <div>
                    <label class="block text-xs text-gray-600 mb-1">رقم العنصر الصحيح:</label>
                    <input type="number" data-connect-left="${index}" data-field="correctIndex" 
                        value="${item.correctIndex !== undefined ? item.correctIndex + 1 : 1}" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                        min="1" max="${Math.max(1, rightColumn.length)}" 
                        oninput="this.value = Math.max(1, Math.min(parseInt(this.value) || 1, ${Math.max(1, rightColumn.length)}))" />
                    <p class="text-xs text-gray-500 mt-1">(من 1 إلى ${rightColumn.length})</p>
                </div>
            </div>
        </div>
    `).join('');

        const rightItemsHtml = rightColumn.map((item, index) => `
        <div class="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">العنصر ${index + 1}</span>
                <button data-action="delete-connect-right" data-index="${index}" 
                        ${rightColumn.length <= 1 ? 'disabled' : ''}
                        class="p-1 text-red-600 hover:bg-red-100 rounded-full transition duration-150 ${rightColumn.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
            <div>
                ${rightColumnType === 'text' ? `
                    <input type="text" data-connect-right="${index}" data-field="value" value="${Utils.escapeHTML(item.value || '')}" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                        placeholder="النص..." />
                ` : `
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">رابط الصورة:</label>
                        <input type="url" data-connect-right="${index}" data-field="value" value="${Utils.escapeHTML(item.value || '')}" 
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                            placeholder="https://example.com/image.jpg" />
                    </div>
                `}
            </div>
        </div>
    `).join('');

        return `
    <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
        <h4 class="text-lg font-semibold mb-3 text-gray-800">إعدادات اختبار التوصيل</h4>
        
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">السؤال</label>
            <input type="text" id="connect-quiz-question" value="${Utils.escapeHTML(c.question || '')}" 
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="أدخل السؤال هنا..." />
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">نوع العمود الأيسر</label>
                <select id="connect-left-type" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="text" ${leftColumnType === 'text' ? 'selected' : ''}>نص</option>
                    <option value="image" ${leftColumnType === 'image' ? 'selected' : ''}>صورة</option>
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">نوع العمود الأيمن</label>
                <select id="connect-right-type" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="text" ${rightColumnType === 'text' ? 'selected' : ''}>نص</option>
                    <option value="image" ${rightColumnType === 'image' ? 'selected' : ''}>صورة</option>
                </select>
            </div>
        </div>

        <div class="space-y-4">
            <details class="bg-gray-50 rounded-lg border border-gray-200" open>
                <summary class="p-3 cursor-pointer flex items-center justify-between">
                    <h5 class="text-base font-semibold text-gray-800">العمود الأيسر (${leftColumn.length}/3)</h5>
                    <i class="fas fa-chevron-down text-gray-500 transition-transform"></i>
                </summary>
                <div class="p-3 border-t border-gray-200 max-h-60 overflow-y-auto">
                    <div id="connect-left-container" class="space-y-2">
                        ${leftItemsHtml}
                    </div>
                </div>
            </details>
            
            <details class="bg-gray-50 rounded-lg border border-gray-200" open>
                <summary class="p-3 cursor-pointer flex items-center justify-between">
                    <h5 class="text-base font-semibold text-gray-800">العمود الأيمن (${rightColumn.length}/3)</h5>
                    <i class="fas fa-chevron-down text-gray-500 transition-transform"></i>
                </summary>
                <div class="p-3 border-t border-gray-200 max-h-60 overflow-y-auto">
                    <div id="connect-right-container" class="space-y-2">
                        ${rightItemsHtml}
                    </div>
                </div>
            </details>
        </div>

        <div class="mt-4">
            ${leftColumn.length < 3 && rightColumn.length < 3 ? `
                <button id="add-connect-pair" class="w-full flex items-center justify-center space-x-2 space-x-reverse bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-150 text-sm">
                    <i class="fas fa-plus"></i>
                    <span>إضافة زوج جديد</span>
                </button>
            ` : `
                <div class="w-full text-center py-2 text-gray-500 text-sm bg-gray-50 rounded-lg border border-gray-200">
                    <i class="fas fa-info-circle ml-1"></i>
                    الحد الأقصى 3 عناصر في كل عمود
                </div>
            `}
        </div>
    </div>
    `;
    }

    renderDragMatchQuizEditor(slide) {
        const c = slide.content || {};
        const leftColumn = c.leftColumn || [];
        const rightColumn = c.rightColumn || [];

        const leftItemsHtml = leftColumn.map((item, index) => `
        <div class="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">الصورة ${index + 1}</span>
                <button data-action="delete-drag-left" data-index="${index}" 
                        ${leftColumn.length <= 1 ? 'disabled' : ''}
                        class="p-1 text-red-600 hover:bg-red-100 rounded-full transition duration-150 ${leftColumn.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
            <div class="space-y-2">
                <div>
                    <input type="url" data-drag-left="${index}" data-field="value" value="${Utils.escapeHTML(item.value || '')}" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                           placeholder="رابط الصورة..." />
                </div>
                <div>
                    <label class="block text-xs text-gray-600 mb-1">رقم النص الصحيح:</label>
                    <input type="number" data-drag-left="${index}" data-field="correctIndex" value="${item.correctIndex !== undefined ? item.correctIndex + 1 : 1}" 
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                        min="1" max="${Math.max(1, rightColumn.length)}" 
                        oninput="this.value = Math.max(1, Math.min(parseInt(this.value) || 1, ${Math.max(1, rightColumn.length)}))" />
                    <p class="text-xs text-gray-500 mt-1">(من 1 إلى ${rightColumn.length})</p>
                </div>
            </div>
        </div>
    `).join('');

        const rightItemsHtml = rightColumn.map((item, index) => `
        <div class="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-700">النص ${index + 1}</span>
                <button data-action="delete-drag-right" data-index="${index}" 
                        ${rightColumn.length <= 1 ? 'disabled' : ''}
                        class="p-1 text-red-600 hover:bg-red-100 rounded-full transition duration-150 ${rightColumn.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
            <div>
                <input type="text" data-drag-right="${index}" data-field="value" value="${Utils.escapeHTML(item.value || '')}" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                       placeholder="النص..." />
            </div>
        </div>
    `).join('');

        return `
    <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
        <h4 class="text-lg font-semibold mb-3 text-gray-800">إعدادات اختبار السحب والتوصيل</h4>
        
        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">السؤال</label>
            <input type="text" id="drag-match-quiz-question" value="${Utils.escapeHTML(c.question || '')}" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                   placeholder="أدخل السؤال هنا..." />
        </div>

        <div class="space-y-4">
            <details class="bg-gray-50 rounded-lg border border-gray-200" open>
                <summary class="p-3 cursor-pointer flex items-center justify-between">
                    <h5 class="text-base font-semibold text-gray-800">الصور (قابلة للسحب) (${leftColumn.length}/3)</h5>
                    <i class="fas fa-chevron-down text-gray-500 transition-transform"></i>
                </summary>
                <div class="p-3 border-t border-gray-200 max-h-60 overflow-y-auto">
                    <div id="drag-left-container" class="space-y-2">
                        ${leftItemsHtml}
                    </div>
                </div>
            </details>
            
            <details class="bg-gray-50 rounded-lg border border-gray-200" open>
                <summary class="p-3 cursor-pointer flex items-center justify-between">
                    <h5 class="text-base font-semibold text-gray-800">النصوص (مناطق الإسقاط) (${rightColumn.length}/3)</h5>
                    <i class="fas fa-chevron-down text-gray-500 transition-transform"></i>
                </summary>
                <div class="p-3 border-t border-gray-200 max-h-60 overflow-y-auto">
                    <div id="drag-right-container" class="space-y-2">
                        ${rightItemsHtml}
                    </div>
                </div>
            </details>
        </div>

        <div class="mt-4">
            ${leftColumn.length < 3 && rightColumn.length < 3 ? `
                <button id="add-drag-pair" class="w-full flex items-center justify-center space-x-2 space-x-reverse bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-150 text-sm">
                    <i class="fas fa-plus"></i>
                    <span>إضافة زوج جديد</span>
                </button>
            ` : `
                <div class="w-full text-center py-2 text-gray-500 text-sm bg-gray-50 rounded-lg border border-gray-200">
                    <i class="fas fa-info-circle ml-1"></i>
                    الحد الأقصى 3 عناصر في كل عمود
                </div>
            `}
        </div>
    </div>
    `;
    }

    renderImagePairsQuizEditor(slide) {
        const c = slide.content || {};
        const leftColumn = c.leftColumn || [];
        const rightColumn = c.rightColumn || [];
        // Force image pairs to use images only
        const leftColumnType = 'image';
        const rightColumnType = 'image';

        const leftItemsHtml = leftColumn.map((item, index) => `
    <div class="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700">الصورة ${index + 1}</span>
            <button data-action="delete-pairs-item" data-column="left" data-index="${index}" 
                    ${leftColumn.length <= 1 ? 'disabled' : ''}
                    class="p-1 text-red-600 hover:bg-red-100 rounded-full transition duration-150 ${leftColumn.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                <i class="fas fa-trash text-xs"></i>
            </button>
        </div>
        <div class="space-y-2">
            <div>
                <label class="block text-xs text-gray-600 mb-1">رابط الصورة:</label>
                <input type="url" data-pairs-left="${index}" data-field="value" value="${Utils.escapeHTML(item.value || '')}" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                       placeholder="https://example.com/image.jpg" />
                ${item.value ? `
    <div class="mt-2 p-2 bg-gray-100 rounded-lg text-center">
        <div class="text-gray-500 text-sm">
            <i class="fas fa-image text-lg mb-1 opacity-50"></i>
            <p class="text-xs">تم إدخال رابط الصورة</p>
            <p class="text-xs text-gray-400 break-all mt-1">${Utils.escapeHTML(item.value)}</p>
        </div>
    </div>
` : ''}
            </div>
            <div class="flex items-center">
                <input type="checkbox" data-pairs-left="${index}" data-field="isCorrect" ${item.isCorrect ? 'checked' : ''} 
                       class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                <label class="ms-2 text-sm font-medium text-gray-700">هذه الصورة صحيحة</label>
            </div>
        </div>
    </div>
`).join('');

        const rightItemsHtml = rightColumn.map((item, index) => `
    <div class="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700">الصورة ${index + 1}</span>
            <button data-action="delete-pairs-item" data-column="right" data-index="${index}" 
                    ${rightColumn.length <= 1 ? 'disabled' : ''}
                    class="p-1 text-red-600 hover:bg-red-100 rounded-full transition duration-150 ${rightColumn.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                <i class="fas fa-trash text-xs"></i>
            </button>
        </div>
        <div class="space-y-2">
            <div>
                <label class="block text-xs text-gray-600 mb-1">رابط الصورة:</label>
                <input type="url" data-pairs-right="${index}" data-field="value" value="${Utils.escapeHTML(item.value || '')}" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                       placeholder="https://example.com/image.jpg" />
                ${item.value ? `
    <div class="mt-2 p-2 bg-gray-100 rounded-lg text-center">
        <div class="text-gray-500 text-sm">
            <i class="fas fa-image text-lg mb-1 opacity-50"></i>
            <p class="text-xs">تم إدخال رابط الصورة</p>
            <p class="text-xs text-gray-400 break-all mt-1">${Utils.escapeHTML(item.value)}</p>
        </div>
    </div>
` : ''}
            </div>
            <div class="flex items-center">
                <input type="checkbox" data-pairs-right="${index}" data-field="isCorrect" ${item.isCorrect ? 'checked' : ''} 
                       class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" />
                <label class="ms-2 text-sm font-medium text-gray-700">هذه الصورة صحيحة</label>
            </div>
        </div>
    </div>
`).join('');

        return `
<div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
    <h4 class="text-lg font-semibold mb-3 text-gray-800">إعدادات اختبار اختيار الصور</h4>
    
    <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 mb-1">السؤال</label>
        <input type="text" id="image-pairs-quiz-question" value="${Utils.escapeHTML(c.question || '')}" 
               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
               placeholder="أدخل السؤال هنا..." />
    </div>

    <div class="grid grid-cols-2 gap-3 mt-4">
        ${leftColumn.length < 3 ? `
            <button id="add-image-pairs-left" class="flex items-center justify-center space-x-2 space-x-reverse bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-150 text-sm">
                <i class="fas fa-plus"></i>
                <span>إضافة صورة لليسار</span>
            </button>
        ` : `
            <div class="text-center py-2 text-gray-500 text-sm bg-gray-50 rounded-lg border border-gray-200">
                <i class="fas fa-info-circle ml-1"></i>
                حد اليسار
            </div>
        `}
        ${rightColumn.length < 3 ? `
            <button id="add-image-pairs-right" class="flex items-center justify-center space-x-2 space-x-reverse bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition duration-150 text-sm">
                <i class="fas fa-plus"></i>
                <span>إضافة صورة لليمين</span>
            </button>
        ` : `
            <div class="text-center py-2 text-gray-500 text-sm bg-gray-50 rounded-lg border border-gray-200">
                <i class="fas fa-info-circle ml-1"></i>
                حد اليمين
            </div>
        `}
    </div>

    <div class="space-y-4">
        <details class="bg-gray-50 rounded-lg border border-gray-200" open>
            <summary class="p-3 cursor-pointer flex items-center justify-between">
                <h5 class="text-base font-semibold text-gray-800">الصور اليسرى (${leftColumn.length}/3)</h5>
                <i class="fas fa-chevron-down text-gray-500 transition-transform"></i>
            </summary>
            <div class="p-3 border-t border-gray-200 max-h-60 overflow-y-auto">
                <div id="image-pairs-left-container" class="space-y-2">
                    ${leftItemsHtml}
                </div>
            </div>
        </details>
        
        <details class="bg-gray-50 rounded-lg border border-gray-200" open>
            <summary class="p-3 cursor-pointer flex items-center justify-between">
                <h5 class="text-base font-semibold text-gray-800">الصور اليمنى (${rightColumn.length}/3)</h5>
                <i class="fas fa-chevron-down text-gray-500 transition-transform"></i>
            </summary>
            <div class="p-3 border-t border-gray-200 max-h-60 overflow-y-auto">
                <div id="image-pairs-right-container" class="space-y-2">
                    ${rightItemsHtml}
                </div>
            </div>
        </details>
    </div>

    <div class="mt-4">
    ${leftColumn.length < 3 && rightColumn.length < 3 ? `
        <button id="add-image-pairs-pair" class="w-full flex items-center justify-center space-x-2 space-x-reverse bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-150 text-sm">
            <i class="fas fa-plus"></i>
            <span>إضافة زوج صور جديد</span>
        </button>
    ` : `
        <div class="w-full text-center py-2 text-gray-500 text-sm bg-gray-50 rounded-lg border border-gray-200">
            <i class="fas fa-info-circle ml-1"></i>
            الحد الأقصى 3 صور في كل عمود
        </div>
    `}
    </div>

    <!-- Add validation warning -->
    ${(() => {
                const hasLeftCorrect = leftColumn.some(item => item.isCorrect);
                const hasRightCorrect = rightColumn.some(item => item.isCorrect);
                if (!hasLeftCorrect && !hasRightCorrect) {
                    return `
            <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div class="flex items-center">
                    <i class="fas fa-exclamation-triangle text-yellow-500 ml-2"></i>
                    <span class="text-yellow-700 text-sm">يجب اختيار صورة صحيحة واحدة على الأقل من أحد العمودين</span>
                </div>
            </div>
            `;
                }
                return '';
            })()}
</div>
`;
    }

    renderImageCollectionEditor(slide) {
        const sections = slide.content.sections || [];
        const sectionsHtml = sections.map((section, idx) => `
    <div class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div class="flex items-center justify-between mb-3">
            <label class="block text-sm font-medium text-gray-700">القسم ${idx + 1}</label>
            <button data-action="delete-image-collection-section" data-index="${idx}" 
                    class="p-2 text-red-600 hover:bg-red-100 rounded-full transition duration-150" 
                    ${sections.length <= 1 ? 'disabled' : ''}>
                <i class="fas fa-trash text-sm"></i>
            </button>
        </div>
        <div class="space-y-3">
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">رابط الصورة</label>
                <input type="url" data-image-collection="${idx}" data-field="imageUrl" 
                       value="${Utils.escapeHTML(section.imageUrl || '')}" 
                       class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                       placeholder="https://example.com/image.jpg" />
                ${section.imageUrl ? `
                    <div class="mt-2 p-2 bg-gray-100 rounded-lg relative">
                        <img src="${Utils.escapeHTML(section.imageUrl)}" alt="معاينة" 
                             class="max-h-32 mx-auto rounded" 
                             onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='block';" />
                        <div class="fallback-placeholder hidden text-center text-gray-500 py-4">
                            <i class="fas fa-image text-lg mb-1 opacity-50"></i>
                            <p class="text-xs text-center">تعذر تحميل الصورة</p>
                        </div>
                    </div>
                ` : ''}
            </div>
            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">الوصف (اختياري)</label>
                <textarea data-image-collection="${idx}" data-field="description" rows="3"
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          placeholder="أدخل وصف الصورة هنا...">${Utils.escapeHTML(section.description || '')}</textarea>
            </div>
        </div>
    </div>
`).join('');

        return `
    <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
        <h4 class="text-base font-semibold mb-3 text-gray-800">محتوى مجموعة الصور</h4>
        <div id="image-collection-sections-container-${slide.id}" class="space-y-3">
            ${sectionsHtml}
        </div>
        <div class="mt-4">
            ${sections.length < 4 ? `
                <button id="add-image-collection-section-${slide.id}" 
                        class="w-full flex items-center justify-center space-x-2 space-x-reverse bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-150">
                    <i class="fas fa-plus"></i>
                    <span>إضافة قسم جديد</span>
                </button>
            ` : `
                <div class="w-full text-center py-3 text-gray-500 text-sm bg-gray-50 rounded-lg border border-gray-200">
                    <i class="fas fa-info-circle ml-1"></i>
                    الحد الأقصى 4 أقسام في المجموعة
                </div>
            `}
        </div>
    </div>
`;
    }


    renderQuizCarousel(slide) {
        const c = slide.content || {};
        const answers = c.answers || [];
        const question = c.question || 'لم يتم إدخال السؤال بعد';
        const chosen = slide.userChoice ?? null;
        const submitted = slide.submitted ?? false;
        const correctIndex = (c.correct ?? 1) - 1;

        const answersHTML = answers.map((a, i) => {
            const isChosen = chosen === i;
            const isCorrect = submitted && i === correctIndex;
            const isWrong = submitted && isChosen && i !== correctIndex;

            let classes = "quiz-option w-full flex items-start gap-2 px-3 py-2 rounded-lg border transition text-right break-words hyphens-auto ";
            if (submitted) {
                if (isCorrect) classes += "border-green-500 bg-green-600/30 text-white";
                else if (isWrong) classes += "border-red-500 bg-red-600/30 text-white";
                else classes += "border-gray-300 bg-white/10 text-gray-300";
            } else {
                classes += isChosen
                    ? "border-blue-500 quiz-option-selected text-white"
                    : "border-gray-300 bg-white/10 text-white hover:bg-white/20";
            }

            const mark = submitted && isCorrect ? `<i class='fas fa-check ml-2 text-green-400 flex-shrink-0'></i>` : "";
            return `
        <button data-index="${i}" class="${classes}">
            <span class="w-5 h-5 flex items-center justify-center border border-gray-400 rounded-full flex-shrink-0 mt-0.5">
                ${isChosen ? `<span class='w-3 h-3 bg-blue-500 rounded-full'></span>` : ""}
            </span>
            <span class="flex-1 text-right break-words hyphens-auto min-w-0">${i + 1}. ${Utils.escapeHTML(a || '—')}</span>
            ${mark}
        </button>
    `;
        }).join('');

        // Use the common function to check if submit button should be shown
        const showSubmit = this.editor.shouldShowQuizSubmit(slide);

        return `
    <div class="mt-4 relative overflow-visible w-full">
        <h2 class="text-lg font-bold text-center mb-3 text-white break-words hyphens-auto">${Utils.escapeHTML(question)}</h2>
        <div class="space-y-2 max-w-md mx-auto max-h-[80vh] overflow-y-auto" id="quiz-${slide.id}-answers">
            ${answersHTML}
        </div>
        ${showSubmit ? `
            <div class="text-center mt-4">
                <button class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition" 
                        id="quiz-${slide.id}-submit">
                    تأكيد الإجابة
                </button>
            </div>
        ` : ''}
        <!-- New feedback icon container -->
        <div id="quiz-${slide.id}-feedback" class="quiz-feedback-icon"></div>
    </div>
`;
    }

    renderQuizCategorize(slide) {
        const c = slide.content || {};
        const question = c.question || 'لم يتم إدخال السؤال بعد';
        const categories = c.categories || [];
        const correctIndex = (c.correct ?? 0);
        const chosen = slide.userChoice ?? null;
        const submitted = slide.submitted ?? false;
        const containerId = `quiz-${slide.id}-categorize`;

        // Use common function to check if submit should be shown
        const showSubmit = this.editor.shouldShowQuizSubmit(slide);

        // 🧱 Build drop zones
        const dropZones = categories.map((cat, i) => {
            let bg = 'bg-white/10 border-gray-300';
            if (submitted) {
                if (i === correctIndex && chosen === i) bg = 'bg-green-600/30 border-green-500';
                else if (chosen === i && i !== correctIndex) bg = 'bg-red-600/30 border-red-500';
                else bg = 'bg-white/10 border-gray-400 opacity-50';
            } else if (chosen === i) {
                bg = 'bg-black/30 border-blue-500';
            }

            return `
    <div class="quiz-category-zone border ${bg} rounded-xl flex flex-col items-center justify-center 
                text-white font-semibold p-4 text-center transition relative min-h-[100px] drop-zone"
         data-index="${i}"
         ondragover="event.preventDefault()"
         ondrop="window.handleCategorizeDrop(event, '${containerId}', ${i})">
        <span class="block mb-2 text-base">${Utils.escapeHTML(cat || `التصنيف ${i + 1}`)}</span>
    </div>`;
        }).join('');

        // 🧱 Build draggable question box
        const draggableHtml = `
    <div id="${containerId}-question"
         draggable="${!submitted}"
         class="quiz-draggable bg-white/80 text-gray-900 font-bold text-lg rounded-xl px-6 py-4 shadow-md cursor-move 
                transition select-none mb-6 max-w-xs text-center"
         ondragstart="window.handleCategorizeDrag(event, '${containerId}')">
        ${Utils.escapeHTML(question)}
    </div>`;

        return `
        <div id="${containerId}" class="mt-6 w-full flex flex-col items-center text-center">
    ${draggableHtml}
    <div class="quiz-categorize-container grid grid-cols-2 gap-4 w-full max-w-md mx-auto mb-4">
        ${dropZones}
    </div>
    ${showSubmit ? `
        <button class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition mt-3"
                id="quiz-${slide.id}-submit">
            إرسال الإجابة
        </button>
    ` : ''}

    <!-- New feedback icon container -->
    <div id="quiz-${slide.id}-feedback" class="quiz-feedback-icon"></div>
</div>`;
    }

    renderUniversalComparison(slide, type = 'text') {
        const c = slide.content || {};
        const id = `comparison-${slide.id}`;

        // Build content per type
        const leftHtml = (type === 'image')
            ? (c.imageA
                ? `<div class="relative w-full h-full">
                 <img src="${Utils.escapeHTML(c.imageA)}" alt="الصورة الأولى" class="w-full h-full object-contain rounded-lg"
                      onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                 <div class="fallback-placeholder hidden absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center text-white/70">
                   <i class="fas fa-image text-xl mb-1 opacity-50"></i>
                   <p class="text-xs text-center">تعذر تحميل الصورة</p>
                 </div>
               </div>`
                : `<div class="text-white/70 text-center py-8">الصورة الأولى غير محددة</div>`)
            : `<div class="text-white text-center p-6 break-words hyphens-auto h-full overflow-y-auto"><h3 class="text-xl font-bold mb-3 break-words">${Utils.escapeHTML(c.leftTitle || 'الجانب الأيسر')}</h3><p class="text-base break-words hyphens-auto leading-relaxed">${Utils.escapeHTML(c.leftText || '')}</p></div>`;

        const rightHtml = (type === 'image')
            ? (c.imageB
                ? `<div class="relative w-full h-full">
                 <img src="${Utils.escapeHTML(c.imageB)}" alt="الصورة الثانية" class="w-full h-full object-contain rounded-lg"
                      onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                 <div class="fallback-placeholder hidden absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center text-white/70">
                   <i class="fas fa-image text-xl mb-1 opacity-50"></i>
                   <p class="text-xs text-center">تعذر تحميل الصورة</p>
                 </div>
               </div>`
                : `<div class="text-white/70 text-center py-8">الصورة الثانية غير محددة</div>`)
            : `<div class="text-white text-center p-6 break-words hyphens-auto h-full overflow-y-auto"><h3 class="text-xl font-bold mb-3 break-words">${Utils.escapeHTML(c.rightTitle || 'الجانب الأيمن')}</h3><p class="text-base break-words hyphens-auto leading-relaxed">${Utils.escapeHTML(c.rightText || '')}</p></div>`;

        // unified background + fully opaque top layer
        return `
    <div id="${id}" class="comparison-wrapper relative w-full rounded-lg overflow-hidden bg-gray-700 text-white" style="min-height:250px;">
        <!-- Unified background already on wrapper -->

        <!-- Bottom (right) layer -->
        <div class="comparison-layer bottom absolute inset-0 z-0">
            ${rightHtml}
        </div>

        <!-- Top (left) layer, completely opaque -->
        <div class="comparison-layer top absolute inset-0 z-10 bg-gray-700" 
             style="clip-path: inset(0 50% 0 0); transition: clip-path 0.12s linear;">
            ${leftHtml}
        </div>

        <!-- Draggable separator -->
        <div class="comparison-separator absolute top-0 bottom-0 z-20 cursor-ew-resize" style="left:50%; width:6px;">
            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:26px; height:26px; border-radius:999px; background:white; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.15);">
                <i class="fas fa-arrows-left-right text-sm text-blue-600"></i>
            </div>
        </div>
    </div>`;
    }

    renderTextSeriesEditor(slide) {
        const items = slide.content.items || [];
        const itemsHtml = items.map((it, idx) => `
        <div class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center justify-between mb-3">
                <label class="block text-sm font-medium text-gray-700">العنصر ${idx + 1}</label>
                <button data-action="delete-text-series" data-index="${idx}" class="p-2 text-red-600 hover:bg-red-100 rounded-full transition duration-150" ${items.length <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-trash text-sm"></i>
                </button>
            </div>
            <div class="space-y-3">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">العنوان (اختياري)</label>
                    <input type="text" data-text-series="${idx}" data-field="title" value="${Utils.escapeHTML(it.title || '')}" 
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                           placeholder="أدخل العنوان هنا..." />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">المحتوى</label>
                    <textarea data-text-series="${idx}" data-field="content" rows="3" 
                              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                              placeholder="أدخل المحتوى هنا...">${Utils.escapeHTML(it.content || '')}</textarea>
                </div>
            </div>
        </div>
    `).join('');

        return `
        <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
            <h4 class="text-base font-semibold mb-3 text-gray-800">محتوى السلسلة النصية</h4>
            <div id="text-series-items-container-${slide.id}" class="space-y-3">
                ${itemsHtml}
            </div>
            <div class="mt-4">
                ${items.length < 6 ? `
                    <button id="add-text-series-${slide.id}" class="w-full flex items-center justify-center space-x-2 space-x-reverse bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-150">
                        <i class="fas fa-plus"></i>
                        <span>إضافة نص جديد</span>
                    </button>
                ` : `
                    <div class="w-full text-center py-3 text-gray-500 text-sm bg-gray-50 rounded-lg border border-gray-200">
                        <i class="fas fa-info-circle ml-1"></i>
                        الحد الأقصى 6 نصوص في السلسلة
                    </div>
                `}
            </div>
        </div>
    `;
    }

    renderTextSeriesPreview(slide) {
        const items = slide.content.items || [];
        if (!items.length) {
            return `<div class="text-center text-white/70 py-12">لا توجد نصوص في السلسلة</div>`;
        }

        const slidesHtml = items.map((item, index) => `
        <div class="text-series-slide min-h-[300px] w-full flex flex-col items-center justify-center p-6 transition-all duration-300 ease-in-out ${index === 0 ? 'block' : 'hidden'}" data-index="${index}">
            <div class="text-center max-w-2xl w-full">
                ${item.title ? `<h3 class="text-2xl font-bold text-white mb-4 break-words">${Utils.escapeHTML(item.title)}</h3>` : ''}
                <div class="text-lg text-white leading-relaxed break-words hyphens-auto">
                    ${Utils.escapeHTML(item.content || '').replace(/\n/g, '<br>')}
                </div>
            </div>
        </div>
    `).join('');

        const dotsHtml = items.map((_, index) => `
        <span class="text-series-nav-dot w-3 h-3 rounded-full border-2 border-white transition-all duration-300 cursor-pointer ${index === 0 ? 'text-series-nav-dot-active bg-white' : 'bg-transparent'}" data-index="${index}"></span>
    `).join('');

        return `
        <div class="text-series-preview relative w-full overflow-hidden" id="text-series-${slide.id}">
            <div class="text-series-slides relative w-full">
                ${slidesHtml}
            </div>
            
            ${items.length > 1 ? `
                <div class="text-series-nav-dots absolute bottom-4 left-1/2 transform -translate-x-1/2 flex  space-x-reverse">
                    ${dotsHtml}
                </div>
            ` : ''}
        </div>
    `;
    }

    renderSeriesEditor(slide, itemType, itemRenderer) {
        const items = slide.content.items || [];
        const itemsHtml = items.map((it, idx) => `
        <div class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div class="flex items-center justify-between mb-3">
                <label class="block text-sm font-medium text-gray-700">العنصر ${idx + 1}</label>
                <button data-action="delete-${itemType}-series" data-index="${idx}" class="p-2 text-red-600 hover:bg-red-100 rounded-full transition duration-150" ${items.length <= 1 ? 'disabled' : ''}>
                    <i class="fas fa-trash text-sm"></i>
                </button>
            </div>
            ${itemRenderer(it, idx)}
        </div>
    `).join('');

        const maxItems = 6;
        const itemName = itemType === 'text' ? 'نص' : 'صورة';

        return `
        <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
            <h4 class="text-base font-semibold mb-3 text-gray-800">محتوى السلسلة ${itemType === 'text' ? 'النصية' : 'الصورية'}</h4>
            <div id="${itemType}-series-items-container-${slide.id}" class="space-y-3">
                ${itemsHtml}
            </div>
            <div class="mt-4">
                ${items.length < maxItems ? `
                    <button id="add-${itemType}-series-${slide.id}" class="w-full flex items-center justify-center space-x-2 space-x-reverse bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-150">
                        <i class="fas fa-plus"></i>
                        <span>إضافة ${itemName} جديد</span>
                    </button>
                ` : `
                    <div class="w-full text-center py-3 text-gray-500 text-sm bg-gray-50 rounded-lg border border-gray-200">
                        <i class="fas fa-info-circle ml-1"></i>
                        الحد الأقصى ${maxItems} ${itemName === 'نص' ? 'نصوص' : 'صور'} في السلسلة
                    </div>
                `}
            </div>
        </div>
    `;
    }

    renderImageSeriesEditor(slide) {
        const imageItemRenderer = (item, index) => `
    <div class="space-y-3">
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">العنوان (اختياري)</label>
            <input type="text" data-image-series="${index}" data-field="title" value="${Utils.escapeHTML(item.title || '')}" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                   placeholder="أدخل العنوان هنا..." />
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">رابط الصورة</label>
            <input type="url" data-image-series="${index}" data-field="imageUrl" value="${Utils.escapeHTML(item.imageUrl || '')}" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                   placeholder="https://example.com/image.jpg" />
            ${item.imageUrl ? `
                <div class="mt-2 p-2 bg-gray-100 rounded-lg relative">
                    <img src="${Utils.escapeHTML(item.imageUrl)}" alt="معاينة" 
                         class="max-h-32 mx-auto rounded" 
                         onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='block';" />
                    <div class="fallback-placeholder hidden text-center text-gray-500 py-4">
                        <i class="fas fa-image text-lg mb-1 opacity-50"></i>
                        <p class="text-xs text-center">تعذر تحميل الصورة</p>
                    </div>
                </div>
            ` : ''}
        </div>
    </div>
`;

        return this.renderSeriesEditor(slide, 'image', imageItemRenderer);
    }

    renderImageSeriesPreview(slide) {
        const items = slide.content.items || [];
        if (!items.length) {
            return `<div class="text-center text-white/70 py-12">لا توجد صور في السلسلة</div>`;
        }

        const slidesHtml = items.map((item, index) => `
    <div class="image-series-slide min-h-[300px] w-full flex flex-col items-center justify-center p-6 transition-all duration-600 ease-in-out ${index === 0 ? 'block' : 'hidden'}" data-index="${index}">
        <div class="text-center max-w-2xl w-full">
            ${item.title ? `<h3 class="text-2xl font-bold text-white mb-4 break-words">${Utils.escapeHTML(item.title)}</h3>` : ''}
            ${item.imageUrl ? `
                <div class="image-container mb-4">
                    <img src="${Utils.escapeHTML(item.imageUrl)}" alt="${Utils.escapeHTML(item.title || 'صورة')}" 
                         class="max-h-64 max-w-full mx-auto rounded-lg shadow-lg object-contain" 
                         onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuS8muS4gOWbvueUteWtkDwvdGV4dD48L3N2Zz4='; this.alt='تعذر تحميل الصورة';" />
                </div>
            ` : `
                <div class="text-white/70 text-center py-8 bg-black/20 rounded-lg">
                    <i class="fas fa-image text-4xl mb-3 opacity-50"></i>
                    <p>لم يتم إدخال رابط الصورة بعد</p>
                </div>
            `}
        </div>
    </div>
`).join('');

        const dotsHtml = items.map((_, index) => `
    <span class="image-series-nav-dot w-3 h-3 rounded-full border-2 border-white transition-all duration-400 cursor-pointer ${index === 0 ? 'image-series-nav-dot-active bg-white' : 'bg-transparent'}" data-index="${index}"></span>
`).join('');

        return `
    <div class="image-series-preview relative w-full overflow-hidden" id="image-series-${slide.id}">
        <div class="image-series-slides relative w-full">
            ${slidesHtml}
        </div>
        
        ${items.length > 1 ? `
            <div class="image-series-nav-dots absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 space-x-reverse">
                ${dotsHtml}
            </div>
        ` : ''}
    </div>
`;
    }

    // Video render (kept same heuristics)
    renderVideoPreview(slide) {
        const content = slide.content || {};
        const videoUrl = content.videoUrl || '';
        if (!videoUrl) {
            return `
                <div class="self-center w-full text-white text-center py-10 bg-gray-600/30 rounded-xl border border-dashed border-white/50">
                    <i class="fas fa-video text-4xl mb-3 opacity-70"></i>
                    <p class="text-base font-medium">الرجاء إدخال رابط الفيديو للمعاينة</p>
                </div>
            `;
        }

        let embed = videoUrl;
        try {
            if (videoUrl.includes('youtube.com/watch?v=')) {
                const vid = videoUrl.split('v=')[1].split('&')[0];
                embed = `https://www.youtube.com/embed/${vid}?rel=0`;
            } else if (videoUrl.includes('youtu.be/')) {
                const vid = videoUrl.split('youtu.be/')[1].split('?')[0];
                embed = `https://www.youtube.com/embed/${vid}?rel=0`;
            }
        } catch (e) { }

        return `
            <div class="relative w-full overflow-hidden rounded-xl shadow-2xl" style="padding-top: 56.25%;">
                <iframe
                    class="absolute top-0 left-0 w-full h-full"
                    src="${Utils.escapeHTML(embed)}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    onerror="this.onerror=null; this.parentElement.innerHTML='<div class=&quot;text-center text-red-400 py-10&quot;>تعذر تحميل الفيديو 🚫</div>';">
                </iframe>
            </div>
            ${content.description ? `<p class="text-white mt-3 text-center text-sm">${Utils.escapeHTML(content.description)}</p>` : ''}
            ${content.duration ? `<p class="text-white/80 text-center text-xs"><i class="fas fa-clock ml-1"></i> المدة: ${Utils.escapeHTML(content.duration)}</p>` : ''}
        `;
    }

    // Editors (copied + kept unchanged semantics)
    renderBulletedListEditor(slide) {
        const items = slide.content.items || [];
        const itemsHtml = items.map((item, idx) => `
            <div class="flex items-center space-x-2 space-x-reverse mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <input type="text" value="${Utils.escapeHTML(item)}" data-bullet-index="${idx}" class="bulleted-input flex-1 px-3 py-2 border border-gray-300 rounded-lg" />
                <button data-action="delete-bullet" data-index="${idx}" class="p-2 text-red-600 hover:bg-red-100 rounded-full transition duration-150"><i class="fas fa-trash"></i></button>
            </div>`).join('');

        return `
            <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
                <h4 class="text-base font-semibold mb-2 text-gray-800">محتوى القائمة النقطية</h4>
                <div id="bulleted-list-items-container-${slide.id}">
                    ${itemsHtml}
                </div>
                ${items.length < 4 ? `
                    <button id="add-bullet-${slide.id}" class="w-full flex items-center justify-center space-x-2 space-x-reverse bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-150 mt-2">
                        <i class="fas fa-plus"></i>
                        <span>أضف نقطة جديدة</span>
                    </button>
                ` : `
                    <div class="w-full text-center py-2 text-gray-500 text-sm mt-2">
                        <i class="fas fa-info-circle ml-1"></i>
                        الحد الأقصى 4 نقاط
                    </div>
                `}
            </div>
        `;
    }

    renderComparisonTextEditor(slide) {
        const c = slide.content || {};
        return `
            <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
                <h4 class="text-base font-semibold mb-2 text-gray-800">محتوى المقارنة</h4>
                <div class="grid grid-cols-1 gap-3">
                    <div class="p-2 border border-gray-300 rounded-lg bg-gray-50">
                        <label class="block text-sm font-medium text-gray-700 mb-1">عنوان الجانب الأول</label>
                        <input type="text" id="comp-left-title" value="${Utils.escapeHTML(c.leftTitle || '')}" class="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2" />
                        <label class="block text-sm font-medium text-gray-700 mb-1">نص الجانب الأول</label>
                        <textarea id="comp-left-text" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${Utils.escapeHTML(c.leftText || '')}</textarea>
                    </div>
                    <div class="p-2 border border-gray-300 rounded-lg bg-gray-50">
                        <label class="block text-sm font-medium text-gray-700 mb-1">عنوان الجانب الثاني</label>
                        <input type="text" id="comp-right-title" value="${Utils.escapeHTML(c.rightTitle || '')}" class="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2" />
                        <label class="block text-sm font-medium text-gray-700 mb-1">نص الجانب الثاني</label>
                        <textarea id="comp-right-text" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${Utils.escapeHTML(c.rightText || '')}</textarea>
                    </div>
                </div>
            </div>
        `;
    }

    renderExpandableListEditor(slide) {
        const items = slide.content.items || [];
        const itemsHtml = items.map((it, idx) => `
            <div class="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div class="flex items-center justify-between mb-2">
                    <label class="block text-sm font-medium text-gray-700">العنصر ${idx + 1}</label>
                    <button data-action="delete-expandable" data-index="${idx}" class="p-1 text-red-600 hover:bg-red-100 rounded-full transition duration-150"><i class="fas fa-trash text-sm"></i></button>
                </div>
                <input type="text" data-expandable="${idx}" data-expandable-field="title" value="${Utils.escapeHTML(it.title || '')}" class="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2" />
                <textarea data-expandable="${idx}" data-expandable-field="text" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${Utils.escapeHTML(it.text || '')}</textarea>
            </div>`).join('');

        return `
            <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
                <h4 class="text-base font-semibold mb-2 text-gray-800">محتوى القائمة القابلة للتوسيع</h4>
                <div id="expandable-list-items-container-${slide.id}">
                    ${itemsHtml}
                </div>
                ${items.length < 4 ? `
                    <button id="add-expandable-${slide.id}" class="w-full flex items-center justify-center space-x-2 space-x-reverse bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-150 mt-2">
                        <i class="fas fa-plus"></i>
                        <span>أضف عنصراً قابلاً للتوسيع</span>
                    </button>
                ` : `
                    <div class="w-full text-center py-2 text-gray-500 text-sm mt-2">
                        <i class="fas fa-info-circle ml-1"></i>
                        الحد الأقصى 4 عناصر
                    </div>
                `}
            </div>
        `;
    }

    renderVideoEditor(slide) {
        const c = slide.content || {};
        return `
            <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
                <h4 class="text-base font-semibold mb-2 text-gray-800">إعدادات محتوى الفيديو</h4>
                <div class="mb-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">رابط الفيديو (URL)</label>
                    <input type="url" id="edit-video-url" value="${Utils.escapeHTML(c.videoUrl || '')}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div class="mb-2">
                    <label class="block text-sm font-medium text-gray-700 mb-1">مدة الفيديو</label>
                    <input type="text" id="edit-video-duration" value="${Utils.escapeHTML(c.duration || '')}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                    <textarea id="edit-video-description" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${Utils.escapeHTML(c.description || '')}</textarea>
                </div>
            </div>
        `;
    }

    renderQuizCarouselEditor(slide) {
        const c = slide.content || {};
        const answers = c.answers || [];
        const question = c.question || '';
        const correct = c.correct || 1;

        let html = `
        <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
            <h4 class="text-base font-semibold mb-2 text-gray-800">إعدادات الاختبار</h4>

            <div class="mb-2">
                <label class="block text-sm font-medium text-gray-700 mb-1">السؤال</label>
                <input type="text" id="quiz-question" value="${Utils.escapeHTML(question)}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="أدخل نص السؤال هنا" />
            </div>

            <div class="mb-2">
                <label class="block text-sm font-medium text-gray-700 mb-2">الإجابات</label>
                <ul id="quiz-answers" class="space-y-2 w-full min-w-0">
                    ${answers.map((a, i) => `
                        <li class="flex items-center gap-2 w-full min-w-0">
                            <span class="w-6 text-gray-500 text-center flex-shrink-0">${i + 1}.</span>
                            <input type="text" class="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg quiz-answer-input truncate" data-index="${i}" value="${Utils.escapeHTML(a)}" placeholder="الإجابة ${i + 1}" />
                            <button class="text-red-500 hover:text-red-700 remove-answer flex-shrink-0" data-index="${i}"><i class="fas fa-trash"></i></button>
                        </li>
                    `).join('')}
                </ul>
                <div class="mt-3">
                    ${answers.length < 4 ? `
                        <button id="add-answer" class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                            <i class="fas fa-plus"></i>
                            <span>إضافة إجابة</span>
                        </button>
                    ` : `
                        <div class="w-full text-center py-2 text-gray-500 text-sm bg-gray-50 rounded-lg border border-gray-200">
                            <i class="fas fa-info-circle ml-1"></i>
                            الحد الأقصى 4 إجابات
                        </div>
                    `}
                </div>
            </div>

            <div class="w-full">
                <label class="block text-sm font-medium text-gray-700 mb-1">رقم الإجابة الصحيحة</label>
                <input type="number" id="quiz-correct" min="1" max="${Math.max(1, answers.length)}" value="${Math.min(correct, Math.max(1, answers.length))}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
        </div>
    `;
        return html;
    }

    renderQuizCategorizeEditor(slide) {
        const c = slide.content || {};
        const question = c.question || '';
        const categories = Array.isArray(c.categories) ? c.categories : [];
        const correct = c.correct ?? 0;

        // Mirror the carousel editor layout and visual style, but keep IDs/classes expected by other code
        return `
    <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
        <h4 class="text-base font-semibold mb-2 text-gray-800">إعدادات الاختبار</h4>

        <div class="mb-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">نص السؤال</label>
            <textarea id="quiz-question-input" rows="2"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="أدخل نص السؤال هنا">${Utils.escapeHTML(question)}</textarea>
        </div>

        <div class="mb-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">التصنيفات</label>
            <ul id="quiz-categories-list" class="space-y-2">
                ${categories.map((cat, i) => `
                    <li class="flex items-center gap-2">
                        <span class="w-6 text-gray-500 text-center">${i + 1}.</span>
                        <input type="text" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg quiz-category-input"
                               data-index="${i}" value="${Utils.escapeHTML(cat)}" placeholder="اسم التصنيف ${i + 1}" />
                        <button class="remove-category-btn p-2 text-red-500 hover:text-red-700" data-index="${i}" title="حذف التصنيف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </li>
                `).join('')}
            </ul>

            <div class="mt-3">
                ${categories.length < 4 ? `
                    <button id="add-category-btn" class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
                        <i class="fas fa-plus"></i>
                        <span>إضافة تصنيف</span>
                    </button>
                ` : `
                    <div class="w-full text-center py-2 text-gray-500 text-sm bg-gray-50 rounded-lg border border-gray-200">
                        <i class="fas fa-info-circle ml-1"></i>
                        الحد الأقصى 4 تصنيفات
                    </div>
                `}
            </div>
        </div>

        <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">التصنيف الصحيح</label>
            <select id="correct-category-select" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                ${categories.map((cat, i) => `
                    <option value="${i}" ${i === correct ? 'selected' : ''}>${Utils.escapeHTML(cat || `التصنيف ${i + 1}`)}</option>
                `).join('')}
            </select>
        </div>
    </div>
    `;
    }

    renderImageComparisonEditor(slide) {
        const c = slide.content || {};
        return `
        <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
            <h4 class="text-base font-semibold mb-2 text-gray-800">إعدادات مقارنة الصور</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">رابط الصورة الأولى (A)</label>
                    <input type="url" id="edit-imageA" value="${Utils.escapeHTML(c.imageA || '')}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="https://example.com/imageA.jpg" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">رابط الصورة الثانية (B)</label>
                    <input type="url" id="edit-imageB" value="${Utils.escapeHTML(c.imageB || '')}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="https://example.com/imageB.jpg" />
                </div>
            </div>
        </div>
    `;
    }

    // sidebar / lessons rendering (keeps original DOM structure)
    renderLessonsSidebar() {
        const container = this.editor.dom.lessonsList;
        if (!container) return;
        container.innerHTML = '';

        this.editor.lessons.forEach(lesson => {
            const isCurrent = lesson.id === this.editor.currentLessonId;
            const isExpanded = this.editor.isLessonExpanded(lesson.id);
            const lessonEl = document.createElement('div');
            lessonEl.className = `lesson-item bg-white border border-gray-200 rounded-lg overflow-hidden ${isExpanded ? 'lesson-expanded' : ''}`;
            lessonEl.dataset.lessonId = lesson.id;
            lessonEl.draggable = true;

            const slidesCount = (lesson.slides && lesson.slides.length) || 0;

            const inner = document.createElement('div');
            inner.innerHTML = `
                <div class="px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 lesson-header">
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900">${Utils.escapeHTML(lesson.title)}</h4>
                        <p class="text-xs text-gray-500 ">${slidesCount} سلايد</p>
                    </div>
                    <div class="flex items-center space-x-2 space-x-reverse">
                        <button class="delete-lesson p-2 text-gray-500 hover:text-gray-700" data-lesson-id="${lesson.id}" title="حذف الدرس">
                            <i class="fas fa-minus"></i>
                        </button>
                        <button class="expand-lesson p-2 text-gray-400 hover:text-blue-600">
                            <i class="fas fa-chevron-down ${isCurrent ? 'rotate-180' : ''} transition-transform"></i>
                        </button>
                    </div>
                </div>
            `;
            lessonEl.appendChild(inner.querySelector('div'));

            const slidesWrap = document.createElement('div');
            slidesWrap.className = `lesson-slides ${isExpanded ? '' : 'hidden'}`;
            slidesWrap.innerHTML = `<div class="border-t border-gray-200"></div>`;
            const listZone = slidesWrap.querySelector('div');

            lesson.slides.forEach((slide, index) => {
                const slideItem = document.createElement('div');
                slideItem.className = `slide-item p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer flex items-center justify-between ${slide.id === this.editor.currentSlideId ? 'active' : ''}`;
                slideItem.dataset.slideId = slide.id;
                slideItem.dataset.lessonId = lesson.id;
                slideItem.draggable = true;
                slideItem.innerHTML = `
                    <div class="flex items-center space-x-3 space-x-reverse">
                        <div class="w-6 h-6 bg-blue-100 text-blue-600 rounded text-xs flex items-center justify-center">${index + 1}</div>
                        <div>
                            <h5 class="text-sm font-medium text-gray-900">${Utils.escapeHTML(slide.title)}</h5>
                            <p class="text-xs text-gray-500">${this.editor.getSlideTypeText(slide.type)}</p>
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
                `;
                listZone.appendChild(slideItem);
            });

            listZone.innerHTML += `
                <div class="p-3">
                    <button class="add-slide-inside-lesson w-full flex items-center justify-center space-x-2 space-x-reverse py-2 px-3 border border-dashed border-gray-300 rounded text-gray-600 hover:border-green-500 hover:text-green-600 transition-colors text-sm" data-lesson-id="${lesson.id}">
                        <i class="fas fa-plus"></i>
                        <span>إضافة سلايد</span>
                    </button>
                </div>
            `;
            lessonEl.appendChild(slidesWrap);
            container.appendChild(lessonEl);
        });

        this.editor.attachDragAndDrop();
    }

    // editors & edit content injection
    loadSlideEditContent(slideId) {
        const lesson = this.editor.findLessonById(this.editor.currentLessonId);
        if (!lesson) {
            if (this.editor.dom.slideEditContent) this.editor.dom.slideEditContent.innerHTML = this.getChooseSlidePlaceholder();
            return;
        }
        if (slideId == null) {
            if (this.editor.dom.slideEditContent) this.editor.dom.slideEditContent.innerHTML = this.getChooseSlidePlaceholder();
            return;
        }

        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide) {
            if (this.editor.dom.slideEditContent) this.editor.dom.slideEditContent.innerHTML = this.getChooseSlidePlaceholder();
            return;
        }

        this.editor.currentSlideId = slideId;
        this.editor.loadSlidePreview(slideId);

        let html = `
            <div class="space-y-4">
                <div class="bg-white p-4 rounded-lg shadow border border-gray-200">
                    <h4 class="text-lg font-semibold mb-3 text-gray-800">إعدادات الشريحة الأساسية</h4>
                    <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700 mb-1">اسم الشريحة (الشريط الجانبي)</label>
                        <input type="text" id="edit-slide-name" class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="${Utils.escapeHTML(slide.title)}" />
                    </div>
                    <div class="mb-3">
                        <label class="block text-sm font-medium text-gray-700 mb-1">العنوان الرئيسي للشريحة</label>
                        <input type="text" id="edit-main-title" class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="${Utils.escapeHTML(slide.content.title || '')}" />
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">العنوان الفرعي للشريحة (اختياري)</label>
                        <input type="text" id="edit-subtitle" class="w-full px-3 py-2 border border-gray-300 rounded-lg" value="${Utils.escapeHTML(slide.content.subtitle || '')}" />
                    </div>
                </div>
        `;

        const key = `${slide.type}-${slide.subtype}`;
        switch (key) {
            case 'text-bulleted-list':
                html += this.renderBulletedListEditor(slide);
                break;
            case 'text-comparison':
                html += this.renderComparisonTextEditor(slide);
                break;
            case 'text-expandable-list':
                html += this.renderExpandableListEditor(slide);
                break;
            case 'text-text-series':
                html += this.renderTextSeriesEditor(slide);
                break;
            case 'video-video':
                html += this.renderVideoEditor(slide);
                break;
            case 'image-comparison':
                html += this.renderImageComparisonEditor(slide);
                break;
            case 'image-image-series':
                html += this.renderImageSeriesEditor(slide);
                break;
            case 'image-image-collection':
                html += this.renderImageCollectionEditor(slide);
                break;
            case 'quiz-multiple-choice-carousel':
                html += this.renderQuizCarouselEditor(slide);
                break;
            case 'quiz-categorize':
                html += this.renderQuizCategorizeEditor(slide);
                break;
            case 'quiz-connect-quiz':
                html += this.renderConnectQuizEditor(slide);
                break;

            case 'quiz-drag-match-quiz':
                html += this.renderDragMatchQuizEditor(slide);
                break;

            case 'quiz-image-pairs-quiz':
                html += this.renderImagePairsQuizEditor(slide);
                break;
            default:
                if (slide.content.text !== undefined) {
                    html += `
                        <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
                            <h4 class="text-lg font-semibold mb-3 text-gray-800">المحتوى</h4>
                            <textarea id="edit-generic-text" rows="6" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${Utils.escapeHTML(slide.content.text || '')}</textarea>
                        </div>
                    `;
                } else {
                    html += `
                        <div class="text-center text-gray-500 py-12">
                            <i class="fas fa-tools text-4xl mb-4"></i>
                            <p>لا توجد واجهة تحرير مخصصة لهذا النوع حتى الآن.</p>
                        </div>
                    `;
                }
        }

        html += '</div>';
        if (this.editor.dom.slideEditContent) this.editor.dom.slideEditContent.innerHTML = html;

        // attach simple listeners (the UIInteractions will delegate many things via global handlers)
        const elSlideName = document.getElementById('edit-slide-name');
        if (elSlideName) elSlideName.addEventListener('input', (e) => this.editor.updateSlideContent(slideId, 'slideTitle', e.target.value));

        const elMainTitle = document.getElementById('edit-main-title');
        if (elMainTitle) elMainTitle.addEventListener('input', (e) => this.editor.updateSlideContent(slideId, 'title', e.target.value));

        const elSubtitle = document.getElementById('edit-subtitle');
        if (elSubtitle) elSubtitle.addEventListener('input', (e) => this.editor.updateSlideContent(slideId, 'subtitle', e.target.value));

        const genericText = document.getElementById('edit-generic-text');
        if (genericText) genericText.addEventListener('input', (e) => this.editor.updateSlideContent(slideId, 'text', e.target.value));

        const compLeftTitle = document.getElementById('comp-left-title');
        if (compLeftTitle) compLeftTitle.addEventListener('input', (e) => this.editor.updateSlideContent(slideId, 'leftTitle', e.target.value));

        const compLeftText = document.getElementById('comp-left-text');
        if (compLeftText) compLeftText.addEventListener('input', (e) => this.editor.updateSlideContent(slideId, 'leftText', e.target.value));

        const compRightTitle = document.getElementById('comp-right-title');
        if (compRightTitle) compRightTitle.addEventListener('input', (e) => this.editor.updateSlideContent(slideId, 'rightTitle', e.target.value));

        const compRightText = document.getElementById('comp-right-text');
        if (compRightText) compRightText.addEventListener('input', (e) => this.editor.updateSlideContent(slideId, 'rightText', e.target.value));

        const imgA = document.getElementById('edit-imageA');
        if (imgA) imgA.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            this.editor.updateSlideContent(slideId, 'imageA', val);
            e.target.classList.toggle('border-red-400', val && !val.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i));
        });

        const imgB = document.getElementById('edit-imageB');
        if (imgB) imgB.addEventListener('input', (e) => {
            const val = e.target.value.trim();
            this.editor.updateSlideContent(slideId, 'imageB', val);
            e.target.classList.toggle('border-red-400', val && !val.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i));
        });

        const videoUrl = document.getElementById('edit-video-url');
        if (videoUrl) {
            videoUrl.addEventListener('input', (e) => {
                const val = e.target.value.trim();
                this.editor.updateSlideContent(slideId, 'videoUrl', val);
                const isValidVideo = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com)\//i.test(val);
                e.target.classList.toggle('border-red-400', val && !isValidVideo);
            });
        }

        const quizQuestion = document.getElementById('quiz-question');
        if (quizQuestion) quizQuestion.addEventListener('input', (e) => this.editor.updateSlideContent(slideId, 'question', e.target.value));

        const quizCorrect = document.getElementById('quiz-correct');
        if (quizCorrect) {
            quizCorrect.addEventListener('input', (e) => {
                const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
                if (!slide || !slide.content.answers) return;

                const maxValue = Math.max(1, slide.content.answers.length);
                let value = parseInt(e.target.value) || 1;
                value = Math.max(1, Math.min(value, maxValue));
                e.target.value = value;

                this.editor.updateSlideContent(slideId, 'correct', value);
            });

            // Also validate on blur
            quizCorrect.addEventListener('blur', (e) => {
                const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
                if (!slide || !slide.content.answers) return;

                const maxValue = Math.max(1, slide.content.answers.length);
                let value = parseInt(e.target.value) || 1;
                value = Math.max(1, Math.min(value, maxValue));
                e.target.value = value;
            });
        }

        const quizAnswersList = document.getElementById('quiz-answers');
        if (quizAnswersList) {
            quizAnswersList.addEventListener('input', (e) => {
                if (e.target.classList.contains('quiz-answer-input')) {
                    const idx = parseInt(e.target.dataset.index);
                    this.editor.updateNestedContent(slideId, 'answers', idx, null, e.target.value);
                }
            });

            quizAnswersList.addEventListener('click', (e) => {
                if (e.target.closest('.remove-answer')) {
                    const idx = parseInt(e.target.closest('.remove-answer').dataset.index);
                    const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
                    if (slide && slide.content.answers) {
                        slide.content.answers.splice(idx, 1);
                        this.editor.saveToLocalStorage();
                        this.loadSlideEditContent(slideId);
                    }
                }
            });
        }

        const addAnswerBtn = document.getElementById('add-answer');
        if (addAnswerBtn) addAnswerBtn.addEventListener('click', () => {
            const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
            if (!slide.content.answers) slide.content.answers = [];
            // MISSING: Add the 4-answer limit check here
            if (slide.content.answers.length >= 4) {
                Swal.fire({
                    icon: 'warning',
                    title: 'حد أقصى',
                    text: 'لا يمكن إضافة أكثر من 4 إجابات.',
                    timer: 2000,
                    showConfirmButton: false
                });
                return;
            }
            slide.content.answers.push('');
            this.editor.saveToLocalStorage();
            this.loadSlideEditContent(slideId);
        });
    }

    getChooseSlidePlaceholder() {
        return `
            <div class="text-center text-gray-500 py-12">
                <i class="fas fa-edit text-4xl mb-4"></i>
                <p>اختر سلايداً للتعديل</p>
            </div>`;
    }

    // slide templates
    renderSlideTemplates(category = 'text') {
        const container = this.editor.dom.slideTemplatesContainer;
        if (!container) return;
        const templates = this.editor.slideTemplates[category] || [];
        if (!templates.length) {
            container.innerHTML = `<p class="text-gray-500">لا توجد قوالب متاحة لهذا القسم.</p>`;
            return;
        }
        container.innerHTML = `
            <div class="template-grid grid grid-cols-2 gap-4">
                ${templates.map(t => `
                    <div class="template-card p-4 border rounded-lg cursor-pointer" data-type="${category}" data-subtype="${t.subtype}">
                        <div class="template-preview mb-2">
                            <i class="fas ${t.icon} text-2xl"></i>
                        </div>
                        <div class="template-info">
                            <h4 class="template-title font-semibold">${Utils.escapeHTML(t.title)}</h4>
                            <p class="template-description text-sm text-gray-500">${Utils.escapeHTML(t.description)}</p>
                        </div>
                    </div>`).join('')}
            </div>
        `;
    }

    // mobile slides
    renderMobileSlidesBar() {
        const lessonsTabs = document.getElementById('mobile-lessons-tabs');
        const slidesScroll = document.getElementById('mobile-slides-scroll');
        if (!lessonsTabs || !slidesScroll) return;

        lessonsTabs.innerHTML = this.editor.lessons.map(l =>
            `<button class="lesson-tab ${l.id === this.editor.currentLessonId ? 'active' : ''}" data-lesson-id="${l.id}">
      ${Utils.escapeHTML(l.title)}
    </button>`
        ).join('');

        const lesson = this.editor.findLessonById(this.editor.currentLessonId);
        if (!lesson) return;
        slidesScroll.innerHTML = lesson.slides.map((s, i) =>
            `<div class="slide-square ${s.id === this.editor.currentSlideId ? 'active' : ''}"
                data-slide-id="${s.id}" data-lesson-id="${lesson.id}">
            ${i + 1}
            </div>`
        ).join('');

        const activeSlide = slidesScroll.querySelector('.active');
        if (activeSlide) {
            activeSlide.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest'
            });
        }
    }
}

////////////////////////////////////////////////////
// DragDropManager — scoped drag handling for comparisons + extensible
////////////////////////////////////////////////////
class DragDropManager {
    constructor(editor) {
        this.editor = editor;
        this.activeDrag = null; // { target, wrapper, topLayer }
        this.boundHandlers = {};
        this.initScopedHandlers();
    }

    initScopedHandlers() {
        const container = this.editor.dom.slidePreviewContainer;
        if (!container) return;

        // Mouse/touch start inside preview container only
        container.addEventListener('mousedown', (e) => this.handleStart(e));
        container.addEventListener('touchstart', (e) => this.handleStart(e), { passive: false });
        // Text series navigation
        container.addEventListener('click', (e) => this.handleTextSeriesNavigation(e));
    }

    startTextSeriesSwipe(container, e) {
        // Check if it's text series or image series
        const isTextSeries = container.classList.contains('text-series-preview');
        const isImageSeries = container.classList.contains('image-series-preview');

        if (!isTextSeries && !isImageSeries) return;

        this.textSeriesSwipe = {
            container,
            startX: e.touches ? e.touches[0].clientX : e.clientX,
            startY: e.touches ? e.touches[0].clientY : e.clientY,
            isSwiping: false
        };

        const move = (ev) => this.handleTextSeriesSwipeMove(ev);
        const end = (ev) => this.handleTextSeriesSwipeEnd(ev, move, end);

        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', end);
        document.addEventListener('touchmove', move, { passive: false });
        document.addEventListener('touchend', end);
    }

    handleTextSeriesSwipeMove(e) {
        if (!this.textSeriesSwipe) return;

        const currentX = e.touches ? e.touches[0].clientX : e.clientX;
        const currentY = e.touches ? e.touches[0].clientY : e.clientY;
        const deltaX = currentX - this.textSeriesSwipe.startX;
        const deltaY = currentY - this.textSeriesSwipe.startY;

        // Only consider it a swipe if horizontal movement is greater than vertical
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            this.textSeriesSwipe.isSwiping = true;
            e.preventDefault();
        }
    }

    handleTextSeriesSwipeEnd(e, move, end) {
        if (!this.textSeriesSwipe) return;

        const currentX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
        const deltaX = currentX - this.textSeriesSwipe.startX;

        if (this.textSeriesSwipe.isSwiping && Math.abs(deltaX) > 50) {
            if (deltaX > 0) {
                this.navigateTextSeries(this.textSeriesSwipe.container, -1); // Swipe right - previous
            } else {
                this.navigateTextSeries(this.textSeriesSwipe.container, 1); // Swipe left - next
            }
        }

        this.textSeriesSwipe = null;
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', end);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('touchend', end);
    }

    handleTextSeriesNavigation(e) {
        const target = e.target;
        const textDot = target.closest('.text-series-nav-dot');
        const imageDot = target.closest('.image-series-nav-dot');
        if (textDot) {
            const container = textDot.closest('.text-series-preview');
            const index = parseInt(textDot.dataset.index);
            this.goToTextSeriesSlide(container, index);
            return;
        }
        if (imageDot) {
            const container = imageDot.closest('.image-series-preview');
            const index = parseInt(imageDot.dataset.index);
            this.goToTextSeriesSlide(container, index); // Reuse the same navigation function
            return;
        }
    }

    navigateTextSeries(container, direction) {
        // Determine which type of series we're dealing with
        const isTextSeries = container.classList.contains('text-series-preview');
        const slideSelector = isTextSeries ? '.text-series-slide' : '.image-series-slide';

        const slides = container.querySelectorAll(slideSelector);
        const dots = container.querySelectorAll(isTextSeries ? '.text-series-nav-dot' : '.image-series-nav-dot');

        const currentIndex = Array.from(slides).findIndex(slide =>
            slide.classList.contains('block') || slide.style.opacity === '1'
        );

        let newIndex = currentIndex + direction;

        // Non-looping behavior
        if (newIndex < 0) newIndex = 0;
        if (newIndex >= slides.length) newIndex = slides.length - 1;

        if (newIndex !== currentIndex) {
            this.goToTextSeriesSlide(container, newIndex);
        }
    }

    // REPLACE the entire goToTextSeriesSlide method with this:

    goToTextSeriesSlide(container, index) {
        // Determine which type of series we're dealing with
        const isTextSeries = container.classList.contains('text-series-preview');
        const isImageSeries = container.classList.contains('image-series-preview');

        const slideSelector = isTextSeries ? '.text-series-slide' : '.image-series-slide';
        const dotSelector = isTextSeries ? '.text-series-nav-dot' : '.image-series-nav-dot';

        const slides = container.querySelectorAll(slideSelector);
        const dots = container.querySelectorAll(dotSelector);

        // Hide all slides using display property instead of opacity
        slides.forEach(slide => {
            slide.classList.add('hidden');
            slide.classList.remove('block');
            slide.style.opacity = '0';
        });

        // Reset all dots
        dots.forEach(dot => {
            dot.classList.remove('text-series-nav-dot-active', 'image-series-nav-dot-active', 'bg-white');
            dot.classList.add('bg-transparent');
        });

        // Show target slide
        if (slides[index]) {
            slides[index].classList.remove('hidden');
            slides[index].classList.add('block');
            // Use setTimeout to ensure display change happens before opacity transition
            setTimeout(() => {
                slides[index].style.opacity = '1';
            }, 10);
        }

        // Activate target dot
        if (dots[index]) {
            dots[index].classList.remove('bg-transparent');
            const activeClass = isTextSeries ? 'text-series-nav-dot-active' : 'image-series-nav-dot-active';
            dots[index].classList.add(activeClass, 'bg-white');
        }
    }

    handleStart(e) {
        // identify draggable targets inside preview
        const sep = e.target.closest('.comparison-separator');
        if (sep) {
            e.preventDefault();
            this.startComparisonDrag(sep, e);
            return;
        }

        // Text series swipe handling
        const textSeries = e.target.closest('.text-series-preview');
        const imageSeries = e.target.closest('.image-series-preview'); // ADD THIS LINE

        if (textSeries || imageSeries) { // UPDATE THIS CONDITION
            this.startTextSeriesSwipe(textSeries || imageSeries, e);
            return;
        }
    }

    startComparisonDrag(separatorEl, e) {
        const wrapper = separatorEl.closest('.comparison-wrapper');
        if (!wrapper) return;
        const topLayer = wrapper.querySelector('.comparison-layer.top');
        if (!topLayer) return;

        this.activeDrag = { target: separatorEl, wrapper, topLayer };

        separatorEl.classList.add('dragging');
        if (this.editor.dom.slidePreviewContainer) this.editor.dom.slidePreviewContainer.classList.add('drag-active');

        // bind move/end handlers (store references to remove them later)
        const move = (ev) => this.handleMove(ev);
        const end = (ev) => this.handleEnd(ev, move, end);

        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', end);
        document.addEventListener('touchmove', move, { passive: false });
        document.addEventListener('touchend', end);
    }

    handleMove(ev) {
        if (!this.activeDrag) return;
        ev.preventDefault();
        const { target, wrapper, topLayer } = this.activeDrag;
        const rect = wrapper.getBoundingClientRect();
        const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;

        let x = clientX - rect.left;
        x = Math.max(0, Math.min(rect.width, x));
        const percent = (x / rect.width) * 100;
        target.style.left = `${percent}%`;
        topLayer.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
    }

    handleEnd(ev, move, end) {
        if (!this.activeDrag) return;
        this.activeDrag.target.classList.remove('dragging');
        if (this.editor.dom.slidePreviewContainer) this.editor.dom.slidePreviewContainer.classList.remove('drag-active');
        this.activeDrag = null;
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', end);
        document.removeEventListener('touchmove', move);
        document.removeEventListener('touchend', end);
    }
}

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

        // The re-render will now show the correct state based on userChoice
        editor.loadSlidePreview(slideId);
    }
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

    slide.userConnections?.forEach(connection => {
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

            // Create line element
            const line = document.createElement('div');
            line.className = 'quiz-connection-line user-connection';
            line.style.cssText = `
                left: ${startX}px;
                top: ${startY}px;
                width: ${length}px;
                transform: rotate(${angle}deg);
            `;

            connectionsLayer.appendChild(line);

            // Add dots at connection points
            const startDot = document.createElement('div');
            startDot.className = 'connection-dot';
            startDot.style.cssText = `
                left: ${startX - 6}px;
                top: ${startY - 6}px;
            `;

            const endDot = document.createElement('div');
            endDot.className = 'connection-dot';
            endDot.style.cssText = `
                left: ${endX - 6}px;
                top: ${endY - 6}px;
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
    editor.loadSlidePreview(slide.id);
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

        // Remove visual feedback
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
            // Remove any existing match for this dragged item
            slide.userMatches = slide.userMatches.filter(match => match.leftIndex !== draggedIndex);

            // Add new match
            slide.userMatches.push({
                leftIndex: draggedIndex,
                rightIndex: dropIndex
            });

        } else if (draggedSide === 'right' && dropSide === 'left') {
            // Remove the match when returning to left
            slide.userMatches = slide.userMatches.filter(match =>
                !(match.leftIndex === draggedIndex && match.rightIndex === dropIndex)
            );
        }

        editor.saveToLocalStorage();

        // Re-render based on the updated data model
        editor.loadSlidePreview(slide.id);

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
    const rightItems = document.querySelectorAll('.quiz-connect-item[data-side="right"]');
    let targetRightIndex = -1;

    rightItems.forEach((item, index) => {
        const itemRect = item.getBoundingClientRect();
        const itemCenterX = itemRect.left + itemRect.width / 2;
        const itemCenterY = itemRect.top + itemRect.height / 2;

        // Check if end point is near this right item
        const distance = Math.sqrt(
            Math.pow(clientX - itemCenterX, 2) +
            Math.pow(clientY - itemCenterY, 2)
        );

        if (distance < Math.max(itemRect.width, itemRect.height) * 0.8) {
            targetRightIndex = index;
        }
    });

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
// UIInteractions — attaches event listeners + routes actions
////////////////////////////////////////////////////
class UIInteractions {
    constructor(editor) {
        this.editor = editor;

        // bind handlers
        this.handleDocumentClick = this.handleDocumentClick.bind(this);
        this.handleInput = this.handleInput.bind(this);

        this.setupEventListeners();
    }

    setupEventListeners() {
        // toggles and static buttons
        const toggleSidebar = document.getElementById('toggle-sidebar');
        if (toggleSidebar) toggleSidebar.addEventListener('click', () => {
            const rightSidebar = document.querySelector('.sidebar');
            if (!rightSidebar) return;
            const currentlyCollapsed = rightSidebar.classList.contains('translate-x-full') && rightSidebar.classList.contains('opacity-0');

            if (currentlyCollapsed) {
                rightSidebar.classList.remove('translate-x-full', 'opacity-0', 'pointer-events-none');
                this.editor.saveSidebarStateForLesson(this.editor.currentLessonId, 'right', false);
            } else {
                rightSidebar.classList.add('translate-x-full', 'opacity-0', 'pointer-events-none');
                this.editor.saveSidebarStateForLesson(this.editor.currentLessonId, 'right', true);
            }
        });

        const toggleEditSidebar = document.getElementById('toggle-edit-sidebar');
        if (toggleEditSidebar) toggleEditSidebar.addEventListener('click', () => {
            const leftSidebar = document.querySelector('.edit-sidebar');
            if (!leftSidebar) return;
            const currentlyCollapsed = leftSidebar.classList.contains('-translate-x-full') && leftSidebar.classList.contains('opacity-0');

            if (currentlyCollapsed) {
                leftSidebar.classList.remove('-translate-x-full', 'opacity-0', 'pointer-events-none');
                this.editor.saveSidebarStateForLesson(this.editor.currentLessonId, 'left', false);
            } else {
                leftSidebar.classList.add('-translate-x-full', 'opacity-0', 'pointer-events-none');
                this.editor.saveSidebarStateForLesson(this.editor.currentLessonId, 'left', true);
            }
        });

        const saveBtn = document.getElementById('save-changes');
        if (saveBtn) saveBtn.addEventListener('click', () => {
            Swal.fire({ icon: 'success', text: 'تم حفظ التغييرات بنجاح!' });
            this.editor.saveToLocalStorage();
        });

        const addLessonBtn = document.getElementById('add-lesson-btn');
        if (addLessonBtn) addLessonBtn.addEventListener('click', () => this.editor.addNewLesson());

        const cancelAddSlide = document.getElementById('cancel-add-slide');
        if (cancelAddSlide) cancelAddSlide.addEventListener('click', () => this.editor.hideAddSlideModal());

        const slideCategoryNav = document.getElementById('slide-category-nav');
        if (slideCategoryNav) {
            slideCategoryNav.addEventListener('click', (e) => {
                e.preventDefault();
                const btn = e.target.closest('.slide-category-btn');
                if (btn) this.editor.renderSlideTemplates(btn.dataset.category || 'text');
            });
        }

        if (this.editor.dom.slideTemplatesContainer) {
            this.editor.dom.slideTemplatesContainer.addEventListener('click', (e) => {
                const card = e.target.closest('.template-card');
                if (card) {
                    const type = card.dataset.type;
                    const subtype = card.dataset.subtype;
                    this.editor.createNewSlide(type, subtype);
                }
            });
        }

        const editLessonBtn = document.getElementById('edit-lesson-title');
        if (editLessonBtn) editLessonBtn.addEventListener('click', () => this.editor.showLessonEditForm());
        const saveLessonTitleBtn = document.getElementById('save-lesson-title');
        if (saveLessonTitleBtn) saveLessonTitleBtn.addEventListener('click', () => this.editor.saveLessonTitle());
        const cancelLessonEditBtn = document.getElementById('cancel-lesson-edit');
        if (cancelLessonEditBtn) cancelLessonEditBtn.addEventListener('click', () => this.editor.hideLessonEditForm());

        // add slide buttons
        document.querySelectorAll(' .add-slide-inside-lesson').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lessonId = parseInt(btn.dataset.lessonId);
                if (!isNaN(lessonId)) {
                    this.editor.currentLessonId = lessonId;
                }
                this.editor.showAddSlideModal();
            });
        });

        // global document handlers (delegated)
        document.addEventListener('click', this.handleDocumentClick);
        document.addEventListener('input', this.handleInput);

        const mobileHandle = document.getElementById('mobile-lessons-handle');
        const mobileNav = document.getElementById('mobile-slide-nav');
        if (mobileHandle && mobileNav) {
            mobileHandle.addEventListener('click', () => {
                mobileNav.classList.toggle('collapsed');
                const icon = mobileHandle.querySelector('i');
                if (icon) icon.classList.toggle('fa-chevron-up');
                if (icon) icon.classList.toggle('fa-chevron-down');
            });
        }

        // attach mobile events
        this.editor.attachMobileSlidesEvents();

        // setup resize handles (kept mostly same as original)
        this.editor.setupResizeHandles();
        this.editor.applySidebarStateForLesson(this.editor.currentLessonId);
    }

    handleInput(e) {
        const target = e.target;
        // bulleted inputs
        if (target.classList.contains('bulleted-input')) {
            const idx = parseInt(target.dataset.bulletIndex, 10);
            if (!isNaN(idx) && this.editor.currentSlideId != null) {
                this.editor.updateNestedContent(this.editor.currentSlideId, 'items', idx, null, target.value);
            }
        }

        if (target.dataset && target.dataset.imageCollection !== undefined) {
            const idx = parseInt(target.dataset.imageCollection, 10);
            const field = target.dataset.field;
            if (!isNaN(idx) && field && this.editor.currentSlideId != null) {
                this.editor.updateNestedContent(this.editor.currentSlideId, 'sections', idx, field, target.value);
            }
        }
        // In handleInput method, update the column type handlers:
        if (target.id === 'connect-left-type') {
            if (this.editor.currentSlideId != null) {
                this.editor.updateSlideContent(this.editor.currentSlideId, 'leftColumnType', target.value);
                // Force re-render of edit form AND preview
                this.editor.loadSlideEditContent(this.editor.currentSlideId);
                // Additional preview refresh to ensure it updates
                setTimeout(() => {
                    const slide = this.editor.getCurrentSlide();
                    if (slide) {
                        this.editor.renderSlidePreview(slide);
                    }
                }, 100);
            }
        }

        if (target.id === 'connect-right-type') {
            if (this.editor.currentSlideId != null) {
                this.editor.updateSlideContent(this.editor.currentSlideId, 'rightColumnType', target.value);
                // Force re-render of edit form AND preview
                this.editor.loadSlideEditContent(this.editor.currentSlideId);
                // Additional preview refresh to ensure it updates
                setTimeout(() => {
                    const slide = this.editor.getCurrentSlide();
                    if (slide) {
                        this.editor.renderSlidePreview(slide);
                    }
                }, 100);
            }
        }

        if (target.id === 'image-pairs-left-type') {
            if (this.editor.currentSlideId != null) {
                this.editor.updateSlideContent(this.editor.currentSlideId, 'leftColumnType', target.value);
                this.editor.loadSlideEditContent(this.editor.currentSlideId);
                setTimeout(() => {
                    const slide = this.editor.getCurrentSlide();
                    if (slide) {
                        this.editor.renderSlidePreview(slide);
                    }
                }, 100);
            }
        }

        if (target.id === 'image-pairs-right-type') {
            if (this.editor.currentSlideId != null) {
                this.editor.updateSlideContent(this.editor.currentSlideId, 'rightColumnType', target.value);
                this.editor.loadSlideEditContent(this.editor.currentSlideId);
                setTimeout(() => {
                    const slide = this.editor.getCurrentSlide();
                    if (slide) {
                        this.editor.renderSlidePreview(slide);
                    }
                }, 100);
            }
        }

        if (target.id === 'connect-quiz-question') {
            if (this.editor.currentSlideId != null) this.editor.updateSlideContent(this.editor.currentSlideId, 'question', target.value);
        }

        if (target.id === 'drag-match-quiz-question') {
            if (this.editor.currentSlideId != null) this.editor.updateSlideContent(this.editor.currentSlideId, 'question', target.value);
        }

        if (target.id === 'image-pairs-quiz-question') {
            if (this.editor.currentSlideId != null) this.editor.updateSlideContent(this.editor.currentSlideId, 'question', target.value);
        }

        // Handle connect quiz inputs
        if (target.dataset && target.dataset.connectLeft !== undefined) {
            const idx = parseInt(target.dataset.connectLeft, 10);
            const field = target.dataset.field;
            if (!isNaN(idx) && field && this.editor.currentSlideId != null) {
                let value = field === 'correctIndex' ? parseInt(target.value, 10) : target.value;

                // ADD VALIDATION FOR CORRECT INDEX (1-BASED TO 0-BASED CONVERSION)
                if (field === 'correctIndex') {
                    const slide = this.editor.getCurrentSlide();
                    const rightColumnLength = slide.content.rightColumn?.length || 0;
                    // Convert 1-based input to 0-based storage and validate
                    value = Math.max(1, Math.min(value, Math.max(1, rightColumnLength)));
                    // Store as 0-based internally
                    const storageValue = value - 1;
                    // Update the input field with validated 1-based value
                    target.value = value;
                    this.editor.updateNestedContent(this.editor.currentSlideId, 'leftColumn', idx, field, storageValue);
                    return; // Skip the regular update below
                }

                this.editor.updateNestedContent(this.editor.currentSlideId, 'leftColumn', idx, field, value);
            }
        }

        if (target.dataset && target.dataset.connectRight !== undefined) {
            const idx = parseInt(target.dataset.connectRight, 10);
            const field = target.dataset.field;
            if (!isNaN(idx) && field && this.editor.currentSlideId != null) {
                this.editor.updateNestedContent(this.editor.currentSlideId, 'rightColumn', idx, field, target.value);
            }
        }

        // Handle drag match quiz inputs
        if (target.dataset && target.dataset.dragLeft !== undefined) {
            const idx = parseInt(target.dataset.dragLeft, 10);
            const field = target.dataset.field;
            if (!isNaN(idx) && field && this.editor.currentSlideId != null) {
                let value = field === 'correctIndex' ? parseInt(target.value, 10) : target.value;

                // ADD VALIDATION FOR CORRECT INDEX (1-BASED TO 0-BASED CONVERSION)
                if (field === 'correctIndex') {
                    const slide = this.editor.getCurrentSlide();
                    const rightColumnLength = slide.content.rightColumn?.length || 0;
                    // Convert 1-based input to 0-based storage
                    value = Math.max(1, Math.min(value, rightColumnLength));
                    // Store as 0-based internally
                    const storageValue = value - 1;
                    // Update the input field with validated 1-based value
                    target.value = value;
                    this.editor.updateNestedContent(this.editor.currentSlideId, 'leftColumn', idx, field, storageValue);
                    return; // Skip the regular update below
                }

                this.editor.updateNestedContent(this.editor.currentSlideId, 'leftColumn', idx, field, value);
            }
        }

        if (target.dataset && target.dataset.dragRight !== undefined) {
            const idx = parseInt(target.dataset.dragRight, 10);
            const field = target.dataset.field;
            if (!isNaN(idx) && field && this.editor.currentSlideId != null) {
                this.editor.updateNestedContent(this.editor.currentSlideId, 'rightColumn', idx, field, target.value);
            }
        }

        // Handle image pairs quiz inputs
        if (target.dataset && target.dataset.pairsLeft !== undefined) {
            const idx = parseInt(target.dataset.pairsLeft, 10);
            const field = target.dataset.field;
            if (!isNaN(idx) && field && this.editor.currentSlideId != null) {
                const value = field === 'isCorrect' ? target.checked : target.value;
                this.editor.updateNestedContent(this.editor.currentSlideId, 'leftColumn', idx, field, value);
            }
        }

        if (target.dataset && target.dataset.pairsRight !== undefined) {
            const idx = parseInt(target.dataset.pairsRight, 10);
            const field = target.dataset.field;
            if (!isNaN(idx) && field && this.editor.currentSlideId != null) {
                const value = field === 'isCorrect' ? target.checked : target.value;
                this.editor.updateNestedContent(this.editor.currentSlideId, 'rightColumn', idx, field, value);
            }
        }

        if (target.dataset && target.dataset.expandable !== undefined) {
            const idx = parseInt(target.dataset.expandable, 10);
            const field = target.dataset.expandableField;
            if (!isNaN(idx) && field && this.editor.currentSlideId != null) {
                this.editor.updateNestedContent(this.editor.currentSlideId, 'items', idx, field, target.value);
            }
        }

        if (target.dataset && target.dataset.textSeries !== undefined) {
            const idx = parseInt(target.dataset.textSeries, 10);
            const field = target.dataset.field;
            if (!isNaN(idx) && field && this.editor.currentSlideId != null) {
                this.editor.updateNestedContent(this.editor.currentSlideId, 'items', idx, field, target.value);
            }
        }

        if (target.id === 'edit-video-url') {
            if (this.editor.currentSlideId != null) this.editor.updateSlideContent(this.editor.currentSlideId, 'videoUrl', target.value);
        }
        if (target.id === 'edit-video-duration') {
            if (this.editor.currentSlideId != null) this.editor.updateSlideContent(this.editor.currentSlideId, 'duration', target.value);
        }
        if (target.id === 'edit-video-description') {
            if (this.editor.currentSlideId != null) this.editor.updateSlideContent(this.editor.currentSlideId, 'description', target.value);
        }

        if (target.dataset && target.dataset.imageSeries !== undefined) {
            const idx = parseInt(target.dataset.imageSeries, 10);
            const field = target.dataset.field;
            if (!isNaN(idx) && field && this.editor.currentSlideId != null) {
                this.editor.updateNestedContent(this.editor.currentSlideId, 'items', idx, field, target.value);
            }
        }

        if (target.id === 'quiz-question-input') {
            if (this.editor.currentSlideId != null) {
                this.editor.updateSlideContent(this.editor.currentSlideId, 'question', target.value);
            }
        }

        if (target.classList.contains('quiz-category-input')) {
            const idx = parseInt(target.dataset.index, 10);
            if (!isNaN(idx) && this.editor.currentSlideId != null) {
                this.editor.updateNestedContent(this.editor.currentSlideId, 'categories', idx, null, target.value);
            }
        }

        if (target.id === 'correct-category-select') {
            if (this.editor.currentSlideId != null) {
                this.editor.updateSlideContent(this.editor.currentSlideId, 'correct', parseInt(target.value, 10));
            }
        }

    }

    handleDocumentClick(e) {
        const target = e.target;

        // Text series delete button
        const delTextSeriesBtn = target.closest('[data-action="delete-text-series"]');
        if (delTextSeriesBtn) {
            const idx = parseInt(delTextSeriesBtn.dataset.index, 10);
            if (!isNaN(idx) && this.editor.currentSlideId != null) {
                this.editor.deleteTextSeriesItem(this.editor.currentSlideId, idx);
            }
            return;
        }

        // Add connect pair
        const addConnectPairBtn = target.closest('#add-connect-pair');
        if (addConnectPairBtn && this.editor.currentSlideId != null) {
            const slide = this.editor.getCurrentSlide();
            if (!slide.content.leftColumn) slide.content.leftColumn = [];
            if (!slide.content.rightColumn) slide.content.rightColumn = [];

            // Check limits
            if (slide.content.leftColumn.length >= 3 || slide.content.rightColumn.length >= 3) {
                Swal.fire('حد أقصى', 'لا يمكن إضافة أكثر من 3 عناصر في كل عمود.', 'warning');
                return;
            }

            const leftType = slide.content.leftColumnType || 'text';
            const rightType = slide.content.rightColumnType || 'text';

            // Add to both columns to maintain equal numbers
            slide.content.leftColumn.push({
                type: leftType,
                value: leftType === 'text' ? 'عنصر جديد' : '',
                correctIndex: slide.content.rightColumn.length // This will be the new index
            });
            slide.content.rightColumn.push({
                type: rightType,
                value: rightType === 'text' ? 'عنصر جديد' : ''
            });

            this.editor.saveToLocalStorage();
            this.editor.loadSlideEditContent(this.editor.currentSlideId);
            return;
        }

        // Add to image pairs left column
        const addImagePairsLeftBtn = target.closest('#add-image-pairs-left');
        if (addImagePairsLeftBtn && this.editor.currentSlideId != null) {
            const slide = this.editor.getCurrentSlide();
            if (!slide.content.leftColumn) slide.content.leftColumn = [];

            // Check limit
            if (slide.content.leftColumn.length >= 3) {
                Swal.fire('حد أقصى', 'لا يمكن إضافة أكثر من 3 صور في القائمة اليسرى.', 'warning');
                return;
            }

            slide.content.leftColumn.push({
                type: 'image',  // Force image type
                value: '',      // Empty image URL
                isCorrect: false
            });

            this.editor.saveToLocalStorage();
            this.editor.loadSlideEditContent(this.editor.currentSlideId);
            return;
        }

        // Update the add image pairs right button handler
        const addImagePairsRightBtn = target.closest('#add-image-pairs-right');
        if (addImagePairsRightBtn && this.editor.currentSlideId != null) {
            const slide = this.editor.getCurrentSlide();
            if (!slide.content.rightColumn) slide.content.rightColumn = [];

            // Check limit
            if (slide.content.rightColumn.length >= 3) {
                Swal.fire('حد أقصى', 'لا يمكن إضافة أكثر من 3 صور في القائمة اليمنى.', 'warning');
                return;
            }

            slide.content.rightColumn.push({
                type: 'image',  // Force image type
                value: '',      // Empty image URL
                isCorrect: false
            });

            this.editor.saveToLocalStorage();
            this.editor.loadSlideEditContent(this.editor.currentSlideId);
            return;
        }

        const addImagePairsBtn = target.closest('#add-image-pairs-pair');
        if (addImagePairsBtn && this.editor.currentSlideId != null) {
            const slide = this.editor.getCurrentSlide();
            if (!slide.content.leftColumn) slide.content.leftColumn = [];
            if (!slide.content.rightColumn) slide.content.rightColumn = [];

            // Check limits
            if (slide.content.leftColumn.length >= 3 || slide.content.rightColumn.length >= 3) {
                Swal.fire('حد أقصى', 'لا يمكن إضافة أكثر من 3 صور في كل عمود.', 'warning');
                return;
            }

            // Add to both columns to maintain equal numbers
            slide.content.leftColumn.push({
                type: 'image',
                value: '',
                isCorrect: false
            });
            slide.content.rightColumn.push({
                type: 'image',
                value: '',
                isCorrect: false
            });

            this.editor.saveToLocalStorage();
            this.editor.loadSlideEditContent(this.editor.currentSlideId);
            return;
        }

        // Add drag pair with limits
        const addDragPairBtn = target.closest('#add-drag-pair');
        if (addDragPairBtn && this.editor.currentSlideId != null) {
            const slide = this.editor.getCurrentSlide();
            if (!slide.content.leftColumn) slide.content.leftColumn = [];
            if (!slide.content.rightColumn) slide.content.rightColumn = [];

            // Check limits
            if (slide.content.leftColumn.length >= 3 || slide.content.rightColumn.length >= 3) {
                Swal.fire('حد أقصى', 'لا يمكن إضافة أكثر من 3 عناصر في كل عمود.', 'warning');
                return;
            }

            // Add to both columns to maintain equal numbers
            slide.content.leftColumn.push({
                type: 'image',
                value: '',
                correctIndex: slide.content.rightColumn.length // This will be the new index
            });
            slide.content.rightColumn.push({
                type: 'text',
                value: 'نص جديد'
            });

            this.editor.saveToLocalStorage();
            this.editor.loadSlideEditContent(this.editor.currentSlideId);
            return;
        }

        // Add pairs left with limits
        const addPairsLeftBtn = target.closest('#add-pairs-left');
        if (addPairsLeftBtn && this.editor.currentSlideId != null) {
            const slide = this.editor.getCurrentSlide();
            if (!slide.content.leftColumn) slide.content.leftColumn = [];

            // Check limit
            if (slide.content.leftColumn.length >= 3) {
                Swal.fire('حد أقصى', 'لا يمكن إضافة أكثر من 3 عناصر في القائمة اليسرى.', 'warning');
                return;
            }

            slide.content.leftColumn.push({ type: 'text', value: 'عنصر جديد', isCorrect: false });
            this.editor.saveToLocalStorage();
            this.editor.loadSlideEditContent(this.editor.currentSlideId);
            return;
        }

        // Add pairs right with limits
        const addPairsRightBtn = target.closest('#add-pairs-right');
        if (addPairsRightBtn && this.editor.currentSlideId != null) {
            const slide = this.editor.getCurrentSlide();
            if (!slide.content.rightColumn) slide.content.rightColumn = [];

            // Check limit
            if (slide.content.rightColumn.length >= 3) {
                Swal.fire('حد أقصى', 'لا يمكن إضافة أكثر من 3 عناصر في القائمة اليمنى.', 'warning');
                return;
            }

            slide.content.rightColumn.push({ type: 'text', value: 'عنصر جديد', isCorrect: false });
            this.editor.saveToLocalStorage();
            this.editor.loadSlideEditContent(this.editor.currentSlideId);
            return;
        }

        // Delete connect quiz left item
        const deleteConnectLeftBtn = target.closest('[data-action="delete-connect-left"]');
        if (deleteConnectLeftBtn && this.editor.currentSlideId != null) {
            const index = parseInt(deleteConnectLeftBtn.dataset.index, 10);
            const slide = this.editor.getCurrentSlide();
            if (slide && slide.content.leftColumn && slide.content.rightColumn) {
                if (slide.content.leftColumn.length > 1 && slide.content.rightColumn.length > 1) {
                    // Delete from both columns at the same index
                    slide.content.leftColumn.splice(index, 1);
                    slide.content.rightColumn.splice(index, 1);

                    // Update correctIndex values for remaining left items
                    slide.content.leftColumn.forEach((item, idx) => {
                        if (item.correctIndex >= index) {
                            item.correctIndex = Math.max(0, item.correctIndex - 1);
                        }
                    });

                    this.editor.saveToLocalStorage();
                    this.editor.loadSlideEditContent(this.editor.currentSlideId);
                } else {
                    Swal.fire('تنبيه', 'يجب أن يبقى عنصر واحد على الأقل في كل عمود.', 'warning');
                }
            }
            return;
        }

        // Delete connect quiz right item (and corresponding left item)
        const deleteConnectRightBtn = target.closest('[data-action="delete-connect-right"]');
        if (deleteConnectRightBtn && this.editor.currentSlideId != null) {
            const index = parseInt(deleteConnectRightBtn.dataset.index, 10);
            const slide = this.editor.getCurrentSlide();
            if (slide && slide.content.leftColumn && slide.content.rightColumn) {
                if (slide.content.leftColumn.length > 1 && slide.content.rightColumn.length > 1) {
                    // Delete from both columns at the same index
                    slide.content.leftColumn.splice(index, 1);
                    slide.content.rightColumn.splice(index, 1);

                    // Update correctIndex values for remaining left items
                    slide.content.leftColumn.forEach((item, idx) => {
                        if (item.correctIndex >= index) {
                            item.correctIndex = Math.max(0, item.correctIndex - 1);
                        }
                    });

                    this.editor.saveToLocalStorage();
                    this.editor.loadSlideEditContent(this.editor.currentSlideId);
                } else {
                    Swal.fire('تنبيه', 'يجب أن يبقى عنصر واحد على الأقل في كل عمود.', 'warning');
                }
            }
            return;
        }


        // Delete drag match left item
        const deleteDragLeftBtn = target.closest('[data-action="delete-drag-left"]');
        if (deleteDragLeftBtn && this.editor.currentSlideId != null) {
            const index = parseInt(deleteDragLeftBtn.dataset.index, 10);
            const slide = this.editor.getCurrentSlide();
            if (slide && slide.content.leftColumn && slide.content.rightColumn) {
                if (slide.content.leftColumn.length > 1 && slide.content.rightColumn.length > 1) {
                    // Delete from both columns at the same index
                    slide.content.leftColumn.splice(index, 1);
                    slide.content.rightColumn.splice(index, 1);

                    // Update correctIndex values for remaining left items
                    slide.content.leftColumn.forEach((item, idx) => {
                        if (item.correctIndex >= index) {
                            item.correctIndex = Math.max(0, item.correctIndex - 1);
                        }
                    });

                    this.editor.saveToLocalStorage();
                    this.editor.loadSlideEditContent(this.editor.currentSlideId);
                } else {
                    Swal.fire('تنبيه', 'يجب أن يبقى عنصر واحد على الأقل في كل عمود.', 'warning');
                }
            }
            return;
        }


        // Delete drag match right item
        const deleteDragRightBtn = target.closest('[data-action="delete-drag-right"]');
        if (deleteDragRightBtn && this.editor.currentSlideId != null) {
            const index = parseInt(deleteDragRightBtn.dataset.index, 10);
            const slide = this.editor.getCurrentSlide();
            if (slide && slide.content.leftColumn && slide.content.rightColumn) {
                if (slide.content.leftColumn.length > 1 && slide.content.rightColumn.length > 1) {
                    // Delete from both columns at the same index
                    slide.content.leftColumn.splice(index, 1);
                    slide.content.rightColumn.splice(index, 1);

                    // Update correctIndex values for remaining left items
                    slide.content.leftColumn.forEach((item, idx) => {
                        if (item.correctIndex >= index) {
                            item.correctIndex = Math.max(0, item.correctIndex - 1);
                        }
                    });

                    this.editor.saveToLocalStorage();
                    this.editor.loadSlideEditContent(this.editor.currentSlideId);
                } else {
                    Swal.fire('تنبيه', 'يجب أن يبقى عنصر واحد على الأقل في كل عمود.', 'warning');
                }
            }
            return;
        }

        const deletePairsItemBtn = target.closest('[data-action="delete-pairs-item"]');
        if (deletePairsItemBtn && this.editor.currentSlideId != null) {
            const column = deletePairsItemBtn.dataset.column;
            const index = parseInt(deletePairsItemBtn.dataset.index, 10);
            const slide = this.editor.getCurrentSlide();

            if (slide.content[column === 'left' ? 'leftColumn' : 'rightColumn']) {
                const columnArray = slide.content[column === 'left' ? 'leftColumn' : 'rightColumn'];

                // CHECK IF THIS IS THE LAST CORRECT ANSWER
                const currentItem = columnArray[index];
                if (currentItem && currentItem.isCorrect) {
                    const allCorrectAnswers = [
                        ...(slide.content.leftColumn || []).filter(item => item.isCorrect),
                        ...(slide.content.rightColumn || []).filter(item => item.isCorrect)
                    ];

                    // If this is the only correct answer, prevent deletion
                    if (allCorrectAnswers.length <= 1) {
                        Swal.fire('تنبيه', 'لا يمكن حذف الإجابة الصحيحة الوحيدة. يجب أن تبقى إجابة صحيحة واحدة على الأقل.', 'warning');
                        return;
                    }
                }

                if (columnArray.length > 1) {
                    columnArray.splice(index, 1);
                    this.editor.saveToLocalStorage();
                    this.editor.loadSlideEditContent(this.editor.currentSlideId);
                } else {
                    Swal.fire('تنبيه', 'يجب أن تبقى عنصر واحد على الأقل في كل قائمة.', 'warning');
                }
            }
            return;
        }

        // Text series add button
        const addTextSeriesBtn = target.closest('[id^="add-text-series-"]');
        if (addTextSeriesBtn) {
            const sid = this.editor.currentSlideId;
            if (sid != null) this.editor.addTextSeriesItem(sid);
            return;
        }

        // Image series delete button
        const delImageSeriesBtn = target.closest('[data-action="delete-image-series"]');
        if (delImageSeriesBtn) {
            const idx = parseInt(delImageSeriesBtn.dataset.index, 10);
            if (!isNaN(idx) && this.editor.currentSlideId != null) {
                this.editor.deleteImageSeriesItem(this.editor.currentSlideId, idx);
            }
            return;
        }

        // Image series add button
        const addImageSeriesBtn = target.closest('[id^="add-image-series-"]');
        if (addImageSeriesBtn) {
            const sid = this.editor.currentSlideId;
            if (sid != null) this.editor.addImageSeriesItem(sid);
            return;
        }

        // Image collection section delete button
        const delImageCollectionBtn = target.closest('[data-action="delete-image-collection-section"]');
        if (delImageCollectionBtn) {
            const idx = parseInt(delImageCollectionBtn.dataset.index, 10);
            if (!isNaN(idx) && this.editor.currentSlideId != null) {
                this.editor.deleteImageCollectionSection(this.editor.currentSlideId, idx);
            }
            return;
        }

        // Image collection add button
        const addImageCollectionBtn = target.closest('[id^="add-image-collection-section-"]');
        if (addImageCollectionBtn) {
            const sid = this.editor.currentSlideId;
            if (sid != null) this.editor.addImageCollectionSection(sid);
            return;
        }

        // Image collection preview interactions
        const imageCollectionDetail = target.closest('[data-action="close-detail"]');
        if (imageCollectionDetail) {
            const slide = this.editor.getCurrentSlide();
            if (slide && slide.content._selectedSection !== undefined) {
                // Close detail view
                delete slide.content._selectedSection;
                this.editor.saveToLocalStorage();
                this.editor.loadSlidePreview(slide.id);
            }
            return;
        }

        const imageCollectionItem = target.closest('[data-action="open-detail"]');
        if (imageCollectionItem) {
            const index = parseInt(imageCollectionItem.dataset.index, 10);
            const slide = this.editor.getCurrentSlide();
            if (slide && !isNaN(index)) {
                // Open detail view
                slide.content._selectedSection = index;
                this.editor.saveToLocalStorage();
                this.editor.loadSlidePreview(slide.id);
            }
            return;
        }

        const addSlideBtn = target.closest('.add-slide-inside-lesson');
        if (addSlideBtn) {
            const lessonId = parseInt(addSlideBtn.dataset.lessonId, 10);
            if (!isNaN(lessonId)) this.editor.currentLessonId = lessonId;
            this.editor.showAddSlideModal();
            return;
        }

        // delete lesson (header trash button)
        const delLessonBtn = target.closest('.delete-lesson');
        if (delLessonBtn) {
            const lessonId = parseInt(delLessonBtn.dataset.lessonId, 10);
            if (isNaN(lessonId)) return;
            // prevent the header click from toggling the accordion
            e.stopPropagation();

            Swal.fire({
                title: 'هل أنت متأكد؟',
                text: "سيؤدي ذلك إلى حذف الدرس وجميع شرائحه نهائياً!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'نعم، احذف',
                cancelButtonText: 'إلغاء'
            }).then((result) => {
                if (result.isConfirmed) {
                    // delegate to slideManager to perform deletion safely
                    this.editor.slideManager.deleteLessonById(lessonId);
                    Swal.fire({
                        icon: 'success',
                        title: 'تم الحذف',
                        text: 'تم حذف الدرس بنجاح.',
                        timer: 1400,
                        showConfirmButton: false
                    });
                }
            });
            return;
        }


        // 🧩 Add category (hide button if 4 reached)
        if (target.id === 'add-category-btn') {
            const slide = this.editor.getCurrentSlide();
            if (!slide) return;

            slide.content.categories = slide.content.categories || [];

            // ✅ Stop adding beyond 4
            if (slide.content.categories.length >= 4) return;

            slide.content.categories.push('');
            this.editor.saveToLocalStorage();
            this.editor.loadSlideEditContent(slide.id);
            return;
        }

        // 🧩 Remove category (quiz-categorize)
        if (target.closest('.remove-category-btn')) {
            const btn = target.closest('.remove-category-btn');
            const slide = this.editor.getCurrentSlide();
            if (!slide || !slide.content) return;

            const index = parseInt(btn.dataset.index);
            if (isNaN(index)) return;

            slide.content.categories = slide.content.categories || [];

            // Remove the category safely
            if (index >= 0 && index < slide.content.categories.length) {
                slide.content.categories.splice(index, 1);
            }

            this.editor.saveToLocalStorage();
            this.editor.loadSlideEditContent(slide.id);
            return;
        }


        const quizBtn = target.closest('[id^="quiz-"][id$="-answers"] button');
        if (quizBtn) {
            const slideEl = quizBtn.closest('[id^="quiz-"][id$="-answers"]');
            const slideId = parseInt(slideEl.id.split('-')[1]);
            this.editor.setQuizUserChoice(slideId, parseInt(quizBtn.dataset.index));
            return;
        }

        const submitBtn = target.closest('[id^="quiz-"][id$="-submit"]');
        if (submitBtn) {
            const slideId = parseInt(submitBtn.id.split('-')[1]);
            this.editor.handleQuizSubmit(slideId);
            return;
        }

        // lesson header toggle & selection
        const lessonHeader = target.closest('.lesson-header');
        if (lessonHeader) {
            const lessonItem = lessonHeader.closest('.lesson-item');
            if (lessonItem) {
                const lessonId = parseInt(lessonItem.dataset.lessonId, 10);

                // Toggle expansion state
                this.editor.toggleLessonExpansion(lessonId);

                // Always re-render the sidebar to ensure consistent UI state
                this.editor.renderLessonsSidebar();

                if (!isNaN(lessonId) && lessonId !== this.editor.currentLessonId) {
                    this.editor.currentLessonId = lessonId;
                    this.editor.currentSlideId = null;
                    this.editor.updateLessonHeader();
                    if (this.editor.dom.slideEditContent) this.editor.dom.slideEditContent.innerHTML = this.editor.ui.getChooseSlidePlaceholder();
                    this.editor.renderSlidePreview(null);
                }
                return;
            }
        }

        // delete slide
        const delBtn = target.closest('.delete-slide');
        if (delBtn) {
            const slideId = parseInt(delBtn.dataset.slideId, 10);
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
                    this.editor.deleteSlideById(slideId);
                    Swal.fire('تم الحذف!', 'تم حذف الشريحة بنجاح.', 'success');
                }
            });
            return;
        }

        // edit slide
        const editBtn = target.closest('.edit-slide');
        if (editBtn) {
            const slideId = parseInt(editBtn.dataset.slideId, 10);
            const slideItemParent = editBtn.closest('.slide-item');
            if (slideItemParent) {
                const lessonId = parseInt(slideItemParent.dataset.lessonId, 10);
                if (!isNaN(lessonId)) this.editor.currentLessonId = lessonId;
            }
            this.editor.currentSlideId = slideId;
            this.editor.loadSlideEditContent(slideId);

            const leftSidebar = document.querySelector('.edit-sidebar');
            if (leftSidebar) {
                leftSidebar.classList.remove('-translate-x-full', 'opacity-0', 'pointer-events-none');
                this.editor.saveSidebarStateForLesson(this.editor.currentLessonId, 'left', false);
            }
            return;
        }

        // select slide item
        const slideItem = target.closest('.slide-item');
        if (slideItem) {
            const slideId = parseInt(slideItem.dataset.slideId, 10);
            const lessonId = parseInt(slideItem.dataset.lessonId, 10) || this.editor.currentLessonId;
            if (!isNaN(lessonId) && lessonId !== this.editor.currentLessonId) {
                this.editor.currentLessonId = lessonId;
                this.editor.renderLessonsSidebar();
                this.editor.updateLessonHeader();
            }
            document.querySelectorAll('.slide-item').forEach(it => it.classList.remove('active'));
            slideItem.classList.add('active');

            this.editor.currentSlideId = slideId;
            this.editor.loadSlideEditContent(slideId);
            return;
        }

        // bullets
        const addBulletBtn = target.closest('[id^="add-bullet-"]');
        if (addBulletBtn) {
            const sid = this.editor.currentSlideId;
            if (sid != null) this.editor.addBulletedListItem(sid);
            return;
        }
        const delBulletBtn = target.closest('[data-action="delete-bullet"]');
        if (delBulletBtn) {
            const idx = parseInt(delBulletBtn.dataset.index, 10);
            if (!isNaN(idx) && this.editor.currentSlideId != null) this.editor.deleteBulletedListItem(this.editor.currentSlideId, idx);
            return;
        }

        // expandable
        const addExpBtn = target.closest('[id^="add-expandable-"]');
        if (addExpBtn) {
            if (this.editor.currentSlideId != null) this.editor.addExpandableListItem(this.editor.currentSlideId);
            return;
        }
        const delExpBtn = target.closest('[data-action="delete-expandable"]');
        if (delExpBtn) {
            const idx = parseInt(delExpBtn.dataset.index, 10);
            if (!isNaN(idx) && this.editor.currentSlideId != null) this.editor.deleteExpandableListItem(this.editor.currentSlideId, idx);
            return;
        }

        // expandable preview toggle
        // ✅ Expandable list preview toggle (one open at a time, perfectly smooth)
        const expandableItem = target.closest('.expandable-item');
        if (expandableItem) {
            const listContainer = expandableItem.parentElement;
            const content = expandableItem.querySelector('.expandable-content');
            const icon = expandableItem.querySelector('.fa-chevron-down');

            // Smooth toggle helper
            const toggleSection = (el, expand) => {
                el.style.overflow = 'hidden';
                el.style.transition = 'max-height 0.4s ease, opacity 0.4s ease';
                if (expand) {
                    el.style.display = 'block';
                    requestAnimationFrame(() => {
                        el.style.maxHeight = el.scrollHeight + 'px';
                        el.style.opacity = '1';
                    });
                } else {
                    el.style.maxHeight = el.scrollHeight + 'px'; // set current height first
                    requestAnimationFrame(() => {
                        el.style.maxHeight = '0';
                        el.style.opacity = '0';
                    });
                    // hide completely after transition ends
                    setTimeout(() => {
                        el.style.display = 'none';
                    }, 400);
                }
            };

            // Collapse all others smoothly
            listContainer.querySelectorAll('.expandable-item').forEach((item) => {
                if (item !== expandableItem) {
                    const otherContent = item.querySelector('.expandable-content');
                    const otherIcon = item.querySelector('.fa-chevron-down');
                    if (otherContent && otherContent.style.display !== 'none') {
                        toggleSection(otherContent, false);
                        if (otherIcon) otherIcon.classList.remove('rotate-180');
                    }
                }
            });

            // Toggle current
            if (content) {
                const isCollapsed = content.style.display === 'none' || !content.style.display;
                toggleSection(content, isCollapsed);
                if (icon) icon.classList.toggle('rotate-180', isCollapsed);
            }
            return;
        }

    }
}

////////////////////////////////////////////////////
// QuizManager - Common quiz functionality
////////////////////////////////////////////////////
class QuizManager {
    constructor(editor) {
        this.editor = editor;
    }

    // Common quiz validation
    validateQuizContent(slide) {
        const c = slide.content || {};

        // Basic validation that applies to all quiz types
        if (!c.question || c.question.trim() === '') {
            return { isValid: false, message: 'يجب إدخال سؤال للاختبار' };
        }

        // Type-specific validation
        switch (slide.subtype) {
            case 'multiple-choice-carousel':
                if (!c.answers || c.answers.length < 2) {
                    return { isValid: false, message: 'يجب إدخال على الأقل إجابتين' };
                }
                if (c.correct === undefined || c.correct === null) {
                    return { isValid: false, message: 'يجب تحديد الإجابة الصحيحة' };
                }
                break;

            case 'categorize':
                if (!c.categories || c.categories.length < 2) {
                    return { isValid: false, message: 'يجب إدخال على الأقل تصنيفين' };
                }
                if (c.correct === undefined || c.correct === null) {
                    return { isValid: false, message: 'يجب تحديد التصنيف الصحيح' };
                }
                break;
            case 'connect-quiz':
                if (!c.leftColumn || !c.rightColumn || c.leftColumn.length === 0 || c.rightColumn.length === 0) {
                    return { isValid: false, message: 'يجب إدخال عناصر في كلا العمودين' };
                }
                break;
            case 'drag-match-quiz':
                if (!c.leftColumn || !c.rightColumn || c.leftColumn.length === 0 || c.rightColumn.length === 0) {
                    return { isValid: false, message: 'يجب إدخال عناصر في كلا العمودين' };
                }
                break;
            case 'image-pairs-quiz':
                if (!c.leftColumn || !c.rightColumn || c.leftColumn.length === 0 || c.rightColumn.length === 0) {
                    return { isValid: false, message: 'يجب إدخال عناصر في كلا العمودين' };
                }

                // ADD VALIDATION: At least one correct answer must exist
                const hasLeftCorrect = c.leftColumn.some(item => item.isCorrect);
                const hasRightCorrect = c.rightColumn.some(item => item.isCorrect);
                if (!hasLeftCorrect && !hasRightCorrect) {
                    return { isValid: false, message: 'يجب اختيار إجابة صحيحة واحدة على الأقل من أحد العمودين' };
                }

                break;
        }

        return { isValid: true };
    }

    // Common submit handler
    handleQuizSubmit(slideId, containerId = null) {
        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide || slide.submitted) return;

        // Validate before submission
        const validation = this.validateQuizContent(slide);
        if (!validation.isValid) {
            Swal.fire('تنبيه', validation.message, 'warning');
            return;
        }

        slide.submitted = true;
        this.editor.saveToLocalStorage();
        this.editor.loadSlidePreview(slideId);

        // Show feedback animation
        this.showQuizFeedback(slide, containerId);
    }

    // Common feedback display
    showQuizFeedback(slide, containerId = null) {
        setTimeout(() => {
            // Try to find feedback element using containerId first, then fall back to slide id
            let feedbackEl = null;
            if (containerId) {
                feedbackEl = document.querySelector(`#${containerId} .quiz-feedback-icon`);
            }
            if (!feedbackEl) {
                feedbackEl = document.getElementById(`quiz-${slide.id}-feedback`);
            }

            const isCorrect = this.isAnswerCorrect(slide);

            if (feedbackEl) {
                const smoothPaths = ['smooth-curve', 'figure-eight', 'gentle-wave'];
                const randomPath = smoothPaths[Math.floor(Math.random() * smoothPaths.length)];

                feedbackEl.innerHTML = isCorrect
                    ? '<i class="fas fa-check-circle"></i>'
                    : '<i class="fas fa-times-circle"></i>';

                feedbackEl.className = `quiz-feedback-icon ${isCorrect ? 'correct' : 'incorrect'} animate-${randomPath}`;
            }
        }, 100);
    }

    // Common answer correctness check
    isAnswerCorrect(slide) {
        const c = slide.content || {};

        switch (slide.subtype) {
            case 'multiple-choice-carousel':
                return slide.userChoice === (c.correct - 1); // Convert to 0-indexed

            case 'categorize':
                return slide.userChoice === c.correct;
            case 'connect-quiz':
                // Check if all connections are correct
                const userConnections = slide.userConnections || [];
                return userConnections.every(conn => {
                    const leftItem = c.leftColumn[conn.leftIndex];
                    const rightItem = c.rightColumn[conn.rightIndex];
                    return leftItem && rightItem && leftItem.correctIndex === conn.rightIndex;
                });
            case 'drag-match-quiz':
                // Check if all drag matches are correct
                const userMatches = slide.userMatches || [];
                return userMatches.every(match => {
                    const leftItem = c.leftColumn[match.leftIndex];
                    const rightItem = c.rightColumn[match.rightIndex];
                    return leftItem && rightItem && leftItem.correctIndex === match.rightIndex;
                });
            case 'image-pairs-quiz':
                // Check if all selected items are correct and all correct items are selected
                const userSelections = slide.userSelections || { left: [], right: [] };
                const allLeftCorrect = c.leftColumn.every((item, index) =>
                    item.isCorrect === userSelections.left.includes(index)
                );
                const allRightCorrect = c.rightColumn.every((item, index) =>
                    item.isCorrect === userSelections.right.includes(index)
                );
                return allLeftCorrect && allRightCorrect;

            default:
                return false;
        }
    }

    // Common reset functionality
    resetQuiz(slideId) {
        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide) return;

        slide.userChoice = null;
        slide.submitted = false;
        this.editor.saveToLocalStorage();
        this.editor.loadSlidePreview(slideId);
    }

    // Common user choice setter
    setUserChoice(slideId, choice) {
        const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
        if (!slide || slide.submitted) return;

        slide.userChoice = choice;
        this.editor.saveToLocalStorage();
        this.editor.loadSlidePreview(slideId);
    }

    // Check if submit button should be shown
    shouldShowSubmitButton(slide) {
        if (slide.submitted) return false;

        switch (slide.subtype) {
            case 'multiple-choice-carousel':
                return slide.userChoice !== null && slide.userChoice !== undefined;

            case 'categorize':
                return slide.userChoice !== null && slide.userChoice !== undefined;
            case 'connect-quiz':
                const userConnections = slide.userConnections || [];
                return userConnections.length === (slide.content?.leftColumn?.length || 0);
            case 'drag-match-quiz':
                const userMatches = slide.userMatches || [];
                const leftColumnLength = slide.content?.leftColumn?.length || 0;
                return leftColumnLength > 0 && userMatches.length === leftColumnLength;
            case 'image-pairs-quiz':
                const userSelections = slide.userSelections || { left: [], right: [] };
                return userSelections.left.length > 0 || userSelections.right.length > 0;

            default:
                return false;
        }
    }
}

////////////////////////////////////////////////////
// CourseEditor — orchestrator
////////////////////////////////////////////////////
export default class CourseEditor {
    constructor(options = {}) {
        // state
        this.lessons = [];
        this.currentLessonId = null;
        this.currentSlideId = null;
        this.expandedLessons = new Set(); // Track expanded lesson IDs

        // dom refs
        this.dom = {
            lessonsList: document.getElementById('lessons-list'),
            currentLessonTitle: document.getElementById('current-lesson-title'),
            currentLessonCode: document.getElementById('current-lesson-code'),
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
        this.ensureInitialState();
        // If current lesson exists, expand it by default
        if (this.currentLessonId) {
            this.expandedLessons.add(this.currentLessonId);
        }

        // Render initial UI
        this.setupSidebarToggles();
        this.renderLessonsSidebar();
        this.updateLessonHeader();

        // interactions & drag system
        this.quizManager = new QuizManager(this);
        this.interactions = new UIInteractions(this);
        this.dragManager = new DragDropManager(this);

        // mobile rendering
        this.renderMobileSlidesBar();

        // run smoke tests
        this.runSmokeTests();
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
        const newCode = document.getElementById('lesson-code-input').value.trim();
        const currentLesson = this.findLessonById(this.currentLessonId);
        if (!currentLesson) return;
        if (newTitle) currentLesson.title = newTitle;
        currentLesson.code = newCode;
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
        if (this.dom.currentLessonCode) this.dom.currentLessonCode.textContent = `(الكود: ${curr.code})`;
    }

    // expose some UI methods used by UIInteractions
    getSlideTypeText(type) {
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
                newWidth = Math.max(250, Math.min(viewportWidth * 0.4, startWidth + deltaX));
                leftSidebar.style.width = newWidth + 'px';
            } else if (targetSide === 'right') {
                newWidth = Math.max(200, Math.min(viewportWidth * 0.3, startWidth - deltaX));
                rightSidebar.style.width = newWidth + 'px';
            }
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.style.marginLeft = leftSidebar ? getComputedStyle(leftSidebar).width : '0px';
                mainContent.style.marginRight = rightSidebar ? getComputedStyle(rightSidebar).width : '0px';
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

                // Clean up indicators before processing drop
                this.cleanupDropIndicators();

                const all = Array.from(lessonsContainer.querySelectorAll('.lesson-item'));
                const targetIndex = all.indexOf(lessonEl);
                lessonsContainer.removeChild(draggingLessonEl);
                const children = Array.from(lessonsContainer.children);
                if (targetIndex >= children.length) {
                    lessonsContainer.appendChild(draggingLessonEl);
                } else {
                    lessonsContainer.insertBefore(draggingLessonEl, children[targetIndex]);
                }
                this.saveLessonOrderFromDOM();
                this.renderLessonsSidebar();
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

                    // remove from source
                    const srcLesson = this.findLessonById(draggedFromLessonId);
                    const srcIndex = srcLesson ? srcLesson.slides.findIndex(s => s.id === draggedSlideId) : -1;
                    let draggedSlideObj = null;
                    if (srcLesson && srcIndex > -1) {
                        draggedSlideObj = srcLesson.slides.splice(srcIndex, 1)[0];
                    } else if (draggingSlideEl) {
                        for (const l of this.lessons) {
                            const idx = l.slides.findIndex(s => s.id === draggedSlideId);
                            if (idx > -1) {
                                draggedSlideObj = l.slides.splice(idx, 1)[0];
                                break;
                            }
                        }
                    }
                    if (!draggedSlideObj) return;

                    const targetLesson = this.findLessonById(targetLessonId);
                    if (!targetLesson) return;
                    const insertionIndex = Math.max(0, targetLesson.slides.findIndex(s => s.id === targetSlideId) + 1);
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
            console.group('%cSMOKE TESTS', 'color:#1e90ff; font-weight:bold;');
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
            if (tempLesson.slides.length === 0) {
                console.log('⚠️ اختبار حذف آخر سلايد: تأكد أن deleteSlideById لا يترك الدرس بلا سلايدات (يوجد حماية).');
            }

            if (!errors.length) {
                console.log('%c✔︎ جميع اختبارات smoke مرت بنجاح', 'color:green;font-weight:bold;');
            } else {
                console.warn('%c❌ بعض اختبارات smoke فشلت:', 'color:orange;font-weight:bold;');
                errors.forEach(err => console.warn(' -', err));
            }
            console.groupEnd();
        } catch (err) {
            console.error('خطأ أثناء تشغيل اختبارات smoke', err);
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
}

// auto-init in browser and keep backward-compatibility on window
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        try {
            const editor = new CourseEditor();
            window.courseEditor = editor;
        } catch (err) {
            console.error('Failed to initialize CourseEditor', err);
        }

    });
}
