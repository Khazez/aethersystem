import type { NextConfig } from "next";

import { defaultLocale } from "./src/i18n/config";

const nextConfig: NextConfig = {
  experimental: {
    /* Включает `app/global-not-found.tsx` — страницу 404 для адресов,
       не совпавших ни с одним разделом. Нужна потому, что общего
       корневого макета у приложения больше нет (см. комментарий в
       `src/app/[locale]/layout.tsx`), и обычной `not-found.tsx` негде
       взять <html>. Флаг помечен экспериментальным: если после
       обновления Next.js сборка ругнётся на него — проверить, не стал
       ли он обычной настройкой. */
    globalNotFound: true,
  },

  async rewrites() {
    /* Новая проба сайта лежит готовыми страницами в public/site/<язык>/.
       beforeFiles — значит эти правила срабатывают раньше страниц приложения:
       старые страницы [locale] остаются в коде нетронутыми, но наружу их
       не видно. Чтобы вернуть прежний сайт, достаточно убрать этот блок.

       Медиа (кадры и ролики) на страницах прописаны абсолютными адресами
       media.aethersystem.kz, в репозитории их нет. */
    const langs = "kk|ru|en";
    return {
      beforeFiles: [
        { source: `/:lang(${langs})`, destination: "/site/:lang/index.html" },
        {
          source: `/:lang(${langs})/:page(about|product|solutions|team)`,
          destination: "/site/:lang/:page.html",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },

  async redirects() {
    return [
      {
        /* Корень сайта своей страницы не имеет — уводим на язык по
           умолчанию. Раньше это делала `app/page.tsx` через redirect()
           из next/navigation; после переноса <html> внутрь [locale]
           той странице негде было бы взять разметку документа.

           permanent: false — код 307, а не 308: язык по умолчанию
           может смениться по слову заказчика, и браузеры не должны
           запоминать переход навсегда. */
        source: "/",
        destination: `/${defaultLocale}`,
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
