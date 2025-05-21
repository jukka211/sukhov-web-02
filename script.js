// script.js

document.addEventListener('DOMContentLoaded', () => {
  const draggable = document.getElementById('draggable');

  let isDragging = false;
  let offset = { x: 0, y: 0 };

  // Mouse Events
  draggable.addEventListener('mousedown', (e) => {
      isDragging = true;
      // Calculate the cursor's offset within the element
      offset.x = e.clientX - draggable.offsetLeft;
      offset.y = e.clientY - draggable.offsetTop;

      // Add event listeners for mousemove and mouseup to the document
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      // Prevent default to avoid text selection
      e.preventDefault();
  });

  // Touch Events
  draggable.addEventListener('touchstart', (e) => {
      isDragging = true;
      const touch = e.touches[0];
      offset.x = touch.clientX - draggable.offsetLeft;
      offset.y = touch.clientY - draggable.offsetTop;

      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd);
  }, { passive: false });

  function onMouseMove(e) {
      if (!isDragging) return;

      let left = e.clientX - offset.x;
      let top = e.clientY - offset.y;

      // Optional: Constrain within the viewport
      left = Math.max(0, Math.min(left, window.innerWidth - draggable.offsetWidth));
      top = Math.max(0, Math.min(top, window.innerHeight - draggable.offsetHeight));

      draggable.style.left = `${left}px`;
      draggable.style.top = `${top}px`;
  }

  function onMouseUp() {
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
  }

  function onTouchMove(e) {
      if (!isDragging) return;
      const touch = e.touches[0];
      let left = touch.clientX - offset.x;
      let top = touch.clientY - offset.y;

      // Optional: Constrain within the viewport
      left = Math.max(0, Math.min(left, window.innerWidth - draggable.offsetWidth));
      top = Math.max(0, Math.min(top, window.innerHeight - draggable.offsetHeight));

      draggable.style.left = `${left}px`;
      draggable.style.top = `${top}px`;

      // Prevent scrolling while dragging
      e.preventDefault();
  }

  function onTouchEnd() {
      isDragging = false;
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
  }
});
