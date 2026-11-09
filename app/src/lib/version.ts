const PATRON_BUNDLE = /\/_expo\/static\/js\/web\/index-[0-9a-f]+\.js/;

export function versionDeHtml(html: string): string | null {
  return html.match(PATRON_BUNDLE)?.[0] ?? null;
}

export function hayVersionNueva(actual: string | null, publicada: string | null): boolean {
  return actual !== null && publicada !== null && actual !== publicada;
}
