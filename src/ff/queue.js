export default {
  processNextMessage () {
    if (!this.queue.length) return
    this.start(this.queue.shift())
  }
}