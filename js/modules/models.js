class Slide {
  constructor({ id, title = 'سلايد جديد', type = 'content', subtype = 'undefined', content = {}, textStyle = null } = {}) {
    this.id = id;
    this.title = title;
    this.type = type;
    this.subtype = subtype;
    this.content = content;
    this.userChoice = this.userChoice ?? null;
    this.submitted = this.submitted ?? false;
    this.textStyle = textStyle;
  }
}

class Lesson {
  constructor({ id, title = 'درس جديد', order_index, status, background = null, slides = [] } = {}) {
    this.status = status;
    this.order_index = order_index;
    this.id = id;
    this.title = title;
    this.slides = slides.map(s => new Slide(s));
    this.background = background;
  }

  nextSlideId() {
    if (!this.slides.length) return 1;
    return Math.max(...this.slides.map(s => s.id)) + 1;
  }
}

export { Slide, Lesson };