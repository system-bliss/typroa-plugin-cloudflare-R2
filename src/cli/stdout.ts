export function writeUrls(urls: string[], writeStdout: (line: string) => void): void {
  for (const url of urls) {
    writeStdout(url);
  }
}
