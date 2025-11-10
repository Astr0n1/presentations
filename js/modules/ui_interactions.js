import { ApiService } from './api.js';
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
    if (saveBtn) saveBtn.addEventListener('click', async () => {
      const course = this.editor.lessons

      course.forEach(lesson => {
        console.log(lesson)
        // ApiService.updateLessonContent(lesson.id, lesson.slides, lesson.background)
        ApiService.updateLessonContent(lesson.id, lesson.slides, lesson.background)
          .then(response => {
            if (response.status === 'success') {
              Swal.fire({ icon: 'success', text: 'تم حفظ التغييرات بنجاح!' });
            } else {
              Swal.fire({ icon: 'error', text: 'حدث خطأ أثناء حفظ التغييرات: ' + response.message });
            }
          })
          .catch(error => {
            console.error('Error saving changes:', error);
            Swal.fire({ icon: 'error', text: 'حدث خطأ غير متوقع أثناء حفظ التغييرات.' });
          });
      })
    });

    const addLessonBtn = document.getElementById('add-lesson-btn');
    if (addLessonBtn) addLessonBtn.addEventListener('click', () => this.editor.addNewLesson());

    const cancelAddSlide = document.getElementById('cancel-add-slide');
    if (cancelAddSlide) cancelAddSlide.addEventListener('click', () => this.editor.hideAddSlideModal());

    // Close modal button
    const closeAddSlideModal = document.getElementById('close-add-slide-modal');
    if (closeAddSlideModal) closeAddSlideModal.addEventListener('click', () => this.editor.hideAddSlideModal());

    // Close modal when clicking outside
    const addSlideModal = document.getElementById('add-slide-modal');
    if (addSlideModal) {
      addSlideModal.addEventListener('click', (e) => {
        if (e.target === addSlideModal) {
          this.editor.hideAddSlideModal();
        }
      });
    }

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

    // Close modal with ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.editor.dom.addSlideModal && !this.editor.dom.addSlideModal.classList.contains('hidden')) {
        this.editor.hideAddSlideModal();
      }
    });

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

    // Add these event listeners in the setupEventListeners method:

    // Lesson background controls
    document.addEventListener('change', (e) => {
      if (e.target.name === 'lesson-background') {
        const lesson = this.editor.findLessonById(this.editor.currentLessonId);
        if (!lesson) return;

        if (e.target.value === 'default') {
          lesson.background = null;
          const bgImageInput = document.getElementById('bg-image-input');
          if (bgImageInput) bgImageInput.classList.add('hidden');
        } else {
          const bgImageInput = document.getElementById('bg-image-input');
          if (bgImageInput) bgImageInput.classList.remove('hidden');
          // Keep existing background if any, or wait for URL input
        }
        this.editor.saveToLocalStorage();
        this.editor.loadSlidePreview(this.editor.currentSlideId);
      }
    });

    // Background image URL input
    document.addEventListener('input', (e) => {
      if (e.target.id === 'lesson-bg-image') {
        const lesson = this.editor.findLessonById(this.editor.currentLessonId);
        if (!lesson) return;

        lesson.background = e.target.value.trim();
        this.editor.saveToLocalStorage();
        this.editor.loadSlidePreview(this.editor.currentSlideId);
      }
    });

    // Test background image button
    document.addEventListener('click', (e) => {
      if (e.target.id === 'test-bg-image') {
        const urlInput = document.getElementById('lesson-bg-image');
        if (!urlInput) return;

        const testUrl = urlInput.value.trim();

        if (!testUrl) {
          Swal.fire('تنبيه', 'يرجى إدخال رابط الصورة أولاً', 'warning');
          return;
        }

        const img = new Image();
        img.onload = () => {
          Swal.fire('نجاح', 'تم تحميل الصورة بنجاح!', 'success');
        };
        img.onerror = () => {
          Swal.fire('خطأ', 'تعذر تحميل الصورة. يرجى التحقق من الرابط.', 'error');
          urlInput.focus();
        };
        img.src = testUrl;
      }
    });

    document.addEventListener('change', (e) => {
      const slide = this.editor.getCurrentSlide();
      if (!slide || !this.editor.currentSlideId) return;

      if (['text-size', 'font-family', 'text-color', 'text-italic'].includes(e.target.id)) {
        slide.textStyle = slide.textStyle || {};

        switch (e.target.id) {
          case 'text-size':
            slide.textStyle.size = e.target.value;
            break;
          case 'font-family':
            slide.textStyle.fontFamily = e.target.value;
            break;
          case 'text-color':
            slide.textStyle.color = e.target.value;
            // Sync hex input
            const hexInput = document.getElementById('text-color-hex');
            if (hexInput) hexInput.value = e.target.value;
            break;
          case 'text-italic':
            slide.textStyle.italic = e.target.checked;
            break;
        }

        this.editor.saveToLocalStorage();
        // Force complete re-render of the preview
        this.editor.renderSlidePreview(slide);
      }
    });

    document.addEventListener('input', (e) => {
      if (e.target.id === 'lesson-bg-image') {
        const lesson = this.editor.findLessonById(this.editor.currentLessonId);
        if (!lesson) return;

        lesson.background = e.target.value.trim();
        this.editor.saveToLocalStorage();
        // Force re-render of current slide preview
        const currentSlide = this.editor.getCurrentSlide();
        if (currentSlide) {
          this.editor.renderSlidePreview(currentSlide);
        }
      }
    });

    // Hex color input sync
    document.addEventListener('input', (e) => {
      if (e.target.id === 'text-color-hex') {
        const colorInput = document.getElementById('text-color');
        if (!colorInput) return;

        const hexValue = e.target.value;

        // Basic hex validation - allow both with and without #
        let validHex = hexValue;
        if (hexValue && !hexValue.startsWith('#')) {
          validHex = '#' + hexValue;
        }

        if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(validHex)) {
          colorInput.value = validHex;
          e.target.value = validHex;
          // Trigger the change event
          colorInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });

    // Reset text style button
    document.addEventListener('click', (e) => {
      if (e.target.id === 'reset-text-style') {
        const slide = this.editor.getCurrentSlide();
        if (!slide) return;

        slide.textStyle = null;
        this.editor.saveToLocalStorage();
        this.editor.loadSlideEditContent(this.editor.currentSlideId);
        this.editor.loadSlidePreview(this.editor.currentSlideId);

        Swal.fire('تم', 'تم إعادة تعيين التنسيق إلى الافتراضي', 'success');
      }
    });
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
      if (this.editor.lessons.length === 1) {
        // show sweet alert showing you can't have an empty course       
        Swal.fire('تنبيه', 'لا يمكن أن تكون هناك دورة فارغة. يرجى إضافة درس جديد أولاً.', 'warning');

        return
      }
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
          //  call deleteLesson function from api.js file 
          ApiService.deleteLesson(lessonId)
            .then(response => {
              if (response.status === 'success') {
                this.editor.slideManager.deleteLessonById(lessonId);
                this.editor.loadFromLocalStorage();
                Swal.fire({
                  icon: 'success',
                  title: 'تم الحذف',
                  text: 'تم حذف الدرس بنجاح.',
                  timer: 1400,
                  showConfirmButton: false
                });
              } else {
                Swal.fire({ icon: 'error', text: 'حدث خطأ أثناء حذف الدرس: ' + response.message });
              }
            })
            .catch(error => {
              console.error('Error deleting lesson:', error);
              Swal.fire({ icon: 'error', text: 'حدث خطأ غير متوقع أثناء حذف الدرس.' });
            });
        }
      });
      return;
    }

    // delete lesson (header trash button)
    const publishLessonBtn = target.closest('.toggle-lesson-status');
    if (publishLessonBtn) {
      const lessonId = parseInt(publishLessonBtn.dataset.lessonId, 10);
      if (isNaN(lessonId)) return;
      e.stopPropagation();

      Swal.fire({
        text: 'هل أنت متأكد من نشر / الغاء نشر الدرس',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'نعم، تأكيد!',
        cancelButtonText: 'إلغاء'
      }).then((result) => {
        if (result.isConfirmed) {
          ApiService.changeLessonStatus(lessonId)
            .then(response => {
              if (response.status === 'success') {
                Swal.fire({
                  icon: 'success',
                  title: 'تم تغيير حالة النشر بنجاح',
                  timer: 1400,
                  showConfirmButton: false
                });
                this.editor.loadFromLocalStorage();
              } else {
                Swal.fire({ icon: 'error', text: 'حدث خطأ أثناء تغيير حالة الدرس الدرس: ' + response.message });
              }
            })
            .catch(error => {
              console.error('Error changing lesson status:', error);
              Swal.fire({ icon: 'error', text: 'حدث خطأ غير متوقع أثناء تغيير حالة الدرس.' });
            });
        }
      });
      return;
    }


    // 🧩 Add category (hide button if 4 reached)
    if (target.id === 'add-category-btn' || target.closest('#add-category-btn')) {
      const slide = this.editor.getCurrentSlide();
      if (!slide) return;

      slide.content.categories = slide.content.categories || [];

      // Stop adding beyond 4
      if (slide.content.categories.length >= 4) {
        Swal.fire('حد أقصى', 'لا يمكن إضافة أكثر من 4 تصنيفات.', 'warning');
        return;
      }

      slide.content.categories.push('');
      this.editor.saveToLocalStorage();

      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        this.editor.loadSlideEditContent(slide.id);
      }, 50);
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

    const expandLessonBtn = target.closest('.expand-lesson-btn');
    if (expandLessonBtn) {
      const lessonItem = expandLessonBtn.closest('.lesson-item');
      if (lessonItem) {
        const lessonId = parseInt(lessonItem.dataset.lessonId, 10);

        // Toggle expansion state
        this.editor.toggleLessonExpansion(lessonId);

        // Re-render the sidebar to update the arrow icon
        this.editor.renderLessonsSidebar();
        return;
      }
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
export { UIInteractions };