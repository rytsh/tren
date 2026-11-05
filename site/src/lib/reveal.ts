export function reveal(node: HTMLElement) {
  const targets = node.matches("[data-rise], .mask-line") ? [node] : [...node.querySelectorAll<HTMLElement>("[data-rise], .mask-line")];
  if (!targets.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
  );
  targets.forEach((t) => io.observe(t));
  return { destroy: () => io.disconnect() };
}
