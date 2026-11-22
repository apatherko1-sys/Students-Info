"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";

const INSTITUTION_NAME = "مؤسسة ملتقى العلم والدين";

type FormValues = {
  student_name: string;
  school_name: string;
  grade: string;
  section: string;
  phone: string;
  institution_name: string;
};

const INITIAL_FORM: FormValues = {
  student_name: "",
  school_name: "",
  grade: "",
  section: "",
  phone: "",
  institution_name: INSTITUTION_NAME,
};

export default function RegistrationPage() {
  const [form, setForm] = useState<FormValues>(INITIAL_FORM);
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function updateField(field: keyof FormValues, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (honeypot) return;
    if (!isSupabaseConfigured()) {
      setNotice({ type: "error", text: "الموقع لم يُربط بقاعدة البيانات بعد. يرجى المحاولة لاحقًا." });
      return;
    }

    const cleaned: FormValues = {
      student_name: form.student_name.trim(),
      school_name: form.school_name.trim(),
      grade: form.grade.trim(),
      section: form.section.trim(),
      phone: form.phone.trim(),
      institution_name: form.institution_name.trim(),
    };

    if (Object.values(cleaned).some((value) => !value)) {
      setNotice({ type: "error", text: "يرجى ملء جميع الحقول قبل إرسال التسجيل." });
      return;
    }
    if (cleaned.student_name.length < 2 || cleaned.student_name.length > 120) {
      setNotice({ type: "error", text: "يرجى إدخال اسم طالب صحيح." });
      return;
    }
    if (!/^[0-9٠-٩+()\-\s]{7,25}$/.test(cleaned.phone)) {
      setNotice({ type: "error", text: "يرجى التأكد من كتابة رقم هاتف صحيح." });
      return;
    }
    if (!consent) {
      setNotice({ type: "error", text: "يرجى الموافقة على استخدام البيانات لغرض التسجيل." });
      return;
    }

    setSubmitting(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("students").insert(cleaned);
      if (error) throw error;

      setForm(INITIAL_FORM);
      setConsent(false);
      setNotice({ type: "success", text: "تم استلام معلوماتك بنجاح. شكرًا لتسجيلك." });
    } catch (error) {
      console.error("Student registration failed:", error);
      setNotice({ type: "error", text: "تعذّر إرسال التسجيل. تحقق من الاتصال وحاول مرة أخرى." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="registration-card" aria-labelledby="page-title">
        <div className="brand-mark" aria-hidden="true">م</div>
        <p className="eyebrow">{INSTITUTION_NAME}</p>
        <h1 id="page-title">تسجيل الطلاب</h1>
        <p className="intro">يرجى إدخال المعلومات التالية بدقة لإكمال عملية التسجيل.</p>

        <form className="registration-form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <label className="field field-full">
              <span>اسم الطالب</span>
              <input
                autoComplete="name"
                maxLength={120}
                required
                value={form.student_name}
                onChange={(event) => updateField("student_name", event.target.value)}
                placeholder="اكتب اسم الطالب الكامل"
              />
            </label>

            <label className="field field-full">
              <span>اسم المدرسة</span>
              <input
                maxLength={160}
                required
                value={form.school_name}
                onChange={(event) => updateField("school_name", event.target.value)}
                placeholder="اكتب اسم المدرسة"
              />
            </label>

            <label className="field">
              <span>الصف</span>
              <input
                maxLength={80}
                required
                value={form.grade}
                onChange={(event) => updateField("grade", event.target.value)}
                placeholder="مثال: الثالث متوسط"
              />
            </label>

            <label className="field">
              <span>الشعبة</span>
              <input
                maxLength={40}
                required
                value={form.section}
                onChange={(event) => updateField("section", event.target.value)}
                placeholder="مثال: أ"
              />
            </label>

            <label className="field field-full">
              <span>رقم الهاتف</span>
              <input
                autoComplete="tel"
                inputMode="tel"
                maxLength={25}
                required
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                placeholder="07xxxxxxxxx"
              />
            </label>

            <label className="field field-full">
              <span>اسم المؤسسة</span>
              <input
                maxLength={160}
                required
                value={form.institution_name}
                onChange={(event) => updateField("institution_name", event.target.value)}
                placeholder="اسم المؤسسة"
              />
            </label>
          </div>

          <label className="consent-row">
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>أوافق على استخدام المعلومات المدخلة لغرض التسجيل والتواصل المتعلق بأنشطة المؤسسة فقط.</span>
          </label>
          <p className="privacy-note">تُعرض بيانات التسجيل على الإدارة المخوّلة فقط. إذا كان الطالب قاصرًا، ينبغي أخذ موافقة ولي الأمر قبل إرسال رقم الهاتف.</p>

          {/* حقل مخفي لالتقاط بعض التسجيلات الآلية البسيطة */}
          <div className="honeypot" aria-hidden="true">
            <label htmlFor="website">اترك هذا الحقل فارغًا</label>
            <input id="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
          </div>

          {notice && (
            <div className={`notice ${notice.type}`} role="status" aria-live="polite">
              {notice.text}
            </div>
          )}

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? "جارٍ إرسال التسجيل..." : "إرسال التسجيل"}
          </button>
        </form>
        <footer className="page-footer">
          <span>© {new Date().getFullYear()} {INSTITUTION_NAME}</span>
          <Link href="/admin">دخول الإدارة</Link>
        </footer>
      </section>
    </main>
  );
}
