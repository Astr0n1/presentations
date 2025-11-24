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
        // Use default value if not set
        if (c.correct === undefined || c.correct === null) {
          c.correct = 1; // Default to first answer
        }
        break;

      case 'categorize':
        if (!c.categories || c.categories.length < 2) {
          return { isValid: false, message: 'يجب إدخال على الأقل تصنيفين' };
        }
        // Use default value if not set
        if (c.correct === undefined || c.correct === null) {
          c.correct = 0; // Default to first category
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

  // In QuizManager.handleQuizSubmit, add this after the existing code:
  // In QuizManager.js, update the handleQuizSubmit method:
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

    if (this.editor.page === 'preview') this.editor.saveQuizScore(slide);

    // Redraw connect quiz lines with correct colors
    if (slide.subtype === 'connect-quiz') {
      setTimeout(() => {
        window.drawConnectQuizLines(slideId);
      }, 100);
    }

    // Show feedback animation
    this.showQuizFeedback(slide, containerId);

    // NEW: Show motivational popup if answer is correct
    const isCorrect = this.isAnswerCorrect(slide);
    if (isCorrect) {
      this.showMotivationalPopup();
    }
  }

  // Add this new method to QuizManager class:
  showMotivationalPopup() {
    const messages = [
      "ممتاز! أحسنت العمل 🌟",
      "رائع! استمر في التقدم 💪",
      "إجابتك صحيحة! أنت ذكي 🧠",
      "أحسنت! مستواك ممتاز 🚀",
      "عمل رائع! أنت تتقدم بسرعة ⚡",
      "إجابة صحيحة! فخور بك 🏆",
      "مذهل! استمر في التميز ✨",
      "برافو! أداء ممتاز 🎯",
      "إجابتك صحيحة! ذكاء خارق 🦸",
      "متفوق كالعادة! 🌈"
    ];

    // Select random message
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    // Show SweetAlert popup
    Swal.fire({
      title: 'تهانينا!',
      text: randomMessage,
      icon: 'success',
      timer: 2500, // 2.5 seconds
      timerProgressBar: true,
      showConfirmButton: false,
      position: 'top',
      background: '#f0fdf4',
      iconColor: '#16a34a'
    });
  }

  // Common feedback display
  showQuizFeedback(slide, containerId = null) {
    const isCorrect = this.isAnswerCorrect(slide);
    // play sound audio track in the background from media folder depending on the answer correct / wrong status
    const audio = new Audio();
    if (isCorrect) {
      audio.src = 'media/correct.mp3';
    } else {
      audio.src = 'media/wrong.mp3';
    }
    audio.play().catch(e => console.error("Error playing sound:", e));

    setTimeout(() => {
      // Try to find feedback element using containerId first, then fall back to slide id
      let feedbackEl = null;
      if (containerId) {
        feedbackEl = document.querySelector(`#${containerId} .quiz-feedback-icon`);
      }
      if (!feedbackEl) {
        feedbackEl = document.getElementById(`quiz-${slide.id}-feedback`);
      }



      if (feedbackEl) {
        feedbackEl.innerHTML = isCorrect
          ? '<i class="fas fa-check-circle"></i>'
          : '<i class="fas fa-times-circle"></i>';

        feedbackEl.className = `quiz-feedback-icon ${isCorrect ? 'correct' : 'incorrect'} animate-simple`;

        // Remove the element after animation
        setTimeout(() => {
          if (feedbackEl) {
            feedbackEl.remove();
          }
        }, 2000);
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
export { QuizManager };