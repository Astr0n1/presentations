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
export { DragDropManager };