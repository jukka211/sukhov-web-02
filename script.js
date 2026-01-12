  document.addEventListener('DOMContentLoaded', () => {
    //
    // ====== DRAG‐SCROLL GALLERIES ======
    //
    const sliders = document.querySelectorAll('.projects-gallery');
    if (sliders.length) {
      sliders.forEach(slider => {
        let isDown = false,
            startX = 0,
            scrollLeft = 0,
            hasDragged = false;

        slider.addEventListener('mousedown', e => {
          isDown = true;
          hasDragged = false;
          slider.classList.add('active');
          startX = e.pageX - slider.offsetLeft;
          scrollLeft = slider.scrollLeft;
          e.preventDefault(); // prevent native image/video dragging
        });

        slider.addEventListener('mousemove', e => {
          if (!isDown) return;
          const x = e.pageX - slider.offsetLeft;
          const dx = x - startX;
          if (Math.abs(dx) > 5) { // only once moved >5px do we treat as a “drag”
            hasDragged = true;
            e.preventDefault();
            slider.scrollLeft = scrollLeft - dx;
          }
        });

        slider.addEventListener('mouseup', () => {
          isDown = false;
          slider.classList.remove('active');
        });

        slider.addEventListener('mouseleave', () => {
          isDown = false;
          slider.classList.remove('active');
        });

        slider.addEventListener('click', e => {
          if (hasDragged) {
            // If the user was dragging, prevent the spurious “click”
            e.stopPropagation();
            e.preventDefault();
          }
          // Otherwise, a genuine click (no 5px move) will bubble if you want it to.
        });
      });
    }

    //
    // ====== TOGGLE SECTIONS + LAZY‐LOAD IMAGES ======
    //
    function unveilSection(el) {
      el.querySelectorAll('img[data-src]').forEach(img => {
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        // Optionally fade in:
        img.style.opacity = 1;
      });
    }

    // Close all .projects-text items inside the Projects section
    function closeAllProjectItems(projectsSection) {
      projectsSection.querySelectorAll('.projects-text.open').forEach(item => {
        item.classList.remove('open');
        const sign = item.querySelector('.toggle-sign');
        if (sign) sign.textContent = '+';
      });
    }

    const toggles = [
      { btn: '#main-header',    target: '#main-container' },
      { btn: '#projects-title', target: '#projects' },
      { btn: '#about-title',    target: '#about' },
      { btn: '#contact-title',  target: '#contact' },
      { btn: '#awards-title',   target: '#awards' },
    ];

    toggles.forEach(({ btn, target }) => {
      const header = document.querySelector(btn);
      const section = document.querySelector(target);
      if (!header || !section) return;

      const sign = header.querySelector('.toggle-sign');
      header.addEventListener('click', () => {
        const isOpen = section.classList.toggle('open');
        sign.textContent = isOpen ? '–' : '+';

        if (isOpen) {
          unveilSection(section);
        } else {
          // If Projects container was closed, close all projects inside it too
          if (section.id === 'projects') closeAllProjectItems(section);
        }
      });
    });

    document.querySelectorAll('.projects-text').forEach(item => {
      const sign = item.querySelector('.toggle-sign');
      if (!sign) return;

      item.addEventListener('click', () => {
        const isOpen = item.classList.toggle('open');
        sign.textContent = isOpen ? '–' : '+';
        if (isOpen) unveilSection(item);
      });
    });
  });
