import { Utils } from './utils.js';
import { ApiService } from './api.js';

class AssetsManager {
  constructor(editor) {
    this.editor = editor;
    this.currentAssetsType = 'images'; // 'images' or 'videos'
    this.selectedAsset = null;
    this.targetInputField = null;

    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Open modal buttons will be set up dynamically
    document.addEventListener('click', (e) => {
      if (e.target.closest('.open-assets-modal')) {
        const button = e.target.closest('.open-assets-modal');
        const assetType = button.dataset.assetType || 'images';
        const targetField = button.dataset.targetField;
        this.openModal(assetType, targetField);
      }
    });

    // Modal controls
    document.getElementById('close-saved-assets-modal')?.addEventListener('click', () => this.closeModal());
    document.getElementById('cancel-assets-selection')?.addEventListener('click', () => this.closeModal());
    document.getElementById('confirm-asset-selection')?.addEventListener('click', () => this.confirmSelection());
    document.getElementById('upload-from-device')?.addEventListener('click', () => this.triggerFileUpload());
    document.getElementById('file-upload-input')?.addEventListener('change', (e) => this.handleFileUpload(e));

    // Close modal when clicking outside
    document.getElementById('saved-assets-modal')?.addEventListener('click', (e) => {
      if (e.target.id === 'saved-assets-modal') {
        this.closeModal();
      }
    });
  }

  openModal(assetType, targetField) {
    this.currentAssetsType = assetType;
    this.targetInputField = targetField;
    this.selectedAsset = null;

    // Show modal
    document.getElementById('saved-assets-modal').classList.remove('hidden');

    // Load assets
    this.loadAssets();

    // Reset selection UI
    this.updateSelectionUI();
  }

  closeModal() {
    document.getElementById('saved-assets-modal').classList.add('hidden');
    this.selectedAsset = null;
    this.targetInputField = null;

    // Reset file input
    document.getElementById('file-upload-input').value = '';
  }

  async loadAssets() {
    const loadingEl = document.getElementById('assets-loading');
    const containerEl = document.getElementById('assets-container');
    const emptyEl = document.getElementById('assets-empty');
    const gridEl = document.getElementById('assets-grid');

    // Show loading
    loadingEl.classList.remove('hidden');
    containerEl.classList.add('hidden');
    emptyEl.classList.add('hidden');

    try {
      // Fetch assets from JSON file
      const response = await fetch(`https://barber.herova.net/api/edit/media/get${this.currentAssetsType === 'images' ? 'Images' : 'Vedioes'}.php`);
      const data = await response.json();

      const assets = data.data || [];
      console.log(assets)

      // Update title
      const titleEl = document.getElementById('assets-type-title');
      titleEl.textContent = this.currentAssetsType === 'images' ? 'الصور المحفوظة' : 'الفيديوهات المحفوظة';

      // Render assets
      this.renderAssets(assets, gridEl);

      // Show appropriate state
      if (assets.length > 0) {
        containerEl.classList.remove('hidden');
        emptyEl.classList.add('hidden');
      } else {
        containerEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
      }

    } catch (error) {
      console.error('Failed to load assets:', error);
      containerEl.classList.add('hidden');
      emptyEl.classList.remove('hidden');
      emptyEl.innerHTML = `
                <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-3"></i>
                <p class="text-red-500">فشل في تحميل الأصول</p>
            `;
    } finally {
      loadingEl.classList.add('hidden');
    }
  }

  renderAssets(assets, container) {
    container.innerHTML = assets.map(asset => `
            <div class="asset-card relative" data-asset-id="${asset.id}">
                <div class="asset-preview">
                    ${this.currentAssetsType === 'images' ?
        `<img src="${Utils.escapeHTML(asset.url)}" alt="${Utils.escapeHTML(asset.name)}" 
                              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />` :
        `<video src="${Utils.escapeHTML(asset.url)}" muted></video>
                         <div class="video-icon">
                             <i class="fas fa-play"></i>
                         </div>`
      }
                    <div class="fallback-placeholder hidden absolute inset-0 flex items-center justify-center bg-gray-200">
                        <i class="fas fa-${this.currentAssetsType === 'images' ? 'image' : 'video'} text-2xl text-gray-400"></i>
                    </div>
                </div>
                <div class="asset-info">
                    <div class="asset-type">${this.currentAssetsType === 'images' ? 'صورة' : 'فيديو'}</div>
                </div>
            </div>
        `).join('');

    // Add click listeners to asset cards
    container.querySelectorAll('.asset-card').forEach(card => {
      card.addEventListener('click', () => {
        this.selectAsset(card, assets.find(a => a.id == card.dataset.assetId));
      });
    });
  }

  selectAsset(card, asset) {
    // Deselect all assets
    document.querySelectorAll('.asset-card').forEach(c => {
      c.classList.remove('selected');
    });

    // Select clicked asset
    card.classList.add('selected');
    this.selectedAsset = asset;

    this.updateSelectionUI();
  }

  updateSelectionUI() {
    const confirmBtn = document.getElementById('confirm-asset-selection');
    const selectedInfo = document.getElementById('selected-asset-info');

    if (this.selectedAsset) {
      confirmBtn.classList.remove('hidden');
      selectedInfo.classList.remove('hidden');
    } else {
      confirmBtn.classList.add('hidden');
      selectedInfo.classList.add('hidden');
    }
  }

  // Enhanced method to handle all input types including data-target-field
  updateSlideContentDirectly(editor, targetInput) {
    const slideId = editor.currentSlideId;
    if (!slideId) return;

    const slide = editor.findSlide(editor.currentLessonId, slideId);
    if (!slide) return;

    console.log('🔄 Direct content update for slide:', slideId);
    console.log('📋 Input attributes:', {
      id: targetInput.id,
      dataset: targetInput.dataset,
      dataTargetField: targetInput.dataset.targetField
    });

    // Get the target field from data-target-field attribute
    const targetField = targetInput.dataset.targetField;

    // Handle inputs with data-target-field attribute
    if (targetField) {
      console.log('🎯 Processing data-target-field:', targetField);
      this.handleTargetFieldInput(editor, slideId, targetInput, targetField);
      return;
    }

    // Handle inputs with specific data attributes (original logic)
    if (targetInput.dataset.imageSeries !== undefined) {
      const index = parseInt(targetInput.dataset.imageSeries);
      const field = targetInput.dataset.field;
      if (!isNaN(index) && field) {
        editor.updateNestedContent(slideId, 'items', index, field, targetInput.value);
        console.log('✅ Updated image series item:', index, field, targetInput.value);
      }
    }
    else if (targetInput.dataset.imageCollection !== undefined) {
      const index = parseInt(targetInput.dataset.imageCollection);
      const field = targetInput.dataset.field;
      if (!isNaN(index) && field) {
        editor.updateNestedContent(slideId, 'sections', index, field, targetInput.value);
        console.log('✅ Updated image collection section:', index, field, targetInput.value);
      }
    }
    else if (targetInput.dataset.connectLeft !== undefined) {
      const index = parseInt(targetInput.dataset.connectLeft);
      const field = targetInput.dataset.field;
      if (!isNaN(index) && field) {
        editor.updateNestedContent(slideId, 'leftColumn', index, field, targetInput.value);
        console.log('✅ Updated connect quiz left item:', index, field, targetInput.value);
      }
    }
    else if (targetInput.dataset.connectRight !== undefined) {
      const index = parseInt(targetInput.dataset.connectRight);
      const field = targetInput.dataset.field;
      if (!isNaN(index) && field) {
        editor.updateNestedContent(slideId, 'rightColumn', index, field, targetInput.value);
        console.log('✅ Updated connect quiz right item:', index, field, targetInput.value);
      }
    }
    else if (targetInput.dataset.dragLeft !== undefined) {
      const index = parseInt(targetInput.dataset.dragLeft);
      const field = targetInput.dataset.field;
      if (!isNaN(index) && field) {
        editor.updateNestedContent(slideId, 'leftColumn', index, field, targetInput.value);
        console.log('✅ Updated drag match left item:', index, field, targetInput.value);
      }
    }
    else if (targetInput.dataset.dragRight !== undefined) {
      const index = parseInt(targetInput.dataset.dragRight);
      const field = targetInput.dataset.field;
      if (!isNaN(index) && field) {
        editor.updateNestedContent(slideId, 'rightColumn', index, field, targetInput.value);
        console.log('✅ Updated drag match right item:', index, field, targetInput.value);
      }
    }
    else if (targetInput.dataset.pairsLeft !== undefined) {
      const index = parseInt(targetInput.dataset.pairsLeft);
      const field = targetInput.dataset.field;
      if (!isNaN(index) && field) {
        editor.updateNestedContent(slideId, 'leftColumn', index, field, targetInput.value);
        console.log('✅ Updated image pairs left item:', index, field, targetInput.value);
      }
    }
    else if (targetInput.dataset.pairsRight !== undefined) {
      const index = parseInt(targetInput.dataset.pairsRight);
      const field = targetInput.dataset.field;
      if (!isNaN(index) && field) {
        editor.updateNestedContent(slideId, 'rightColumn', index, field, targetInput.value);
        console.log('✅ Updated image pairs right item:', index, field, targetInput.value);
      }
    }
    else {
      console.log('⚠️ No specific handler for input type, relying on event system');
    }

    // Force save to localStorage
    editor.saveToLocalStorage();
  }

  // Improved method to handle data-target-field inputs with proper UI refresh
  handleTargetFieldInput(editor, slideId, targetInput, targetField) {
    console.log('🎯 Handling target field:', targetField);

    // Store the original value for comparison
    const originalValue = targetInput.value;

    // Parse the target field to extract index and type information
    if (targetField.startsWith('image-series-')) {
      const index = parseInt(targetField.split('-')[2]);
      if (!isNaN(index)) {
        editor.updateNestedContent(slideId, 'items', index, 'imageUrl', targetInput.value);
        console.log('✅ Updated image series via target-field:', index, targetInput.value);
      }
    }
    else if (targetField.startsWith('image-collection-')) {
      const index = parseInt(targetField.split('-')[2]);
      if (!isNaN(index)) {
        editor.updateNestedContent(slideId, 'sections', index, 'imageUrl', targetInput.value);
        console.log('✅ Updated image collection via target-field:', index, targetInput.value);
      }
    }
    else if (targetField.startsWith('connect-left-')) {
      const index = parseInt(targetField.split('-')[2]);
      if (!isNaN(index)) {
        editor.updateNestedContent(slideId, 'leftColumn', index, 'value', targetInput.value);
        console.log('✅ Updated connect left via target-field:', index, targetInput.value);
      }
    }
    else if (targetField.startsWith('connect-right-')) {
      const index = parseInt(targetField.split('-')[2]);
      if (!isNaN(index)) {
        editor.updateNestedContent(slideId, 'rightColumn', index, 'value', targetInput.value);
        console.log('✅ Updated connect right via target-field:', index, targetInput.value);
      }
    }
    else if (targetField.startsWith('drag-left-')) {
      const index = parseInt(targetField.split('-')[2]);
      if (!isNaN(index)) {
        editor.updateNestedContent(slideId, 'leftColumn', index, 'value', targetInput.value);
        console.log('✅ Updated drag left via target-field:', index, targetInput.value);
      }
    }
    else if (targetField.startsWith('drag-right-')) {
      const index = parseInt(targetField.split('-')[2]);
      if (!isNaN(index)) {
        editor.updateNestedContent(slideId, 'rightColumn', index, 'value', targetInput.value);
        console.log('✅ Updated drag right via target-field:', index, targetInput.value);
      }
    }
    else if (targetField.startsWith('pairs-left-')) {
      const index = parseInt(targetField.split('-')[2]);
      if (!isNaN(index)) {
        editor.updateNestedContent(slideId, 'leftColumn', index, 'value', targetInput.value);
        console.log('✅ Updated pairs left via target-field:', index, targetInput.value);
      }
    }
    else if (targetField.startsWith('pairs-right-')) {
      const index = parseInt(targetField.split('-')[2]);
      if (!isNaN(index)) {
        editor.updateNestedContent(slideId, 'rightColumn', index, 'value', targetInput.value);
        console.log('✅ Updated pairs right via target-field:', index, targetInput.value);
      }
    }
    else {
      console.log('⚠️ Unknown target field pattern:', targetField);
    }

    // Force save to localStorage
    editor.saveToLocalStorage();

    // Refresh the edit form to update the input field display
    console.log('🔄 Refreshing edit form for slide:', slideId);
    editor.loadSlideEditContent(slideId);

    // Single preview refresh after a short delay to allow form refresh
    setTimeout(() => {
      console.log('🔄 Single preview refresh for slide:', slideId);
      editor.loadSlidePreview(slideId);
    }, 300);
  }

  confirmSelection() {
    if (this.selectedAsset && this.targetInputField) {
      console.log('🔧 Setting field:', this.targetInputField, 'to URL:', this.selectedAsset.url);

      let targetInput = null;

      // Strategy 1: Direct ID lookup (for simple fields like video URL)
      targetInput = document.getElementById(this.targetInputField);
      if (targetInput) {
        console.log('✅ Found by ID:', this.targetInputField);
      }

      // Strategy 2: Data attribute lookup for dynamic fields
      if (!targetInput) {
        targetInput = document.querySelector(`[data-target-field="${this.targetInputField}"]`);
        if (targetInput) {
          console.log('✅ Found by data-target-field:', this.targetInputField);
        }
      }

      // Strategy 3: Pattern-based lookup for complex dynamic fields
      if (!targetInput) {
        targetInput = this.findTargetInputByPattern(this.targetInputField);
        if (targetInput) {
          console.log('✅ Found by pattern:', this.targetInputField);
        }
      }

      // Strategy 4: Fallback - search all inputs with data attributes
      if (!targetInput) {
        console.log('🔍 Fallback search for:', this.targetInputField);
        // Look for any input that might match our target pattern
        const allInputs = document.querySelectorAll('input[data-connect-left], input[data-connect-right], input[data-drag-left], input[data-drag-right], input[data-pairs-left], input[data-pairs-right], input[data-image-collection], input[data-image-series]');

        for (const input of allInputs) {
          // Check if this input's data attributes match our target
          const inputId = this.getInputIdentifier(input);
          if (inputId === this.targetInputField) {
            targetInput = input;
            console.log('✅ Found in fallback search:', this.targetInputField);
            break;
          }
        }
      }

      if (targetInput) {
        // Set the value
        targetInput.value = this.selectedAsset.url;

        // Trigger only essential events
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        targetInput.dispatchEvent(new Event('change', { bubbles: true }));

        console.log('🎉 Successfully set value for:', this.targetInputField, 'New value:', targetInput.value);

        // Force immediate content update and UI refresh
        const editor = window.courseEditor || window.editor;
        if (editor && editor.currentSlideId) {
          this.updateSlideContentDirectly(editor, targetInput);
        }

        // Close modal on success
        this.closeModal();
      } else {
        console.warn('❌ Could not find target input field:', this.targetInputField);
        console.log('Available inputs with data attributes:');
        document.querySelectorAll('input[data-connect-left], input[data-connect-right], input[data-drag-left], input[data-drag-right], input[data-pairs-left], input[data-pairs-right], input[data-image-collection], input[data-image-series]').forEach(input => {
          console.log(' - ', this.getInputIdentifier(input), input);
        });

        Swal.fire({
          icon: 'warning',
          title: 'تعذر العثور على الحقل',
          text: `لم يتم العثور على الحقل المستهدف: ${this.targetInputField}`,
          timer: 3000
        });
      }
    } else {
      console.warn('No asset selected or no target field specified');
      this.closeModal();
    }
  }

  // Add this helper method to identify inputs
  getInputIdentifier(input) {
    if (input.dataset.connectLeft !== undefined) {
      return `connect-left-${input.dataset.connectLeft}`;
    }
    if (input.dataset.connectRight !== undefined) {
      return `connect-right-${input.dataset.connectRight}`;
    }
    if (input.dataset.dragLeft !== undefined) {
      return `drag-left-${input.dataset.dragLeft}`;
    }
    if (input.dataset.dragRight !== undefined) {
      return `drag-right-${input.dataset.dragRight}`;
    }
    if (input.dataset.pairsLeft !== undefined) {
      return `pairs-left-${input.dataset.pairsLeft}`;
    }
    if (input.dataset.pairsRight !== undefined) {
      return `pairs-right-${input.dataset.pairsRight}`;
    }
    if (input.dataset.imageCollection !== undefined) {
      return `image-collection-${input.dataset.imageCollection}`;
    }
    if (input.dataset.imageSeries !== undefined) {
      return `image-series-${input.dataset.imageSeries}`;
    }
    return input.id || 'unknown';
  }

  // Enhanced pattern matching method
  findTargetInputByPattern(targetField) {
    let targetInput = null;

    console.log('🔍 Pattern search for:', targetField);

    // Handle image collection sections
    if (targetField.startsWith('image-collection-')) {
      const index = targetField.split('-')[2];
      targetInput = document.querySelector(`input[data-image-collection="${index}"][data-field="imageUrl"]`);
      if (!targetInput) {
        // Try alternative selector
        targetInput = document.querySelector(`[data-image-collection="${index}"] input[data-field="imageUrl"]`);
      }
    }
    // Handle image series items
    else if (targetField.startsWith('image-series-')) {
      const index = targetField.split('-')[2];
      targetInput = document.querySelector(`input[data-image-series="${index}"][data-field="imageUrl"]`);
      if (!targetInput) {
        targetInput = document.querySelector(`[data-image-series="${index}"] input[data-field="imageUrl"]`);
      }
    }
    // Handle connect quiz items
    else if (targetField.startsWith('connect-left-')) {
      const index = targetField.split('-')[2];
      targetInput = document.querySelector(`input[data-connect-left="${index}"][data-field="value"]`);
    }
    else if (targetField.startsWith('connect-right-')) {
      const index = targetField.split('-')[2];
      targetInput = document.querySelector(`input[data-connect-right="${index}"][data-field="value"]`);
    }
    // Handle drag match quiz items
    else if (targetField.startsWith('drag-left-')) {
      const index = targetField.split('-')[2];
      targetInput = document.querySelector(`input[data-drag-left="${index}"][data-field="value"]`);
    }
    else if (targetField.startsWith('drag-right-')) {
      const index = targetField.split('-')[2];
      targetInput = document.querySelector(`input[data-drag-right="${index}"][data-field="value"]`);
    }
    // Handle image pairs quiz items
    else if (targetField.startsWith('pairs-left-')) {
      const index = targetField.split('-')[2];
      targetInput = document.querySelector(`input[data-pairs-left="${index}"][data-field="value"]`);
    }
    else if (targetField.startsWith('pairs-right-')) {
      const index = targetField.split('-')[2];
      targetInput = document.querySelector(`input[data-pairs-right="${index}"][data-field="value"]`);
    }

    if (targetInput) {
      console.log('✅ Pattern match found:', targetField);
    } else {
      console.log('❌ Pattern match failed:', targetField);
    }

    return targetInput;
  }

  triggerFileUpload(assetsType) {
    const fileInput = document.getElementById('file-upload-input');
    if (this.currentAssetsType === 'images') {
      fileInput.accept = 'image/*';
      fileInput.value = '';
    }
    else {
      fileInput.accept = 'video/*';
      fileInput.value = '';
    }
    document.getElementById('file-upload-input').click();
  }

  async handleFileUpload(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    // Show loading for multiple files - show count instead of names
    const swalInstance = Swal.fire({
      title: 'جاري الرفع...',
      html: `
            <div style="margin-bottom: 15px;">جاري رفع <strong>${files.length}</strong> ملف</div>
            <div class="progress-container" style="width: 100%; height: 20px; background: #f0f0f0; border-radius: 10px; margin: 10px 0;">
                <div class="progress-bar" style="height: 100%; background: #3B82F6; border-radius: 10px; width: 0%; transition: width 0.3s;"></div>
            </div>
            <p id="upload-status" style="margin: 10px 0; font-size: 14px;">0%</p>
            <p id="current-file" style="font-size: 12px; color: #666;"></p>
        `,
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    let successCount = 0;
    let errorCount = 0;
    const totalBytes = Array.from(files).reduce((total, file) => total + file.size, 0);
    let uploadedBytes = 0;

    // Upload files sequentially with real progress
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Update current file info
      document.getElementById('current-file').textContent = `جاري رفع: ${file.name}`;

      try {
        await this.uploadSingleFileWithProgress(file, (progress) => {
          // Calculate overall progress including current file progress
          const currentFileProgress = (progress / 100) * file.size;
          const overallProgress = ((uploadedBytes + currentFileProgress) / totalBytes) * 100;
          this.updateProgress(overallProgress, i + 1, files.length, file.name);
        });
        successCount++;
        uploadedBytes += file.size; // Add the full file size when completed
      } catch (error) {
        console.error(`❌ Failed to upload ${file.name}:`, error);
        errorCount++;
        uploadedBytes += file.size; // Even if failed, count the file as "processed"
      }
    }

    // Show final result
    await Swal.fire({
      icon: errorCount === 0 ? 'success' : (successCount > 0 ? 'warning' : 'error'),
      title: errorCount === 0 ? 'تم الرفع بنجاح' : 'تم الرفع مع بعض الأخطاء',
      html: `
            <div> تم رفع ${successCount} ملف بنجاح</div>
            ${errorCount > 0 ? `<div> فشل رفع ${errorCount} ملف</div>` : ''}
        `,
      timer: 3000,
      showConfirmButton: false
    });

    // Reload assets and reset input
    await this.loadAssets();
    event.target.value = '';
  }

  async uploadSingleFileWithProgress(file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = this.currentAssetsType === 'images'
        ? 'https://barber.herova.net/api/edit/media/uploadImage.php'
        : 'https://barber.herova.net/api/edit/media/uploadVedio.php';

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          if (onProgress) onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.status === 'success') {
              resolve(response);
            } else {
              reject(new Error(response.message || 'Upload failed'));
            }
          } catch (e) {
            reject(new Error('Invalid server response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });

      const formData = new FormData();
      if (this.currentAssetsType === 'images') {
        formData.append('image', file);
      } else {
        formData.append('video', file);
      }
      formData.append('filename', file.name);

      xhr.open('POST', url);
      xhr.send(formData);
    });
  }

  updateProgress(percent, currentFileIndex, totalFiles, currentFileName = '') {
    const progressBar = document.querySelector('.progress-bar');
    const statusEl = document.getElementById('upload-status');
    const currentFileEl = document.getElementById('current-file');

    // Update progress bar with smooth animation
    if (progressBar) {
      progressBar.style.width = percent + '%';

      // Dynamic color based on progress
      if (percent < 30) {
        progressBar.style.background = 'linear-gradient(90deg, #EF4444, #F59E0B)';
      } else if (percent < 70) {
        progressBar.style.background = 'linear-gradient(90deg, #F59E0B, #3B82F6)';
      } else {
        progressBar.style.background = 'linear-gradient(90deg, #3B82F6, #10B981)';
      }
    }

    // Update status text
    if (statusEl) {
      statusEl.textContent = `${Math.round(percent)}% - ${currentFileIndex}/${totalFiles} ملف`;
    }

    // Update current file info (if available)
    if (currentFileEl && currentFileName) {
      // Truncate long file names to prevent UI issues
      const displayName = currentFileName.length > 30
        ? currentFileName.substring(0, 27) + '...'
        : currentFileName;
      currentFileEl.textContent = `جاري رفع: ${displayName}`;
    }
  }

  uploadWithProgress(file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = this.currentAssetsType === 'images'
        ? 'https://barber.herova.net/api/edit/media/uploadImage.php'
        : 'https://barber.herova.net/api/edit/media/uploadVedio.php';

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = (e.loaded / e.total) * 100;
          if (onProgress) onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error('Invalid server response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error'));
      });

      const formData = new FormData();
      if (this.currentAssetsType === 'images') {
        formData.append('image', file);
      } else {
        formData.append('video', file);
      }
      formData.append('filename', file.name);

      xhr.open('POST', url);
      xhr.send(formData);
    });
  }
}

export { AssetsManager };