
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

            default:
                if (slide.content.text) {
                    bodyHtml += `<div class="prose max-w-none text-base text-white mt-3 max-h-96 overflow-y-auto break-words hyphens-auto">${Utils.escapeHTML(slide.content.text).replace(/\n/g, '<br>')}</div>`;
                } else {
                    bodyHtml += `<div class="text-center text-gray-200 py-12">لا توجد واجهة معاينة مخصصة لهذا النوع بعد.</div>`;
                }
        }

        previewContent.innerHTML = `
            <div class="slide-content w-full h-full overflow-y-auto break-words hyphens-auto">
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
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                    <div class="fallback-placeholder hidden text-center text-white/70 py-8">
                        <i class="fas fa-image text-4xl mb-3 opacity-50"></i>
                        <p>تعذر تحميل الصورة</p>
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
        const gapHeight = 0.75; // Reduced from 1rem to 0.75rem
        const totalGapsHeight = (sectionsCount - 1) * gapHeight;
        const extraPadding = 2; // 2rem extra space at top and bottom
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
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div class="fallback-placeholder hidden h-full w-full items-center justify-center text-white/70 bg-black/10 rounded-lg">
                    <i class="fas fa-image text-xl mb-1 opacity-50"></i>
                    <p class="text-xs">تعذر تحميل الصورة</p>
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
                        <div class="mt-2 p-2 bg-gray-100 rounded-lg">
                            <img src="${Utils.escapeHTML(section.imageUrl)}" alt="معاينة" 
                                 class="max-h-32 mx-auto rounded" onerror="this.style.display='none'" />
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

        return `
        <div class="mt-4 relative overflow-visible w-full">
            <h2 class="text-lg font-bold text-center mb-3 text-white break-words hyphens-auto">${Utils.escapeHTML(question)}</h2>
            <div class="space-y-2 max-w-md mx-auto max-h-[80vh] overflow-y-auto" id="quiz-${slide.id}-answers">                ${answersHTML}
            </div>
            ${submitted ? "" : `
                <div class="text-center mt-4">
                    <button class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition" id="quiz-${slide.id}-submit">تأكيد</button>
                </div>`}
            <div id="quiz-${slide.id}-icon" class="absolute top-0 right-0 text-4xl opacity-0 transition-transform duration-700 ease-out"></div>
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

        // 🧱 Build draggable question box (styled + padded)
        const draggableHtml = `
        <div id="${containerId}-question"
             draggable="${!submitted}"
             class="quiz-draggable bg-white/80 text-gray-900 font-bold text-lg rounded-xl px-6 py-4 shadow-md cursor-move 
                    transition select-none mb-6 max-w-xs text-center"
             ondragstart="window.handleCategorizeDrag(event, '${containerId}')">
            ${Utils.escapeHTML(question)}
        </div>`;

        // ⚙️ Submit button appears only if question already dropped
        const showSubmit = (chosen !== null && !submitted);

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

        <div id="quiz-${slide.id}-icon" 
             class="absolute top-0 right-0 text-4xl opacity-0 transition-transform duration-700 ease-out pointer-events-none"></div>
    </div>`;
    }

    renderUniversalComparison(slide, type = 'text') {
        const c = slide.content || {};
        const id = `comparison-${slide.id}`;

        // Build content per type
        const leftHtml = (type === 'image')
            ? (c.imageA
                ? `<img src="${Utils.escapeHTML(c.imageA)}" alt="الصورة الأولى" class="w-full h-full object-contain rounded-lg">`
                : `<div class="text-white/70 text-center py-8">الصورة الأولى غير محددة</div>`)
            : `<div class="text-white text-center p-6 break-words hyphens-auto h-full overflow-y-auto"><h3 class="text-xl font-bold mb-3 break-words">${Utils.escapeHTML(c.leftTitle || 'الجانب الأيسر')}</h3><p class="text-base break-words hyphens-auto leading-relaxed">${Utils.escapeHTML(c.leftText || '')}</p></div>`;

        const rightHtml = (type === 'image')
            ? (c.imageB
                ? `<img src="${Utils.escapeHTML(c.imageB)}" alt="الصورة الثانية" class="w-full h-full object-contain rounded-lg">`
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
                    <div class="mt-2 p-2 bg-gray-100 rounded-lg">
                        <img src="${Utils.escapeHTML(item.imageUrl)}" alt="معاينة" class="max-h-32 mx-auto rounded" onerror="this.style.display='none'" />
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
                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuS8muS4gOWbvueUteWtkDwvdGV4dD48L3N2Zz4='; this.alt='تعذر تحميل الصورة';" />
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
    if (questionEl) questionEl.classList.add('opacity-50', 'scale-95');
};

window.handleCategorizeDrop = (e, containerId, dropIndex) => {
    e.preventDefault();
    const questionEl = document.getElementById(`${containerId}-question`);
    const container = document.getElementById(containerId);
    if (!container || !questionEl) return;

    // Reset drag visual
    questionEl.classList.remove('opacity-50', 'scale-95');

    // Append into zone if empty
    const zone = container.querySelector(`.quiz-category-zone[data-index="${dropIndex}"]`);
    if (zone && !zone.querySelector('.quiz-draggable')) {
        zone.appendChild(questionEl);
    }

    // Style dropped question
    questionEl.classList.remove('bg-white/80', 'text-gray-900');
    questionEl.classList.add('bg-blue-500/70', 'text-white', 'shadow-lg', 'scale-100', 'transition-all');

    // Save choice as a number (defensive)
    const editor = window.courseEditor || window.editor;
    if (editor && typeof editor.getCurrentSlide === 'function') {
        const slide = editor.getCurrentSlide();
        if (slide) {
            slide.userChoice = Number(dropIndex);       // <- ensure numeric
            slide.submitted = false;
            editor.slideManager.saveToLocalStorage();

            // If you prefer to re-render via the UIRenderer you can, but we keep it local:
            // editor.ui.renderSlidePreviewContent && editor.ui.renderSlidePreviewContent(slide);
        }
    }

    let btn = container.querySelector(`#${containerId}-submit`);
    if (!btn) {
        btn = document.createElement('button');
        btn.id = `${containerId}-submit`;   // ✅ correct ID
        btn.textContent = 'إرسال الإجابة';
        btn.className =
            'bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition mt-3';
        btn.style.display = 'block';
        btn.style.margin = '1rem auto 0 auto';
        btn.addEventListener('click', () => {
            if (window.handleQuizCategorizeSubmit) {
                window.handleQuizCategorizeSubmit(containerId);
            }
        });
        container.appendChild(btn);
    }
};


window.handleQuizCategorizeSubmit = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const editor = window.courseEditor || window.editor;
    if (!editor || typeof editor.getCurrentSlide !== 'function') return;
    const slide = editor.getCurrentSlide();
    if (!slide || !slide.content) return;

    const c = slide.content;
    const correctRaw = c.correct;
    const categories = Array.isArray(c.categories) ? c.categories : [];
    const chosenRaw = slide.userChoice;

    // Normalize chosen to number or null
    const chosen = (chosenRaw === null || typeof chosenRaw === 'undefined')
        ? null
        : Number(chosenRaw);

    // Normalize correct to an index (number) if possible
    let correctIndex = null;
    if (typeof correctRaw === 'number') {
        correctIndex = correctRaw;
    } else if (typeof correctRaw === 'string') {
        // try numeric string first
        const n = Number(correctRaw);
        if (!Number.isNaN(n)) correctIndex = n;
        else {
            // fallback: if correctRaw is a category name, find its index
            correctIndex = categories.findIndex(cat => {
                if (!cat) return false;
                return String(cat).trim() === String(correctRaw).trim();
            });
            if (correctIndex === -1) correctIndex = null;
        }
    } else {
        // default fallback
        correctIndex = 0;
    }

    // Debugging log (remove in production)
    console.debug('Categorize submit:', { chosenRaw, chosen, correctRaw, correctIndex, categories });

    if (chosen === null || typeof chosen === 'number' && Number.isNaN(chosen)) {
        // nothing chosen — no-op (or show message)
        console.warn('No choice selected for categorize quiz.');
        return;
    }

    const questionEl = document.getElementById(`${containerId}-question`);
    const dropZones = container.querySelectorAll('.quiz-category-zone');

    // Safety: ensure correctIndex is a valid numeric index
    if (correctIndex === null || correctIndex < 0 || correctIndex >= categories.length) {
        console.warn('Correct index is invalid; defaulting to 0.');
        correctIndex = 0;
    }

    // Decide correct/incorrect
    const isCorrect = Number(chosen) === Number(correctIndex);

    if (isCorrect) {
        // correct: green question + green zone
        if (questionEl) {
            questionEl.classList.remove('bg-blue-500/70');
            questionEl.classList.add('bg-green-500/70');
        }
        dropZones.forEach((zone, i) => {
            if (i === chosen) {
                zone.classList.remove('bg-white/10', 'border-gray-300');
                zone.classList.add('bg-green-500/30', 'border-green-500');
            } else {
                // dim others
                zone.classList.add('opacity-50');
            }
        });
    } else {
        // incorrect: red question, highlight correct with green
        if (questionEl) {
            questionEl.classList.remove('bg-blue-500/70');
            questionEl.classList.add('bg-red-500/70');
        }
        dropZones.forEach((zone, i) => {
            zone.classList.remove('bg-white/10', 'border-gray-300');
            if (i === correctIndex) {
                zone.classList.add('bg-green-500/30', 'border-green-500');
            } else if (i === chosen) {
                zone.classList.add('bg-red-500/30', 'border-red-500');
            } else {
                zone.classList.add('opacity-50');
            }
        });
    }

    // disable drag
    if (questionEl) {
        questionEl.setAttribute('draggable', 'false');
        questionEl.style.cursor = 'default';
    }

    // Save submitted state and persist
    slide.submitted = true;
    slide.userChoice = Number(chosen);
    editor.slideManager.saveToLocalStorage();

    // Remove/hide the submit button
    const btn = container.querySelector(`#quiz-${containerId}-submit`);
    if (btn) btn.remove();

    // Optional feedback icon behavior (similar to existing carousel)
    const iconContainer = container.querySelector(`#quiz-${slide.id}-icon`);
    if (iconContainer) {
        iconContainer.innerHTML = isCorrect
            ? '<i class="fas fa-check-circle text-green-400"></i>'
            : '<i class="fas fa-times-circle text-red-400"></i>';
        iconContainer.style.opacity = '1';
        iconContainer.classList.add('quiz-icon-animate');
        setTimeout(() => {
            iconContainer.style.opacity = '0';
            iconContainer.classList.remove('quiz-icon-animate');
        }, 1500);
    }
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


        // quiz  multiple choice 
        const quizBtn = target.closest('[id^="quiz-"][id$="-answers"] button');
        if (quizBtn) {
            const slideEl = quizBtn.closest('[id^="quiz-"][id$="-answers"]');
            const slideId = parseInt(slideEl.id.split('-')[1]);
            const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
            if (!slide || !slide.submitted) {
                slide.userChoice = parseInt(quizBtn.dataset.index);
                this.editor.saveToLocalStorage();
                this.editor.loadSlidePreview(slideId);
            }
            return;
        }

        // quiz submit
        const submitBtn = target.closest('[id^="quiz-"][id$="-submit"]');
        if (submitBtn) {
            const slideId = parseInt(submitBtn.id.split('-')[1]);
            const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
            if (!slide || slide.submitted) return;

            slide.submitted = true;
            this.editor.saveToLocalStorage();
            this.editor.loadSlidePreview(slideId);

            setTimeout(() => {
                const iconEl = document.getElementById(`quiz-${slideId}-icon`);
                const correct = (slide.userChoice === (slide.content.correct - 1));
                if (iconEl) {
                    // Set icon type and color
                    iconEl.innerHTML = correct
                        ? `<i class="fas fa-star text-yellow-400"></i>`
                        : `<i class="fas fa-times-circle text-red-500"></i>`;

                    // ✅ Trigger the new fly-over animation
                    iconEl.classList.remove("quiz-icon-animate"); // reset if it played before
                    void iconEl.offsetWidth; // reflow to restart animation cleanly
                    iconEl.classList.add("quiz-icon-animate");
                }
            }, 300);


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
                { subtype: 'categorize', title: 'اختبار تصنيفي', description: 'صنف العبارة التالية', icon: 'fa-layer-group' }
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
