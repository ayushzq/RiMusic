// ─── Meta WhatsApp Template Types ──────────────────────────────────────────

export enum TemplateCategory {
  MARKETING = "MARKETING",
  UTILITY = "UTILITY",
  AUTHENTICATION = "AUTHENTICATION",
}

export enum TemplateLanguage {
  ENGLISH_US = "en_US",
  ENGLISH_UK = "en_GB",
  HINDI = "hi",
  SPANISH = "es",
  PORTUGUESE_BR = "pt_BR",
  ARABIC = "ar",
  FRENCH = "fr",
  GERMAN = "de",
  INDONESIAN = "id",
}

export enum HeaderFormat {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  DOCUMENT = "DOCUMENT",
  LOCATION = "LOCATION",
}

export enum ButtonType {
  QUICK_REPLY = "QUICK_REPLY",
  URL = "URL",
  PHONE_NUMBER = "PHONE_NUMBER",
}

// ─── Components ─────────────────────────────────────────────────────────────

export interface HeaderComponent {
  type: "HEADER";
  format: HeaderFormat;
  text?: string;
  example?: {
    header_handle?: string[];
    header_text?: string[];
  };
}

export interface BodyComponent {
  type: "BODY";
  text: string;
  // 🔥 NAYA: Meta ko BODY variables verify karne ke liye example values chahiye.
  // Format: [["value_for_{{1}}", "value_for_{{2}}", ...]]
  example?: {
    body_text: string[][];
  };
}

export interface FooterComponent {
  type: "FOOTER";
  text: string;
}

export interface QuickReplyButton {
  type: ButtonType.QUICK_REPLY;
  text: string;
}

export interface UrlButton {
  type: ButtonType.URL;
  text: string;
  url: string;
}

export interface PhoneNumberButton {
  type: ButtonType.PHONE_NUMBER;
  text: string;
  phone_number: string;
}

export type TemplateButton = QuickReplyButton | UrlButton | PhoneNumberButton;

export interface ButtonsComponent {
  type: "BUTTONS";
  buttons: TemplateButton[];
}

export type TemplateComponent =
  | HeaderComponent
  | BodyComponent
  | FooterComponent
  | ButtonsComponent;

export interface CreateTemplatePayload {
  name: string;
  category: TemplateCategory;
  language: string;
  components: TemplateComponent[];
}

// ─── Meta API response shape (list templates) ──────────────────────────────

export interface MetaTemplateRecord {
  id: string;
  name: string;
  status?: "APPROVED" | "REJECTED" | "PENDING" | string;
  category: string;
  language: string;
  components?: TemplateComponent[];
}
