import { CreateTemplatePayload, BodyComponent } from "../types/template.types";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// {{1}}, {{2}}... nikaal kar unique sorted number list deta hai
export function extractVariableNumbers(text: string): number[] {
  if (!text) return [];
  const matches = [...text.matchAll(/\{\{(\d+)\}\}/g)];
  const nums = matches.map((m) => parseInt(m[1], 10));
  return [...new Set(nums)].sort((a, b) => a - b);
}

export function validateTemplate(payload: CreateTemplatePayload): ValidationResult {
  const errors: ValidationError[] = [];

  // ── Name ──
  if (!payload.name || payload.name.trim().length === 0) {
    errors.push({ field: "name", message: "Template name zaroori hai." });
  } else if (!/^[a-z0-9_]+$/.test(payload.name)) {
    errors.push({ field: "name", message: "Sirf lowercase letters, numbers aur underscore allowed hain." });
  } else if (payload.name.length > 512) {
    errors.push({ field: "name", message: "Naam 512 characters se zyada nahi ho sakta." });
  }

  // ── Body ──
  const bodyComp = payload.components.find((c) => c.type === "BODY") as BodyComponent | undefined;
  if (!bodyComp || !bodyComp.text || bodyComp.text.trim().length === 0) {
    errors.push({ field: "components.BODY", message: "Body text zaroori hai." });
  } else {
    const limit = payload.category === "AUTHENTICATION" ? 150 : 1024;
    if (bodyComp.text.length > limit) {
      errors.push({ field: "components.BODY", message: `Body text ${limit} characters se zyada nahi ho sakta.` });
    }

    // ── Sequential variable check (Meta rejects gaps like {{1}} then {{3}}) ──
    const vars = extractVariableNumbers(bodyComp.text);
    if (vars.length > 0) {
      const expectedSequence = Array.from({ length: vars.length }, (_, i) => i + 1);
      const isSequential = vars.every((v, i) => v === expectedSequence[i]);
      if (!isSequential) {
        errors.push({
          field: "components.BODY",
          message: "Variables sequential hone chahiye: {{1}}, {{2}}, {{3}}... koi number skip mat karo.",
        });
      }

      // 🔥 NAYA: Har variable ke liye example value hona chahiye, warna Meta
      // template ko verify/approve nahi karega.
      const examples = bodyComp.example?.body_text?.[0] ?? [];
      if (examples.length < vars.length) {
        errors.push({
          field: "components.BODY.example",
          message: "Har variable ({{1}}, {{2}}...) ke liye ek sample/example value dena zaroori hai.",
        });
      } else if (examples.some((ex) => !ex || ex.trim().length === 0)) {
        errors.push({
          field: "components.BODY.example",
          message: "Koi bhi variable example khaali nahi ho sakta.",
        });
      }
    }
  }

  // ── Buttons ──
  const buttonsComp = payload.components.find((c) => c.type === "BUTTONS") as any;
  if (buttonsComp) {
    const buttons = buttonsComp.buttons || [];
    if (buttons.length > 10) {
      errors.push({ field: "components.BUTTONS", message: "Maximum 10 buttons allowed hain." });
    }
    buttons.forEach((btn: any, idx: number) => {
      if (!btn.text || btn.text.trim().length === 0) {
        errors.push({ field: "components.BUTTONS", message: `Button #${idx + 1} ka text khaali hai.` });
      }
      if (btn.type === "URL" && (!btn.url || !/^https?:\/\//.test(btn.url))) {
        errors.push({ field: "components.BUTTONS", message: `Button #${idx + 1} ka URL valid nahi hai.` });
      }
      if (btn.type === "PHONE_NUMBER" && (!btn.phone_number || !/^\+\d{6,15}$/.test(btn.phone_number))) {
        errors.push({ field: "components.BUTTONS", message: `Button #${idx + 1} ka phone number E.164 format mein hona chahiye.` });
      }
    });
  }

  return { isValid: errors.length === 0, errors };
}
