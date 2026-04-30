import { Globe, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { applyDocumentDir, SUPPORTED_LANGS } from "@/i18n";

const LABELS: Record<string, string> = { he: "עברית", en: "English" };

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage || i18n.language || "he";

  const change = (lang: string) => {
    void i18n.changeLanguage(lang);
    applyDocumentDir(lang);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("common.language")}>
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SUPPORTED_LANGS.map((l) => (
          <DropdownMenuItem key={l} onClick={() => change(l)} className="gap-2">
            <Check className={`h-4 w-4 ${current === l ? "opacity-100" : "opacity-0"}`} />
            {LABELS[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
