import '@testing-library/jest-dom/vitest'

// jsdom does not implement <dialog> modal methods; emulate open state and the native `close` event.
HTMLDialogElement.prototype.showModal = function showModal() {
  this.setAttribute('open', '')
}
HTMLDialogElement.prototype.close = function close() {
  this.removeAttribute('open')
  this.dispatchEvent(new Event('close'))
}
