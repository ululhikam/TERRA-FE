export const revealDirective = {
  mounted(el, binding) {
    const delay = typeof binding.value === 'number' ? binding.value : Number(binding.value?.delay || 0)
    el.classList.add('motion-reveal')
    if (delay > 0) {
      el.style.transitionDelay = `${delay}ms`
    }

    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-revealed')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add('is-revealed')
            observer.unobserve(el)
          }
        }
      },
      { threshold: 0.06, rootMargin: '0px 0px -24px 0px' }
    )

    el._revealObserver = observer
    observer.observe(el)
  },
  unmounted(el) {
    if (el._revealObserver) {
      el._revealObserver.disconnect()
      delete el._revealObserver
    }
  }
}
