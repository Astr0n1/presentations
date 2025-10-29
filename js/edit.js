
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
                        content: { title: 'مرحباً بكم!', subtitle: 'نظام التحكم الآلي', buttonText: 'ابدأ التعلم' }
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
            return { title: 'محتوى', subtitle: '', text: 'أدخل المحتوى هنا...' };
        }
        if (type === 'video' && subtype === 'video') {
            return { title: 'فيديو جديد', subtitle: '', videoUrl: '', duration: '', description: '' };
        }
        if (type === 'image' && subtype === 'comparison') {
            return { title: 'مقارنة صور', subtitle: '', imageA: '', imageB: '' };
        }
        if (type === 'title') {
            return { title: 'عنوان', subtitle: '', buttonText: 'ابدأ' };
        }
        return { title: 'شريحة جديدة', subtitle: '' };
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
                bodyHtml += `<ul class="space-y-2 mt-2">`;
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

            case 'video-video':
                bodyHtml += this.renderVideoPreview(slide);
                break;

            case 'title-undefined':
                bodyHtml += `<div class="mt-8 text-center">
                                <button class="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg px-6 py-2">
                                    ${Utils.escapeHTML(slide.content.buttonText || 'البدء')}
                                </button>
                            </div>`;
                break;

            case 'image-comparison':
                bodyHtml += this.renderUniversalComparison(slide, 'image');
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
                    bodyHtml += `<div class="prose max-w-none text-base text-white mt-3">${Utils.escapeHTML(slide.content.text).replace(/\n/g, '<br>')}</div>`;
                } else {
                    bodyHtml += `<div class="text-center text-gray-200 py-12">لا توجد واجهة معاينة مخصصة لهذا النوع بعد.</div>`;
                }
        }

        previewContent.innerHTML = `
            <div class="slide-content">
                ${headerHtml + bodyHtml}
            </div>
        `;
        const preview = document.getElementById("slide-preview-container");
        if (preview) preview.classList.add("fixed-slide-size");
    }

    renderExpandableListPreview(slide) {
        const items = slide.content.items || [];
        let html = `<div class="space-y-3 mt-3 w-full">`;

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

            let classes = "quiz-option w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition ";
            if (submitted) {
                if (isCorrect) classes += "border-green-500 bg-green-600/30 text-white";
                else if (isWrong) classes += "border-red-500 bg-red-600/30 text-white";
                else classes += "border-gray-300 bg-white/10 text-gray-300";
            } else {
                classes += isChosen
                    ? "border-blue-500 quiz-option-selected text-white"
                    : "border-gray-300 bg-white/10 text-white hover:bg-white/20";
            }

            const mark = submitted && isCorrect ? `<i class='fas fa-check ml-2 text-green-400'></i>` : "";
            return `
            <button data-index="${i}" class="${classes}">
                <span class="w-5 h-5 flex items-center justify-center border border-gray-400 rounded-full">
                    ${isChosen ? `<span class='w-3 h-3 bg-blue-500 rounded-full'></span>` : ""}
                </span>
                <span class="flex-1 text-right">${i + 1}. ${Utils.escapeHTML(a || '—')}</span>
                ${mark}
            </button>
        `;
        }).join('');

        return `
        <div class="mt-4 relative overflow-visible w-full">
            <h2 class="text-lg font-bold text-center mb-3 text-white">${Utils.escapeHTML(question)}</h2>
            <div class="space-y-2 max-w-md mx-auto" id="quiz-${slide.id}-answers">
                ${answersHTML}
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
        const categories = c.answers || [];
        const question = c.question || 'ضع العنصر في التصنيف الصحيح';
        const correctIndex = (c.correct ?? 1) - 1;

        const categoriesHTML = categories.map((cat, i) => `
        <div 
            data-index="${i}" 
            id="quiz-${slide.id}-cat-${i}" 
            class="category-dropzone border-2 border-dashed border-gray-300 rounded-xl py-8 flex items-center justify-center text-white text-lg font-medium transition">
            ${Utils.escapeHTML(cat || '—')}
        </div>
    `).join('');

        setTimeout(() => {
            const dragEl = document.getElementById(`quiz-${slide.id}-draggable`);
            const zones = document.querySelectorAll(`[id^="quiz-${slide.id}-cat-"]`);
            if (dragEl) dragEl.draggable = true;
            let placedZone = null;

            dragEl?.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', slide.id);
                setTimeout(() => dragEl.classList.add('opacity-50'), 0);
            });
            dragEl?.addEventListener('dragend', () => {
                dragEl.classList.remove('opacity-50');
            });

            zones.forEach(zone => {
                zone.addEventListener('dragover', e => e.preventDefault());
                zone.addEventListener('drop', e => {
                    e.preventDefault();
                    if (placedZone) placedZone.innerHTML = Utils.escapeHTML(placedZone.dataset.label);
                    placedZone = zone;
                    zone.appendChild(dragEl);
                });
            });
        }, 100);

        return `
        <div class="quiz-categorize-container mt-4 relative overflow-visible w-full">
            <h2 class="text-lg font-bold text-center mb-6 text-white">${Utils.escapeHTML(question)}</h2>
            <div id="quiz-${slide.id}-draggable" class="draggable-item mx-auto bg-blue-600/80 text-white font-semibold px-6 py-3 rounded-lg shadow-md cursor-grab select-none w-fit active:cursor-grabbing">
                ${Utils.escapeHTML(question)}
            </div>
            <div class="categories-grid grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 max-w-xl mx-auto">
                ${categoriesHTML}
            </div>
            <div class="text-center mt-6">
                <button id="quiz-${slide.id}-submit" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition">تأكيد</button>
            </div>
            <div id="quiz-${slide.id}-icon" class="absolute top-0 right-0 text-4xl opacity-0 transition-transform duration-700 ease-out pointer-events-none"></div>
        </div>
    `;
    }


    renderUniversalComparison(slide, type = 'text') {
        const c = slide.content || {};
        const id = `comparison-${slide.id}`;

        // Build content per type
        const leftHtml = (type === 'image')
            ? (c.imageA
                ? `<img src="${Utils.escapeHTML(c.imageA)}" alt="الصورة الأولى" class="w-full h-full object-contain rounded-lg">`
                : `<div class="text-white/70 text-center py-8">الصورة الأولى غير محددة</div>`)
            : `<div class="text-white text-center p-6"><h3 class="text-xl font-bold mb-3">${Utils.escapeHTML(c.leftTitle || 'الجانب الأيسر')}</h3><p class="text-base">${Utils.escapeHTML(c.leftText || '')}</p></div>`;

        const rightHtml = (type === 'image')
            ? (c.imageB
                ? `<img src="${Utils.escapeHTML(c.imageB)}" alt="الصورة الثانية" class="w-full h-full object-contain rounded-lg">`
                : `<div class="text-white/70 text-center py-8">الصورة الثانية غير محددة</div>`)
            : `<div class="text-white text-center p-6"><h3 class="text-xl font-bold mb-3">${Utils.escapeHTML(c.rightTitle || 'الجانب الأيمن')}</h3><p class="text-base">${Utils.escapeHTML(c.rightText || '')}</p></div>`;

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
                <button id="add-bullet-${slide.id}" class="w-full flex items-center justify-center space-x-2 space-x-reverse bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-150 mt-2">
                    <i class="fas fa-plus"></i>
                    <span>أضف نقطة جديدة</span>
                </button>
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
                <button id="add-expandable-${slide.id}" class="w-full flex items-center justify-center space-x-2 space-x-reverse bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition duration-150 mt-2">
                    <i class="fas fa-plus"></i>
                    <span>أضف عنصراً قابلاً للتوسيع</span>
                </button>
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
                <ul id="quiz-answers" class="space-y-2">
                    ${answers.map((a, i) => `
                        <li class="flex items-center gap-2">
                            <span class="w-6 text-gray-500 text-center">${i + 1}.</span>
                            <input type="text" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg quiz-answer-input" data-index="${i}" value="${Utils.escapeHTML(a)}" placeholder="الإجابة ${i + 1}" />
                            <button class="text-red-500 hover:text-red-700 remove-answer" data-index="${i}"><i class="fas fa-trash"></i></button>
                        </li>
                    `).join('')}
                </ul>
                <button id="add-answer" class="mt-2 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"><i class="fas fa-plus mr-1"></i> إضافة إجابة</button>
            </div>

            <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">رقم الإجابة الصحيحة</label>
                <input type="number" id="quiz-correct" min="1" max="${answers.length || 1}" value="${correct}" class="w-24 px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
        </div>
    `;
        return html;
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
            const lessonEl = document.createElement('div');
            lessonEl.className = `lesson-item bg-white border border-gray-200 rounded-lg overflow-hidden ${isCurrent ? 'lesson-expanded' : ''}`;
            lessonEl.dataset.lessonId = lesson.id;
            lessonEl.draggable = true;

            const slidesCount = (lesson.slides && lesson.slides.length) || 0;

            const inner = document.createElement('div');
            inner.innerHTML = `
                <div class="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 lesson-header">
                    <div class="flex-1">
                        <h4 class="font-medium text-gray-900">${Utils.escapeHTML(lesson.title)}</h4>
                        <p class="text-sm text-gray-500 mt-1">${slidesCount} سلايد</p>
                    </div>
                    <div class="flex items-center space-x-2 space-x-reverse">
                        <button class="add-slide-to-lesson p-2 text-gray-400 hover:text-green-600" data-lesson-id="${lesson.id}">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="expand-lesson p-2 text-gray-400 hover:text-blue-600">
                            <i class="fas fa-chevron-down ${isCurrent ? 'rotate-180' : ''} transition-transform"></i>
                        </button>
                    </div>
                </div>
            `;
            lessonEl.appendChild(inner.querySelector('div'));

            const slidesWrap = document.createElement('div');
            slidesWrap.className = `lesson-slides ${isCurrent ? '' : 'hidden'}`;
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
            case 'video-video':
                html += this.renderVideoEditor(slide);
                break;
            case 'image-comparison':
                html += this.renderImageComparisonEditor(slide);
                break;
            case 'quiz-multiple-choice-carousel':
                html += this.renderQuizCarouselEditor(slide);
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
        if (quizCorrect) quizCorrect.addEventListener('input', (e) => this.editor.updateSlideContent(slideId, 'correct', parseInt(e.target.value) || 1));

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
    }

    handleStart(e) {
        // identify draggable targets inside preview
        const sep = e.target.closest('.comparison-separator');
        if (sep) {
            e.preventDefault();
            this.startComparisonDrag(sep, e);
            return;
        }
        // if later we add other draggable types, check them here and branch
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
        document.querySelectorAll('.add-slide-to-lesson, .add-slide-inside-lesson').forEach(btn => {
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

        if (target.dataset && target.dataset.expandable !== undefined) {
            const idx = parseInt(target.dataset.expandable, 10);
            const field = target.dataset.expandableField;
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
    }

    handleDocumentClick(e) {
        const target = e.target;

        const addSlideBtn = target.closest('.add-slide-to-lesson, .add-slide-inside-lesson');
        if (addSlideBtn) {
            const lessonId = parseInt(addSlideBtn.dataset.lessonId, 10);
            if (!isNaN(lessonId)) this.editor.currentLessonId = lessonId;
            this.editor.showAddSlideModal();
            return;
        }

        // quiz select
        const quizBtn = target.closest('[id^="quiz-"][id$="-answers"] button');
        if (quizBtn) {
            const slideEl = quizBtn.closest('[id^="quiz-"][id$="-answers"]');
            const slideId = parseInt(slideEl.id.split('-')[1]);
            const slide = this.editor.findSlide(this.editor.currentLessonId, slideId);
            if (!slide.submitted) {
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
                lessonItem.classList.toggle('lesson-expanded');
                const icon = lessonItem.querySelector('.expand-lesson i');
                if (icon) icon.classList.toggle('rotate-180');

                if (!isNaN(lessonId) && lessonId !== this.editor.currentLessonId) {
                    this.editor.currentLessonId = lessonId;
                    this.editor.currentSlideId = null;
                    this.editor.renderLessonsSidebar();
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
            ],
            image: [{ subtype: 'comparison', title: 'مقارنة صور', description: '', icon: 'fa-image' }],
            video: [{ subtype: 'video', title: 'فيديو', description: '', icon: 'fa-video' }],
            quiz: [{ subtype: 'multiple-choice-carousel', title: 'اختبار دوّار', description: '', icon: 'fa-layer-group' }]
        };

        // create helpers
        this.slideManager = new SlideManager(this);
        this.ui = new UIRenderer(this);

        // Load/persist and initial state
        this.loadFromLocalStorage();
        this.ensureInitialState();

        // Render initial UI
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
    loadFromLocalStorage() { return this.slideManager.loadFromLocalStorage(); }
    saveToLocalStorage() { return this.slideManager.saveToLocalStorage(); }
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

    updateLessonHeader() {
        const curr = this.findLessonById(this.currentLessonId);
        if (!curr) return;
        if (this.dom.currentLessonTitle) this.dom.currentLessonTitle.textContent = curr.title;
        if (this.dom.currentLessonCode) this.dom.currentLessonCode.textContent = curr.code;
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

    // ---------- Drag & Drop Functionality (lessons & slides reordering) ----------
    attachDragAndDrop() {
        const lessonsContainer = this.dom.lessonsList;
        if (!lessonsContainer) return;

        let draggingLessonEl = null;
        let draggingSlideEl = null;
        let sourceLessonIdOfDraggingSlide = null;

        // LESSON drag
        lessonsContainer.querySelectorAll('.lesson-item').forEach(lessonEl => {
            lessonEl.addEventListener('dragstart', (e) => {
                draggingLessonEl = lessonEl;
                e.dataTransfer.effectAllowed = 'move';
                lessonEl.classList.add('dragging-lesson');
            });
            lessonEl.addEventListener('dragend', (e) => {
                if (draggingLessonEl) draggingLessonEl.classList.remove('dragging-lesson');
                draggingLessonEl = null;
            });
            lessonEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });
            lessonEl.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!draggingLessonEl || draggingLessonEl === lessonEl) return;
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

        // SLIDE drag
        lessonsContainer.querySelectorAll('.lesson-item').forEach(lessonEl => {
            const slidesContainer = lessonEl.querySelector('.lesson-slides');
            if (!slidesContainer) return;

            slidesContainer.querySelectorAll('.slide-item').forEach(slideEl => {
                slideEl.addEventListener('dragstart', (e) => {
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
                    if (draggingSlideEl) draggingSlideEl.classList.remove('dragging-slide');
                    draggingSlideEl = null;
                    sourceLessonIdOfDraggingSlide = null;
                });

                slideEl.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                });

                slideEl.addEventListener('drop', (e) => {
                    e.preventDefault();
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

            slidesContainer.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            slidesContainer.addEventListener('drop', (e) => {
                e.preventDefault();
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
        // create and attach instance
        try {
            const editor = new CourseEditor();
            window.courseEditor = editor;
        } catch (err) {
            console.error('Failed to initialize CourseEditor', err);
        }
    });
}
