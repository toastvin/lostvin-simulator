import { HomeWorkspace } from "@/components/home/home-workspace";
import { LanguageProvider } from "@/components/i18n/language-provider";

export default function HomePage() {
  return (
    <LanguageProvider>
      <main className="mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-6 py-10 sm:px-10 lg:px-14 xl:px-16">
        <HomeWorkspace />
      </main>
    </LanguageProvider>
  );
}
