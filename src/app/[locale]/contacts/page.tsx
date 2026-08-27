import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail, Phone, MapPin } from "lucide-react";

import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import { Section, SectionHeading } from "@/components/Section";
import { EMAIL, PHONE } from "@/lib/company";
import { alternates } from "@/lib/seo";
import { getDictionary } from "@/i18n";
import { isLocale, locales } from "@/i18n/config";

type Params = { params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: t.nav.contacts,
    description: t.contacts.hero.subtitle,
    alternates: alternates(locale, "contacts"),
  };
}

export default async function ContactsPage({ params }: Params) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const t = getDictionary(locale);
  const c = t.contacts;

  /* Почта и телефон получены от заказчика 27.08.2026 и лежат в
     `lib/company.ts` — они одинаковы на всех языках.

     Адрес пока НЕ передан, поэтому у него `value: null` и на странице
     остаётся честная пометка «будет опубликовано». Выдумывать адрес
     компании нельзя, а убирать поле — значит потом переверстывать
     сетку из трёх карточек в две и обратно.

     У почты и телефона есть `href`: на телефоне по номеру можно
     позвонить прикосновением, а почта открывается в почтовой
     программе. Раз форм на сайте больше нет, это единственный путь
     до компании, и он должен быть в один шаг. */
  const channels = [
    {
      key: "email",
      icon: Mail,
      label: c.emailLabel,
      value: EMAIL,
      href: `mailto:${EMAIL}`,
    },
    {
      key: "phone",
      icon: Phone,
      label: c.phoneLabel,
      value: PHONE.display,
      href: `tel:${PHONE.href}`,
    },
    {
      key: "address",
      icon: MapPin,
      label: c.addressLabel,
      value: c.address,
      /* Ссылки нет намеренно: вести на карту — значит выбрать за
         человека картографический сервис и отправить его данные
         на чужой сайт. Адрес можно скопировать. */
      href: null,
    },
  ];

  return (
    <>
      <PageHero
        eyebrow={c.hero.eyebrow}
        title={c.hero.title}
        lead={c.hero.subtitle}
      />

      {/* --- Каналы связи --- */}
      <Section className="bg-abyss">
        <div className="container-page py-24 lg:py-32">
          <SectionHeading
            index="01"
            eyebrow={c.hero.eyebrow}
            title={c.channelsTitle}
          />

          <ul className="mt-14 grid gap-px border border-line bg-line sm:grid-cols-3">
            {channels.map((channel, i) => (
              <Reveal key={channel.key} as="li" delay={i * 70} className="h-full">
                <div className="flex h-full flex-col bg-surface p-8">
                  <channel.icon
                    className="h-6 w-6 text-accent/70"
                    strokeWidth={1.4}
                    aria-hidden="true"
                  />
                  <h3 className="hud-label mt-6">{channel.label}</h3>
                  {/* whitespace-pre-line — в адресе стоит перенос строки:
                      одной строкой он расползается на всю карточку. */}
                  <p className="mt-3 text-base whitespace-pre-line break-words text-ink">
                    {/* Три случая, а не два: значение со ссылкой (почта,
                        телефон), значение без ссылки (адрес — вести на
                        карту не нужно) и пустое поле. Раньше здесь
                        проверялось `value && href`, и адрес без ссылки
                        молча уходил в «будет опубликовано». */}
                    {channel.value ? (
                      channel.href ? (
                        <a
                          href={channel.href}
                          className="inline-flex min-h-11 items-center text-ink underline decoration-accent/40 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
                        >
                          {channel.value}
                        </a>
                      ) : (
                        channel.value
                      )
                    ) : (
                      <span className="font-mono text-[0.8125rem] tracking-wide text-ink-faint">
                        {c.pending}
                      </span>
                    )}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </Section>

      {/* --- Формы --- */}
    </>
  );
}
