import { redirect } from "next/navigation";
import { defaultLocale } from "@/i18n/config";

/**
 * Корень сайта "/" сам по себе страницы не имеет — он перенаправляет
 * посетителя на язык по умолчанию: "/" → "/ru".
 */
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
