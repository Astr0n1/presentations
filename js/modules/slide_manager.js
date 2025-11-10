import { Slide, Lesson } from './models.js';
import { ApiService } from './api.js';

////////////////////////////////////////////////////
// SlideManager — data + persistence + CRUD
////////////////////////////////////////////////////
class SlideManager {
  constructor(editor) {
    this.editor = editor;
  }

  saveToLocalStorage() {
    try {
      // call the function in api.js that is called updateLessonContent with id = 7
      localStorage.setItem('course_lessons', JSON.stringify(this.editor.lessons));
    } catch (err) {
      console.error('Failed saving lessons to localStorage', err);
    }
  }

  async loadFromLocalStorage() {
    try {
      const courseId = localStorage.getItem('C_id');
      if (courseId) {
        const fetchedLessons = await ApiService.getCourseLessons(courseId);
        console.log(fetchedLessons)
        if (fetchedLessons) {
          this.editor.lessons = fetchedLessons.map(l => new Lesson({
            id: l.id,
            title: l.name,
            order_index: l.order_index,
            status: l.status,
            background: l.background || null,
            slides: l.content?.length ? l.content.map(s => new Slide(s)) : []
          }));
          if (this.editor.lessons.length && !this.editor.currentLessonId) {
            this.editor.currentLessonId = this.editor.lessons[0].id;
          }
          console.log(this.editor.lessons);
          this.ensureInitialState();
          this.editor.renderLessonsSidebar();
          return;
        }
      }
      else {
        window.location.href = 'unauthorized.html';
      }

      const raw = localStorage.getItem('course_lessons');
      if (raw) {
        const parsed = JSON.parse(raw);
        this.editor.lessons = parsed.map(l => new Lesson(l));
        if (this.editor.lessons.length && !this.editor.currentLessonId) {
          this.editor.currentLessonId = this.editor.lessons[0].id;
          console.log(this.editor.lessons);
        }
      } else {
        this.editor.lessons = [];
      }
    } catch (err) {
      console.error('Failed loading lessons from localStorage', err);
      this.editor.lessons = [];
    }
    this.ensureInitialState();
    this.editor.renderLessonsSidebar();
  }
  templateSlide() {
    return new Slide({
      id: 1,
      title: 'مرحباً',
      type: 'title',
      subtype: 'undefined',
      content: {
        title: 'مرحباً بكم!',
        subtitle: 'مرحبا بكم في الدرس الجديد قم باضافة بعد الشرائح للدرس',
        buttonText: 'ابدأ التعلم'
      },
      textStyle: {
        size: 'm',
        fontFamily: 'tajawal',
        color: '#ffffff',
        italic: false
      }
    })
  }
  ensureInitialState() {
    // console.log(this.editor.lessons)
    if (!this.editor.lessons || !this.editor.lessons.length) {
      const sample = new Lesson({
        id: Date.now(),
        title: 'الدرس الأول',
        slides: [
          this.templateSlide()
        ],
        background: null
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

  // after adding the new lesson expand / collapse functionality not working
  async addNewLesson() {
    try {
      const response = await ApiService.addNewLesson(`درس جديد ${this.editor.lessons.length + 1}`, localStorage.getItem('C_id'))
      console.log(response)
      if (response.status === 'success') {
        const newLesson = new Lesson({
          C_id: response.data.C_id,
          id: response.data.id,
          order_index: response.data.order_index,
          title: response.data.name,
          status: response.data.status,
          slides: []
        });
        this.editor.lessons.push(newLesson);
        this.editor.currentLessonId = newLesson.id;
        this.editor.currentSlideId = null;
        this.saveToLocalStorage();
        this.editor.loadFromLocalStorage();
        this.editor.renderLessonsSidebar();
        this.editor.updateLessonHeader();
        Swal.fire({ icon: 'success', text: 'تم إضافة الدرس بنجاح!' });
      } else {
        Swal.fire({ icon: 'error', text: 'حدث خطأ أثناء إضافة الدرس: ' + response.data.message });
        return
      }
    }
    catch (error) {
      console.error('Error adding new lesson:', error);
      Swal.fire({ icon: 'error', text: 'حدث خطأ غير متوقع أثناء إضافة الدرس.' });
      return
    }

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
    console.log(this.editor.currentLessonId)
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
    console.log('??')
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
      if (subtype === 'multiple-choice-carousel') {
        return {
          question: '',
          answers: ['الإجابة 1', 'الإجابة 2'],
          correct: 1 // Default to first answer
        };
      }
      if (subtype === 'categorize') {
        return {
          question: '',
          categories: ['التصنيف 1', 'التصنيف 2'],
          correct: 0 // Default to first category
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
      // Handle empty slide title - use empty string instead of default
      slide.title = value.trim() === '' ? '' : value;
      const slideItem = document.querySelector(`.slide-item[data-slide-id="${slideId}"] h5`);
      if (slideItem) {
        slideItem.textContent = slide.title || ''; // Show empty if title is empty
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

export { SlideManager };