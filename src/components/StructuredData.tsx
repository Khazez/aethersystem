import { EMAIL, PHONE, ADDRESS, PLATFORM_URL } from "@/lib/company";
import { SITE_URL, OG_IMAGE } from "@/lib/seo";
import { localeHtmlLang, type Locale } from "@/i18n/config";

/**
 * Структурированные данные — карточка организации для поисковых систем.
 *
 * ── Что это ───────────────────────────────────────────────────────
 *
 * Обычный текст страницы поисковик читает как текст: он видит слова, но
 * не знает, что «Aether System & Co.» — название организации, а
 * «+7 700 832 32 73» — её телефон. Структурированные данные говорят это
 * прямо, машинным языком, по словарю schema.org.
 *
 * ── Зачем нам ─────────────────────────────────────────────────────
 *
 * Ради брендовых запросов. Когда человек ищет «Aether System» или
 * «Aether Nexus», поисковику нужно понять, что этот домен и есть та
 * самая компания. `alternateName` перечисляет написания названия,
 * которыми люди пользуются на самом деле — с «& Co.» и без, кириллицей
 * и латиницей.
 *
 * ⚠️ Здесь только то, что подтверждено заказчиком: реквизиты из
 * `lib/company.ts`. Ничего не додумано — за выдуманные данные в
 * разметке поисковик наказывает, а для компании под госзаказ это ещё и
 * репутационный вопрос.
 *
 * ⚠️ `sameAs` (ссылки на страницы компании в других местах — LinkedIn,
 * каталоги, реестры) намеренно **отсутствует**: таких страниц пока нет.
 * Когда появятся — добавить сюда, это один из сильнейших сигналов
 * принадлежности бренда домену.
 */

const ORG_ID = `${SITE_URL}/#organization`;

export function OrganizationJsonLd({ locale }: { locale: Locale }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORG_ID,
    name: "Aether System & Co.",
    alternateName: [
      "Aether System",
      "Aether System and Co",
      "AETHER SYSTEM & CO.",
      "Аэтер Систем",
    ],
    url: SITE_URL,
    logo: `${SITE_URL}/logo-mark.png`,
    image: OG_IMAGE,
    slogan: "Technology for the Next Airspace",
    description:
      "Цифровая инфраструктура для беспилотной авиации, автономных воздушных операций и управления воздушным пространством нового поколения.",
    email: EMAIL,
    telephone: PHONE.href,
    address: {
      "@type": "PostalAddress",
      streetAddress: ADDRESS.street,
      addressLocality: ADDRESS.city,
      addressRegion: ADDRESS.district,
      addressCountry: ADDRESS.country,
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: EMAIL,
      telephone: PHONE.href,
      availableLanguage: ["kk", "ru", "en"],
    },
    inLanguage: localeHtmlLang[locale],
  };

  const site = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "Aether System & Co.",
    alternateName: "Aether System",
    publisher: { "@id": ORG_ID },
    inLanguage: localeHtmlLang[locale],
  };

  return (
    <script
      type="application/ld+json"
      /* Так подключают структурированные данные: это не выполняемый
         скрипт, а данные, которые читает поисковый робот. */
      dangerouslySetInnerHTML={{ __html: JSON.stringify([data, site]) }}
    />
  );
}

/**
 * Карточка самого продукта — для запроса «Aether Nexus».
 *
 * Ставится только на странице продукта: описывать платформу на каждой
 * странице значит размывать, к чему относится описание.
 */
export function ProductJsonLd({
  name,
  description,
}: {
  name: string;
  description: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    alternateName: "Aether Nexus",
    applicationCategory: "BusinessApplication",
    description,
    url: `${SITE_URL}`,
    /* Адрес самой платформы: он подтверждает, что продукт существует,
       а не только описан на витрине. */
    sameAs: PLATFORM_URL,
    publisher: { "@id": ORG_ID },
    /* operatingSystem обязателен для этого типа. Платформа работает
       в браузере — так и пишем, без выдумок про мобильные приложения. */
    operatingSystem: "Web",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
