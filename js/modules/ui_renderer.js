import { Utils } from './utils.js';
////////////////////////////////////////////////////
// UIRenderer — renders preview & editors & templates
////////////////////////////////////////////////////
class UIRenderer {
    constructor(editor) {
        this.editor = editor;

        // initialize slide-unit observer so unit updates when preview container resizes
        try {
            this.initSlideUnitObserver();
        } catch (e) {
            // ignore if preview container not present yet
        }

    }

    updateProgress(slide) {
        if (!slide || this.editor.page !== 'preview') return;

        const currentLessonId = this.editor.currentLessonId;
        const slideId = slide.id;

        // Mark slide as visited
        this.editor.markSlideVisited(currentLessonId, slideId);
    }

    renderSlidePreview(slide) {

        if (this.editor.page === 'preview' && slide) {
            this.updateProgress(slide);
        }
        const previewContainer = this.editor.dom.slidePreviewContainer;
        const previewContent = this.editor.dom.slidePreviewContent;
        if (!previewContent) return;
        // TODO
        if (!slide) {
            previewContent.innerHTML = `
        <div class="${this.editor.page === 'editor' ? 'fixed-slide-size' : ' '} flex flex-col items-center justify-center text-center h-full opacity-80">
            <i class="fas fa-sliders-h slide-icon-large mb-unit-4"></i>
            <h2 class="slide-text-title mb-unit-2">اختر سلايداً للمعاينة</h2>
            <p class="slide-text-body">انقر على أي سلايد لرؤية محتواه هنا</p>
        </div>`;
            previewContainer.className = `slide-preview  ${this.editor.page === 'editor' ? `rounded-unit-3  fixed-slide-size ${this.editor.preview}` : ' '} mx-auto flex items-center justify-center`;
            previewContainer.style.backgroundImage = '';
            previewContainer.style.backgroundColor = '';
            if (this.editor.dom.previewActions) this.editor.dom.previewActions.style.opacity = '0';
            return;
        }
        if (this.editor.dom.previewActions) this.editor.dom.previewActions.style.opacity = '1';

        previewContent.innerHTML = '';

        // Apply background and text styling
        const lesson = this.editor.findLessonById(this.editor.currentLessonId);
        // TODO variable preview
        let containerClasses = `slide-preview ${this.editor.page === 'editor' ? `rounded-unit-3 fixed-slide-size ${this.editor.preview}` : `free-aspect ${this.editor.preview} `} m-0 slide-${slide.type}`;

        // Apply background
        if (lesson && lesson.background) {
            containerClasses += ' has-background-image';
            previewContainer.style.backgroundImage = `url("${Utils.escapeHTML(lesson.background)}")`;
            previewContainer.style.backgroundColor = 'transparent';
        } else {
            previewContainer.style.backgroundImage = '';
            previewContainer.style.backgroundColor = '';
            containerClasses = containerClasses.replace(' has-background-image', '');
        }

        previewContainer.className = containerClasses;

        // Apply text styling with unit-based classes
        const textStyle = slide.textStyle || {};

        // Build style attributes for different elements
        const titleStyle = textStyle.title || {};
        const subtitleStyle = textStyle.subtitle || {};
        const contentStyle = textStyle.content || {};
        const buttonStyle = textStyle.button || {};

        // Build unit-based classes
        // TODO
        const titleSizeClass = titleStyle.size ? `text-size-${titleStyle.size}` : 'text-size-l';
        const subtitleSizeClass = subtitleStyle.size ? `text-size-${subtitleStyle.size}` : 'text-size-m';
        const contentSizeClass = contentStyle.size ? `text-size-${contentStyle.size}` : 'text-size-m';
        const buttonSizeClass = buttonStyle.size ? `text-size-${buttonStyle.size}` : 'text-size-m';

        const titleItalicClass = titleStyle.italic ? 'text-italic' : '';
        const subtitleItalicClass = subtitleStyle.italic ? 'text-italic' : '';
        const contentItalicClass = contentStyle.italic ? 'text-italic' : '';
        const buttonItalicClass = buttonStyle.italic ? 'text-italic' : '';

        // Build style attributes
        let titleStyleAttr = '';
        if (titleStyle.color || titleStyle.fontWeight) {
            titleStyleAttr = `style="`;
            if (titleStyle.color) titleStyleAttr += `color: ${titleStyle.color} !important;`;
            if (titleStyle.fontWeight) titleStyleAttr += ` font-weight: ${titleStyle.fontWeight} !important;`;
            titleStyleAttr += `"`;
        }

        let subtitleStyleAttr = '';
        if (subtitleStyle.color || subtitleStyle.fontWeight) {
            subtitleStyleAttr = `style="`;
            if (subtitleStyle.color) subtitleStyleAttr += `color: ${subtitleStyle.color} !important;`;
            if (subtitleStyle.fontWeight) subtitleStyleAttr += ` font-weight: ${subtitleStyle.fontWeight} !important;`;
            subtitleStyleAttr += `"`;
        }

        let contentStyleAttr = '';
        if (contentStyle.color || contentStyle.fontWeight) {
            contentStyleAttr = `style="`;
            if (contentStyle.color) contentStyleAttr += `color: ${contentStyle.color} !important;`;
            if (contentStyle.fontWeight) contentStyleAttr += ` font-weight: ${contentStyle.fontWeight} !important;`;
            contentStyleAttr += `"`;
        }

        let buttonStyleAttr = '';
        if (buttonStyle.backgroundColor || buttonStyle.color) {
            buttonStyleAttr = `style="`;
            if (buttonStyle.backgroundColor) buttonStyleAttr += `background-color: ${buttonStyle.backgroundColor} !important;`;
            if (buttonStyle.color) buttonStyleAttr += ` color: ${buttonStyle.color} !important;`;
            buttonStyleAttr += `"`;
        }

        const headerHtml = `
    <div class="slide-header w-full ">
        ${slide.content.title ? `<h1 class="font-extrabold text-center slide-my-unit-2 ${titleSizeClass} ${titleItalicClass}" ${titleStyleAttr}>${Utils.escapeHTML(slide.content.title)}</h1>` : ''}
        ${slide.content.subtitle ? `<h2 class="slide-my-unit-2 text-center ${subtitleSizeClass} ${subtitleItalicClass}" ${subtitleStyleAttr}>${Utils.escapeHTML(slide.content.subtitle)}</h2>` : ''}
    </div>
`;

        let bodyHtml = '';
        const key = `${slide.type}-${slide.subtype}`;

        switch (key) {
            case 'text-bulleted-list':
                bodyHtml += `<ul class="slide-gap-unit-2 slide-my-unit-2 max-h-unit-96 overflow-y-auto break-words ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}>`;
                if (Array.isArray(slide.content.items)) {
                    slide.content.items.forEach(it => {
                        bodyHtml += `<li class="slide-p-unit-2">${Utils.escapeHTML(it)}</li>`;
                    });
                }
                bodyHtml += `</ul>`;
                break;
            case 'text-comparison':
                bodyHtml += this.renderUniversalComparison(slide, 'text', contentStyleAttr, contentSizeClass, contentItalicClass);
                break;
            case 'text-expandable-list':
                bodyHtml += this.renderExpandableListPreview(slide, contentStyleAttr, contentSizeClass, contentItalicClass);
                break;
            case 'text-text-series':
                bodyHtml += this.renderTextSeriesPreview(slide, contentStyleAttr, contentSizeClass, contentItalicClass);
                break;

            case 'video-video':
                bodyHtml += this.renderVideoPreview(slide, contentStyleAttr, contentSizeClass, contentItalicClass);
                break;

            case 'title-undefined':
                bodyHtml += `<div class="slide-my-unit-4 text-center self-center">
                    <button class="quiz-submit-button ${buttonSizeClass} ${buttonItalicClass}" ${buttonStyleAttr}>
                        ${Utils.escapeHTML(slide.content.buttonText || 'البدء')}
                    </button>
                </div>`;
                break;
            case 'pdf-pdf':
                bodyHtml += this.renderPDFPreview(slide, contentStyleAttr, contentSizeClass, contentItalicClass);
                break;

            case 'image-comparison':
                bodyHtml += this.renderUniversalComparison(slide, 'image', contentStyleAttr, contentSizeClass, contentItalicClass);
                break;
            case 'image-image-series':
                bodyHtml += this.renderImageSeriesPreview(slide, contentStyleAttr, contentSizeClass, contentItalicClass);
                break;
            case 'image-image-collection':
                bodyHtml += this.renderImageCollectionPreview(slide, contentStyleAttr, contentSizeClass, contentItalicClass);
                break;

            case 'quiz-multiple-choice-carousel': {
                bodyHtml += this.renderQuizCarousel(slide, contentStyleAttr, contentSizeClass, contentItalicClass, buttonStyleAttr, buttonSizeClass, buttonItalicClass);
                break;
            }
            case 'quiz-categorize':
                bodyHtml += this.renderQuizCategorize(slide, contentStyleAttr, contentSizeClass, contentItalicClass, buttonStyleAttr, buttonSizeClass, buttonItalicClass);
                break;
            case 'quiz-connect-quiz':
                bodyHtml += this.renderConnectQuizPreview(slide, contentStyleAttr, contentSizeClass, contentItalicClass, buttonStyleAttr, buttonSizeClass, buttonItalicClass);
                setTimeout(() => window.drawConnectQuizLines(slide.id), 100);
                break;

            case 'quiz-drag-match-quiz':
                bodyHtml += this.renderDragMatchQuizPreview(slide, contentStyleAttr, contentSizeClass, contentItalicClass, buttonStyleAttr, buttonSizeClass, buttonItalicClass);
                break;

            case 'quiz-image-pairs-quiz':
                bodyHtml += this.renderImagePairsQuizPreview(slide, contentStyleAttr, contentSizeClass, contentItalicClass, buttonStyleAttr, buttonSizeClass, buttonItalicClass);
                break;

            case 'text-welcome':
                bodyHtml += `<div class="gap-16 slide-p-unit-3 slide-my-unit-3 flex flex-col justify-center items-center overflow-y-auto break-words hyphens-auto  ${contentItalicClass}" ${contentStyleAttr}>
                    <p class='min-h-unit-32 flex justify-center items-center text-size-xxxl excepted'>
                        ${Utils.escapeHTML(slide.content.text).replace(/\n/g, '<br>')}
                    </p> 
                    <button id='welcome-button' class="quiz-submit-button  ${buttonSizeClass} ${buttonItalicClass}" ${buttonStyleAttr}  >
                        ${Utils.escapeHTML(slide.content.buttonText || 'البدء')}
                    </button>
                </div>`;

                break;

            default:
                if (slide.content.text) {
                    bodyHtml += `<div class="slide-p-unit-3 slide-my-unit-3 max-h-unit-96 overflow-y-auto break-words hyphens-auto ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}>${Utils.escapeHTML(slide.content.text).replace(/\n/g, '<br>')}</div>`;
                } else {
                    bodyHtml += `<div class="text-center slide-py-unit-12 ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}>لا توجد واجهة معاينة مخصصة لهذا النوع بعد.</div>`;
                }
        }

        previewContent.innerHTML = `
        <div class="slide-content w-full overflow-y-auto break-words hyphens-auto justify-around pb-0">
            <div class="w-full">
                ${headerHtml} 
                <div class="slide-body w-full  ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}">${bodyHtml}</div>
            </div>
            <div class='gap-fixer'> </div>
        </div>
`;
        const welcomeBtns = document.querySelectorAll("#welcome-button");
        welcomeBtns.forEach(btn => {
            btn.addEventListener("click", () => { this.editor.navigateToAdjacentSlide(1) });
        })

        if (this.editor.page === 'preview') this.editor.setSlideCounter();

        const preview = document.getElementById("slide-preview-container");
        if (preview && this.editor.page === 'editor') preview.classList.add("fixed-slide-size");
    }

    getUnitSize(size) {
        const sizeMap = {
            'xs': 4, 's': 5, 'm': 6, 'l': 7, 'xl': 8, 'xxl': 9, 'xxxl': 10
        };
        return sizeMap[size] || 9;
    }

    renderPDFPreview(slide, contentStyleAttr = '', contentSizeClass = '', contentItalicClass = '') {
        const content = slide.content || {};
        const pdfUrl = content.pdfUrl || '';

        if (!pdfUrl) {
            return `
            <div class="pdf-container mx-auto flex flex-col justify-center items-center gap-unit-4 self-center aspect-video text-center  slide-py-unit-10 bg-gray-600/30 rounded-unit-4 slide-p-unit-3 border border-dashed border-white/50">
                <i class="fas fa-file-pdf unit-20 slide-my-unit-3 opacity-70"></i>
                <p class="${contentSizeClass} font-medium ${contentItalicClass}" ${contentStyleAttr}>الرجاء إدخال رابط ملف PDF للمعاينة</p>
            </div>
        `;
        }

        return `
        <div class="pdf-preview-container pdf-container aspect-video mx-auto my-unit-4">
            <div class="pdf-preview relative w-full overflow-hidden rounded-unit-2 shadow-2xl cursor-pointer" onclick="window.open('${Utils.escapeHTML(pdfUrl)}', '_blank')">
                <div class="relative w-full" style="padding-top: 56.25%;">
                    <div class="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-600/90 to-red-800/90 flex flex-col items-center justify-center text-white">
                        <i class="fas fa-file-pdf unit-20 slide-my-unit-3 opacity-90"></i>
                        <h3 class="unit-8 font-bold slide-my-unit-2">ملف PDF</h3>
                        <p class="unit-6 opacity-80">انقر لفتح ملف PDF</p>
                    </div>
                </div>
            </div>
            ${content.description ? `
                <div class="description-container slide-my-unit-3 text-center ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}>
                    ${Utils.escapeHTML(content.description)}
                </div>
            ` : ''}
        </div>
    `;
    }


    // Add PDF editor method
    renderPDFEditor(slide) {
        const c = slide.content || {};
        return `
        <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
            <h4 class="text-base font-semibold mb-2 text-gray-800">إعدادات ملف PDF</h4>
            
            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">رابط ملف PDF</label>
                <div class="asset-input-group">
                    <input type="url" id="edit-pdf-url" value="${Utils.escapeHTML(c.pdfUrl || '')}" 
                        class="asset-input px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        placeholder="https://example.com/document.pdf" />
                    <button type="button" class="asset-button open-assets-modal !w-24 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-150 flex items-center justify-center"
                            data-asset-type="pdf" data-target-field="edit-pdf-url"
                            title="اختر من الأصول المحفوظة">
                        <i class="fas fa-file-pdf"></i>
                    </button>
                </div>
            </div>
            
            <div class="mb-3">
                <label class="block text-sm font-medium text-gray-700 mb-1">الوصف (اختياري)</label>
                <textarea id="edit-pdf-description" rows="3" 
                          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${Utils.escapeHTML(c.description || '')}</textarea>
            </div>
            
            ${c.pdfUrl ? `
                <div class="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div class="flex items-center">
                        <i class="fas fa-check-circle text-green-500 ml-2"></i>
                        <span class="text-green-700 text-sm">تم إدخال رابط PDF بنجاح</span>
                    </div>
                    <p class="text-green-600 text-xs mt-1 break-all">${Utils.escapeHTML(c.pdfUrl)}</p>
                </div>
            ` : ''}
        </div>
    `;
    }

    renderExpandableListPreview(slide, contentStyleAttr = '', contentSizeClass = '', contentItalicClass = '') {
        const items = slide.content.items || [];
        let html = `<div class="expandable-list-container slide-gap-unit-3 slide-my-unit-3 w-full overflow-auto no-scrollbar">`;

        items.forEach((item, idx) => {
            html += `
        <div class="expandable-item bg-black/40 px-unit-4 py-unit-2 rounded-unit-3 shadow cursor-pointer my-unit-3" data-index="${idx}">
            <div class="flex justify-between items-center">
                <h3 class="${contentSizeClass} font-semibold ${contentItalicClass}" ${contentStyleAttr}>${Utils.escapeHTML(item.title || 'العنوان')}</h3>
                <i class="fas fa-chevron-down transition-transform duration-300"></i>
            </div>
            <div class="expandable-content slide-py-unit-2 max-h-0 overflow-y-auto transition-all duration-300 ease-in-out">
                <p class="${contentSizeClass} leading-relaxed ${contentItalicClass} break-words hyphens-auto" ${contentStyleAttr}>${Utils.escapeHTML(item.text || 'لا يوجد محتوى')}</p>
            </div>
        </div>`;
        });

        html += `</div>`;
        return html;
    }

    renderImageCollectionPreview(slide, contentStyleAttr = '', contentSizeClass = '', contentItalicClass = '') {
        const sections = slide.content.sections || [];
        if (!sections.length) {
            return `<div class="text-center slide-py-unit-12 ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}>لا توجد صور في المجموعة</div>`;
        }

        const isDetailView = slide.content._selectedSection !== undefined && slide.content._selectedSection !== null;

        if (isDetailView) {
            const selectedIndex = slide.content._selectedSection;
            const selectedSection = sections[selectedIndex];

            return `
    <div class="image-collection-detail w-full h-full absolute inset-0 flex flex-col items-center justify-center slide-p-unit-4 cursor-pointer bg-gradient-to-br from-purple-600/90 to-blue-600/90 backdrop-blur-sm overflow-hidden" 
         data-action="close-detail">
        ${selectedSection.imageUrl ? `
            <div class="image-container flex-1 flex items-center justify-center w-full max-w-unit-160 overflow-hidden">
                <img src="${Utils.escapeHTML(selectedSection.imageUrl)}" 
                     alt="الصورة المحددة" 
                     class="max-h-full max-w-full object-contain rounded-unit-3 shadow-2xl transition-transform duration-300"
                     onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='block';" />
                <div class="fallback-placeholder hidden text-center slide-py-unit-8">
                    <i class="fas fa-image unit-40 slide-my-unit-3 opacity-50"></i>
                    <p class="text-center">تعذر تحميل الصورة</p>
                </div>
            </div>
            ${selectedSection.description ? `
                <div class="description-container bg-black/40 rounded-unit-3 slide-p-unit-4 max-w-unit-96 w-full border border-white/20 overflow-y-auto slide-my-unit-2" style="max-height: min(300px, 30vh);">
                    <p class="leading-relaxed text-center font-medium break-words ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}>${Utils.escapeHTML(selectedSection.description)}</p>
                </div>
            ` : ''}
        ` : `
            <div class="text-center slide-py-unit-8 ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}>
                <i class="fas fa-image unit-40 slide-my-unit-3 opacity-50"></i>
                <p>لم يتم إدخال رابط الصورة بعد</p>
            </div>
        `}
        <div class="absolute bottom-unit-4 ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}>
            انقر في أي مكان للعودة
        </div>
    </div>
`;
        }

        // Normal mode - 2×2 grid layout
        const sectionsHtml = sections.map((section, index) => `
    <div class="image-collection-item cursor-pointer transition-all duration-300 transform hover:scale-[1.02] hover:brightness-110 hover:shadow-xl" 
         data-action="open-detail" 
         data-index="${index}">
        ${section.imageUrl ? `
            <div class="image-container bg-black/20 rounded-unit-1 border-unit-1 border-transparent hover:border-white/30 w-full h-full flex items-center justify-center slide-p-unit-2">
                <img src="${Utils.escapeHTML(section.imageUrl)}" 
                     alt="صورة ${index + 1}" 
                     class="w-auto h-auto max-w-full max-h-full object-contain rounded-unit-2"
                     style="max-width: 100%; max-height: 100%;"
                     onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div class="fallback-placeholder hidden h-full w-full items-center justify-center bg-black/10 rounded-unit-1">
                    <i class="fas fa-image unit-6 slide-my-unit-1 opacity-50"></i>
                    <p class="unit-4 text-center">تعذر تحميل الصورة</p>
                </div>
            </div>
        ` : `
            <div class="h-full bg-black/20 rounded-unit-3 flex items-center justify-center border-unit-1 border-dashed border-white/30 hover:border-white/50 hover:bg-black/30 w-full slide-p-unit-2">
                <div class="text-center ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}>
                    <i class="fas fa-image unit-12 slide-my-unit-1 opacity-50"></i>
                    <p class="unit-4 excepted text-size-xxs">لا توجد صورة</p>
                </div>
            </div>
        `}
    </div>
`).join('');

        return `
    <div class="image-collection-grid w-full flex items-center justify-center">
        <div class="grid grid-cols-2 slide-gap-unit-3 slide-p-unit-3">
            ${sectionsHtml}
        </div>
    </div>
`;
    }

    renderConnectQuizPreview(slide) {
        const c = slide.content || {};
        const leftColumn = c.leftColumn || [];
        const rightColumn = c.rightColumn || [];
        const leftColumnType = c.leftColumnType || 'text';
        const rightColumnType = c.rightColumnType || 'text';
        const submitted = slide.submitted || false;

        // Get button styling
        const textStyle = slide.textStyle || {};
        const buttonStyle = textStyle.button || {};
        const buttonSizeClass = buttonStyle.size ? `unit-${this.getUnitSize(buttonStyle.size)}` : 'unit-5';
        const buttonItalicClass = buttonStyle.italic ? 'text-italic' : '';
        let buttonStyleAttr = '';

        if (buttonStyle.backgroundColor || buttonStyle.color) {
            buttonStyleAttr = `style="`;
            if (buttonStyle.backgroundColor) buttonStyleAttr += `background-color: ${buttonStyle.backgroundColor} !important;`;
            if (buttonStyle.color) buttonStyleAttr += ` color: ${buttonStyle.color} !important;`;
            buttonStyleAttr += `"`;
        }

        let html = `
<div class="quiz-connect-container relative w-full flex flex-col items-center justify-center">
    <h3 class="unit-8 font-bold text-center slide-my-unit-4">${Utils.escapeHTML(c.question || 'قم بتوصيل العناصر المتشابهة')}</h3>
    <div class="flex justify-center items-center w-full">
        <div class=" flex slide-gap-unit-6 w-full max-w-fit dir-ltr">
            <div class="flex-1 flex flex-col h-full ">
                <div class="flex-1 flex flex-col  slide-gap-unit-2 justify-center items-center min-h-0">
`;

        // Left column items - max 3, using column type
        leftColumn.slice(0, 3).forEach((item, index) => {
            html += this.renderQuizItem(item, index, 'left', 'connect', submitted, leftColumnType);
        });

        html += `
                </div>
            </div>
            <div class="flex-1 flex flex-col h-full ">
                <div class="flex-1 flex flex-col  slide-gap-unit-2 justify-center items-center min-h-0">
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
            <div class="text-center slide-my-unit-2 slide-pt-unit-3 border-t border-white/20">
                <button class="quiz-submit-button ${buttonSizeClass} ${buttonItalicClass}" ${buttonStyleAttr}
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

        let html = `
    <div class="quiz-image-pairs-container relative w-full flex flex-col items-center justify-center">
        <h3 class="text-xl font-bold text-center mb-2">${Utils.escapeHTML(c.question || 'اختر الصور الصحيحة من القائمتين')}</h3>
        <div class="flex justify-center items-center w-full">
            <div class="flex gap-4 w-full max-w-2xl items-center justify-center">
                <div class="flex-1 flex flex-col h-full  max-h-64">
                    <div class="flex-1 flex flex-col  gap-2 justify-center items-center min-h-0">
    `;

        // Left column - selectable items - max 3, using column type
        leftColumn.slice(0, 3).forEach((item, index) => {
            html += this.renderQuizItem(item, index, 'left', 'pairs', submitted, leftColumnType);
        });

        html += `
                    </div>
                </div>
                <div class="flex-1 flex flex-col h-full  max-h-64">
                    <div class="flex-1 flex flex-col gap-2  justify-center items-center min-h-0">
    `;

        // Right column - selectable items - max 3, using column type
        rightColumn.slice(0, 3).forEach((item, index) => {
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
        <div class="text-center mt-3 pt-2 border-t border-white/20">
            <button class="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl text-sm" 
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

        // Get button styling
        const textStyle = slide.textStyle || {};
        const buttonStyle = textStyle.button || {};
        const buttonSizeClass = buttonStyle.size ? `unit-${this.getUnitSize(buttonStyle.size)}` : 'unit-5';
        const buttonItalicClass = buttonStyle.italic ? 'text-italic' : '';
        let buttonStyleAttr = '';

        if (buttonStyle.backgroundColor || buttonStyle.color) {
            buttonStyleAttr = `style="`;
            if (buttonStyle.backgroundColor) buttonStyleAttr += `background-color: ${buttonStyle.backgroundColor} !important;`;
            if (buttonStyle.color) buttonStyleAttr += ` color: ${buttonStyle.color} !important;`;
            buttonStyleAttr += `"`;
        }

        // Check if answer is correct
        const isCorrect = this.editor.quizManager.isAnswerCorrect(slide);

        let html = `
<div class="quiz-drag-match-container relative w-full flex flex-col items-center justify-center">
    <h3 class="unit-8 font-bold text-center slide-my-unit-4">${Utils.escapeHTML(c.question || 'اسحب الصور إلى النصوص المناسبة')}</h3>
    <div class="flex justify-center items-center w-full">
        <div class="flex slide-gap-unit-6 items-start">
            <div class="flex flex-col">
                <div class="flex flex-col slide-gap-unit-2 justify-center items-center">
`;

        // Left column - show only items that are NOT placed in right column
        leftColumn.slice(0, 3).forEach((item, index) => {
            const isPlaced = slide.userMatches?.some(match => match.leftIndex === index);

            let itemHtml = '';
            if (!isPlaced) {
                itemHtml = this.renderQuizItem(item, index, 'left', 'drag', submitted, leftColumnType);
            }

            const zoneClass = isPlaced ? 'quiz-drop-zone border-blue-400 bg-blue-500/10' : 'quiz-drop-zone border-white/40';

            html += `
    <div class="${zoneClass} min-h-unit-28 min-w-unit-28 border-unit-1 border-dashed rounded-unit-3 transition-all duration-300 flex items-center justify-center hover:border-blue-400 hover:bg-blue-500/10" 
        data-index="${index}" 
        data-side="left"
        ondragover="window.handleDragMatchOver(event)"
        ondragleave="window.handleDragMatchLeave(event)"
        ondrop="window.handleDragMatchDrop(event, '${slide.id}', ${index}, 'left')"
        onpointermove="window.handleDragMatchOver(event)"
        onpointerleave="window.handleDragMatchLeave(event)"
        onpointerup="window.handleDragMatchDrop(event, '${slide.id}', ${index}, 'left')"
        ontouchmove="window.handleDragMatchOver(event)"
        ontouchend="window.handleDragMatchDrop(event, '${slide.id}', ${index}, 'left')"
         >
        ${itemHtml}
    </div>
`;
        });

        html += `
                </div>
            </div>
            <div class="flex flex-col">
                <div class="flex flex-col slide-gap-unit-2 justify-center items-center">
`;

        // Right column - show items that ARE placed in right column
        rightColumn.slice(0, 3).forEach((item, index) => {
            // Find which left item is placed in this right zone
            const match = slide.userMatches?.find(match => match.rightIndex === index);
            let itemHtml = '';

            if (match) {
                // If there's a match, render the left item in the right zone
                const leftItem = leftColumn[match.leftIndex];
                if (leftItem) {
                    itemHtml = this.renderQuizItem(leftItem, match.leftIndex, 'left', 'drag', submitted, leftColumnType);
                }
            } else {
                // If no match, show the original right item as placeholder
                itemHtml = this.renderQuizItem(item, index, 'right', 'drag', submitted, rightColumnType);
            }

            // Determine border color based on submission and correctness
            let zoneClass = 'quiz-drop-zone border-white/40';
            if (submitted) {
                if (match) {
                    const leftItem = leftColumn[match.leftIndex];
                    const rightItem = rightColumn[match.rightIndex];
                    const isMatchCorrect = leftItem && rightItem && leftItem.correctIndex === match.rightIndex;
                    zoneClass = isMatchCorrect ? 'quiz-drop-zone border-green-400 bg-green-500/10' : 'quiz-drop-zone border-red-400 bg-red-500/10';
                }
            } else {
                zoneClass = match ? 'quiz-drop-zone border-green-400 bg-green-500/10' : 'quiz-drop-zone border-white/40';
            }

            html += `
    <div class="${zoneClass}  border-unit-1 border-dashed rounded-unit-3 transition-all duration-300 flex items-center justify-center hover:border-green-400 hover:bg-green-500/10" 
         data-index="${index}" 
         data-side="right"
        ondragover="window.handleDragMatchOver(event)"
        ondragleave="window.handleDragMatchLeave(event)"
        ondrop="window.handleDragMatchDrop(event, '${slide.id}', ${index}, 'right')"
        onpointermove="window.handleDragMatchOver(event)"
        onpointerleave="window.handleDragMatchLeave(event)"
        onpointerup="window.handleDragMatchDrop(event, '${slide.id}', ${index}, 'right')"
        ontouchmove="window.handleDragMatchOver(event)"
        ontouchend="window.handleDragMatchDrop(event, '${slide.id}', ${index}, 'right')"
         >
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
            <div class="text-center slide-my-unit-3 slide-pt-unit-2 border-t border-white/20">
                <button class="quiz-submit-button ${buttonSizeClass} ${buttonItalicClass}" ${buttonStyleAttr}
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

    renderImagePairsQuizPreview(slide) {
        const c = slide.content || {};
        const leftColumn = c.leftColumn || [];
        const rightColumn = c.rightColumn || [];
        const leftColumnType = c.leftColumnType || 'image'; // Force image type
        const rightColumnType = c.rightColumnType || 'image'; // Force image type
        const submitted = slide.submitted || false;

        let html = `
    <div class="quiz-image-pairs-container relative w-full flex flex-col items-center justify-center">
        <h3 class="unit-8 font-bold text-center slide-my-unit-2">${Utils.escapeHTML(c.question || 'اختر الصور الصحيحة من القائمتين')}</h3>
        <div class="flex justify-center items-center w-full">
            <div class="flex slide-gap-unit-4 w-full max-w-unit-96 items-start flex-row-reverse justify-center">
                <div class="flex-1 flex flex-col h-full  ">
                    <div class="flex-1 flex flex-col  slide-gap-unit-2 justify-center items-center min-h-0">
    `;

        // Left column - selectable items - max 3, using column type
        leftColumn.slice(0, 3).forEach((item, index) => {
            html += this.renderQuizItem(item, index, 'left', 'pairs', submitted, leftColumnType);
        });

        html += `
                    </div>
                </div>
                <div class="flex-1 flex flex-col h-full  ">
                    <div class="flex-1 flex flex-col  slide-gap-unit-2 justify-center items-center min-h-0">
    `;

        // Right column - selectable items - max 3, using column type
        rightColumn.slice(0, 3).forEach((item, index) => {
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
        <div class="text-center slide-my-unit-3 slide-pt-unit-2 border-t border-white/20">
            <button class="bg-gradient-to-r from-blue-500 to-blue-600 slide-px-unit-4 slide-py-unit-2 rounded-unit-3 font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl unit-5" 
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

    renderQuizItem(item, index, side, quizType, submitted = false, columnType = null) {
        // Use column type if provided, otherwise fall back to item.type
        const type = columnType || item.type;
        const isSelected = item._selected || false;
        const isCorrect = item.isCorrect || false;

        // Get the current slide for user selections and text styling
        const currentSlide = this.editor.getCurrentSlide();
        const userSelections = currentSlide?.userSelections || { left: [], right: [] };
        const isActuallySelected = userSelections[side]?.includes(index) || false;

        // Get text styling for this item
        const textStyle = currentSlide?.textStyle || {};
        const contentStyle = textStyle.content || {};
        const contentSizeClass = contentStyle.size ? `unit-${this.getUnitSize(contentStyle.size)}` : 'unit-6';
        const contentItalicClass = contentStyle.italic ? 'text-italic' : '';
        let contentStyleAttr = contentStyle.color ? `style="color: ${contentStyle.color} !important;"` : '';

        // Base unit-based classes for all quiz items
        let itemClass = "quiz-el border-unit-1 border-white/30 rounded-unit-4 slide-p-unit-3 flex items-center justify-center transition-all duration-300 shadow-lg";

        // Different background for image pairs vs other quiz types
        if (quizType === 'pairs') {
            itemClass += " bg-black/30";
            if (isActuallySelected && !submitted) {
                itemClass += " bg-blue-600/40 border-blue-400";
            }
        } else {
            itemClass += " bg-black/40";
        }

        // Hover effects for interactive items
        if (quizType === 'connect' || quizType === 'pairs') {
            itemClass += " cursor-pointer hover:border-white/50 hover:shadow-xl";
        }
        if (quizType === 'drag' && side === 'left' && !submitted && type === 'image') {
            itemClass += " cursor-grab active:cursor-grabbing hover:bg-blue-600/20 hover:border-blue-400";
        }

        // Submitted state styling
        if (submitted) {
            if (quizType === 'pairs') {
                itemClass += isCorrect ? " bg-green-600/30 border-green-500" : " bg-red-600/30 border-red-500";
            }
        }

        let content = '';
        if (type === 'text') {
            content = `<div class="text-center font-semibold unit-5 leading-relaxed break-words hyphens-auto slide-px-unit-2 excepted text-size-xxs ${contentItalicClass}" ${contentStyleAttr}>${Utils.escapeHTML(item.value || `عنصر ${index + 1}`)}</div>`;
        } else if (type === 'image') {
            if (item.value) {
                content = `
        <div class="w-full h-full flex items-center justify-center">
            <img src="${Utils.escapeHTML(item.value)}" alt="صورة ${index + 1}" 
                 class="max-w-full max-h-full object-contain rounded-unit-3"
                 onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';" />
            <div class="fallback-placeholder hidden flex-col items-center justify-center">
                <i class="fas fa-image unit-6 slide-my-unit-1 opacity-50"></i>
                <p class="unit-4 text-center">تعذر تحميل الصورة</p>
            </div>
        </div>
    `;
            } else {
                content = `
        <div class="flex flex-col items-center justify-center">
            <i class="fas fa-image unit-6 slide-my-unit-1 opacity-50"></i>
            <p class="unit-4 excepted text-size-xxs">لا توجد صورة</p>
        </div>
    `;
            }
        }

        // Add interactive elements based on quiz type
        if (quizType === 'connect') {
            const isConnected = currentSlide?.userConnections?.some(conn =>
                conn.leftIndex === index && side === 'left'
            );
            const connectionClass = isConnected ? 'ring-unit-2 ring-blue-400 bg-blue-500/20' : '';

            // For left items, use the new drawing system
            if (side === 'left') {
                const slideId = currentSlide?.id;
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
            const isPlaced = currentSlide?.userMatches?.some(match => match.leftIndex === index);

            return `
    <div class="${itemClass} quiz-drag-item" data-side="${side}" data-index="${index}" 
         ${draggable ? 'draggable="true"' : ''}
        ondragstart="${draggable ? `window.handleDragMatchStart(event, '${side}', ${index})` : ''}"
        onpointerdown="${draggable ? `window.handleDragMatchStart(event, '${side}', ${index})` : ''}"
        ontouchstart="${draggable ? `window.handleDragMatchStart(event, '${side}', ${index})` : ''}"
        onmousedown="${draggable ? `window.handleDragMatchStart(event, '${side}', ${index})` : ''}"
         >
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
            <span class="text-sm font-medium text-gray-700">السؤال ${index + 1}</span>
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
                    <div class="asset-input-group">
                        <input type="url" data-connect-left="${index}" data-field="value" value="${Utils.escapeHTML(item.value || '')}" 
                            class="asset-input px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                            placeholder="https://example.com/image.jpg" />
                        <button type="button" class="asset-button open-assets-modal !w-24 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-150 flex items-center justify-center"
                                data-asset-type="images" data-target-field="connect-left-${index}"
                                title="اختر من الأصول المحفوظة">
                            <i class="fas fa-images text-sm"></i>
                        </button>
                    </div>
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
            <!-- ADD INDIVIDUAL SCORE INPUT FOR EACH QUESTION -->
            <div>
                <label class="block text-xs text-gray-600 mb-1">درجة السؤال (0-5)</label>
                <input type="number" data-connect-left="${index}" data-field="score" 
                value="${item.score !== undefined ? item.score : 1}" 
                class="quiz-score-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                min="0" max="5" placeholder="درجة السؤال من 0 إلى 5"
                oninput="this.value = Math.max(0, Math.min(5, parseInt(this.value) || 0))" />
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
                        <div class="asset-input-group">
                            <input type="url" data-connect-right="${index}" data-field="value" value="${Utils.escapeHTML(item.value || '')}" 
                                class="asset-input px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                                placeholder="https://example.com/image.jpg" />
                            <button type="button" class="asset-button open-assets-modal !w-24 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-150 flex items-center justify-center"
                                    data-asset-type="images" data-target-field="connect-right-${index}"
                                    title="اختر من الأصول المحفوظة">
                                <i class="fas fa-images text-sm"></i>
                            </button>
                        </div>
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
            <span class="text-sm font-medium text-gray-700">السؤال ${index + 1}</span>
            <button data-action="delete-drag-left" data-index="${index}" 
                    ${leftColumn.length <= 1 ? 'disabled' : ''}
                    class="p-1 text-red-600 hover:bg-red-100 rounded-full transition duration-150 ${leftColumn.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                <i class="fas fa-trash text-xs"></i>
            </button>
        </div>
        <div class="space-y-2">
            <div>
                <label class="block text-xs text-gray-600 mb-1">رابط الصورة:</label>
                <div class="asset-input-group">
                    <input type="url" data-drag-left="${index}" data-field="value" value="${Utils.escapeHTML(item.value || '')}" 
                        class="asset-input px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                        placeholder="رابط الصورة..." />
                    <button type="button" class="asset-button open-assets-modal !w-24 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-150 flex items-center justify-center"
                            data-asset-type="images" data-target-field="drag-left-${index}"
                            title="اختر من الأصول المحفوظة">
                        <i class="fas fa-images text-sm"></i>
                    </button>
                </div>
            </div>
            <div>
                <label class="block text-xs text-gray-600 mb-1">رقم النص الصحيح:</label>
                <input type="number" data-drag-left="${index}" data-field="correctIndex" value="${item.correctIndex !== undefined ? item.correctIndex + 1 : 1}" 
                    class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                    min="1" max="${Math.max(1, rightColumn.length)}" 
                    oninput="this.value = Math.max(1, Math.min(parseInt(this.value) || 1, ${Math.max(1, rightColumn.length)}))" />
                <p class="text-xs text-gray-500 mt-1">(من 1 إلى ${rightColumn.length})</p>
            </div>
            <!-- ADD INDIVIDUAL SCORE INPUT FOR EACH DRAGGABLE ITEM -->
            <div>
                <label class="block text-xs text-gray-600 mb-1">درجة السؤال (0-5)</label>
                <input type="number" data-drag-left="${index}" data-field="score" 
                        value="${item.score !== undefined ? item.score : 1}" 
                        class="quiz-score-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                        min="0" max="5" placeholder="درجة السؤال من 0 إلى 5"
                        oninput="this.value = Math.max(0, Math.min(5, parseInt(this.value) || 0))" />
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
        const leftColumnType = 'image';
        const rightColumnType = 'image';

        const leftItemsHtml = leftColumn.map((item, index) => `
    <div class="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700">السؤال ${index + 1}</span>
            <button data-action="delete-pairs-item" data-column="left" data-index="${index}" 
                    ${leftColumn.length <= 1 ? 'disabled' : ''}
                    class="p-1 text-red-600 hover:bg-red-100 rounded-full transition duration-150 ${leftColumn.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                <i class="fas fa-trash text-xs"></i>
            </button>
        </div>
        <div class="space-y-2">
            <div>
                <label class="block text-xs text-gray-600 mb-1">رابط الصورة:</label>
                <div class="asset-input-group">
                    <input type="url" data-pairs-left="${index}" data-field="value" value="${Utils.escapeHTML(item.value || '')}" 
                        class="asset-input px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                        placeholder="https://example.com/image.jpg" />
                    <button type="button" class="asset-button open-assets-modal !w-24 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-150 flex items-center justify-center"
                            data-asset-type="images" data-target-field="pairs-left-${index}"
                            title="اختر من الأصول المحفوظة">
                        <i class="fas fa-images text-sm"></i>
                    </button>
                </div>
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
            <!-- ADD INDIVIDUAL SCORE INPUT FOR EACH IMAGE PAIRS ITEM -->
            <div>
                <label class="block text-xs text-gray-600 mb-1">درجة السؤال (0-5)</label>
                <input type="number" data-pairs-left="${index}" data-field="score" 
                        value="${item.score !== undefined ? item.score : 1}" 
                        class="quiz-score-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                        min="0" max="5" placeholder="درجة السؤال من 0 إلى 5"
                        oninput="this.value = Math.max(0, Math.min(5, parseInt(this.value) || 0))" />
            </div>
        </div>
    </div>
`).join('');

        const rightItemsHtml = rightColumn.map((item, index) => `
    <div class="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-700">السؤال ${index + 1}</span>
            <button data-action="delete-pairs-item" data-column="right" data-index="${index}" 
                    ${rightColumn.length <= 1 ? 'disabled' : ''}
                    class="p-1 text-red-600 hover:bg-red-100 rounded-full transition duration-150 ${rightColumn.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                <i class="fas fa-trash text-xs"></i>
            </button>
        </div>
        <div class="space-y-2">
            <div>
                <label class="block text-xs text-gray-600 mb-1">رابط الصورة:</label>
                <div class="asset-input-group">
                    <input type="url" data-pairs-right="${index}" data-field="value" value="${Utils.escapeHTML(item.value || '')}" 
                        class="asset-input px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                        placeholder="https://example.com/image.jpg" />
                    <button type="button" class="asset-button open-assets-modal !w-24 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-150 flex items-center justify-center"
                            data-asset-type="images" data-target-field="pairs-right-${index}"
                            title="اختر من الأصول المحفوظة">
                        <i class="fas fa-images text-sm"></i>
                    </button>
                </div>
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
            <!-- ADD INDIVIDUAL SCORE INPUT FOR EACH IMAGE PAIRS ITEM -->
            <div>
                <label class="block text-xs text-gray-600 mb-1">درجة السؤال (0-5)</label>
                <input type="number" data-pairs-right="${index}" data-field="score" 
                       value="${item.score !== undefined ? item.score : 1}" 
                        class="quiz-score-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" 
                        min="0" max="5" placeholder="درجة السؤال من 0 إلى 5"
                        oninput="this.value = Math.max(0, Math.min(5, parseInt(this.value) || 0))" />
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
                <div class="asset-input-group">
                    <input type="url" data-image-collection="${idx}" data-field="imageUrl" 
                        value="${Utils.escapeHTML(section.imageUrl || '')}" 
                        class="asset-input px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                        placeholder="https://example.com/image.jpg" />
                    <button type="button" class="asset-button open-assets-modal !w-24 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-150 flex items-center justify-center"
                            data-asset-type="images" data-target-field="image-collection-${idx}"
                            title="اختر من الأصول المحفوظة">
                        <i class="fas fa-images"></i>
                    </button>
                </div>
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
            ${sections.length < 6 ? `
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

        // Get textStyle for button styling
        const textStyle = slide.textStyle || {};
        const buttonStyle = textStyle.button || {};
        const buttonSizeClass = buttonStyle.size ? `unit-${this.getUnitSize(buttonStyle.size)}` : 'unit-5';
        const buttonItalicClass = buttonStyle.italic ? 'text-italic' : '';
        let buttonStyleAttr = '';

        // Button styling
        if (buttonStyle.backgroundColor || buttonStyle.color) {
            buttonStyleAttr = `style="`;
            if (buttonStyle.backgroundColor) buttonStyleAttr += `background-color: ${buttonStyle.backgroundColor} !important;`;
            if (buttonStyle.color) buttonStyleAttr += ` color: ${buttonStyle.color} !important;`;
            buttonStyleAttr += `"`;
        }

        const answersHTML = answers.map((a, i) => {
            const isChosen = chosen === i;
            const isCorrect = submitted && i === correctIndex;
            const isWrong = submitted && isChosen && i !== correctIndex;

            let classes = "quiz-option w-full flex items-start slide-gap-unit-2 slide-px-unit-3 slide-py-unit-2 rounded-unit-3 border transition text-right break-words hyphens-auto ";
            if (submitted) {
                if (isCorrect) classes += "border-green-500 bg-green-600/30";
                else if (isWrong) classes += "border-red-500 bg-red-600/30";
                else classes += "border-gray-300 bg-white/10";
            } else {
                classes += isChosen
                    ? "border-blue-500 quiz-option-selected bg-blue-600/30"
                    : "border-gray-300 bg-white/10 hover:bg-white/20";
            }

            const mark = submitted && isCorrect ? `<i class='fas fa-check slide-ml-unit-2 text-green-400 flex-shrink-0'></i>` : "";
            return `
    <button data-index="${i}" class="${classes}">
        <span class="w-unit-5 h-unit-5 flex items-center justify-center border border-gray-400 rounded-full flex-shrink-0 mt-0.5">
            ${isChosen ? `<span class='w-unit-3 h-unit-3 bg-blue-500 rounded-full'></span>` : ""}
        </span>
        <span class="flex-1 text-right break-words hyphens-auto min-w-0">${i + 1}. ${Utils.escapeHTML(a || '—')}</span>
        ${mark}
    </button>
`;
        }).join('');

        // Use the common function to check if submit button should be shown
        const showSubmit = this.editor.shouldShowQuizSubmit(slide);

        return `
<div class="relative w-full flex flex-col items-center justify-center">
    <h2 class="unit-6 font-bold text-center slide-my-unit-3 break-words hyphens-auto">${Utils.escapeHTML(question)}</h2>
    <div class="pc-max-w-60 slide-gap-unit-4 flex flex-col w-full" id="quiz-${slide.id}-answers">
        ${answersHTML}
    </div>
    ${showSubmit ? `
        <div class="text-center slide-my-unit-4">
            <button class="quiz-submit-button ${buttonSizeClass} ${buttonItalicClass}" ${buttonStyleAttr}
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

        // Get button styling
        const textStyle = slide.textStyle || {};
        const buttonStyle = textStyle.button || {};
        const buttonSizeClass = buttonStyle.size ? `unit-${this.getUnitSize(buttonStyle.size)}` : 'unit-5';
        const buttonItalicClass = buttonStyle.italic ? 'text-italic' : '';
        let buttonStyleAttr = '';

        if (buttonStyle.backgroundColor || buttonStyle.color) {
            buttonStyleAttr = `style="`;
            if (buttonStyle.backgroundColor) buttonStyleAttr += `background-color: ${buttonStyle.backgroundColor} !important;`;
            if (buttonStyle.color) buttonStyleAttr += ` color: ${buttonStyle.color} !important;`;
            buttonStyleAttr += `"`;
        }

        // Use common function to check if submit should be shown
        const showSubmit = this.editor.shouldShowQuizSubmit(slide);

        // 🧱 Build drop zones
        const dropZones = categories.map((cat, i) => {
            let bg = 'bg-white/10 border-gray-300';
            let questionContent = '';

            if (submitted) {
                if (i === correctIndex && chosen === i) bg = 'bg-green-600/30 border-green-500';
                else if (chosen === i && i !== correctIndex) bg = 'bg-red-600/30 border-red-500';
                else bg = 'bg-white/10 border-gray-400 opacity-50';
            } else if (chosen === i) {
                bg = 'bg-black/30 border-blue-500';
                // Show scaled down question inside the chosen drop zone, but keep it draggable
                questionContent = `
            <div class="quiz-draggable bg-white/80 font-bold unit-6 rounded-unit-4 max-h-unit-25 slide-p-unit-2 shadow-md transition select-none text-center truncate text-wrap !unit-4"
                 draggable="true"
                 ondragstart="window.handleCategorizeDrag(event, '${containerId}')">
                ${Utils.escapeHTML(question)}
            </div>
        `;
            }

            return `
<div class="quiz-category-zone border ${bg} rounded-unit-4 flex flex-col items-center justify-center 
            font-semibold slide-p-unit-4 text-center transition relative min-h-unit-25 drop-zone"
     data-index="${i}"
     ondragover="event.preventDefault()"
     ondrop="window.handleCategorizeDrop(event, '${containerId}', ${i})">
    <span class="block slide-my-unit-2 unit-6">${Utils.escapeHTML(cat || `التصنيف ${i + 1}`)}</span>
    ${questionContent}
</div>`;
        }).join('');

        // 🧱 Build draggable question box (only show if not placed in a category OR if we want to allow re-dragging)
        let draggableHtml = '';
        if (!submitted) {
            // Always show draggable question unless submitted
            draggableHtml = `
    <div id="${containerId}-question"
         draggable="true"
         class="quiz-draggable bg-white/80 font-bold unit-6 rounded-unit-4 slide-px-unit-6 slide-py-unit-4 shadow-md cursor-move 
                transition select-none slide-my-unit-6  text-center"
         ondragstart="window.handleCategorizeDrag(event, '${containerId}')">
        ${Utils.escapeHTML(question)}
    </div>`;
        }

        return `
    <div id="${containerId}" class="pc-max-w-80 w-full flex flex-col items-center justify-center text-center">
        ${draggableHtml}
        <div class="quiz-categorize-container grid grid-cols-2 slide-gap-unit-4 w-full  mx-auto slide-my-unit-4">
            ${dropZones}
        </div>
        ${showSubmit ? `
            <button class="quiz-submit-button ${buttonSizeClass} ${buttonItalicClass}" ${buttonStyleAttr}
                id="quiz-${slide.id}-submit">
                إرسال الإجابة
            </button>
        ` : ''}

        <!-- New feedback icon container -->
        <div id="quiz-${slide.id}-feedback" class="quiz-feedback-icon"></div>
    </div>`;
    }

    renderUniversalComparison(slide, type = 'text', contentStyleAttr = '', contentSizeClass = '', contentItalicClass = '') {
        const c = slide.content || {};
        const id = `comparison-${slide.id}`;

        const leftHtml = (type === 'image')
            ? (c.imageA
                ? `<div class="relative w-full h-full flex items-center justify-center slide-p-unit-4">
                 <img src="${Utils.escapeHTML(c.imageA)}" alt="الصورة الأولى" class="max-w-full max-h-full object-contain rounded-unit-3"
                      onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                 <div class="fallback-placeholder hidden absolute inset-0 bg-black/20 rounded-unit-3 flex items-center justify-center">
                   <i class="fas fa-image unit-6 slide-my-unit-1 opacity-50"></i>
                   <p class="unit-4 text-center">تعذر تحميل الصورة</p>
                 </div>
               </div>`
                : `<div class="text-center slide-py-unit-8 ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}>الصورة الأولى غير محددة</div>`)
            : `<div class="text-center slide-p-unit-6 break-words hyphens-auto h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}><h3 class="font-bold slide-my-unit-3 break-words">${Utils.escapeHTML(c.leftTitle || 'الجانب الأيسر')}</h3><p class="break-words hyphens-auto leading-relaxed">${Utils.escapeHTML(c.leftText || '')}</p></div>`;

        const rightHtml = (type === 'image')
            ? (c.imageB
                ? `<div class="relative w-full h-full flex items-center justify-center slide-p-unit-4">
                 <img src="${Utils.escapeHTML(c.imageB)}" alt="الصورة الثانية" class="max-w-full max-h-full object-contain rounded-unit-3"
                      onerror="this.onerror=null; this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                 <div class="fallback-placeholder hidden absolute inset-0 bg-black/20 rounded-unit-3 flex items-center justify-center">
                   <i class="fas fa-image unit-6 slide-my-unit-1 opacity-50"></i>
                   <p class="unit-4 text-center">تعذر تحميل الصورة</p>
                 </div>
               </div>`
                : `<div class="text-center slide-py-unit-8 ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}>الصورة الثانية غير محددة</div>`)
            : `<div class="text-center slide-p-unit-6 break-words hyphens-auto h-full overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}><h3 class="font-bold slide-my-unit-3 break-words">${Utils.escapeHTML(c.rightTitle || 'الجانب الأيمن')}</h3><p class="break-words hyphens-auto leading-relaxed">${Utils.escapeHTML(c.rightText || '')}</p></div>`;

        return `
<div id="${id}" class="comparison-wrapper relative w-full rounded-unit-3 overflow-hidden bg-gray-700" style="aspect-ratio: 3 / 2;
    width: min(100%, 350px);
    margin: auto;
    min-height: min(200px , calc(var(--unit) * 60))">
    <div class="comparison-layer bottom absolute inset-0 z-0 flex items-center justify-center">
        ${rightHtml}
    </div>
    <div class="comparison-layer top absolute inset-0 z-10 bg-gray-700 flex items-center justify-center" 
         style="clip-path: inset(0 50% 0 0); transition: clip-path 0.12s linear;">
        ${leftHtml}
    </div>
    <div class="comparison-separator absolute top-0 bottom-0 z-20 cursor-ew-resize" style="left:50%; width:6px;">
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:26px; height:26px; border-radius:999px; background:white; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.15);">
            <i class="fas fa-arrows-left-right unit-5 !text-blue-600"></i>
        </div>
    </div>
</div>`;
    }

    renderTextSeriesEditor(slide) {
        const items = slide.content.items || [];
        const itemsHtml = items.map((it, idx) => `
        <div class="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200" >
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

    // TODO series
    renderTextSeriesPreview(slide, contentStyleAttr = '', contentSizeClass = '', contentItalicClass = '') {
        const items = slide.content.items || [];
        if (!items.length) {
            return `<div class="text-center slide-py-unit-12 ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}>لا توجد نصوص في السلسلة</div>`;
        }

        const slidesHtml = items.map((item, index) => `
        <div class="text-series-slide flex flex-col items-center justify-center slide-p-unit-6 transition-all duration-300 ease-in-out ${index === 0 ? 'block' : 'hidden'}" data-index="${index}">
            <div class="text-center max-w-unit-96 w-full">
                ${item.title ? `<h3 class="font-bold slide-my-unit-4 break-words ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}>${Utils.escapeHTML(item.title)}</h3>` : ''}
                <div class="leading-relaxed break-words hyphens-auto ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}>
                    ${Utils.escapeHTML(item.content || '').replace(/\n/g, '<br>')}
                </div>
            </div>
        </div>
    `).join('');

        const dotsHtml = items.map((_, index) => `
        <span class="text-series-nav-dot w-unit-3 h-unit-3 rounded-full border-unit-1 border-white transition-all duration-300 cursor-pointer ${index === 0 ? 'text-series-nav-dot-active bg-white' : 'bg-transparent'}" data-index="${index}"></span>
    `).join('');

        return `
        <div class="text-series-preview relative w-full overflow-hidden rounded-unit-4" id="text-series-${slide.id} ">
            <div class="text-series-slides relative w-full">
                ${slidesHtml}
            </div>
            
            ${items.length > 1 ? `
                <div class="text-series-nav-dots slide-my-unit-2 flex  space-x-reverse justify-center">
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
    // TODO series
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
            <div class="asset-input-group">
                <input type="url" data-image-series="${index}" data-field="imageUrl" value="${Utils.escapeHTML(item.imageUrl || '')}" 
                    class="asset-input px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="https://example.com/image.jpg" />
                <button type="button" class="asset-button open-assets-modal !w-24 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-150 flex items-center justify-center"
                        data-asset-type="images" data-target-field="image-series-${index}"
                        title="اختر من الأصول المحفوظة">
                    <i class="fas fa-images"></i>
                </button>   
            </div>
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
            return `<div class="text-center slide-py-unit-12">لا توجد صور في السلسلة</div>`;
        }

        const slidesHtml = items.map((item, index) => `
    <div class="image-series-slide  flex flex-col items-center justify-center slide-p-unit-6 transition-all duration-600 ease-in-out ${index === 0 ? 'block' : 'hidden'}" data-index="${index}">
        <div class="text-center max-w-unit-96 w-full">
            ${item.title ? `<h3 class="unit-8 font-bold slide-my-unit-4 break-words">${Utils.escapeHTML(item.title)}</h3>` : ''}
            ${item.imageUrl ? `
                <div class="image-container slide-my-unit-4">
                    <img src="${Utils.escapeHTML(item.imageUrl)}" alt="${Utils.escapeHTML(item.title || 'صورة')}" 
                         class="max-h-unit-64 max-w-full mx-auto rounded-unit-3 shadow-lg object-contain" 
                         onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuS8muS4gOWbvueUteWtkDwvdGV4dD48L3N2Zz4='; this.alt='تعذر تحميل الصورة';" />
                </div>
            ` : `
                <div class="text-center p-unit-4 bg-black/20 rounded-unit-3">
                    <i class="fas fa-image unit-40 slide-my-unit-3 opacity-50"></i>
                    <p>لم يتم إدخال رابط الصورة بعد</p>
                </div>
            `}
        </div>
    </div>
`).join('');

        const dotsHtml = items.map((_, index) => `
    <span class="image-series-nav-dot w-unit-3 h-unit-3 rounded-full border-unit-1 border-white transition-all duration-400 cursor-pointer ${index === 0 ? 'image-series-nav-dot-active bg-white' : 'bg-transparent'}" data-index="${index}"></span>
`).join('');

        return `
    <div class="image-series-preview relative w-full overflow-hidden" id="image-series-${slide.id}">
        <div class="image-series-slides relative w-full">
            ${slidesHtml}
        </div>
        
        ${items.length > 1 ? `
            <div class="image-series-nav-dots slide-my-unit-2 justify-center flex ">
                ${dotsHtml}
            </div>
        ` : ''}
    </div>
`;
    }

    renderVideoPreview(slide, contentStyleAttr = '', contentSizeClass = '', contentItalicClass = '') {
        const content = slide.content || {};
        const videoUrl = content.videoUrl || '';
        if (!videoUrl) {
            return `
                <div class="video-container mx-auto flex flex-col justify-center items-center gap-unit-4 self-center  aspect-video text-center slide-py-unit-10 bg-gray-600/30 rounded-unit-4 slide-p-unit-3 border border-dashed border-white/50">
                    <i class="fas fa-video unit-20 slide-my-unit-3 opacity-70 excepted"></i>
                    <p class="${contentSizeClass} font-medium ${contentItalicClass}" ${contentStyleAttr}>الرجاء إدخال رابط الفيديو للمعاينة</p>
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
            <div class="video-container mx-auto my-unit-3 relative overflow-hidden aspect-video rounded-unit-2 shadow-2xl">
                <iframe
                    class="aspect-video absolute top-0 left-0"
                    src="${Utils.escapeHTML(embed)}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    onerror="this.onerror=null; this.parentElement.innerHTML='<div class=&quot;text-center slide-py-unit-10&quot;>تعذر تحميل الفيديو 🚫</div>';">
                </iframe>
            </div>
            ${content.description ? `<p class="slide-my-unit-3 text-center ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}>${Utils.escapeHTML(content.description)}</p>` : ''}
            ${content.duration ? `<p class="text-center ${contentSizeClass} ${contentItalicClass}" ${contentStyleAttr}><i class="fas fa-clock slide-ml-unit-1"></i> المدة: ${Utils.escapeHTML(content.duration)}</p>` : ''}
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
        <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">رابط الفيديو (URL)</label>
            <div class="asset-input-group">
                <input type="url" id="edit-video-url" value="${Utils.escapeHTML(c.videoUrl || '')}" 
                    class="asset-input px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="https://example.com/video.mp4" />
                <button type="button" class="asset-button open-assets-modal !w-24 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-150 flex items-center justify-center" 
                        data-asset-type="videos" data-target-field="edit-video-url"
                        title="اختر من الأصول المحفوظة">
                    <i class="fas fa-video"></i>
                </button>
            </div>
        </div>
        <div class="mb-3">
            <label class="block text-sm font-medium text-gray-700 mb-1">مدة الفيديو</label>
            <input type="text" id="edit-video-duration" value="${Utils.escapeHTML(c.duration || '')}" 
                   class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
            <textarea id="edit-video-description" rows="3" 
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">${Utils.escapeHTML(c.description || '')}</textarea>
        </div>
    </div>
    `;
    }

    renderQuizCarouselEditor(slide) {
        const c = slide.content || {};
        const answers = c.answers || [];
        const question = c.question || '';
        const correct = c.correct || 1;
        // ADD THIS LINE - Define the score variable
        const score = c.score !== undefined ? c.score : 1;

        let html = `
    <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
        <h4 class="text-base font-semibold mb-2 text-gray-800">إعدادات الاختبار</h4>
        <!-- ADD SCORE INPUT FIELD -->
        <div class="mb-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">درجة السؤال (0-5)</label>
            <input type="number" data-quiz-type="single" min="0" max="5" value="${score}" 
                class="quiz-score-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="أدخل درجة السؤال من 0 إلى 5"
                oninput="this.value = Math.max(0, Math.min(5, parseInt(this.value) || 0))" />

        </div>
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
        const score = c.score !== undefined ? c.score : 1;


        // Mirror the carousel editor layout and visual style, but keep IDs/classes expected by other code
        return `
    <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
        <h4 class="text-base font-semibold mb-2 text-gray-800">إعدادات الاختبار</h4>

        <!-- ADD SCORE INPUT FIELD -->
        <div class="mb-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">درجة السؤال (0-5)</label>
            <input type="number" data-quiz-type="single" min="0" max="5" value="${score}" 
                class="quiz-score-input w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                placeholder="أدخل درجة السؤال من 0 إلى 5"
                oninput="this.value = Math.max(0, Math.min(5, parseInt(this.value) || 0))" />

        </div>

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
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">رابط الصورة الأولى (A)</label>
                    <div class="asset-input-group">
                        <input type="url" id="edit-imageA" value="${Utils.escapeHTML(c.imageA || '')}" 
                            class="asset-input px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                            placeholder="https://example.com/imageA.jpg" />
                        <button type="button" class="asset-button open-assets-modal !w-24 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-150 flex items-center justify-center"
                                data-asset-type="images" data-target-field="edit-imageA"
                                title="اختر من الأصول المحفوظة">
                            <i class="fas fa-images"></i>
                        </button>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">رابط الصورة الثانية (B)</label>
                    <div class="asset-input-group">
                        <input type="url" id="edit-imageB" value="${Utils.escapeHTML(c.imageB || '')}" 
                            class="asset-input px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                            placeholder="https://example.com/imageA.jpg" />
                        <button type="button" class="asset-button open-assets-modal !w-24 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-150 flex items-center justify-center"
                                data-asset-type="images" data-target-field="edit-imageB"
                                title="اختر من الأصول المحفوظة">
                            <i class="fas fa-images"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    }

    // TODO
    renderLessonsSidebar() {
        const container = this.editor.dom.lessonsList;
        if (!container) return;
        container.innerHTML = '';

        if (this.editor.page === 'preview') {
            // Ensure progress system is initialized before rendering
            if (!this.editor.progressMap) {
                this.editor.progressMap = {};
            }
            if (!this.editor.progressMap[this.editor.currentCourseId]) {
                this.editor.progressMap[this.editor.currentCourseId] = {};
            }

            // If mostRecentSlide is not set, initialize it
            if (!this.editor.mostRecentSlide && this.editor.lessons.length > 0) {
                const firstLesson = this.editor.lessons.find(l => l.status !== 'Draft');
                if (firstLesson && firstLesson.slides.length > 0) {
                    this.editor.mostRecentSlide = {
                        lessonId: firstLesson.id,
                        slideId: firstLesson.slides[0].id
                    };
                }
            }
        }

        const urlParams = new URLSearchParams(window.location.search);
        this.editor.lessons.forEach((lesson, lessonIndex) => {
            if (this.editor.page === 'preview' && urlParams.get('ps') != 'publisher' && lesson.status === 'Draft') return
            const isCurrent = lesson.id === this.editor.currentLessonId;
            const isExpanded = this.editor.isLessonExpanded(lesson.id);

            const isUnlocked = this.editor.page === 'editor' ||
                this.editor.authority === 'presenter' ||
                this.editor.authority === 'publisher' ||
                this.editor.isLessonUnlocked(lesson.id);

            const lessonEl = document.createElement('div');
            lessonEl.className = `lesson-item bg-white border border-gray-200 rounded-lg overflow-hidden ${isExpanded ? 'lesson-expanded' : ''} ${!isUnlocked ? 'locked' : ''}`;

            lessonEl.dataset.lessonId = lesson.id;
            lessonEl.draggable = true;

            const slidesCount = (lesson.slides && lesson.slides.length) || 0;

            const inner = document.createElement('div');
            inner.innerHTML = `
            <div class="p-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 lesson-header">
                <div class="flex-1">
                    <h4 class="font-medium text-gray-900">${Utils.escapeHTML(lesson.title)}</h4>
                    <p class="text-xs text-gray-500 ">${slidesCount} سلايد</p>
                </div>
                <div class="flex items-center">
                    ${this.editor.page === 'editor' ? `
                        <button class="delete-lesson p-2 text-gray-500 hover:text-gray-700" data-lesson-id="${lesson.id}" title="حذف الدرس">
                            <i class="fas fa-minus"></i>
                        </button>
                       <button class="toggle-lesson-status p-2 text-gray-400 hover:text-blue-600" data-lesson-id="${lesson.id}" title="تبديل حالة الدرس">
                            <i class="fas ${lesson.status === 'Published' ? 'fa-wifi text-green-500' : 'fa-wifi-slash'}"></i>
                        </button>
                        `: ''}
                        <button class="expand-lesson p-2 text-gray-400  expand-lesson-btn">
                        ${isUnlocked ? `
                        <i class="fas hover:text-blue-600 fa-chevron-down ${isExpanded ? 'rotate-180' : ''} transition-transform"></i>
                        `: `
                        <i class="fa-solid fa-lock"></i>
                        `}
                        </button>
                </div>
            </div>
        `;
            lessonEl.appendChild(inner.querySelector('div'));

            const slidesWrap = document.createElement('div');
            slidesWrap.className = `lesson-slides ${isExpanded ? '' : 'hidden'}`;
            slidesWrap.innerHTML = `<div class="border-t border-gray-200"></div>`;
            const listZone = slidesWrap.querySelector('div');

            lesson.slides.forEach((slide, slideIndex) => {

                const isSlideUnlocked = this.editor.page === 'editor' ||
                    this.editor.authority === 'presenter' ||
                    this.editor.authority === 'publisher' ||
                    this.editor.isSlideUnlocked(lesson.id, slide.id);
                const isMostRecent = this.editor.mostRecentSlide &&
                    this.editor.mostRecentSlide.lessonId === lesson.id &&
                    this.editor.mostRecentSlide.slideId === slide.id;

                const slideItem = document.createElement('div');
                slideItem.className = `slide-item p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer flex items-center justify-between 
                  ${slide.id === this.editor.currentSlideId ? 'active' : ''}
                  ${!isSlideUnlocked ? 'locked' : ''}
                  ${isMostRecent ? 'most-recent' : ''}`;
                slideItem.draggable = isSlideUnlocked;

                slideItem.dataset.slideId = slide.id;
                slideItem.dataset.lessonId = lesson.id;
                slideItem.draggable = true;

                // Add click event listener for preview mode
                if (this.editor.page === 'preview' && isSlideUnlocked) {
                    slideItem.addEventListener('click', (e) => {
                        // Prevent event if clicking on action buttons
                        if (e.target.closest('.slide-actions')) return;

                        this.editor.currentLessonId = lesson.id;
                        this.editor.currentSlideId = slide.id;
                        this.editor.loadSlidePreview(slide.id);
                        this.editor.renderLessonsSidebar();
                        this.editor.setSlideCounter();
                    });
                }
                slideItem.innerHTML = `
<div class="flex items-center space-x-3 space-x-reverse">
    <div class="w-6 h-6 ${isMostRecent ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'} rounded text-xs flex items-center justify-center">
        ${slideIndex + 1}
        ${isMostRecent ? '<i class="fas fa-star text-xs ml-1"></i>' : ''}
    </div>
    <div>
        <h5 class="text-sm font-medium text-gray-900">${Utils.escapeHTML(slide.title || '')}</h5>
        <p class="text-xs text-gray-500">${this.editor.getSlideTypeText(slide.type)}</p>
    </div>
</div>
${this.editor.page === 'editor' ? `
    <div class="slide-actions flex space-x-1 space-x-reverse">
        <button class="edit-slide p-1 text-gray-400 hover:text-blue-600" data-slide-id="${slide.id}">
            <i class="fas fa-edit text-xs"></i>
        </button>
        <button class="delete-slide p-1 text-gray-400 hover:text-red-600" data-slide-id="${slide.id}">
            <i class="fas fa-trash text-xs"></i>
        </button>
    </div>
    `: ''}

`;
                if (!isSlideUnlocked) {
                    slideItem.insertAdjacentHTML('beforeend', `
                    <button class="p-2 text-gray-400 hover:text-blue-600 lock-icon">
                        <i class="fa-solid fa-lock"></i>
                    </button>
                `);
                }
                listZone.appendChild(slideItem);
            });

            if (this.editor.page === 'editor') {
                listZone.innerHTML += `
                <div class="p-3">
                    <button class="add-slide-inside-lesson w-full flex items-center justify-center space-x-2 space-x-reverse py-2 px-3 border border-dashed border-gray-300 rounded text-gray-600 hover:border-green-500 hover:text-green-600 transition-colors text-sm" data-lesson-id="${lesson.id}">
                        <i class="fas fa-plus"></i>
                        <span>إضافة سلايد</span>
                    </button>
                </div>
            `;
            }

            lessonEl.appendChild(slidesWrap);
            container.appendChild(lessonEl);
        });

        if (this.editor.page === 'editor') this.editor.attachDragAndDrop();
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

        // In UIRenderer class, replace the styleScetion variable in loadSlideEditContent method:

        let styleScetion = `
<!-- Styling Controls Section -->
<div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4 mb-6">
    <details class="styling-controls-section">
        <summary class="cursor-pointer flex items-center justify-between">
            <h4 class="text-lg font-semibold text-gray-800">إعدادات التنسيق</h4>
            <i class="fas fa-chevron-down text-gray-500 transition-transform"></i>
        </summary>
        
        <div class="mt-4 space-y-4">
            <!-- Lesson Background -->
            <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h5 class="text-sm font-medium text-gray-700 mb-2">خلفية الدرس (لجميع الشرائح)</h5>
                <div class="space-y-2">
                    <div class="flex items-center space-x-2 space-x-reverse">
                        <input type="radio" id="bg-default" name="lesson-background" value="default" 
                            ${(!lesson.background) ? 'checked' : ''} class="text-blue-600">
                        <label for="bg-default" class="text-sm text-gray-700">الخلفية الافتراضية</label>
                    </div>
                    <div class="flex items-center space-x-2 space-x-reverse">
                        <input type="radio" id="bg-custom" name="lesson-background" value="custom" 
                            ${(lesson.background) ? 'checked' : ''} class="text-blue-600">
                        <label for="bg-custom" class="text-sm text-gray-700">صورة مخصصة</label>
                    </div>
                    <div id="bg-image-input" class="${lesson.background ? '' : 'hidden'}">
                        <div class="asset-input-group">
                            <input type="url" id="lesson-bg-image" value="${Utils.escapeHTML(lesson.background || '')}" 
                                class="asset-input w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                                placeholder="أدخل رابط الصورة..." />
                            <button type="button" class="asset-button open-assets-modal !w-32 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-150 flex items-center justify-center text-sm"
                                    data-asset-type="images" data-target-field="lesson-bg-image"
                                    title="اختر من الأصول المحفوظة">
                                <i class="fas fa-images ml-2"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Title Styling -->
            <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h5 class="text-sm font-medium text-gray-700 mb-2">تنسيق العنوان الرئيسي</h5>
                <div class="space-y-3">
                    <!-- Text Size -->
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">حجم النص</label>
                        <select id="title-text-size" class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                            <option value="xs" ${(slide.textStyle?.title?.size === 'xs') ? 'selected' : ''}>صغير جداً</option>
                            <option value="s" ${(slide.textStyle?.title?.size === 's') ? 'selected' : ''}>صغير</option>
                            <option value="m" ${(!slide.textStyle?.title?.size || slide.textStyle.title.size === 'm') ? 'selected' : ''}>متوسط</option>
                            <option value="l" ${(slide.textStyle?.title?.size === 'l') ? 'selected' : ''}>كبير</option>
                            <option value="xl" ${(slide.textStyle?.title?.size === 'xl') ? 'selected' : ''}>كبير جداً</option>
                        </select>
                    </div>

                    <!-- Font Weight -->
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">سمك الخط</label>
                        <select id="title-font-weight" class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                            <option value="300" ${(slide.textStyle?.title?.fontWeight === '300') ? 'selected' : ''}>خفيف</option>
                            <option value="500" ${(!slide.textStyle?.title?.fontWeight || slide.textStyle.title.fontWeight === '500') ? 'selected' : ''}>متوسط</option>
                            <option value="800" ${(slide.textStyle?.title?.fontWeight === '800') ? 'selected' : ''}>ثقيل</option>
                        </select>
                    </div>

                    <!-- Text Color -->
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">لون النص</label>
                        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                            <input type="color" id="title-text-color" 
                                value="${(slide.textStyle?.title?.color) ? slide.textStyle.title.color : '#ffffff'}" 
                                class="w-full sm:w-12 h-10 border border-gray-300 rounded" />
                            <input type="text" id="title-text-color-hex" 
                                value="${(slide.textStyle?.title?.color) ? slide.textStyle.title.color : '#ffffff'}" 
                                class="w-full px-2 py-1 border border-gray-300 rounded text-sm" 
                                placeholder="#ffffff" maxlength="7" />
                        </div>
                    </div>

                    <!-- Italic -->
                    <div class="flex items-center pt-1">
                        <input type="checkbox" id="title-text-italic" 
                            ${(slide.textStyle?.title?.italic) ? 'checked' : ''} 
                            class="w-4 h-4 text-blue-600 border-gray-300 rounded">
                        <label for="title-text-italic" class="mr-2 text-xs text-gray-700">نص مائل</label>
                    </div>
                </div>
            </div>

            <!-- Subtitle Styling -->
            <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h5 class="text-sm font-medium text-gray-700 mb-2">تنسيق العنوان الفرعي</h5>
                <div class="space-y-3">
                    <!-- Text Size -->
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">حجم النص</label>
                        <select id="subtitle-text-size" class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                            <option value="xs" ${(slide.textStyle?.subtitle?.size === 'xs') ? 'selected' : ''}>صغير جداً</option>
                            <option value="s" ${(slide.textStyle?.subtitle?.size === 's') ? 'selected' : ''}>صغير</option>
                            <option value="m" ${(!slide.textStyle?.subtitle?.size || slide.textStyle.subtitle.size === 'm') ? 'selected' : ''}>متوسط</option>
                            <option value="l" ${(slide.textStyle?.subtitle?.size === 'l') ? 'selected' : ''}>كبير</option>
                            <option value="xl" ${(slide.textStyle?.subtitle?.size === 'xl') ? 'selected' : ''}>كبير جداً</option>
                        </select>
                    </div>

                    <!-- Font Weight -->
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">سمك الخط</label>
                        <select id="subtitle-font-weight" class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                            <option value="300" ${(slide.textStyle?.subtitle?.fontWeight === '300') ? 'selected' : ''}>خفيف</option>
                            <option value="500" ${(!slide.textStyle?.subtitle?.fontWeight || slide.textStyle.subtitle.fontWeight === '500') ? 'selected' : ''}>متوسط</option>
                            <option value="800" ${(slide.textStyle?.subtitle?.fontWeight === '800') ? 'selected' : ''}>ثقيل</option>
                        </select>
                    </div>

                    <!-- Text Color -->
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">لون النص</label>
                        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                            <input type="color" id="subtitle-text-color" 
                                value="${(slide.textStyle?.subtitle?.color) ? slide.textStyle.subtitle.color : '#e5e7eb'}" 
                                class="w-full sm:w-12 h-10 border border-gray-300 rounded">
                            <input type="text" id="subtitle-text-color-hex" 
                                value="${(slide.textStyle?.subtitle?.color) ? slide.textStyle.subtitle.color : '#e5e7eb'}" 
                                class="w-full px-2 py-1 border border-gray-300 rounded text-sm" 
                                placeholder="#e5e7eb" maxlength="7">
                        </div>
                    </div>

                    <!-- Italic -->
                    <div class="flex items-center pt-1">
                        <input type="checkbox" id="subtitle-text-italic" 
                            ${(slide.textStyle?.subtitle?.italic) ? 'checked' : ''} 
                            class="w-4 h-4 text-blue-600 border-gray-300 rounded">
                        <label for="subtitle-text-italic" class="mr-2 text-xs text-gray-700">نص مائل</label>
                    </div>
                </div>
            </div>

            <!-- Content Styling -->
            <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h5 class="text-sm font-medium text-gray-700 mb-2">تنسيق المحتوى</h5>
                <div class="space-y-3">
                    <!-- Text Size -->
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">حجم النص</label>
                        <select id="content-text-size" class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                            <option value="xs" ${(slide.textStyle?.content?.size === 'xs') ? 'selected' : ''}>صغير جداً</option>
                            <option value="s" ${(slide.textStyle?.content?.size === 's') ? 'selected' : ''}>صغير</option>
                            <option value="m" ${(!slide.textStyle?.content?.size || slide.textStyle.content.size === 'm') ? 'selected' : ''}>متوسط</option>
                            <option value="l" ${(slide.textStyle?.content?.size === 'l') ? 'selected' : ''}>كبير</option>
                            <option value="xl" ${(slide.textStyle?.content?.size === 'xl') ? 'selected' : ''}>كبير جداً</option>
                        </select>
                    </div>

                    <!-- Font Weight -->
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">سمك الخط</label>
                        <select id="content-font-weight" class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                            <option value="300" ${(slide.textStyle?.content?.fontWeight === '300') ? 'selected' : ''}>خفيف</option>
                            <option value="500" ${(!slide.textStyle?.content?.fontWeight || slide.textStyle.content.fontWeight === '500') ? 'selected' : ''}>متوسط</option>
                            <option value="800" ${(slide.textStyle?.content?.fontWeight === '800') ? 'selected' : ''}>ثقيل</option>
                        </select>
                    </div>

                    <!-- Text Color -->
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">لون النص</label>
                        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                            <input type="color" id="content-text-color" 
                                value="${(slide.textStyle?.content?.color) ? slide.textStyle.content.color : '#ffffff'}" 
                                class="w-full sm:w-12 h-10 border border-gray-300 rounded">
                            <input type="text" id="content-text-color-hex" 
                                value="${(slide.textStyle?.content?.color) ? slide.textStyle.content.color : '#ffffff'}" 
                                class="w-full px-2 py-1 border border-gray-300 rounded text-sm" 
                                placeholder="#ffffff" maxlength="7">
                        </div>
                    </div>

                    <!-- Italic -->
                    <div class="flex items-center pt-1">
                        <input type="checkbox" id="content-text-italic" 
                            ${(slide.textStyle?.content?.italic) ? 'checked' : ''} 
                            class="w-4 h-4 text-blue-600 border-gray-300 rounded">
                        <label for="content-text-italic" class="mr-2 text-xs text-gray-700">نص مائل</label>
                    </div>
                </div>
            </div>

            <!-- Button Styling -->
            <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <h5 class="text-sm font-medium text-gray-700 mb-2">تنسيق الأزرار</h5>
                <div class="space-y-3">
                    <!-- Background Color -->
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">لون الخلفية</label>
                        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                            <input type="color" id="button-bg-color"
                                value="${(slide.textStyle?.button?.backgroundColor) ? slide.textStyle.button.backgroundColor : '#2563eb'}" 
                                class="w-full sm:w-12 h-10 border border-gray-300 rounded">
                            <input type="text" id="button-bg-color-hex" 
                                value="${(slide.textStyle?.button?.backgroundColor) ? slide.textStyle.button.backgroundColor : '#2563eb'}" 
                                class="w-full px-2 py-1 border border-gray-300 rounded text-sm" 
                                placeholder="#2563eb" maxlength="7">
                        </div>
                    </div>

                    <!-- Text Color -->
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">لون النص</label>
                        <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                            <input type="color" id="button-text-color" 
                                value="${(slide.textStyle?.button?.color) ? slide.textStyle.button.color : '#ffffff'}" 
                                class="w-full sm:w-12 h-10 border border-gray-300 rounded">
                            <input type="text" id="button-text-color-hex" 
                                value="${(slide.textStyle?.button?.color) ? slide.textStyle.button.color : '#ffffff'}" 
                                class="w-full px-2 py-1 border border-gray-300 rounded text-sm" 
                                placeholder="#ffffff" maxlength="7">
                        </div>
                    </div>

                    <!-- Text Size -->
                    <div>
                        <label class="block text-xs text-gray-600 mb-1">حجم النص</label>
                        <select id="button-text-size" class="w-full px-2 py-1 border border-gray-300 rounded text-sm">
                            <option value="xs" ${(slide.textStyle?.button?.size === 'xs') ? 'selected' : ''}>صغير جداً</option>
                            <option value="s" ${(slide.textStyle?.button?.size === 's') ? 'selected' : ''}>صغير</option>
                            <option value="m" ${(!slide.textStyle?.button?.size || slide.textStyle.button.size === 'm') ? 'selected' : ''}>متوسط</option>
                            <option value="l" ${(slide.textStyle?.button?.size === 'l') ? 'selected' : ''}>كبير</option>
                            <option value="xl" ${(slide.textStyle?.button?.size === 'xl') ? 'selected' : ''}>كبير جداً</option>
                        </select>
                    </div>

                    <!-- Italic -->
                    <div class="flex items-center pt-1">
                        <input type="checkbox" id="button-text-italic" 
                            ${(slide.textStyle?.button?.italic) ? 'checked' : ''} 
                            class="w-4 h-4 text-blue-600 border-gray-300 rounded">
                        <label for="button-text-italic" class="mr-2 text-xs text-gray-700">نص مائل</label>
                    </div>
                </div>
            </div>
        </div>

        <!-- Reset Button -->
        <button id="reset-text-style" class="w-full mt-4 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm">
            إعادة التعيين إلى الافتراضي
        </button>
    </details>
</div>
`;


        let html = ` ${styleScetion}
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
            case 'pdf-pdf':
                html += this.renderPDFEditor(slide);
                break;
            case 'text-welcome':
                html += `
                    <div class="bg-white p-4 rounded-lg shadow border border-gray-200 mt-4">
                        <h4 class="text-lg font-semibold mb-3 text-gray-800">النص الترحيبي</h4>
                        <textarea id="edit-generic-text" rows="6" class="w-full px-3 py-2 border border-gray-300 rounded-lg">${Utils.escapeHTML(slide.content.text || '')}</textarea>
                    </div>
                `;
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

        // Add Styling Controls Section

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

        if (this.editor.page === 'editor') {
            if (this._quizScoreHandler) {
                this.editor.dom.slideEditContent.removeEventListener('input', this._quizScoreHandler);
            }

            // Create a named function for the event handler
            this._quizScoreHandler = (e) => {
                if (e.target.classList.contains('quiz-score-input')) {
                    let value = parseInt(e.target.value) || 0;
                    // Double validation to ensure value is between 0 and 5
                    value = Math.max(0, Math.min(5, value));
                    e.target.value = value;

                    // Handle single question quizzes (using data attribute)
                    if (e.target.hasAttribute('data-quiz-type') && e.target.getAttribute('data-quiz-type') === 'single') {
                        this.editor.updateSlideContent(slideId, 'score', value);
                        console.log('Updating single quiz score for slide:', slideId, 'value:', value);
                    }
                    // Handle multi-question quizzes
                    else {
                        // Get the quiz type and index from data attributes
                        if (e.target.hasAttribute('data-connect-left')) {
                            const index = parseInt(e.target.getAttribute('data-connect-left'));
                            this.editor.updateNestedContent(slideId, 'leftColumn', index, 'score', value);
                            console.log('Updating connect quiz score for slide:', slideId, 'left index:', index, 'value:', value);
                        }
                        else if (e.target.hasAttribute('data-drag-left')) {
                            const index = parseInt(e.target.getAttribute('data-drag-left'));
                            this.editor.updateNestedContent(slideId, 'leftColumn', index, 'score', value);
                            console.log('Updating drag quiz score for slide:', slideId, 'left index:', index, 'value:', value);
                        }
                        else if (e.target.hasAttribute('data-pairs-left')) {
                            const index = parseInt(e.target.getAttribute('data-pairs-left'));
                            this.editor.updateNestedContent(slideId, 'leftColumn', index, 'score', value);
                            console.log('Updating pairs quiz score for slide:', slideId, 'left index:', index, 'value:', value);
                        }
                        else if (e.target.hasAttribute('data-pairs-right')) {
                            const index = parseInt(e.target.getAttribute('data-pairs-right'));
                            this.editor.updateNestedContent(slideId, 'rightColumn', index, 'score', value);
                            console.log('Updating pairs quiz score for slide:', slideId, 'right index:', index, 'value:', value);
                        }
                    }
                }
            };

            // Add the event listener
            this.editor.dom.slideEditContent?.addEventListener('input', this._quizScoreHandler);
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
            if (slide.content.answers.length >= 6) {
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

        this.editor.updateNavigationButtons();
    }

    getChooseSlidePlaceholder() {
        return `
            <div class="text-center text-gray-500 py-12">
                <i class="fas fa-edit text-4xl mb-4"></i>
                <p>اختر سلايداً للتعديل</p>
            </div>`;
    }

    setUnitSize() {
        setTimeout(() => {
            const element = document.querySelector('#slide-preview-container');
            if (!element) { /* preview not present yet */ return; }

            const rect = element.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;

            const smallerDimension = Math.min(width, height);

            let unitSize = Math.max(1, Math.min(5, Math.floor(smallerDimension / 100)));

            const unitValue = unitSize + 'px';

            element.style.setProperty('--slide-unit', unitValue);
            element.style.setProperty('--unit', unitValue);
        }
            , 300)
    }


    // slide templates
    renderSlideTemplates(category = 'text') {
        const container = this.editor.dom.slideTemplatesContainer;
        if (!container) return;
        const templates = this.editor.slideTemplates[category] || [];
        if (!templates.length) {
            container.innerHTML = `< p class="text-gray-500" > لا توجد قوالب متاحة لهذا القسم.</ > `;
            return;
        }
        container.innerHTML = `
    <div class="template-grid grid grid-cols-2 gap-4" >
        ${templates.map(t => `
                    <div class="template-card p-4 border rounded-lg cursor-pointer" data-type="${category}" data-subtype="${t.subtype}">
                        <div class="template-preview mb-2">
                            <i class="fas ${t.icon} text-2xl"></i>
                        </div>
                        <div class="template-info">
                            <h4 class="template-title font-semibold">${Utils.escapeHTML(t.title)}</h4>
                            <p class="template-description text-sm text-gray-500">${Utils.escapeHTML(t.description)}</p>
                        </div>
                    </div>`).join('')
            }
    </div >
    `;
    }

    // TODO
    renderMobileSlidesBar() {
        const lessonsTabs = document.getElementById('mobile-lessons-tabs');
        const slidesScroll = document.getElementById('mobile-slides-scroll');
        if (!lessonsTabs || !slidesScroll) return;

        lessonsTabs.innerHTML = this.editor.lessons.map(l =>
            `<button class="lesson-tab ${l.id === this.editor.currentLessonId ? 'active' : ''}" data-lesson-id="${l.id}">
                ${Utils.escapeHTML(l.title)}
            </button>`
        ).join(' ');

        const lesson = this.editor.findLessonById(this.editor.currentLessonId);
        if (!lesson) return;
        slidesScroll.innerHTML = lesson.slides.map((s, i) =>
            `<div class="slide-square ${s.id === this.editor.currentSlideId ? 'active' : ''}"
data-slide-id="${s.id}" data-lesson-id="${lesson.id}">
    ${i + 1}
            </div>`
        ).join('');
        // Add a button to add a new slide in the selected lesson
        slidesScroll.innerHTML += `
    <button class="add-slide-inside-lesson" data-lesson-id="${lesson.id}">
        <i class="fas fa-plus"></i>
            </button>
    `;

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
export { UIRenderer };