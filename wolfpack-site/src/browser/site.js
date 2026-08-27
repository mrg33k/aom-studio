document.documentElement.setAttribute('data-js', 'true')

document.addEventListener('click', event => {
  const menuToggle = event.target.closest('[data-menu-toggle]')
  if (menuToggle) {
    const menu = document.getElementById(menuToggle.dataset.menuToggle)
    if (menu) {
      const isOpen = menuToggle.getAttribute('aria-expanded') === 'true'
      menuToggle.setAttribute('aria-expanded', String(!isOpen))
      menu.hidden = isOpen
    }
    return
  }

  const dialogTrigger = event.target.closest('[data-dialog-open]')
  if (dialogTrigger) {
    document.getElementById(dialogTrigger.dataset.dialogOpen)?.showModal?.()
    return
  }

  if (event.target.closest('[data-dialog-close]')) {
    event.target.closest('dialog')?.close?.()
  }
})
