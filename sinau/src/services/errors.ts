export class NotImplementedError extends Error {
  constructor(feature: string) {
    super(`${feature} belum diimplementasikan. Hubungkan ke backend terlebih dahulu.`)
    this.name = 'NotImplementedError'
  }
}
