import { PlaywrightCrawler, Configuration } from "crawlee";
Configuration.getGlobalConfig().set("persistStorage", false);

export interface ScrapeResult {
  cleanMarkdown: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resp: any;
}

export async function scrapePage(url: string): Promise<ScrapeResult> {
  let cleanMarkdown = "";

  // 1. Вимикаємо збереження файлів у storage через глобальний конфіг
  Configuration.getGlobalConfig().set("persistStorage");

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 1,

    async requestHandler({ page }) {
      await page.waitForLoadState("domcontentloaded");

      cleanMarkdown = await page.evaluate(`
        (() => {
          // 1. Видаляємо технічне сміття
          const elementsToRemove = [
          "script", "style", "noscript", "iframe", "svg", "noindex",
          ".cookie-banner", "#cookie-consent", "#onetrust-consent-sdk",
          "[class*='cookie']", "[id*='cookie']", "[aria-label*='cookie']",
          "[class*='consent']", "[id*='consent']"
        ];
          elementsToRemove.forEach((selector) => {
            document.querySelectorAll(selector).forEach((el) => el.remove());
          });

          // Очищення тільки UTM-міток без обрізання query-параметрів та якорів
          const cleanUrl = (rawUrl) => {
            try {
              const u = new URL(rawUrl);
              
              // Видаляємо лише utm_* параметри аналітики
              const keysToDelete = [];
              u.searchParams.forEach((_, key) => {
                if (key.startsWith("utm_")) {
                  keysToDelete.push(key);
                }
              });
              keysToDelete.forEach((key) => u.searchParams.delete(key));

              return u.href; // Повертає повний URL (з query-параметрами та якорями)
            } catch {
              return rawUrl;
            }
          };

          const seenLinks = new Set();

          // 2. Обробка посилань
          document.querySelectorAll("a[href]").forEach((a) => {
            const rawText = a.innerText || a.textContent || a.getAttribute("aria-label") || "";
            const text = rawText.replace(/\\s+/g, " ").trim();
            let href = a.href;

            const isSocial = /(facebook|twitter|instagram|linkedin|youtube|github|t.me)\\.com/i.test(href);
            const isValid = text.length > 1 && href.startsWith("http") && !isSocial;

            if (isValid) {
              const sanitizedUrl = cleanUrl(href);
              const linkKey = text.toLowerCase() + "|" + sanitizedUrl;

              if (seenLinks.has(linkKey)) {
                a.replaceWith(document.createTextNode(" " + text + " "));
              } else {
                seenLinks.add(linkKey);
                a.replaceWith(document.createTextNode(" [" + text + "](" + sanitizedUrl + ") "));
              }
            } else if (text) {
              a.replaceWith(document.createTextNode(" " + text + " "));
            }
          });

          // 3. Обробка заголовків
          document.querySelectorAll("h1, h2, h3").forEach((h) => {
            const level = h.tagName.toLowerCase() === "h1" ? "# " : h.tagName.toLowerCase() === "h2" ? "## " : "### ";
            h.replaceWith(document.createTextNode("\\n\\n" + level + (h.textContent ? h.textContent.trim() : "") + "\\n"));
          });

          // 4. Очищений текст
          return document.body.innerText
            .split("\\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .join("\\n");
        })()
      `);
    },
  });

  const resp = await crawler.run([url]);
  return { cleanMarkdown, resp };
}