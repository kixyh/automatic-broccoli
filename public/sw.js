self.addEventListener('fetch', event => {
  // Intercepts all requests from this origin even after they leave
  event.respondWith(fetch(event.request).then(r => {
    // Could log here persistently
    return r;
  }));
});
