import { PlaywrightCrawler, Configuration } from "crawlee";
Configuration.getGlobalConfig().set("persistStorage", false);

export interface ScrapeResult {
  cleanMarkdown: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resp: any;
}

export async function scrapePage(url: string): Promise<ScrapeResult> {
  let cleanMarkdown = "";

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: 1,

    async requestHandler({ page }) {
      await page.waitForLoadState("domcontentloaded");
      // Даємо JS-сайтам дорендерити контент, але не чекаємо вічно
      await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});

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
            document.querySelectorAll(selector).forEach((el) => {
              // Селектори [class*='cookie'] можуть збігтися з body/обгорткою всієї сторінки
              const wrapsPage = el === document.body || el === document.documentElement || el.contains(document.body) || el.querySelector("main, h1");
              if (!wrapsPage) el.remove();
            });
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

            const isSocial = /^https?:\\/\\/(([^/]*\\.)?(facebook|twitter|x|instagram|linkedin|youtube|github)\\.com|t\\.me)(\\/|$)/i.test(href);
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
            // Блоковий елемент, бо innerText згортає \\n у текстових вузлах
            const block = document.createElement("div");
            block.textContent = level + (h.textContent ? h.textContent.trim() : "");
            h.replaceWith(block);
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