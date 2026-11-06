// Erzeugt die App Icons aus SVG. Aufruf: node scripts/icons.cjs (braucht Playwright, nur bei Änderungen am Icon nötig)
// Flach wie bei My Notes und ShoppingList: roter Grund mit leichtem Verlauf, weißes Plektrum.
const { chromium } = require('playwright')
const path = require('path')
const out = (f) => path.resolve(__dirname, '..', 'assets', f)

// Umriss eines Standard Plektrums (breit oben, runde Spitze), Raster 512 x 512
const PICK = 'M256.0 45.0 C296.4 45.0 348.8 54.8 377.2 61.9 C405.6 68.9 413.8 75.9 426.4 87.2 C439.0 98.5 448.2 115.3 453.0 129.4 C457.8 143.5 456.2 157.5 455.4 171.6 C454.6 185.7 451.5 199.7 448.0 213.8 C444.5 227.9 439.5 241.9 434.2 256.0 C428.9 270.1 423.1 284.1 416.4 298.2 C409.7 312.3 402.4 326.3 393.8 340.4 C385.2 354.5 375.7 368.5 365.0 382.6 C354.3 396.7 340.4 413.5 329.6 424.8 C318.8 436.1 312.4 443.1 300.1 450.1 C287.9 457.2 270.7 467.0 256.0 467.0 C241.3 467.0 224.1 457.2 211.9 450.1 C199.6 443.1 193.2 436.1 182.4 424.8 C171.6 413.5 157.7 396.7 147.0 382.6 C136.3 368.5 126.8 354.5 118.2 340.4 C109.6 326.3 102.3 312.3 95.6 298.2 C88.9 284.1 83.1 270.1 77.8 256.0 C72.5 241.9 67.5 227.9 64.0 213.8 C60.5 199.7 57.4 185.7 56.6 171.6 C55.8 157.5 54.2 143.5 59.0 129.4 C63.8 115.3 73.0 98.5 85.6 87.2 C98.2 75.9 106.4 68.9 134.8 61.9 C163.2 54.8 215.6 45.0 256.0 45.0 Z'
const bg = '<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d0353b"/><stop offset="1" stop-color="#a3161d"/></linearGradient></defs><rect width="512" height="512" fill="url(#bg)"/>'
const pick = (scale, color = '#fff') => `<g transform="translate(256 262) scale(${scale}) translate(-256 -256)"><path d="${PICK}" fill="${color}"/></g>`
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${body}</svg>`

const svgs = {
  // Kachel (älteres Android, Play Store): Plektrum auf 90 %
  'icon.png': [1024, svg(bg + pick(0.9))],
  // Android Icon in Ebenen: sichtbar ist nur die Mitte (rund 2/3), deshalb kleiner.
  // 0.56 statt rechnerisch 0.6, damit die oberen Ecken auch bei runden Masken nicht abgeschnitten werden.
  'android-icon-foreground.png': [1024, svg(pick(0.56))],
  'android-icon-background.png': [1024, svg(bg)],
  'android-icon-monochrome.png': [1024, svg(pick(0.56))],
  'splash-icon.png': [512, svg(`<clipPath id="r"><rect width="512" height="512" rx="112"/></clipPath><g clip-path="url(#r)">${bg}${pick(0.9)}</g>`)],
  'favicon.png': [48, svg(`<clipPath id="r"><rect width="512" height="512" rx="112"/></clipPath><g clip-path="url(#r)">${bg}${pick(0.9)}</g>`)],
}
;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  for (const [file, [size, s]] of Object.entries(svgs)) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<style>html,body{margin:0;background:transparent}</style><img width="${size}" height="${size}" style="display:block" src="data:image/svg+xml;base64,${Buffer.from(s).toString('base64')}">`)
    await page.screenshot({ path: out(file), omitBackground: true })
  }
  await browser.close()
})()
