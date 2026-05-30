declare const self: ServiceWorkerGlobalScope;

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {
    title: "KoachApp",
    body: "Novi podsjetnik!",
  };
  const url: string | undefined = data.url;
  event.waitUntil(
    (async () => {
      // Suppress the OS notification if a window is already focused on the
      // target chat — the live update already showed the message there.
      if (url) {
        const wins = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        const focusedOnTarget = wins.some(
          (w) => w.focused && w.url.includes(url)
        );
        if (focusedOnTarget) return;
      }
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: "/icon-192.png",
        badge: "/badge-96.png",
        data: { url: url ?? "/app" },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target: string = event.notification.data?.url ?? "/app";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const abs = new URL(target, self.location.origin).href;
        const existing = clients.find((c) => c.url.includes(target));
        if (existing) return existing.focus();
        const anyWin = clients[0];
        if (anyWin) {
          // navigate() needs an absolute URL and can reject; fall back to a new window.
          return anyWin
            .navigate(abs)
            .then((c) => (c ?? anyWin).focus())
            .catch(() => self.clients.openWindow(abs));
        }
        return self.clients.openWindow(abs);
      })
  );
});
