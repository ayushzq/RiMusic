import {
  TemplateCategory,
  HeaderFormat,
  ButtonType,
  CreateTemplatePayload,
  TemplateComponent,
  HeaderComponent,
  BodyComponent,
  FooterComponent,
  ButtonsComponent,
  TemplateButton,
  QuickReplyButton,
  UrlButton,
  PhoneNumberButton,
} from "../../types/template.types";

export interface ButtonDraft {
  id: string;
  type: ButtonType.QUICK_REPLY | ButtonType.URL | ButtonType.PHONE_NUMBER;
  text: string;
  url?: string;
  phone_number?: string;
}

export interface FormState {
  name: string;
  category: TemplateCategory;
  language: string;
  headerFormat: HeaderFormat | "NONE";
  headerText: string;
  headerMediaUrl?: string;
  bodyText: string;
  footerText: string;
  buttons: ButtonDraft[];
  // 🔥 NAYA: variable number → example value (e.g. { 1: "Rahul", 2: "₹499" })
  bodyExamples: Record<number, string>;
}

export const uid = () => Math.random().toString(36).slice(2, 9);

export function buildPayload(form: FormState, variableNumbers: number[]): CreateTemplatePayload {
  const components: TemplateComponent[] = [];

  if (form.headerFormat !== "NONE") {
    const headerComp: any = { type: "HEADER", format: form.headerFormat as HeaderFormat };
    if (form.headerFormat === HeaderFormat.TEXT) {
      headerComp.text = form.headerText;
    } else if (form.headerMediaUrl) {
      headerComp.example = { header_handle: [form.headerMediaUrl] };
    }
    components.push(headerComp as HeaderComponent);
  }

  const bodyComp: BodyComponent = { type: "BODY", text: form.bodyText };
  // 🔥 NAYA: Meta ko variable verify karne ke liye example values chahiye
  if (variableNumbers.length > 0) {
    bodyComp.example = {
      body_text: [variableNumbers.map((n) => form.bodyExamples[n] || "")],
    };
  }
  components.push(bodyComp);

  if (form.footerText.trim()) {
    components.push({ type: "FOOTER", text: form.footerText } as FooterComponent);
  }

  if (form.buttons.length > 0) {
    const buttons: TemplateButton[] = form.buttons.map((b) => {
      if (b.type === ButtonType.QUICK_REPLY)
        return { type: ButtonType.QUICK_REPLY, text: b.text } as QuickReplyButton;
      if (b.type === ButtonType.URL)
        return { type: ButtonType.URL, text: b.text, url: b.url ?? "" } as UrlButton;
      return {
        type: ButtonType.PHONE_NUMBER,
        text: b.text,
        phone_number: b.phone_number ?? "",
      } as PhoneNumberButton;
    });
    components.push({ type: "BUTTONS", buttons } as ButtonsComponent);
  }

  return {
    name: form.name,
    category: form.category,
    language: form.language,
    components,
  };
}
